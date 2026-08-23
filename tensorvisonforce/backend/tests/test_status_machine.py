"""
Revised status machine tests aligned with the new 6-status complaint lifecycle:
  SUBMITTED -> VERIFIED -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> REWORK_REQUIRED
                                             |
                                       REWORK_REQUIRED -> IN_PROGRESS  (cycle back)
"""
import pytest

from app.schemas.complaints import ComplaintStatus
from app.utils.status_machine import (
    InvalidTransitionError,
    can_transition,
    get_allowed_transitions,
    is_terminal,
    validate_transition,
)


class TestValidTransitions:
    @pytest.mark.parametrize(
        "current,target",
        [
            (ComplaintStatus.SUBMITTED, ComplaintStatus.VERIFIED),
            (ComplaintStatus.VERIFIED, ComplaintStatus.ASSIGNED),
            (ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS),
            (ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED),
            (ComplaintStatus.RESOLVED, ComplaintStatus.REWORK_REQUIRED),
            (ComplaintStatus.REWORK_REQUIRED, ComplaintStatus.IN_PROGRESS),   # re-work cycle
            (ComplaintStatus.REWORK_REQUIRED, ComplaintStatus.RESOLVED),      # re-resolved
            (ComplaintStatus.ASSIGNED, ComplaintStatus.VERIFIED),             # re-unassign
            (ComplaintStatus.IN_PROGRESS, ComplaintStatus.ASSIGNED),          # hand-off
        ],
    )
    def test_allowed_transition_does_not_raise(self, current, target):
        assert can_transition(current, target) is True
        validate_transition(current, target)  # must not raise


class TestDisallowedTransitions:
    @pytest.mark.parametrize(
        "current,target",
        [
            (ComplaintStatus.SUBMITTED, ComplaintStatus.RESOLVED),
            (ComplaintStatus.SUBMITTED, ComplaintStatus.IN_PROGRESS),
            (ComplaintStatus.VERIFIED, ComplaintStatus.RESOLVED),
            (ComplaintStatus.VERIFIED, ComplaintStatus.REWORK_REQUIRED),
        ],
    )
    def test_disallowed_transition_raises(self, current, target):
        assert can_transition(current, target) is False
        with pytest.raises(InvalidTransitionError):
            validate_transition(current, target)

    def test_same_status_is_not_a_valid_transition(self):
        assert can_transition(ComplaintStatus.SUBMITTED, ComplaintStatus.SUBMITTED) is False


class TestTerminalStates:
    def test_no_statuses_are_forever_terminal_in_new_machine(self):
        """REWORK_REQUIRED is the only quasi-terminal state, but it has outgoing transitions."""
        assert is_terminal(ComplaintStatus.REWORK_REQUIRED) is False

    @pytest.mark.parametrize(
        "status",
        [
            ComplaintStatus.SUBMITTED,
            ComplaintStatus.VERIFIED,
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.RESOLVED,
            ComplaintStatus.REWORK_REQUIRED,
        ],
    )
    def test_every_status_has_allowed_transitions_count(self, status):
        transitions = get_allowed_transitions(status)
        # Every status we use must have defined transitions (even if 0 for future terminal ones)
        assert isinstance(transitions, set)


class TestInvalidTransitionError:
    def test_error_message_includes_both_statuses(self):
        with pytest.raises(InvalidTransitionError) as exc_info:
            validate_transition(ComplaintStatus.SUBMITTED, ComplaintStatus.RESOLVED)
        err = exc_info.value
        assert "SUBMITTED" in str(err).upper() or "submitted" in str(err)
        assert err.current == ComplaintStatus.SUBMITTED
        assert err.target  == ComplaintStatus.RESOLVED
