"""
Resolves which department is responsible for a complaint.

Routing is category-first (e.g. only "Water Works" handles
water_leakage), then narrowed by geographic zone when a department is
split into zones (e.g. multiple "Roads" sub-teams per district). Falls
back to the first category-matching department with no zone restriction
if no zone matches -- better to land in a general queue than nowhere.
"""
from app.schemas.complaints import ComplaintCategory, GeoPoint
from app.schemas.location import DepartmentZone
from app.services.location import find_nearest_zone


class NoDepartmentFoundError(RuntimeError):
    pass


def resolve_department(
    *,
    category: ComplaintCategory,
    location: GeoPoint,
    zones: list[DepartmentZone],
    category_department_map: dict[ComplaintCategory, list[str]],
) -> str:
    """
    Args:
        zones: all known DepartmentZone rows (any department/category).
        category_department_map: department_id -> categories it handles,
            inverted here as category -> list of department_ids, so we can
            filter zones down to only departments that handle this category.
    Returns:
        department_id of the resolved department.
    """
    eligible_department_ids = set(category_department_map.get(category, []))
    if not eligible_department_ids:
        raise NoDepartmentFoundError(f"No department configured for category '{category.value}'")

    eligible_zones = [z for z in zones if str(z.department_id) in eligible_department_ids]

    if eligible_zones:
        nearest = find_nearest_zone(location, eligible_zones)
        if nearest is not None:
            return str(nearest.department_id)

    # No zone matched geographically (or no zones defined) -- fall back to
    # the first eligible department so the complaint is still routed.
    return next(iter(eligible_department_ids))


# Category → canonical department name (matches the names seeded in departments table)
_CATEGORY_TO_DEPARTMENT: dict[str, str] = {
    "pothole":       "Roads Department",
    "garbage":       "Sanitation Department",
    "streetlight":   "Electrical Department",
    "drainage":      "Drainage Department",
    "water_leakage": "Water Department",
    "other":         "General Civic Department",
}


def department_name_for_category(category: str) -> str:
    """
    Return the department name responsible for this complaint category.
    Falls back to 'General Civic Department' for unknown categories.
    """
    return _CATEGORY_TO_DEPARTMENT.get(category.lower(), "General Civic Department")
