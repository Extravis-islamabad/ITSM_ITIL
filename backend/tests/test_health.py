"""
Basic health check tests for the ITSM Platform API.
"""
import pytest
from fastapi.testclient import TestClient


def test_health_endpoint():
    """Test that the health endpoint returns a healthy status."""
    from app.main import app
    client = TestClient(app)

    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_api_health_endpoint():
    """Test that the API health endpoint returns version info."""
    from app.main import app
    client = TestClient(app)

    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_root_endpoint():
    """Test that the root endpoint returns API info."""
    from app.main import app
    client = TestClient(app)

    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "ITSM" in data["message"]
