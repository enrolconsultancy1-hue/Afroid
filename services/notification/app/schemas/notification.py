"""Notification Service — Pydantic Schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class EmailNotificationRequest(BaseModel):
    recipient_email: EmailStr
    recipient_name: str | None = None
    subject: str = Field(..., min_length=1, max_length=255)
    body_text: str
    body_html: str | None = None
    template_id: str | None = None
    template_data: dict[str, Any] = {}


class SMSNotificationRequest(BaseModel):
    phone_number: str = Field(..., min_length=8, max_length=20)
    message: str = Field(..., min_length=1, max_length=480)


class WebhookDispatchEvent(BaseModel):
    target_url: str
    event_type: str
    payload: dict[str, Any]
    secret: str | None = None


class NotificationResponse(BaseModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    status: str = "delivered"
    channel: str
    recipient: str
    sent_at: datetime = Field(default_factory=datetime.utcnow)
