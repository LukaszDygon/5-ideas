"""
Implementation capture: turn an agent transcript into a leak-free AI interaction summary.

Extracts clean human prompts, turn counts, tools executed and files modified; never raw
system prompts, skill bodies or timestamps. The CLI entry point is `five-ideas capture`.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

SOURCES = ("auto", "claude", "antigravity")
CLAUDE_WRAPPER_PREFIXES = (
    "<system-reminder>",
    "<command-name>",
    "<local-command-stdout>",
    "<local-command-caveat>",
)
REMINDER_RE = re.compile(r"<system-reminder>.*?</system-reminder>", re.DOTALL)


def find_latest_transcript(app_data_dir: str | None = None) -> Path | None:
    """Finds the most recent Antigravity transcript in the AGY brain directory."""
    base = Path(app_data_dir or os.path.expanduser("~/.gemini/antigravity-cli/brain"))
    if not base.exists():
        return None

    candidates = list(base.glob("*/.system_generated/logs/transcript.jsonl"))
    if not candidates:
        return None

    # Sort by modification time, most recent first
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return candidates[0]


def claude_project_dir(project: Path, projects_root: Path | None = None) -> Path:
    """Claude Code keeps transcripts in ~/.claude/projects/<project path with non-alphanumerics as '-'>/."""
    root = projects_root or Path.home() / ".claude" / "projects"
    return root / re.sub(r"[^A-Za-z0-9]", "-", str(project.resolve()))


def find_claude_transcript(project: Path, projects_root: Path | None = None) -> Path | None:
    """The current session's transcript (recorded by the SessionStart hook), else the newest one for the project."""
    state = project / ".claude" / "state" / "session.json"
    if state.exists():
        try:
            recorded = json.loads(state.read_text(encoding="utf-8")).get("transcript_path")
        except (json.JSONDecodeError, OSError):
            recorded = None
        if recorded and Path(recorded).is_file():
            return Path(recorded)
    candidates = sorted(
        claude_project_dir(project, projects_root).glob("*.jsonl"), key=lambda p: p.stat().st_mtime
    )
    return candidates[-1] if candidates else None


def find_transcript(source: str, project: Path, projects_root: Path | None = None) -> Path | None:
    """Resolves the transcript for --source auto|claude|antigravity (auto prefers Claude Code)."""
    if source in ("auto", "claude"):
        found = find_claude_transcript(project, projects_root)
        if found or source == "claude":
            return found
    return find_latest_transcript()


def parse_transcript(transcript_path: Path) -> list[dict[str, Any]]:
    """Reads JSONL transcript into steps list."""
    steps = []
    with open(transcript_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    steps.append(json.loads(line))
                except Exception:
                    pass
    return steps


def extract_clean_user_prompt(content: str) -> str:
    """Extracts only the human user's prompt, strictly stripping all system blocks, XML wrappers, and skill instructions."""
    if not content:
        return ""

    # 1. Prefer content explicitly enclosed in <USER_REQUEST>...</USER_REQUEST>
    req_match = re.search(r"<USER_REQUEST>(.*?)</USER_REQUEST>", content, re.DOTALL)
    if req_match:
        text = req_match.group(1).strip()
    else:
        text = content
        # Strip system / skill / context metadata blocks
        text = re.sub(r"<ADDITIONAL_METADATA>.*?</ADDITIONAL_METADATA>", "", text, flags=re.DOTALL)
        text = re.sub(r"<SYSTEM_MESSAGE>.*?</SYSTEM_MESSAGE>", "", text, flags=re.DOTALL)
        text = re.sub(r"<SKILL>.*?</SKILL>", "", text, flags=re.DOTALL)
        text = re.sub(r"<CONTEXT_SUMMARY>.*?</CONTEXT_SUMMARY>", "", text, flags=re.DOTALL)
        text = re.sub(r"<RULE\[.*?\].*?</RULE\[.*?\]>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", "", text)
        text = text.strip()

    # 2. Strict anti-leak sanitizer: eliminate any internal framework or slash command instructions
    text = re.sub(r"The current local time is:.*", "", text)
    text = re.sub(r"The user has mentioned some items in the form.*", "", text)
    text = re.sub(r"The user changed setting `Model Selection`.*", "", text)
    text = re.sub(r"^/[a-zA-Z0-9_\-]+ is a \[Slash Command\]:.*", "", text, flags=re.DOTALL)
    text = re.sub(r"# Spec Implementation.*", "", text, flags=re.DOTALL)
    text = re.sub(r"# Record Implementation.*", "", text, flags=re.DOTALL)

    # Normalize whitespace
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def detect_source(entries: list[dict[str, Any]]) -> str:
    """'claude' for Claude Code JSONL (entries carry `message`), otherwise 'antigravity'."""
    return (
        "claude"
        if any(e.get("type") in ("user", "assistant") and "message" in e for e in entries)
        else "antigravity"
    )


def _summarise(
    user_prompts: list[str], tools: list[str], files: set[str], total_steps: int
) -> dict[str, Any]:
    return {
        "initial_prompt": user_prompts[0] if user_prompts else "Project genesis prompt",
        "total_user_turns": len(user_prompts),
        "total_steps": total_steps,
        "user_prompts": user_prompts,
        "tools_called_summary": {t: tools.count(t) for t in sorted(set(tools))},
        "key_files": sorted(files),
    }


def _extract_antigravity(steps: list[dict[str, Any]]) -> dict[str, Any]:
    user_prompts, tools_called, key_files_modified = [], [], set()
    for s in steps:
        if s.get("type", "") == "USER_INPUT" or s.get("source", "") == "USER_EXPLICIT":
            clean = extract_clean_user_prompt(s.get("content", ""))
            if clean:
                user_prompts.append(clean)

        for tc in s.get("tool_calls", []):
            name = tc.get("name") or tc.get("function", {}).get("name", "unknown")
            args = tc.get("args") or tc.get("function", {}).get("arguments", {})
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except json.JSONDecodeError:
                    pass
            tools_called.append(name)
            if isinstance(args, dict):
                target = args.get("TargetFile") or args.get("AbsolutePath")
                if target and isinstance(target, str):
                    key_files_modified.add(Path(target.strip("\"'")).name)
    return _summarise(user_prompts, tools_called, key_files_modified, len(steps))


def _claude_prompt_text(entry: dict[str, Any]) -> str:
    """The human-typed text of a Claude Code user entry, or '' for anything machine-generated."""
    if entry.get("isMeta") or entry.get("isSidechain") or "toolUseResult" in entry:
        return ""
    content = (entry.get("message") or {}).get("content")
    if isinstance(content, list):
        if any(isinstance(b, dict) and b.get("type") == "tool_result" for b in content):
            return ""
        content = "\n".join(
            b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text"
        )
    if not isinstance(content, str):
        return ""
    content = REMINDER_RE.sub("", content).strip()
    if not content or content.startswith(CLAUDE_WRAPPER_PREFIXES) or "tool_result" in content:
        return ""
    return extract_clean_user_prompt(content)


def _extract_claude(entries: list[dict[str, Any]]) -> dict[str, Any]:
    user_prompts, tools_called, files = [], [], set()
    steps = 0
    for entry in entries:
        if entry.get("isSidechain") or entry.get("type") not in ("user", "assistant"):
            continue
        steps += 1
        if entry["type"] == "user":
            text = _claude_prompt_text(entry)
            if text:
                user_prompts.append(text)
            continue
        for block in (entry.get("message") or {}).get("content") or []:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                tools_called.append(block.get("name", "unknown"))
                target = (block.get("input") or {}).get("file_path") or (block.get("input") or {}).get(
                    "notebook_path"
                )
                if isinstance(target, str) and target:
                    files.add(Path(target).name)
    return _summarise(user_prompts, tools_called, files, steps)


def extract_turns_summary(entries: list[dict[str, Any]], source: str = "auto") -> dict[str, Any]:
    """Extracts human prompts, tool calls, and files modified cleanly without leaks."""
    if source == "auto":
        source = detect_source(entries)
    return _extract_claude(entries) if source == "claude" else _extract_antigravity(entries)


def generate_interaction_summary(summary: dict[str, Any]) -> str:
    """Formats a clean, presentable, leak-free AI Interaction Summary."""
    lines = []
    lines.append(f'Genesis Prompt: "{summary["initial_prompt"]}"')
    lines.append(
        f"Interaction Turns: {summary['total_user_turns']} human turns across {summary['total_steps']} execution steps"
    )

    if len(summary["user_prompts"]) > 1:
        lines.append("\nKey Guidance Turns:")
        for idx, prompt in enumerate(summary["user_prompts"][1:], start=2):
            preview = prompt.replace("\n", " ").strip()
            if len(preview) > 130:
                preview = preview[:127] + "..."
            lines.append(f"  • Turn {idx}: {preview}")

    if summary.get("tools_called_summary"):
        top_tools = sorted(summary["tools_called_summary"].items(), key=lambda x: x[1], reverse=True)[:6]
        tools_str = ", ".join(f"{k} ({v})" for k, v in top_tools)
        lines.append(f"\nTools Executed: {tools_str}")

    if summary.get("key_files"):
        files_str = ", ".join(summary["key_files"][:8])
        lines.append(f"Files Modified: {files_str}")

    return "\n".join(lines)


def generate_presentable_report(
    summary: dict[str, Any],
    idea_title: str = "Daily Implemented Prototype",
    build_type: str = "webapp",
    time_spent: float = 4.0,
    ai_stack: str = "Claude Code",
) -> str:
    """Formats the captured process into a clean 90s Memphis-style Markdown report."""
    md = []
    md.append(f"# Implementation Recap: {idea_title}")
    md.append(
        f"**Build Type:** `{build_type.upper()}` | **Time:** `{time_spent}h` | **AI Stack:** `{ai_stack}`\n"
    )

    md.append("## 1. Original Human Spark & Prompts")
    md.append(f'> "{summary["initial_prompt"]}"\n')
    if len(summary["user_prompts"]) > 1:
        md.append("### Subsequent Clarifications:")
        for idx, p in enumerate(summary["user_prompts"][1:], start=2):
            md.append(f"- **Turn {idx}:** {p[:200]}...")
        md.append("")

    md.append("## 2. Human + Computer Interaction Flow")
    md.append(f"- **User Turns:** {summary['total_user_turns']}")
    md.append(f"- **Trajectory Steps:** {summary['total_steps']}")
    md.append(f"- **Files Created / Edited:** `{', '.join(summary['key_files']) or 'None'}`")
    md.append(
        f"- **Tools Executed:** {', '.join(f'{k} ({v})' for k, v in summary['tools_called_summary'].items())}\n"
    )

    md.append("## 3. Architecture & Build Steps")
    md.append("_Provided by the user (see /record-implementation); never generated._\n")

    md.append("## 4. Retrospective (What Rocked vs What Broke)")
    md.append("_Provided by the user (see /record-implementation); never generated._")
    md.append("")

    return "\n".join(md)
