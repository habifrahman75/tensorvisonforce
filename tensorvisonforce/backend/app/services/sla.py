"""
Service Level Agreement (SLA) calculations: how long a department has to
resolve a complaint, based on its priority, and whether an open
complaint has breached that window.
"""
from datetime import datetime, timedelta, timezone

from app.config import Settings
from app.schemas.complaints import ComplaintStatus, Priority

_TERMINAL_STATUSES = {ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED}


def get_sla_hours(priority: Priority, settings: Settings) -> int:
    return {
        Priority.HIGH: settings.sla_hours_high,
        Priority.MEDIUM: settings.sla_hours_medium,
        Priority.LOW: settings.sla_hours_low,
    }[priority]


def compute_sla_due_at(
    *, priority: Priority, created_at: datetime, settings: Settings
) -> datetime:
    hours = get_sla_hours(priority, settings)
    return created_at + timedelta(hours=hours)


def is_breached(
    *, sla_due_at: datetime, status: ComplaintStatus, now: datetime | None = None
) -> bool:
    if status in _TERMINAL_STATUSES:
        return False
    now = now or datetime.now(timezone.utc)
    return now > sla_due_at


def time_remaining(sla_due_at: datetime, now: datetime | None = None) -> timedelta:
    now = now or datetime.now(timezone.utc)
    return sla_due_at - now