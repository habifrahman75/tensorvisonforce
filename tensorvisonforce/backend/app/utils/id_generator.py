"""
Generates human-friendly, sortable complaint numbers, e.g. CMP-20260823-A3F9.

Format:  CMP-YYYYMMDD-XXXX
  - YYYYMMDD: UTC date of creation, keeps numbers roughly chronological
  - XXXX: 4-char uppercase hex from a random suffix, avoids collisions
          within the same day without needing a DB round-trip to compute
"""
import secrets
from datetime import datetime, timezone

PREFIX = "CMP"


def generate_complaint_number(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    date_part = now.strftime("%Y%m%d")
    suffix = secrets.token_hex(2).upper()  # 4 hex chars
    return f"{PREFIX}-{date_part}-{suffix}"
