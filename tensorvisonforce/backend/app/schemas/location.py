from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.complaints import GeoPoint


class ReverseGeocodeRequest(BaseModel):
    location: GeoPoint


class ReverseGeocodeResult(BaseModel):
    address: str
    ward: str | None = None
    zone: str | None = None
    city: str | None = None


class DistanceRequest(BaseModel):
    point_a: GeoPoint
    point_b: GeoPoint


class DistanceResult(BaseModel):
    meters: float


class DepartmentZone(BaseModel):
    department_id: UUID
    department_name: str
    zone_name: str
    center: GeoPoint
    radius_meters: float = Field(gt=0)


class ResolveDepartmentRequest(BaseModel):
    location: GeoPoint
    category: str
