import uuid

import pytest
from jose import jwt

from app.schemas.auth import UserRole
from app.utils.security import create_access_token, hash_password, verify_password


class TestPasswordHashing:
    def test_hash_and_verify_round_trip(self):
        hashed = hash_password("SuperSecret123")
        assert verify_password("SuperSecret123", hashed)

    def test_wrong_password_fails(self):
        hashed = hash_password("SuperSecret123")
        assert not verify_password("WrongPassword", hashed)

    def test_hash_is_not_plaintext(self):
        hashed = hash_password("SuperSecret123")
        assert hashed != "SuperSecret123"


class TestTokenCreation:
    def test_access_token_contains_expected_claims(self, settings):
        user_id = str(uuid.uuid4())
        token = create_access_token(
            user_id=user_id,
            email="citizen@example.com",
            role=UserRole.CITIZEN,
            department_id=None,
            settings=settings,
        )
        decoded = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        assert decoded["sub"] == user_id
        assert decoded["email"] == "citizen@example.com"
        assert decoded["role"] == "citizen"
        assert decoded["type"] == "access"

    def test_worker_role_in_token(self, settings):
        token = create_access_token(
            user_id=str(uuid.uuid4()),
            email="worker@example.com",
            role=UserRole.WORKER,
            department_id=str(uuid.uuid4()),
            settings=settings,
        )
        decoded = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        assert decoded["role"] == "worker"
        assert decoded["department_id"] is not None


class TestAuthEndpoints:
    def test_register_new_user(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        created_id = str(uuid.uuid4())
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            {
                "id": created_id,
                "email": "new@example.com",
                "role": "citizen",
                "department_id": None,
            }
        ]

        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "new@example.com",
                "password": "StrongPass123",
                "full_name": "Jane Citizen",
            },
        )
        assert response.status_code == 201
        body = response.json()
        assert "access_token" in body
        assert "refresh_token" in body

    def test_register_duplicate_email_conflicts(self, client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": str(uuid.uuid4())}
        ]
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "existing@example.com",
                "password": "StrongPass123",
                "full_name": "Existing User",
            },
        )
        assert response.status_code == 409

    def test_me_requires_authentication(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_me_rejects_garbage_token(self, client):
        response = client.get(
            "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
        )
        assert response.status_code == 401
