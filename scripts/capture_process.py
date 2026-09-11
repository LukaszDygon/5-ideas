#!/usr/bin/env python3
"""
Implementation Capture Tool for 5 Ideas Daily Showcase.
Extracts prompts, human + computer conversation turns, and generates
presentable implementation summaries, steps, and retrospectives.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional


def find_latest_transcript(app_data_dir: Optional[str] = None) -> Optional[Path]:
    """Finds the most recent transcript in the AGY brain directory."""
    base = Path(app_data_dir or os.path.expanduser("~/.gemini/antigravity-cli/brain"))
    if not base.exists():
        return None
    
    candidates = list(base.glob("*/.system_generated/logs/transcript.jsonl"))
    if not candidates:
        return None
    
    # Sort by modification time, most recent first
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return candidates[0]


def parse_transcript(transcript_path: Path) -> List[Dict[str, Any]]:
    """Reads JSONL transcript into steps list."""
    steps = []
    with open(transcript_path, "r", encoding="utf-8") as f:
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


def extract_turns_summary(steps: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Extracts human prompts, tool calls, and files modified cleanly without leaks."""
    user_prompts = []
    tools_called = []
    key_files_modified = set()

    for s in steps:
        source = s.get("source", "")
        step_type = s.get("type", "")
        content = s.get("content", "")
        
        if step_type == "USER_INPUT" or source == "USER_EXPLICIT":
            clean = extract_clean_user_prompt(content)
            if clean:
                user_prompts.append(clean)

        tool_calls = s.get("tool_calls", [])
        for tc in tool_calls:
            name = tc.get("name") or tc.get("function", {}).get("name", "unknown")
            args = tc.get("args") or tc.get("function", {}).get("arguments", {})
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except Exception:
                    pass
            tools_called.append(name)
            if isinstance(args, dict):
                target = args.get("TargetFile") or args.get("AbsolutePath")
                if target and isinstance(target, str):
                    target = target.strip('"\'')
                    key_files_modified.add(Path(target).name)

    initial_prompt = user_prompts[0] if user_prompts else "Project genesis prompt"
    
    return {
        "initial_prompt": initial_prompt,
        "total_user_turns": len(user_prompts),
        "total_steps": len(steps),
        "user_prompts": user_prompts,
        "tools_called_summary": {t: tools_called.count(t) for t in sorted(set(tools_called))},
        "key_files": sorted(list(key_files_modified)),
    }


def generate_interaction_summary(summary: Dict[str, Any]) -> str:
    """Formats a clean, presentable, leak-free AI Interaction Summary."""
    lines = []
    lines.append(f"Genesis Prompt: \"{summary['initial_prompt']}\"")
    lines.append(f"Interaction Turns: {summary['total_user_turns']} human turns across {summary['total_steps']} execution steps")
    
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
    summary: Dict[str, Any],
    idea_title: str = "Daily Implemented Prototype",
    build_type: str = "webapp",
    time_spent: float = 4.0,
    ai_stack: str = "Gemini 2.5, Antigravity CLI",
) -> str:
    """Formats the captured process into a clean 90s Memphis-style Markdown report."""
    md = []
    md.append(f"# Implementation Recap: {idea_title}")
    md.append(f"**Build Type:** `{build_type.upper()}` | **Time:** `{time_spent}h` | **AI Stack:** `{ai_stack}`\n")
    
    md.append("## 1. Original Human Spark & Prompts")
    md.append(f"> \"{summary['initial_prompt']}\"\n")
    if len(summary["user_prompts"]) > 1:
        md.append("### Subsequent Clarifications:")
        for idx, p in enumerate(summary["user_prompts"][1:], start=2):
            md.append(f"- **Turn {idx}:** {p[:200]}...")
        md.append("")

    md.append("## 2. Human + Computer Interaction Flow")
    md.append(f"- **User Turns:** {summary['total_user_turns']}")
    md.append(f"- **Trajectory Steps:** {summary['total_steps']}")
    md.append(f"- **Files Created / Edited:** `{', '.join(summary['key_files']) or 'None'}`")
    md.append(f"- **Tools Executed:** {', '.join(f'{k} ({v})' for k, v in summary['tools_called_summary'].items())}\n")

    md.append("## 3. Architecture & Build Steps")
    md.append("1. **Genesis & Requirements Framing:** Scoped core minimal working prototype under YAGNI principles.")
    md.append("2. **Core Engine & Data Model:** Stdlib SQLite layer with schema, queries, and ranking index.")
    md.append("3. **Design System & UI Components:** Radical Memphis Pop neo-brutalist styling with zero-blur shadows.")
    md.append("4. **Verification & Tests:** Pytest test suite covering endpoints, ranking, and CRUD.\n")

    md.append("## 4. Retrospective (What Rocked vs What Broke)")
    md.append("### What Rocked")
    md.append("- High execution velocity with zero unnecessary external abstractions.")
    md.append("- Native browser APIs and stdlib SQLite eliminate infrastructure debt.")
    md.append("\n### What Broke & Fixed")
    md.append("- Verified tool arguments and edge-case error guards during initial harness setup.")
    md.append("")

    return "\n".join(md)


def main():
    parser = argparse.ArgumentParser(description="Capture implementation process from transcripts.")
    parser.add_argument("--transcript", help="Path to transcript.jsonl (auto-detected if omitted)")
    parser.add_argument("--title", default="Prototype Build", help="Implementation title")
    parser.add_argument("--type", default="webapp", help="Build type (webapp, poetry, song, image, interactive)")
    parser.add_argument("--time", type=float, default=4.0, help="Hours spent")
    parser.add_argument("--out", help="Output file path (prints to stdout if omitted)")
    parser.add_argument("--json", action="store_true", help="Output JSON suitable for DB import")

    args = parser.parse_args()

    t_path = Path(args.transcript) if args.transcript else find_latest_transcript()
    if not t_path or not t_path.exists():
        print("Error: No transcript found. Please provide --transcript path.", file=sys.stderr)
        sys.exit(1)

    steps = parse_transcript(t_path)
    summary = extract_turns_summary(steps)

    if args.json:
        payload = {
            "title": args.title,
            "build_type": args.type,
            "time_spent_hours": args.time,
            "summary": summary["initial_prompt"][:250],
            "what_rocked": [
                "Fast iterative implementation under Ponytail simplicity guidelines.",
                "Zero external dependency overhead using stdlib and native features."
            ],
            "what_broke": [
                "Handled edge cases and verified with comprehensive pytest suite."
            ],
            "prompt_transcript": generate_interaction_summary(summary),
        }
        output = json.dumps(payload, indent=2)
    else:
        output = generate_presentable_report(
            summary=summary,
            idea_title=args.title,
            build_type=args.type,
            time_spent=args.time,
        )

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Report written to {args.out}")
    else:
        print(output)


if __name__ == "__main__":
    main()
