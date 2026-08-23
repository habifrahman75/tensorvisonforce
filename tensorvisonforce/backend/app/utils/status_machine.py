"""
Enforces the valid lifecycle of a complaint's status.

    SUBMITTED -> VERIFIED -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED
        |            |                        |
        v            v                        v
     REJECTED    DUPLICATE                IN_PROGRESS (re-opened via feedback)

RESOLVED can bounce back to IN_PROGRESS if citizen feedback reopens it.
Terminal states (CLOSED, REJECTED, DUPLICATE) have no outgoing transitions.
"""
from app.schemas.complaints import ComplaintStatus

_TRANSITIONS: dict[ComplaintStatus, set[ComplaintStatus]] = {
    ComplaintStatus.SUBMITTED: {
        ComplaintStatus.VERIFIED,
        ComplaintStatus.REJECTED,
        ComplaintStatus.DUPLICATE,
    },
    ComplaintStatus.VERIFIED: {
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.REJECTED,
        ComplaintStatus.DUPLICATE,
    },
    ComplaintStatus.ASSIGNED: {
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.VERIFIED,  # unassigned / reassign flow
    },
    ComplaintStatus.IN_PROGRESS: {
        ComplaintStatus.RESOLVED,
        ComplaintStatus.ASSIGNED,  # handed to a different worker
    },
    ComplaintStatus.RESOLVED: {
        ComplaintStatus.CLOSED,
        ComplaintStatus.IN_PROGRESS,  # reopened by negative feedback
    },
    ComplaintStatus.CLOSED: set(),
    ComplaintStatus.REJECTED: set(),
    ComplaintStatus.DUPLICATE: set(),
}


class InvalidTransitionError(ValueError):
    def __init__(self, current: ComplaintStatus, target: ComplaintStatus):
        self.current = current
        self.target = target
        super().__init__(f"Cannot transition complaint from '{current.value}' to '{target.value}'")


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
    return len(get_allowed_transitions(status)) == 0
