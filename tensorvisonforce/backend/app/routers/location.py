from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from app.dependencies import get_current_active_user, get_supabase
from app.schemas.location import (
    DistanceRequest,
    DistanceResult,
    ResolveDepartmentRequest,
    ReverseGeocodeRequest,
    ReverseGeocodeResult,
)
from app.services import location as location_service
from app.services.department import department_name_for_category

router = APIRouter(prefix="/location", tags=["location"])


@router.post("/reverse-geocode", response_model=ReverseGeocodeResult)
async def reverse_geocode(payload: ReverseGeocodeRequest):
    return await location_service.reverse_geocode(payload.location)


@router.post("/distance", response_model=DistanceResult)
def distance(payload: DistanceRequest):
    meters = location_service.haversine_distance_meters(payload.point_a, payload.point_b)
    return DistanceResult(meters=round(meters, 2))


@router.post("/resolve-department")
def resolve_department_endpoint(
    payload: ResolveDepartmentRequest,
    supabase: Client = Depends(get_supabase),
    _current_user=Depends(get_current_active_user),
):
    department_name = department_name_for_category(payload.category)
    result = supabase.table("departments").select("id, name").eq("name", department_name).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department '{department_name}' not found. Has supabase/migrations/001 been run?",
        )
    return {"department_id": result.data[0]["id"], "department_name": department_name}