"""Notification Service — API Routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from services.notification.app.schemas.notification import (
    EmailNotificationRequest,
    NotificationResponse,
    SMSNotificationRequest,
    WebhookDispatchEvent,
)
from services.notification.app.services.dispatcher import NotificationDispatcher
from services.shared.auth_middleware import get_current_user
from services.shared.user_models import User

router = APIRouter(prefix="/notifications", tags=["notifications"])
dispatcher = NotificationDispatcher()


@router.post("/email", response_model=NotificationResponse)
async def send_email(
    body: EmailNotificationRequest,
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    """Send transactional email notification."""
    await dispatcher.send_email(
        to_email=body.recipient_email,
        subject=body.subject,
        body_text=body.body_text,
        body_html=body.body_html,
    )
    return NotificationResponse(
        channel="email",
        recipient=body.recipient_email,
        status="delivered",
    )


@router.post("/sms", response_model=NotificationResponse)
async def send_sms(
    body: SMSNotificationRequest,
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    """Send SMS notification."""
    await dispatcher.send_sms(
        phone_number=body.phone_number,
        message=body.message,
    )
    return NotificationResponse(
        channel="sms",
        recipient=body.phone_number,
        status="delivered",
    )


@router.post("/webhook", response_model=NotificationResponse)
async def dispatch_webhook(
    body: WebhookDispatchEvent,
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    """Dispatch signed webhook event to an external URL."""
    success, _, _ = await dispatcher.dispatch_webhook(
        target_url=body.target_url,
        event_type=body.event_type,
        payload=body.payload,
        secret=body.secret,
    )
    return NotificationResponse(
        channel="webhook",
        recipient=body.target_url,
        status="delivered" if success else "failed",
    )
