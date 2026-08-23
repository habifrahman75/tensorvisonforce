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
            (ComplaintStatus.SUBMITTED, ComplaintStatus.REJECTED),
            (ComplaintStatus.SUBMITTED, ComplaintStatus.DUPLICATE),
            (ComplaintStatus.VERIFIED, ComplaintStatus.ASSIGNED),
            (ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS),
            (ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED),
            (ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED),
            (ComplaintStatus.RESOLVED, ComplaintStatus.IN_PROGRESS),  # reopened
        ],
    )
    def test_allowed_transition_does_not_raise(self, current, target):
        assert can_transition(current, target) is True
        validate_transition(current, target)  # should not raise

    @pytest.mark.parametrize(
        "current,target",
        [
            (ComplaintStatus.SUBMITTED, ComplaintStatus.RESOLVED),
            (ComplaintStatus.SUBMITTED, ComplaintStatus.CLOSED),
            (ComplaintStatus.CLOSED, ComplaintStatus.IN_PROGRESS),
            (ComplaintStatus.REJECTED, ComplaintStatus.VERIFIED),
            (ComplaintStatus.DUPLICATE, ComplaintStatus.SUBMITTED),
            (ComplaintStatus.VERIFIED, ComplaintStatus.RESOLVED),
        ],
    )
    def test_disallowed_transition_raises(self, current, target):
        assert can_transition(current, target) is False
        with pytest.raises(InvalidTransitionError):
            validate_transition(current, target)

    def test_same_status_is_not_a_valid_transition(self):
        assert can_transition(ComplaintStatus.SUBMITTED, ComplaintStatus.SUBMITTED) is False


class TestTerminalStates:
    @pytest.mark.parametrize(
        "status",
        [ComplaintStatus.CLOSED, ComplaintStatus.REJECTED, ComplaintStatus.DUPLICATE],
    )
    def test_terminal_statuses_have_no_outgoing_transitions(self, status):
        assert is_terminal(status) is True
        assert get_allowed_transitions(status) == set()

    @pytest.mark.parametrize(
        "status",
        [
            ComplaintStatus.SUBMITTED,
            ComplaintStatus.VERIFIED,
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.RESOLVED,
        ],
    )
    def test_non_terminal_statuses_have_outgoing_transitions(self, status):
        assert is_terminal(status) is False
        assert len(get_allowed_transitions(status)) > 0


class TestInvalidTransitionError:
    def test_error_message_includes_both_statuses(self):
        with pytest.raises(InvalidTransitionError) as exc_info:
            validate_transition(ComplaintStatus.CLOSED, ComplaintStatus.SUBMITTED)
        assert "closed" in str(exc_info.value)
        assert "submitted" in str(exc_info.value)
        assert exc_info.value.current == ComplaintStatus.CLOSED
        assert exc_info.value.target == ComplaintStatus.SUBMITTED
