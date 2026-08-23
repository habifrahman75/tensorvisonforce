import os
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")

from app.config import get_settings  # noqa: E402
from app.schemas.auth import UserRole  # noqa: E402
from app.utils.security import create_access_token  # noqa: E402


@pytest.fixture(scope="session")
def settings():
    get_settings.cache_clear()
    return get_settings()


@pytest.fixture
def mock_supabase():
    """
    A MagicMock standing in for the Supabase client. Individual tests
    configure `.table(...).select(...).execute.return_value` etc. as
    needed; this fixture just provides a fresh, chainable mock so tests
    don't talk to a real Supabase project.
    """
    client = MagicMock()
    return client


@pytest.fixture
def app(mock_supabase):
    from app.dependencies import get_supabase
    from app.main import create_app

    application = create_app()
    application.dependency_overrides[get_supabase] = lambda: mock_supabase
    return application


@pytest.fixture
def client(app):
    return TestClient(app)


def make_token(*, role: UserRole = UserRole.CITIZEN, user_id: str | None = None, settings=None) -> str:
    from app.config import get_settings as _get_settings

    settings = settings or _get_settings()
    return create_access_token(
        user_id=user_id or str(uuid.uuid4()),
        email="test@example.com",
        role=role,
        department_id=None,
        settings=settings,
    )


@pytest.fixture
def citizen_token(settings):
    return make_token(role=UserRole.CITIZEN, settings=settings)


@pytest.fixture
def worker_token(settings):
    return make_token(role=UserRole.WORKER, settings=settings)


@pytest.fixture
def admin_token(settings):
    return make_token(role=UserRole.ADMIN, settings=settings)


@pytest.fixture
def auth_headers(citizen_token):
    return {"Authorization": f"Bearer {citizen_token}"}


@pytest.fixture
def worker_auth_headers(worker_token):
    return {"Authorization": f"Bearer {worker_token}"}


@pytest.fixture
def admin_auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def sample_complaint_row():
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid.uuid4()),
        "complaint_number": "CMP-20260823-A1B2",
        "title": "Pothole on Main Street",
        "description": "There is a large dangerous pothole on Main Street near the school",
        "category": "pothole",
        "status": "submitted",
        "priority": "high",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "address": "Main Street",
        "citizen_id": str(uuid.uuid4()),
        "department_id": None,
        "assigned_worker_id": None,
        "duplicate_of": None,
        "sla_due_at": now,
        "created_at": now,
        "updated_at": now,
    }
