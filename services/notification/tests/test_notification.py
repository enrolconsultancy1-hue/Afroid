"""Unit tests for the Notification dispatcher and HMAC webhook signatures."""

from __future__ import annotations

import json

import pytest

from services.notification.app.services.dispatcher import NotificationDispatcher


class TestNotificationDispatcher:
    """Tests for email/SMS dispatch and HMAC signing."""

    @pytest.fixture
    def dispatcher(self) -> NotificationDispatcher:
        return NotificationDispatcher()

    def test_webhook_hmac_signing(self, dispatcher: NotificationDispatcher) -> None:
        payload = {"event": "startup.certified", "project_id": "proj-123"}
        payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        secret = "super-secret-key"  # noqa: S105

        sig1 = dispatcher.sign_webhook_payload(payload_bytes, secret)
        sig2 = dispatcher.sign_webhook_payload(payload_bytes, secret)
        assert sig1 == sig2
        assert len(sig1) == 64  # SHA256 hex string

        # Changing secret yields different signature
        sig_different = dispatcher.sign_webhook_payload(payload_bytes, "other-secret")
        assert sig1 != sig_different

    @pytest.mark.asyncio
    async def test_email_dispatch_success(self, dispatcher: NotificationDispatcher) -> None:
        success = await dispatcher.send_email(
            to_email="founder@example.com",
            subject="Your Certification is Complete",
            body_text="Congratulations! Your startup has been certified.",
        )
        assert success is True

    @pytest.mark.asyncio
    async def test_sms_dispatch_success(self, dispatcher: NotificationDispatcher) -> None:
        success = await dispatcher.send_sms(
            phone_number="+254712345678",
            message="Afroid: New grant match found ($50,000). Check your dashboard.",
        )
        assert success is True
