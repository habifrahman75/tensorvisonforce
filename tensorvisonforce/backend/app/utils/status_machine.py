"""
Enforces the valid lifecycle transitions for a complaint's status.

Allowed states (matches DB enum complaint_status):
  SUBMITTED -> VERIFIED -> ASSIGNED -> IN_PROGRESS -> RESOLVED
                                             |               |
                                      REWORK_REQUIRED <------+  (admin reject OR citizen rejects)
                                             |
                                       IN_PROGRESS  (re-assigned after rework)

Notes:
  - REWORK_REQUIRED can return to IN_PROGRESS when work resumes.
  - Workers cannot move a complaint backward past ASSIGNED.
  - Admins can move freely but router-level guards enforce role constraints.
"""
from app.schemas.complaints import ComplaintStatus

_TRANSITIONS: dict[ComplaintStatus, set[ComplaintStatus]] = {
    ComplaintStatus.SUBMITTED: {
        ComplaintStatus.VERIFIED,
    },
    ComplaintStatus.VERIFIED: {
        ComplaintStatus.ASSIGNED,
    },
    ComplaintStatus.ASSIGNED: {
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.VERIFIED,    # re-unassign / reassign flow
    },
    ComplaintStatus.IN_PROGRESS: {
        ComplaintStatus.RESOLVED,
        ComplaintStatus.ASSIGNED,    # handed to a different worker
    },
    ComplaintStatus.RESOLVED: {
        ComplaintStatus.REWORK_REQUIRED,  # admin rejects or citizen rejects
    },
    ComplaintStatus.REWORK_REQUIRED: {
        ComplaintStatus.IN_PROGRESS,      # worker picks it back up
        ComplaintStatus.RESOLVED,         # re-resolved after rework
    },
}


class InvalidTransitionError(ValueError):
    def __init__(self, current: ComplaintStatus, target: ComplaintStatus):
        self.current = current
        self.target  = target
        super().__init__(
            f"Cannot transition complaint from '{current.value}' to '{target.value}'"
        )


def get_allowed_transitions(current: ComplaintStatus) -> set[ComplaintStatus]:
    return _TRANSITIONS.get(current, set())


def can_transition(current: ComplaintStatus, target: ComplaintStatus) -> bool:
    if current == target:
        return False
    return target in get_allowed_transitions(current)


def validate_transition(current: ComplaintStatus, target: ComplaintStatus) -> None:
    if not can_transition(current, target):
        raise InvalidTransitionError(current, target)


def is_terminal(status: ComplaintStatus) -> bool:
    """A status is terminal when it has no outgoing transitions."""
    return len(get_allowed_transitions(status)) == 0
