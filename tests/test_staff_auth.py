import copy
import importlib
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient

spec = importlib.util.spec_from_file_location(
    "activities_app", Path(__file__).parents[1] / "src" / "app.py"
)
app_module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = app_module
spec.loader.exec_module(app_module)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("STAFF_USERNAME", "teacher")
    monkeypatch.setenv("STAFF_PASSWORD", "test-password")
    monkeypatch.setattr(app_module, "activities", copy.deepcopy(app_module.activities))
    with TestClient(app_module.app) as test_client:
        yield test_client


def test_activities_and_rosters_remain_public(client):
    response = client.get("/activities")

    assert response.status_code == 200
    assert "participants" in response.json()["Chess Club"]


def test_anonymous_users_cannot_signup_or_unregister(client):
    signup_response = client.post(
        "/activities/Chess%20Club/signup",
        params={"email": "student-test@mergington.edu"},
    )
    unregister_response = client.delete(
        "/activities/Chess%20Club/unregister",
        params={"email": "michael@mergington.edu"},
    )

    assert signup_response.status_code == 401
    assert unregister_response.status_code == 401


def test_staff_can_manage_signups_until_logout(client):
    login_response = client.post(
        "/auth/login",
        json={"username": "teacher", "password": "test-password"},
    )
    signup_response = client.post(
        "/activities/Chess%20Club/signup",
        params={"email": "student-test@mergington.edu"},
    )

    assert login_response.status_code == 200
    assert signup_response.status_code == 200
    assert "student-test@mergington.edu" in client.get("/activities").json()["Chess Club"]["participants"]

    unregister_response = client.delete(
        "/activities/Chess%20Club/unregister",
        params={"email": "student-test@mergington.edu"},
    )
    assert unregister_response.status_code == 200
    assert "student-test@mergington.edu" not in client.get("/activities").json()["Chess Club"]["participants"]

    logout_response = client.post("/auth/logout")
    denied_response = client.delete(
        "/activities/Chess%20Club/unregister",
        params={"email": "student-test@mergington.edu"},
    )

    assert logout_response.status_code == 200
    assert denied_response.status_code == 401


def test_invalid_credentials_do_not_create_staff_session(client):
    login_response = client.post(
        "/auth/login",
        json={"username": "teacher", "password": "wrong-password"},
    )
    signup_response = client.post(
        "/activities/Chess%20Club/signup",
        params={"email": "student-test@mergington.edu"},
    )

    assert login_response.status_code == 401
    assert signup_response.status_code == 401


def test_staff_login_requires_environment_configuration(client, monkeypatch):
    monkeypatch.delenv("STAFF_USERNAME")

    response = client.post(
        "/auth/login",
        json={"username": "teacher", "password": "test-password"},
    )

    assert response.status_code == 503