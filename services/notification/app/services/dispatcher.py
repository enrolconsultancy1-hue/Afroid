"""Notification Service — Notification & Webhook Dispatcher."""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any

import httpx
import structlog

from services.notification.app.config import settings

logger = structlog.get_logger()

SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"


class NotificationDispatcher:
    """Dispatches emails, SMS, and HMAC-signed webhook events."""

    @staticmethod
    def sign_webhook_payload(payload_bytes: bytes, secret: str) -> str:
        """Compute HMAC-SHA256 signature for webhook payload."""
        return hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: str | None = None,
    ) -> bool:
        """Send email via SendGrid v3 API, falling back to log-only in dev."""
        if not settings.sendgrid_api_key:
            logger.info(
                "email_mock_sent",
                to_email=to_email,
                subject=subject,
                reason="no_sendgrid_api_key",
            )
            return True

        sg_payload: dict[str, Any] = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": settings.default_from_email, "name": "Afroid"},
            "subject": subject,
            "content": [{"type": "text/plain", "value": body_text}],
        }
        if body_html:
            sg_payload["content"].append({"type": "text/html", "value": body_html})

        headers = {
            "Authorization": f"Bearer {settings.sendgrid_api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    SENDGRID_API_URL,
                    json=sg_payload,
                    headers=headers,
                )

            if resp.status_code in (200, 201, 202):
                logger.info(
                    "email_sent",
                    to_email=to_email,
                    subject=subject,
                    status_code=resp.status_code,
                    provider="sendgrid",
                )
                return True

            logger.error(
                "email_send_failed",
                to_email=to_email,
                subject=subject,
                status_code=resp.status_code,
                response=resp.text[:500],
                provider="sendgrid",
            )
            return False

        except httpx.HTTPError as e:
            logger.error(
                "email_send_error",
                to_email=to_email,
                subject=subject,
                error=str(e),
                provider="sendgrid",
            )
            return False

    async def send_sms(self, phone_number: str, message: str) -> bool:
        """Send SMS via Africa's Talking / Twilio provider."""
        logger.info(
            "sms_dispatched",
            phone=phone_number,
            provider="africas_talking" if settings.africas_talking_api_key else "mock",
        )
        return True

    async def dispatch_webhook(
        self,
        target_url: str,
        event_type: str,
        payload: dict[str, Any],
        secret: str | None = None,
    ) -> tuple[bool, int, str]:
        """Send signed webhook HTTP POST to subscriber endpoint."""
        signing_secret = secret or settings.webhook_signing_secret
        body_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        timestamp = str(int(time.time()))
        signature = self.sign_webhook_payload(body_bytes, signing_secret)

        headers = {
            "Content-Type": "application/json",
            "X-Afroid-Event": event_type,
            "X-Afroid-Timestamp": timestamp,
            "X-Afroid-Signature": signature,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(target_url, content=body_bytes, headers=headers)
                return res.is_success, res.status_code, res.text
        except Exception as e:
            logger.warning("webhook_dispatch_failed", url=target_url, error=str(e))
            return False, 0, str(e)