"""
Database layer for 5 Ideas Daily Showcase.
Using Python stdlib sqlite3 (Ponytail rule: stdlib first).
"""

from __future__ import annotations

import json
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_FILE = Path(__file__).parent / "ideas.db"


def get_db(db_path: Path | str | None = None) -> sqlite3.Connection:
    path = db_path or DB_FILE
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db(db_path: Path | str | None = None) -> None:
    conn = get_db(db_path)
    with conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS days (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                theme TEXT NOT NULL,
                subtitle TEXT DEFAULT '',
                streak_count INTEGER DEFAULT 1,
                notes TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ideas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day_id INTEGER NOT NULL REFERENCES days(id) ON DELETE CASCADE,
                idea_number INTEGER NOT NULL CHECK (idea_number BETWEEN 1 AND 5),
                title TEXT NOT NULL,
                tagline TEXT DEFAULT '',
                description TEXT DEFAULT '',
                tags TEXT DEFAULT '',
                icon TEXT DEFAULT 'lightbulb',
                is_implemented INTEGER DEFAULT 0,
                UNIQUE(day_id, idea_number)
            );

            CREATE TABLE IF NOT EXISTS implementations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                idea_id INTEGER UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                build_type TEXT NOT NULL CHECK (build_type IN ('webapp', 'poetry', 'song', 'image', 'interactive')),
                rank INTEGER NOT NULL DEFAULT 999,
                summary TEXT DEFAULT '',
                content TEXT DEFAULT '',
                external_url TEXT DEFAULT '',
                time_spent_hours REAL DEFAULT 4.0,
                ai_tools_used TEXT DEFAULT '',
                process_steps TEXT DEFAULT '[]',
                what_rocked TEXT DEFAULT '[]',
                what_broke TEXT DEFAULT '[]',
                prompt_transcript TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_days_date ON days(date);
            CREATE INDEX IF NOT EXISTS idx_impl_rank ON implementations(rank);
            CREATE INDEX IF NOT EXISTS idx_ideas_day ON ideas(day_id);
            """
        )
    conn.close()


def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    for json_field in ("process_steps", "what_rocked", "what_broke"):
        if json_field in d and isinstance(d[json_field], str):
            try:
                d[json_field] = json.loads(d[json_field])
            except Exception:
                pass
    return d


def get_all_days(db_path: Path | str | None = None) -> List[Dict[str, Any]]:
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM days ORDER BY date DESC")
    days_rows = cursor.fetchall()

    days = []
    for d_row in days_rows:
        day_dict = row_to_dict(d_row)
        cursor.execute("SELECT * FROM ideas WHERE day_id = ? ORDER BY idea_number ASC", (day_dict["id"],))
        ideas_rows = cursor.fetchall()
        ideas = []
        for i_row in ideas_rows:
            i_dict = row_to_dict(i_row)
            cursor.execute("SELECT * FROM implementations WHERE idea_id = ?", (i_dict["id"],))
            impl_row = cursor.fetchone()
            i_dict["implementation"] = row_to_dict(impl_row) if impl_row else None
            ideas.append(i_dict)
        day_dict["ideas"] = ideas
        day_dict["implemented_idea"] = next((i for i in ideas if i["is_implemented"] and i["implementation"]), None)
        days.append(day_dict)
    conn.close()
    return days


def get_day_by_date(date_str: str, db_path: Path | str | None = None) -> Optional[Dict[str, Any]]:
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM days WHERE date = ?", (date_str,))
    day_row = cursor.fetchone()
    if not day_row:
        conn.close()
        return None

    day_dict = row_to_dict(day_row)
    cursor.execute("SELECT * FROM ideas WHERE day_id = ? ORDER BY idea_number ASC", (day_dict["id"],))
    ideas_rows = cursor.fetchall()
    ideas = []
    for i_row in ideas_rows:
        i_dict = row_to_dict(i_row)
        cursor.execute("SELECT * FROM implementations WHERE idea_id = ?", (i_dict["id"],))
        impl_row = cursor.fetchone()
        i_dict["implementation"] = row_to_dict(impl_row) if impl_row else None
        ideas.append(i_dict)
    day_dict["ideas"] = ideas
    day_dict["implemented_idea"] = next((i for i in ideas if i["is_implemented"] and i["implementation"]), None)
    conn.close()
    return day_dict


def get_ranked_implementations(db_path: Path | str | None = None) -> List[Dict[str, Any]]:
    """Returns all implementations ordered by rank ascending (1 is best)."""
    conn = get_db(db_path)
    cursor = conn.cursor()
    query = """
        SELECT 
            impl.*,
            ideas.title AS idea_title,
            ideas.tagline AS idea_tagline,
            ideas.tags AS idea_tags,
            ideas.icon AS idea_icon,
            days.date AS day_date,
            days.theme AS day_theme,
            days.streak_count AS day_streak
        FROM implementations impl
        JOIN ideas ON impl.idea_id = ideas.id
        JOIN days ON ideas.day_id = days.id
        ORDER BY impl.rank ASC, impl.id DESC
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    result = [row_to_dict(r) for r in rows]
    conn.close()
    return result


def get_calendar_days(
    year: int, month: int, db_path: Path | str | None = None
) -> List[Dict[str, Any]]:
    """Returns day entries for a given year & month for calendar rendering."""
    prefix = f"{year:04d}-{month:02d}-%"
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT 
            d.date, d.theme, d.streak_count,
            COUNT(i.id) AS idea_count,
            MAX(CASE WHEN i.is_implemented = 1 THEN 1 ELSE 0 END) AS has_implementation,
            MAX(CASE WHEN i.is_implemented = 1 THEN imp.title ELSE NULL END) AS impl_title,
            MAX(CASE WHEN i.is_implemented = 1 THEN imp.build_type ELSE NULL END) AS impl_type,
            MAX(CASE WHEN i.is_implemented = 1 THEN imp.rank ELSE NULL END) AS impl_rank
        FROM days d
        LEFT JOIN ideas i ON d.id = i.day_id
        LEFT JOIN implementations imp ON i.id = imp.idea_id
        WHERE d.date LIKE ?
        GROUP BY d.id
        ORDER BY d.date ASC
        """,
        (prefix,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_day(
    date_str: str,
    theme: str,
    subtitle: str = "",
    streak_count: int = 1,
    notes: str = "",
    ideas_data: Optional[List[Dict[str, Any]]] = None,
    db_path: Path | str | None = None,
) -> int:
    """Creates or updates a day with its 5 ideas and implementation atomically."""
    conn = get_db(db_path)
    with conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO days (date, theme, subtitle, streak_count, notes)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                theme = excluded.theme,
                subtitle = excluded.subtitle,
                streak_count = excluded.streak_count,
                notes = excluded.notes
            """,
            (date_str, theme, subtitle, streak_count, notes),
        )
        cursor.execute("SELECT id FROM days WHERE date = ?", (date_str,))
        day_id = cursor.fetchone()[0]

        if ideas_data:
            cursor.execute("DELETE FROM ideas WHERE day_id = ?", (day_id,))
            for item in ideas_data:
                idea_num = int(item.get("idea_number", 1))
                title = item.get("title", f"Idea #{idea_num}")
                tagline = item.get("tagline", "")
                description = item.get("description", "")
                tags = item.get("tags", "")
                icon = item.get("icon", "lightbulb")
                is_impl = 1 if item.get("is_implemented") else 0

                cursor.execute(
                    """
                    INSERT INTO ideas (day_id, idea_number, title, tagline, description, tags, icon, is_implemented)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (day_id, idea_num, title, tagline, description, tags, icon, is_impl),
                )
                idea_id = cursor.lastrowid

                if is_impl and item.get("implementation"):
                    impl = item["implementation"]
                    proc_steps = json.dumps(impl.get("process_steps", []))
                    rocked = json.dumps(impl.get("what_rocked", []))
                    broke = json.dumps(impl.get("what_broke", []))

                    cursor.execute(
                        """
                        INSERT INTO implementations (
                            idea_id, title, build_type, rank, summary, content,
                            external_url, time_spent_hours, ai_tools_used,
                            process_steps, what_rocked, what_broke, prompt_transcript
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            idea_id,
                            impl.get("title", title),
                            impl.get("build_type", "webapp"),
                            int(impl.get("rank", 999)),
                            impl.get("summary", ""),
                            impl.get("content", ""),
                            impl.get("external_url", ""),
                            float(impl.get("time_spent_hours", 4.0)),
                            impl.get("ai_tools_used", ""),
                            proc_steps,
                            rocked,
                            broke,
                            impl.get("prompt_transcript", ""),
                        ),
                    )
    conn.close()
    return day_id


def update_implementation_rank(impl_id: int, new_rank: int, db_path: Path | str | None = None) -> None:
    conn = get_db(db_path)
    with conn:
        conn.execute("UPDATE implementations SET rank = ? WHERE id = ?", (new_rank, impl_id))
    conn.close()


def reorder_ranks(ordered_impl_ids: List[int], db_path: Path | str | None = None) -> None:
    conn = get_db(db_path)
    with conn:
        for index, impl_id in enumerate(ordered_impl_ids, start=1):
            conn.execute("UPDATE implementations SET rank = ? WHERE id = ?", (index, impl_id))
    conn.close()


def delete_day(day_id: int, db_path: Path | str | None = None) -> None:
    conn = get_db(db_path)
    with conn:
        conn.execute("DELETE FROM days WHERE id = ?", (day_id,))
    conn.close()


def seed_demo_data(db_path: Path | str | None = None) -> None:
    """Seeds rich 90s Memphis demo content reflecting the Stitch showcase designs."""
    init_db(db_path)
    conn = get_db(db_path)
    with conn:
        conn.execute("DELETE FROM days;")
    conn.close()

    # Day 1: Today - 90s Audio & Hardware Nostalgia (Webapp)
    day1_date = datetime.now().strftime("%Y-%m-%d")
    save_day(
        date_str=day1_date,
        theme="90s Audio & Hardware Nostalgia",
        subtitle="Tangible physical knobs, arcade cabinets, and neon cassette soundscapes",
        streak_count=142,
        notes="Spawned at 7:15 AM over black coffee and synthwave.",
        ideas_data=[
            {
                "idea_number": 1,
                "title": "PixelSynth 16-bit",
                "tagline": "Chiptune tracker in the browser",
                "description": "Generates retro MIDI riffs and Game Boy sound effects directly in the Web Audio API.",
                "tags": "Audio, 16-Bit, Chiptune",
                "icon": "music_note",
                "is_implemented": False,
            },
            {
                "idea_number": 2,
                "title": "Cassette GPT",
                "tagline": "Tape-deck memory assistant",
                "description": "Voice memos rewind with tape screech sound effects and transcribe with punchy 90s zine formatting.",
                "tags": "Voice, AI, Retro",
                "icon": "mic",
                "is_implemented": False,
            },
            {
                "idea_number": 3,
                "title": "NeonDJ: 90s Turntable & Synth Matrix",
                "tagline": "Dual vinyl scratch deck & generative techno box",
                "description": "Interactive dual rotating vinyl decks with real pitch shift, tactile 7-band EQ sliders, and generative AI sample prompt triggers.",
                "tags": "Web Audio, Generative, Vinyl, Canvas",
                "icon": "album",
                "is_implemented": True,
                "implementation": {
                    "title": "NeonDJ: 90s Turntable & Synth Matrix",
                    "build_type": "webapp",
                    "rank": 1,
                    "summary": "Dual interactive vinyl decks with real Web Audio pitch scratching, responsive 70s/90s EQ visualizer, and promptable AI BPM triggers.",
                    "content": "/interactive/neondj",
                    "external_url": "https://github.com/lukaszdygon/5-ideas-neondj",
                    "time_spent_hours": 4.5,
                    "ai_tools_used": "Gemini 2.5 Flash, Web Audio API, Canvas 2D, Bricolage Grotesque",
                    "process_steps": [
                        {"step": 1, "title": "BPM Clock & Audio Context", "desc": "Wrote precision Web Audio scheduling loop with 120-145 BPM tempo slider."},
                        {"step": 2, "title": "Interactive Turntable Physics", "desc": "Implemented touch/drag angular momentum physics for vinyl scratching."},
                        {"step": 3, "title": "Memphis Canvas Equalizer", "desc": "Crafted 7 chunky colored EQ visualizer columns pulsing to synthetic audio peaks."},
                        {"step": 4, "title": "Live Sample Prompting", "desc": "Hooked synth sound synthesis with preset hotkeys 1-8 for instant breakbeats."}
                    ],
                    "what_rocked": [
                        "Real turntable drag scratching worked without latency using AudioBufferSourceNode.playbackRate.",
                        "Radical Memphis color scheme made the hardware sliders feel like a real Roland groovebox.",
                        "Zero external audio libraries required: 100% native browser Web Audio API."
                    ],
                    "what_broke": [
                        "Safari initially muted AudioContext on page load before first explicit pointer gesture.",
                        "Rotational momentum math clipped on rapid reverse scratching, requiring velocity clamping."
                    ],
                    "prompt_transcript": "User: Build me a 90s MTV-style turntable in HTML/JS with playable vinyl and acid neon EQ bars.\nAgent: Implemented Web Audio oscillator nodes and canvas rotational drag..."
                },
            },
            {
                "idea_number": 4,
                "title": "FloppyCloud P2P",
                "tagline": "1.44MB ephemeral micro-sharing",
                "description": "Send files chunked strictly into 1.44MB virtual floppy disks with retro floppy drive spinning sounds.",
                "tags": "P2P, WebRTC, Storage",
                "icon": "save",
                "is_implemented": False,
            },
            {
                "idea_number": 5,
                "title": "Tamagotchi Commit Bot",
                "tagline": "Keep your pixel pet alive with git commits",
                "description": "A desktop pixel critter that thrives on clean git branches and gets hungry if you stop coding for 12 hours.",
                "tags": "CLI, Pixel Art, Productivity",
                "icon": "pets",
                "is_implemented": False,
            },
        ],
        db_path=db_path,
    )

    # Day 2: Yesterday - Neo-Brutalist Digital Poetry & Zines (Poetry)
    day2_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    save_day(
        date_str=day2_date,
        theme="Neo-Brutalist Digital Poetry & Zines",
        subtitle="Raw verses on silicon, coffee, late-night compiles, and prompt fatigue",
        streak_count=141,
        notes="Generated at midnight as an antidote to monotone documentation.",
        ideas_data=[
            {
                "idea_number": 1,
                "title": "Haiku Linter",
                "tagline": "Syntax errors formatted as 5-7-5 syllables",
                "description": "Translates compiler errors into calming Japanese poetry.",
                "tags": "Poetry, Linter",
                "icon": "edit_note",
                "is_implemented": False,
            },
            {
                "idea_number": 2,
                "title": "Silicon Sonnets for the Broken Build",
                "tagline": "An ode to the missing semicolon at 3 AM",
                "description": "Fourteen-line rhymed poem celebrating the agony and ecstasy of shipping solo code.",
                "tags": "Poetry, Literature, Zine",
                "icon": "auto_stories",
                "is_implemented": True,
                "implementation": {
                    "title": "Silicon Sonnets for the Broken Build",
                    "build_type": "poetry",
                    "rank": 2,
                    "summary": "A 14-line neo-brutalist tech sonnet on late-night debugging and ephemeral caffeine clarity.",
                    "content": """The terminal glows cyan on my face,
A trailing comma brings the server down.
Three hundred lines of memory misplaced,
While midnight settles heavy on the town.

No venture checks will bail out this defect,
No standup sync will smooth the jagged seam;
Just raw assembly I forgot to check,
And floating promises that break the stream.

Yet in the silent crucible of test,
A single green checkmark ignites the screen.
The linter quiets down, the threads at rest,
The fastest binary I've ever seen.

So close the laptop as the sun breaks white:
We shipped another prototype tonight.""",
                    "external_url": "",
                    "time_spent_hours": 1.2,
                    "ai_tools_used": "Claude 3.7 Sonnet, RhymeZone, Markdown Typography",
                    "process_steps": [
                        {"step": 1, "title": "Meter & Rhyme Scheme Selection", "desc": "Chose strict Shakespearean ABAB CDCD EFEF GG iambic pentameter."},
                        {"step": 2, "title": "Developer Vocabulary Fusion", "desc": "Blended classical poetic imagery with raw developer realities (pointers, linters, green checks)."},
                        {"step": 3, "title": "Typography Formatting", "desc": "Pared the poem into a heavy black-bordered zine parchment card."}
                    ],
                    "what_rocked": ["Iambic pentameter landed cleanly without forced tech jargon."],
                    "what_broke": ["Initial draft had 11 syllables on line 4, trimmed for cadence."],
                    "prompt_transcript": "User: Write a 14-line classic sonnet about shipping code alone at 3am."
                },
            },
            {
                "idea_number": 3,
                "title": "Ode to the Staged Commit",
                "tagline": "Elegiac verses for unmerged branches",
                "description": "Stanzas on features abandoned in stash.",
                "tags": "Git, Verse",
                "icon": "code",
                "is_implemented": False,
            },
            {
                "idea_number": 4,
                "title": "Concrete Typography Terminal",
                "tagline": "Shape poems built of ASCII code brackets",
                "description": "Poems arranged as hourglasses and cassette tapes in monospace font.",
                "tags": "ASCII, Concrete Poetry",
                "icon": "terminal",
                "is_implemented": False,
            },
            {
                "idea_number": 5,
                "title": "Zine Generator v1",
                "tagline": "Foldable 8-page one-sheet printout",
                "description": "Prints a pocket-sized physical mini-zine from any blog post.",
                "tags": "Print, Zine, PDF",
                "icon": "menu_book",
                "is_implemented": False,
            },
        ],
        db_path=db_path,
    )

    # Day 3: Two days ago - Generative Visual Toys (Image)
    day3_date = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
    save_day(
        date_str=day3_date,
        theme="Generative 90s Memphis Poster Studio",
        subtitle="Asymmetrical pop shapes, confetti sprinkle math, and bold graphic posters",
        streak_count=140,
        notes="Explored SVG math for Memphis confetti patterns.",
        ideas_data=[
            {
                "idea_number": 1,
                "title": "Memphis Squiggle Studio",
                "tagline": "Algorithmic neo-pop poster generator",
                "description": "Renders high-resolution vector posters with randomized 90s geometric confetti, squiggles, and 3D isometric cubes.",
                "tags": "Generative Art, SVG, Memphis",
                "icon": "brush",
                "is_implemented": True,
                "implementation": {
                    "title": "Memphis Squiggle Studio",
                    "build_type": "image",
                    "rank": 3,
                    "summary": "Procedural Memphis Art poster studio rendering randomized vector squiggles, confetti dots, and neo-pop typography.",
                    "content": "/static/images/memphis_poster.svg",
                    "external_url": "",
                    "time_spent_hours": 3.0,
                    "ai_tools_used": "Gemini 2.5 Flash, SVG DOM, Math.random() seed",
                    "process_steps": [
                        {"step": 1, "title": "Geometric Primitives Generator", "desc": "Calculated Bézier squiggles, triangles, and donut rings."},
                        {"step": 2, "title": "Palette Harmonizer", "desc": "Locked color randomization to saturated Hot Pink, Electric Cyan, Sunshine Yellow, and Pitch Black."},
                        {"step": 3, "title": "Vector Export", "desc": "Added instant 4K SVG and PNG download triggers."}
                    ],
                    "what_rocked": ["Pure SVG math with zero canvas rasterization dependencies."],
                    "what_broke": ["Overlapping shapes sometimes created visual mud until distance clamping was added."],
                    "prompt_transcript": "User: Create a procedural Memphis art generator using SVG."
                },
            },
            {
                "idea_number": 2,
                "title": "Halftone Dot Camera",
                "tagline": "Live comic book camera filter",
                "description": "WebGL shader converting webcam feed into Lichtenstein comic dots in real time.",
                "tags": "WebGL, Shader, Comic",
                "icon": "camera_alt",
                "is_implemented": False,
            },
            {
                "idea_number": 3,
                "title": "Retro Sticker Machine",
                "tagline": "Die-cut sticker previewer with holographic foil",
                "description": "Upload a PNG and see it as a peelable vinyl sticker with shiny metallic specular highlight.",
                "tags": "3D, Shaders, Stickers",
                "icon": "loyalty",
                "is_implemented": False,
            },
            {
                "idea_number": 4,
                "title": "Arcade Cabinet Mockup Rig",
                "tagline": "Frame screenshots inside an 80s arcade bezel",
                "description": "Adds CRT scanlines and curved glare to web app screenshots.",
                "tags": "Mockup, Retro, CRT",
                "icon": "sports_esports",
                "is_implemented": False,
            },
            {
                "idea_number": 5,
                "title": "Font Squeezer",
                "tagline": "Extreme variable typography animator",
                "description": "Rubber-band physics for letterforms reacting to cursor velocity.",
                "tags": "Typography, Physics",
                "icon": "text_fields",
                "is_implemented": False,
            },
        ],
        db_path=db_path,
    )

    # Day 4: Three days ago - AI Synth Chiptune Rhythms (Song)
    day4_date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
    save_day(
        date_str=day4_date,
        theme="AI Synth Chiptune Rhythms",
        subtitle="FM synthesis, pulse-width modulation, and 8-bit dance anthems",
        streak_count=139,
        notes="Wrote a procedural 4-channel sound synthesizer in pure Python/JS.",
        ideas_data=[
            {
                "idea_number": 1,
                "title": "GameBoy FM Jammer",
                "tagline": "Procedural 8-bit boss fight anthem",
                "description": "Algorithmic chiptune anthem with triangle bassline, 50% pulse lead, and noise snare bursts.",
                "tags": "Song, Chiptune, FM Synthesis",
                "icon": "headphones",
                "is_implemented": True,
                "implementation": {
                    "title": "Neon Skyline (8-Bit Summer Anthem)",
                    "build_type": "song",
                    "rank": 4,
                    "summary": "Upbeat 135 BPM retro chiptune song generated with algorithmic FM synthesis and dual pulse-wave leads.",
                    "content": "AUDIO_SYNTH:BPM135:AMajor:PulseWaveLead",
                    "external_url": "https://soundcloud.com",
                    "time_spent_hours": 3.8,
                    "ai_tools_used": "Web Audio Oscillator Synthesis, Gemini Audio Prompting",
                    "process_steps": [
                        {"step": 1, "title": "Harmonic Progression", "desc": "Structured standard Japanese city-pop progression IV-V-iii-vi."},
                        {"step": 2, "title": "Arpeggiator Engine", "desc": "Built 16th-note arpeggiator clocking at 135 BPM with swing quantization."},
                        {"step": 3, "title": "Noise Channel Drum Kit", "desc": "Filtered white noise bursts to simulate punchy 8-bit hi-hats and snares."}
                    ],
                    "what_rocked": ["Punchy retro sound that runs instantly without loading heavy MP3 assets."],
                    "what_broke": ["Browser audio autoplay restrictions required explicit user play button."],
                    "prompt_transcript": "User: Compose an 8-bit city pop chiptune anthem in Web Audio."
                },
            },
            {
                "idea_number": 2,
                "title": "Vaporwave Pitch Slower",
                "tagline": "Slow down any MP3 by 25% with lush reverb",
                "description": "Instant aesthetic mood transformer.",
                "tags": "Audio, Vaporwave",
                "icon": "speed",
                "is_implemented": False,
            },
            {
                "idea_number": 3,
                "title": "Dial-Up Modem Synthesizer",
                "tagline": "Handshake protocols as musical notes",
                "description": "Plays the 56k modem sound mapped to keyboard keys.",
                "tags": "Nostalgia, Sound",
                "icon": "dialpad",
                "is_implemented": False,
            },
            {
                "idea_number": 4,
                "title": "BPM Metronome with Personality",
                "tagline": "Speaks sassy encouragement on every 4th bar",
                "description": "A metronome that keeps you on tempo with retro speech synthesis.",
                "tags": "Music, Practice",
                "icon": "timer",
                "is_implemented": False,
            },
            {
                "idea_number": 5,
                "title": "Floppy Drive Organ",
                "tagline": "Stepper motor frequencies playing Bach",
                "description": "Simulator of mechanical stepper motors producing musical pitches.",
                "tags": "Hardware, Audio",
                "icon": "memory",
                "is_implemented": False,
            },
        ],
        db_path=db_path,
    )


if __name__ == "__main__":
    print(f"Initializing database at {DB_FILE}...")
    init_db()
    seed_demo_data()
    days = get_all_days()
    print(f"Seeded {len(days)} days successfully.")
    for d in days:
        impl = d.get("implemented_idea")
        impl_title = impl["implementation"]["title"] if impl else "None"
        print(f"  • {d['date']}: {d['theme']} (Ranked Build: {impl_title})")
