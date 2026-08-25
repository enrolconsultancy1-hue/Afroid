"""Platform Service - Billing routes (Stripe checkout + webhook).

Implements subscription monetization for the `subscriptions` table:
  - POST /v1/billing/checkout  -> create a Stripe Checkout Session (auth required)
  - POST /v1/billing/webhook   -> Stripe webhook receiver (signature-verified, no auth)
  - GET  /v1/billing/subscription/{organization_id} -> current subscription (auth required)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Literal

import stripe
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.app.middleware.auth_middleware import get_current_user
from services.auth.app.models.user import User
from services.platform.app.config import settings
from services.platform.app.models.platform import Organization, OrganizationMember, Subscription
from services.shared.exceptions import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    ServiceUnavailableError,
    UnauthorizedError,
)

router = APIRouter(prefix="/billing", tags=["billing"])

# Global API key for the classic Stripe SDK calls below.
stripe.api_key = settings.stripe_secret_key

PLAN_PRICE_IDS: dict[str, str] = {
    "starter": settings.stripe_price_id_starter,
    "pro": settings.stripe_price_id_pro,
    "enterprise": settings.stripe_price_id_enterprise,
}


# --- Schemas ---

class CheckoutRequest(BaseModel):
    organization_id: uuid.UUID
    plan: Literal["starter", "pro", "enterprise"] = Field(..., description="Subscription tier.")


class CheckoutResponse(BaseModel):
    checkout_url: str
    subscription_id: uuid.UUID


class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    plan: str
    status: str
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None
    model_config = {"from_attributes": True}


# --- Helpers ---

def _get_session(request: Request) -> AsyncSession:
    return request.state.db_session


async def _get_org_or_404(session: AsyncSession, org_id: uuid.UUID) -> Organization:
    result = await session.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise NotFoundError(resource="Organization", resource_id=str(org_id))
    return org


async def _get_member_role(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID) -> str | None:
    result = await session.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
    )
    member = result.scalar_one_or_none()
    return member.role if member else None


async def _require_admin(session: AsyncSession, org: Organization, user: User) -> None:
    if user.role == "superadmin":
        return
    role = await _get_member_role(session, org.id, user.id)
    if role not in ("owner", "admin"):
        raise ForbiddenError(detail="Admin access required.")


def _price_id_for_plan(plan: str) -> str:
    return PLAN_PRICE_IDS.get(plan, "")


async def _find_subscription(session: AsyncSession, org_id: uuid.UUID) -> Subscription | None:
    result = await session.execute(select(Subscription).where(Subscription.organization_id == org_id))
    return result.scalar_one_or_none()


async def _find_subscription_by_stripe(session: AsyncSession, stripe_sub_id: str) -> Subscription | None:
    result = await session.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    return result.scalar_one_or_none()


# --- Checkout ---

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: Request,
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
) -> CheckoutResponse:
    """Create a Stripe Checkout Session for the given plan and return its URL."""
    if not settings.stripe_secret_key:
        raise ServiceUnavailableError(detail="Stripe billing is not configured (STRIPE_SECRET_KEY missing).")

    price_id = _price_id_for_plan(body.plan)
    if not price_id:
        raise BadRequestError(detail=f"Plan '{body.plan}' has no configured Stripe price.")

    session = _get_session(request)
    org = await _get_org_or_404(session, body.organization_id)
    await _require_admin(session, org, current_user)

    subscription = await _find_subscription(session, org.id)
    if subscription is None:
        customer = stripe.Customer.create(
            email=current_user.email,
            metadata={"organization_id": str(org.id)},
        )
        subscription = Subscription(
            id=uuid.uuid4(),
            organization_id=org.id,
            stripe_customer_id=customer.id,
            plan="free",
            status="incomplete",
        )
        session.add(subscription)
        await session.flush()

    stripe.api_key = settings.stripe_secret_key
    checkout = stripe.checkout.Session.create(
        mode="subscription",
        customer=subscription.stripe_customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.frontend_url}/dashboard/settings?checkout=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.frontend_url}/dashboard/settings?checkout=canceled",
        client_reference_id=str(subscription.id),
        metadata={"organization_id": str(org.id), "plan": body.plan},
    )

    return CheckoutResponse(checkout_url=checkout.url, subscription_id=subscription.id)


# --- Subscription lookup ---

@router.get("/subscription/{organization_id}", response_model=SubscriptionResponse)
async def get_subscription(
    request: Request,
    organization_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Return the current billing subscription for an organization."""
    session = _get_session(request)
    org = await _get_org_or_404(session, organization_id)

    role = await _get_member_role(session, org.id, current_user.id)
    if role is None and current_user.role != "superadmin":
        raise ForbiddenError(detail="You are not a member of this organization.")

    subscription = await _find_subscription(session, org.id)
    if subscription is None:
        raise NotFoundError(resource="Subscription", resource_id=str(organization_id))
    return SubscriptionResponse.model_validate(subscription)


# --- Webhook ---

@router.post("/webhook")
async def stripe_webhook(request: Request) -> dict[str, Any]:
    """Receive and verify Stripe webhook events (no auth; signature-verified)."""
    if not settings.stripe_webhook_secret:
        raise ServiceUnavailableError(detail="Stripe webhook secret is not configured (STRIPE_WEBHOOK_SECRET missing).")

    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    if not signature:
        raise UnauthorizedError(detail="Missing Stripe-Signature header.")

    try:
        event = stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
    except (stripe.SignatureVerificationError, ValueError) as exc:
        raise UnauthorizedError(detail="Invalid Stripe webhook signature.") from exc

    session = request.state.db_session
    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(session, data)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(session, data)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(session, data)

    return {"received": True}


async def _handle_checkout_completed(session: AsyncSession, checkout: dict[str, Any]) -> None:
    """Activate a subscription once a checkout session is paid."""
    metadata = checkout.get("metadata") or {}
    subscription: Subscription | None = None

    ref_id = checkout.get("client_reference_id")
    if ref_id:
        result = await session.execute(select(Subscription).where(Subscription.id == uuid.UUID(ref_id)))
        subscription = result.scalar_one_or_none()

    if subscription is None and metadata.get("organization_id"):
        subscription = await _find_subscription(session, uuid.UUID(metadata["organization_id"]))

    if subscription is None:
        return

    subscription.stripe_subscription_id = checkout.get("subscription") or subscription.stripe_subscription_id
    if checkout.get("customer"):
        subscription.stripe_customer_id = checkout["customer"]
    plan = metadata.get("plan")
    if plan:
        subscription.plan = plan
    subscription.status = "active"


async def _handle_subscription_updated(session: AsyncSession, sub_obj: dict[str, Any]) -> None:
    """Sync status + period dates from Stripe subscription updates."""
    subscription = await _find_subscription_by_stripe(session, sub_obj.get("id", ""))
    if subscription is None:
        return
    if sub_obj.get("status"):
        subscription.status = sub_obj["status"]
    if sub_obj.get("current_period_start"):
        subscription.current_period_start = datetime.fromtimestamp(sub_obj["current_period_start"], tz=timezone.utc)
    if sub_obj.get("current_period_end"):
        subscription.current_period_end = datetime.fromtimestamp(sub_obj["current_period_end"], tz=timezone.utc)


async def _handle_subscription_deleted(session: AsyncSession, sub_obj: dict[str, Any]) -> None:
    """Mark a subscription canceled when it ends."""
    subscription = await _find_subscription_by_stripe(session, sub_obj.get("id", ""))
    if subscription is None:
        return
    subscription.status = "canceled"
