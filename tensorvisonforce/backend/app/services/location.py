"""
Geospatial helpers: distance calculation, reverse geocoding, and mapping
a complaint's coordinates to the responsible municipal department/zone.

Reverse geocoding here is a thin wrapper meant to call an external
provider (e.g. Google Maps, Mapbox, OpenStreetMap Nominatim) via the
Supabase edge function or a direct HTTP call. It's left as an
integration point (`reverse_geocode`) rather than hardwired to one
vendor, since that choice is deployment-specific.
"""
import math

import httpx

from app.schemas.complaints import GeoPoint
from app.schemas.location import DepartmentZone, ReverseGeocodeResult

EARTH_RADIUS_METERS = 6_371_000


def haversine_distance_meters(a: GeoPoint, b: GeoPoint) -> float:
    lat1, lon1 = math.radians(a.latitude), math.radians(a.longitude)
    lat2, lon2 = math.radians(b.latitude), math.radians(b.longitude)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    h = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(min(1.0, math.sqrt(h)))
    return EARTH_RADIUS_METERS * c


def is_within_radius(a: GeoPoint, b: GeoPoint, radius_meters: float) -> bool:
    return haversine_distance_meters(a, b) <= radius_meters


async def reverse_geocode(
    point: GeoPoint, *, provider_url: str | None = None, api_key: str | None = None
) -> ReverseGeocodeResult:
    """
    Reverse-geocodes coordinates into a human-readable address.

    If no provider is configured, falls back to a coordinate-only address
    string so the rest of the pipeline (which expects an `address` field)
    keeps working in local/dev environments without an API key.
    """
    if not provider_url:
        return ReverseGeocodeResult(
            address=f"{point.latitude:.5f}, {point.longitude:.5f}",
            ward=None,
            zone=None,
            city=None,
        )

    params = {"lat": point.latitude, "lon": point.longitude}
    if api_key:
        params["key"] = api_key

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(provider_url, params=params)
        response.raise_for_status()
        data = response.json()

    return ReverseGeocodeResult(
        address=data.get("address", f"{point.latitude:.5f}, {point.longitude:.5f}"),
        ward=data.get("ward"),
        zone=data.get("zone"),
        city=data.get("city"),
    )


def find_nearest_zone(
    point: GeoPoint, zones: list[DepartmentZone]
) -> DepartmentZone | None:
    """Picks the zone whose center is nearest and within its own radius."""
    candidates = [
        (haversine_distance_meters(point, zone.center), zone)
        for zone in zones
        if haversine_distance_meters(point, zone.center) <= zone.radius_meters
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda pair: pair[0])
    return candidates[0][1]
