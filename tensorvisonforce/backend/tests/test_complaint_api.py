"""
End-to-end tests for the /complaints endpoints.

Rather than mocking the Supabase client call-by-call (which gets brittle
fast since `MagicMock` can't distinguish `.table("complaints")` from
`.table("complaint_images")`), these tests use a small in-memory fake
that actually filters/inserts/updates a dict of table -> rows. It's not
a full SQL engine, just enough chain support (`select`, `eq`, `neq`,
`in_`, `insert`, `update`, `order`, `range`) to exercise the router
logic realistically.
"""
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient


class FakeResult:
    def __init__(self, data, count=None):
        self.data = data
        self.count = count


class FakeQueryBuilder:
    def __init__(self, store: dict, table_name: str):
        self.store = store
        self.table_name = table_name
        self._filtered = list(store.get(table_name, []))
        self._want_count = False
        self._mode = "select"
        self._payload = None

    def select(self, *args, count=None, **kwargs):
        self._mode = "select"
        self._want_count = count == "exact"
        return self

    def insert(self, data):
        self._mode = "insert"
        self._payload = data
        return self

    def update(self, data):
        self._mode = "update"
        self._payload = data
        return self

    def eq(self, field, value):
        self._filtered = [r for r in self._filtered if str(r.get(field)) == str(value)]
        return self

    def neq(self, field, value):
        self._filtered = [r for r in self._filtered if str(r.get(field)) != str(value)]
        return self

    def in_(self, field, values):
        values = {str(v) for v in values}
        self._filtered = [r for r in self._filtered if str(r.get(field)) in values]
        return self

    def order(self, *args, **kwargs):
        return self

    def range(self, *args, **kwargs):
        return self

    def execute(self):
        if self._mode == "insert":
            row = dict(self._payload)
            row.setdefault("id", str(uuid.uuid4()))
            self.store.setdefault(self.table_name, []).append(row)
            return FakeResult([row])

        if self._mode == "update":
            for row in self._filtered:
                row.update(self._payload)
            return FakeResult(self._filtered)

        count = len(self._filtered) if self._want_count else None
        return FakeResult(self._filtered, count)


class FakeSupabase:
    def __init__(self, initial: dict | None = None):
        self.store: dict = initial or {}

    def table(self, name: str) -> FakeQueryBuilder:
        return FakeQueryBuilder(self.store, name)


@pytest.fixture
def fake_supabase():
    return FakeSupabase({"complaints": [], "complaint_images": []})


@pytest.fixture
def api_app(fake_supabase):
    from app.dependencies import get_supabase
    from app.main import create_app

    application = create_app()
    application.dependency_overrides[get_supabase] = lambda: fake_supabase
    return application


@pytest.fixture
def api_client(api_app):
    return TestClient(api_app)


VALID_COMPLAINT_PAYLOAD = {
    "title": "Large pothole on Main Street",
    "description": "There is a large dangerous pothole on Main Street near the school",
    "location": {"latitude": 13.0827, "longitude": 80.2707},
    "address": "Main Street",
}


class TestCreateComplaint:
    def test_requires_authentication(self, api_client):
        response = api_client.post("/api/v1/complaints", json=VALID_COMPLAINT_PAYLOAD)
        assert response.status_code == 401

    def test_creates_complaint_and_classifies_it(self, api_client, auth_headers):
        response = api_client.post(
            "/api/v1/complaints", json=VALID_COMPLAINT_PAYLOAD, headers=auth_headers
        )
        assert response.status_code == 201
        body = response.json()
        assert body["category"] == "pothole"
        assert body["status"] == "submitted"
        assert body["title"] == VALID_COMPLAINT_PAYLOAD["title"]
        assert body["complaint_number"].startswith("CMP-")

    def test_second_similar_nearby_complaint_flagged_as_duplicate(self, api_client, auth_headers):
        first = api_client.post(
            "/api/v1/complaints", json=VALID_COMPLAINT_PAYLOAD, headers=auth_headers
        )
        assert first.status_code == 201

        second = api_client.post(
            "/api/v1/complaints",
            json={**VALID_COMPLAINT_PAYLOAD, "title": "Same pothole, still there"},
            headers=auth_headers,
        )
        assert second.status_code == 201
        assert second.json()["status"] == "duplicate"
        assert second.json()["duplicate_of"] == first.json()["id"]

    def test_rejects_short_title(self, api_client, auth_headers):
        response = api_client.post(
            "/api/v1/complaints",
            json={**VALID_COMPLAINT_PAYLOAD, "title": "Bad"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_rejects_invalid_latitude(self, api_client, auth_headers):
        response = api_client.post(
            "/api/v1/complaints",
            json={**VALID_COMPLAINT_PAYLOAD, "location": {"latitude": 999, "longitude": 80.27}},
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestListAndGetComplaints:
    def test_citizen_sees_only_own_complaints(self, api_client, auth_headers, worker_auth_headers):
        api_client.post("/api/v1/complaints", json=VALID_COMPLAINT_PAYLOAD, headers=auth_headers)

        own_list = api_client.get("/api/v1/complaints", headers=auth_headers)
        assert own_list.status_code == 200
        assert own_list.json()["total"] == 1

    def test_worker_sees_all_complaints(self, api_client, auth_headers, worker_auth_headers):
        api_client.post("/api/v1/complaints", json=VALID_COMPLAINT_PAYLOAD, headers=auth_headers)

        worker_list = api_client.get("/api/v1/complaints", headers=worker_auth_headers)
        assert worker_list.status_code == 200
        assert worker_list.json()["total"] == 1

    def test_get_own_complaint_succeeds(self, api_client, auth_headers):
        created = api_client.post(
            "/api/v1/complaints", json=VALID_COMPLAINT_PAYLOAD, headers=auth_headers
        ).json()
        response = api_client.get(f"/api/v1/complaints/{created['id']}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == created["id"]

    def test_get_nonexistent_complaint_404s(self, api_client, auth_headers):
        response = api_client.get(f"/api/v1/complaints/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_citizen_cannot_view_another_citizens_complaint(self, api_client, auth_headers):
        from tests.conftest import make_token

        created = api_client.post(
            "/api/v1/complaints", json=VALID_COMPLAINT_PAYLOAD, headers=auth_headers
        ).json()

        other_token = make_token()
        other_headers = {"Authorization": f"Bearer {other_token}"}
        response = api_client.get(f"/api/v1/complaints/{created['id']}", headers=other_headers)
        assert response.status_code == 403


class TestChangeStatus:
    def test_worker_can_advance_valid_status(self, api_client, auth_headers, worker_auth_headers):
        created = api_client.post(
            "/api/v1/complaints", json=VALID_COMPLAINT_PAYLOAD, headers=auth_headers
        ).json()

        response = api_client.patch(
            f"/api/v1/complaints/{created['id']}/status",
            json={"new_status": "verified"},
            headers=worker_auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "verified"

    def test_invalid_status_transition_rejected(self, api_client, auth_headers, worker_auth_headers):
        created = api_client.post(
            "/api/v1/complaints", json=VALID_COMPLAINT_PAYLOAD, headers=auth_headers
        ).json()

        response = api_client.patch(
            f"/api/v1/complaints/{created['id']}/status",
            json={"new_status": "resolved"},  # can't jump straight from submitted
            headers=worker_auth_headers,
        )
        assert response.status_code == 400

    def test_citizen_cannot_change_status(self, api_client, auth_headers):
        created = api_client.post(
            "/api/v1/complaints", json=VALID_COMPLAINT_PAYLOAD, headers=auth_headers
        ).json()

        response = api_client.patch(
            f"/api/v1/complaints/{created['id']}/status",
            json={"new_status": "verified"},
            headers=auth_headers,
        )
        assert response.status_code == 403
