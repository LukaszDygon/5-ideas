"""Core JSON API under /api (prototype-specific endpoints live with their prototypes)."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from showcase import db
from showcase.config import Settings


def app_settings(request: Request) -> Settings:
    return request.app.state.settings


SettingsDep = Annotated[Settings, Depends(app_settings)]

router = APIRouter(prefix="/api")


class IdeaIn(BaseModel):
    idea_number: int
    title: str
    tagline: str | None = ""
    description: str | None = ""
    tags: str | None = ""
    icon: str | None = "lightbulb"
    is_implemented: bool | None = False
    implementation: dict[str, Any] | None = None


class DayIn(BaseModel):
    date: str
    theme: str
    subtitle: str | None = ""
    streak_count: int | None = 1
    notes: str | None = ""
    ideas: list[IdeaIn]


class RankUpdate(BaseModel):
    rank: int


@router.get("/days", response_model=list[dict[str, Any]])
def api_get_days(settings: SettingsDep):
    return db.get_all_days(settings.db_file)


@router.get("/days/{date_str}")
def api_get_day(date_str: str, settings: SettingsDep):
    day = db.get_day_by_date(date_str, settings.db_file)
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    return day


@router.post("/days")
def api_create_day(day_in: DayIn, settings: SettingsDep):
    day_id = db.save_day(
        date_str=day_in.date,
        theme=day_in.theme,
        subtitle=day_in.subtitle or "",
        streak_count=day_in.streak_count or 1,
        notes=day_in.notes or "",
        ideas_data=[idea.model_dump() for idea in day_in.ideas],
        db_path=settings.db_file,
    )
    return {"status": "success", "day_id": day_id, "date": day_in.date}


@router.get("/implementations")
def api_get_ranked_implementations(settings: SettingsDep):
    return db.get_ranked_implementations(settings.db_file)


@router.put("/implementations/{impl_id}/rank")
def api_update_rank(impl_id: int, payload: RankUpdate, settings: SettingsDep):
    db.update_implementation_rank(impl_id, payload.rank, settings.db_file)
    return {"status": "success", "impl_id": impl_id, "new_rank": payload.rank}
