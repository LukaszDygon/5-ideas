"""Paths and settings.

`Settings` is plain data passed explicitly to the app, the CLI and the static build.
Only `Settings.from_env()` reads the environment (the variables in ENV_VARS), for the
dev server and the CLI defaults; tests construct `Settings` directly.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = ROOT / "templates"
STATIC_DIR = ROOT / "static"
DEFAULT_DATA_DIR = ROOT / "data"
DEFAULT_PROTOTYPES_DIR = ROOT / "prototypes"
DIST_DIR = ROOT / "dist"

# The only environment variables the app reads (all optional).
ENV_VARS = ("FIVE_IDEAS_DATA_DIR", "FIVE_IDEAS_PROTOTYPES_DIR", "HOUSE_STATS_DIR")

DB_FILENAME = "ideas.db"
SEED_FILENAME = "ideas.json"
STREAK_FILENAME = "streak.json"


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    house_stats_dir: Path | None = None
    prototypes_dir: Path = DEFAULT_PROTOTYPES_DIR
    hosted: bool = False  # True while freezing the static site: admin links are hidden

    @property
    def db_file(self) -> Path:
        return self.data_dir / DB_FILENAME

    @property
    def seed_file(self) -> Path:
        return self.data_dir / SEED_FILENAME

    @property
    def streak_file(self) -> Path:
        return self.data_dir / STREAK_FILENAME

    @classmethod
    def from_env(cls) -> Settings:
        house_stats = os.environ.get("HOUSE_STATS_DIR")
        return cls(
            data_dir=Path(os.environ.get("FIVE_IDEAS_DATA_DIR") or DEFAULT_DATA_DIR),
            house_stats_dir=Path(house_stats) if house_stats else None,
            prototypes_dir=Path(os.environ.get("FIVE_IDEAS_PROTOTYPES_DIR") or DEFAULT_PROTOTYPES_DIR),
        )


def get_settings() -> Settings:
    return Settings.from_env()
