"""
Service Level Agreement (SLA) calculations.

SLA hours are configurable via Settings (environment variables):
  SLA_HOURS_HIGH   = 24  (default)
  SLA_HOURS_MEDIUM = 48  (default)
  SLA_HOURS_LOW    = 72  (default)

A complaint is overdue when now() > deadline AND the complaint is not yet
in a terminal state (RESOLVED or REWORK_REQUIRED treated as non-terminal
since work is still ongoing).

No background worker is required for MVP — call `detect_overdue_complaints()`
from a periodic trigger endpoint or a cron job.
"""
from datetime import datetime, timedelta, timezone

from app.config import Settings
from app.schemas.complaints import ComplaintStatus, Priority

# Non-terminal statuses where an SLA breach is meaningful
_ACTIVE_STATUSES = {
    ComplaintStatus.SUBMITTED,
    ComplaintStatus.VERIFIED,
    ComplaintStatus.ASSIGNED,
    ComplaintStatus.IN_PROGRESS,
    ComplaintStatus.REWORK_REQUIRED,
}


def get_sla_hours(priority: Priority, settings: Settings) -> int:
    return {
        Priority.HIGH:   settings.sla_hours_high,
        Priority.MEDIUM: settings.sla_hours_medium,
        Priority.LOW:    settings.sla_hours_low,
    }[priority]


def compute_sla_due_at(
    *, priority: Priority, created_at: datetime, settings: Settings
) -> datetime:
    hours = get_sla_hours(priority, settings)
    return created_at + timedelta(hours=hours)


def is_breached(
    *, sla_due_at: datetime, status: ComplaintStatus, now: datetime | None = None
) -> bool:
    """Returns True only if the complaint is active AND past its SLA deadline."""
    if status not in _ACTIVE_STATUSES:
        return False
    now = now or datetime.now(timezone.utc)
    return now > sla_due_at


def time_remaining(sla_due_at: datetime, now: datetime | None = None) -> timedelta:
    now = now or datetime.now(timezone.utc)
    return sla_due_at - now


def detect_overdue_complaints(complaints: list[dict], settings: Settings) -> list[str]:
    """
    Given a list of complaint dicts (each with 'id', 'priority', 'status',
    'created_at' or 'deadline'), returns the list of IDs that are overdue.

    This is the function to call from a periodic endpoint / cron trigger.
    """
    now = datetime.now(timezone.utc)
    overdue: list[str] = []
    for c in complaints:
        try:
            status = ComplaintStatus(c["status"])
        except ValueError:
            continue
        if status not in _ACTIVE_STATUSES:
            continue
        deadline_raw = c.get("deadline") or c.get("sla_due_at")
        if not deadline_raw:
            continue
        if isinstance(deadline_raw, str):
            deadline = datetime.fromisoformat(deadline_raw)
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
        else:
            deadline = deadline_raw
        if now > deadline:
            overdue.append(c["id"])
    return overdue