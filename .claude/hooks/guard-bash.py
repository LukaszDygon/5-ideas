#!/usr/bin/env python3
"""PreToolUse(Bash): block destructive or out-of-repo shell commands.

Exit 0 allows the command silently; exit 2 blocks it and the stderr text is shown to Claude.
"""

from __future__ import annotations

import re
import shlex
import sys
import tempfile
from pathlib import Path

from _lib import project_root, read_payload

HEREDOC_RE = re.compile(r"<<-?\s*(['\"]?)(\w+)\1[^\n]*\n.*?\n\s*\2\b", re.DOTALL)
PIPE_TO_SHELL_RE = re.compile(r"\b(curl|wget)\b[^|;&]*\|\s*(sudo\s+)?(ba|z|da|k)?sh\b")
SEGMENT_OPS = {"&&", "||", ";", "|", "&", "|&", ";;"}
REDIRECT_OPS = {">", ">>", "&>", "&>>", ">|"}
WRAPPERS = {"env", "time", "nohup", "command", "exec"}
SAFE_DEVICES = {"/dev/null", "/dev/stdout", "/dev/stderr", "/dev/tty"}
TEMP_DIRS = {Path(tempfile.gettempdir()).resolve(), Path("/tmp").resolve(), Path("/var/folders").resolve()}


def tokenize(command: str) -> list[str]:
    lexer = shlex.shlex(command, posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    try:
        return list(lexer)
    except ValueError:  # unbalanced quotes: fall back to a rough split
        return command.split()


def segments(command: str) -> list[list[str]]:
    """Split a command line into simple commands, dropping heredoc bodies first."""
    command = HEREDOC_RE.sub("", command)
    result: list[list[str]] = []
    for line in command.splitlines():
        current: list[str] = []
        for tok in tokenize(line):
            if tok in SEGMENT_OPS or tok in {"(", ")", "{", "}"}:
                if current:
                    result.append(current)
                current = []
            else:
                current.append(tok)
        if current:
            result.append(current)
    return result


def strip_prefix(tokens: list[str]) -> list[str]:
    i = 0
    while i < len(tokens) and (re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", tokens[i]) or tokens[i] in WRAPPERS):
        i += 1
    return tokens[i:]


def resolve(path: str, cwd: Path) -> Path | None:
    if "$" in path or "`" in path:
        return None
    p = Path(path).expanduser()
    return (p if p.is_absolute() else cwd / p).resolve()


def inside(p: Path, base: Path) -> bool:
    return p == base or base in p.parents


def is_safe_location(p: Path, root: Path) -> bool:
    return inside(p, root) or any(inside(p, t) for t in TEMP_DIRS)


def git_subcommand(tokens: list[str]) -> tuple[str, list[str]]:
    i = 1
    while i < len(tokens) and tokens[i].startswith("-"):
        i += 2 if tokens[i] in {"-C", "-c"} else 1
    return (tokens[i], tokens[i + 1 :]) if i < len(tokens) else ("", [])


def check_segment(tokens: list[str], root: Path, cwd: Path) -> str | None:
    # Output redirections to absolute paths outside the repo.
    for op, target in zip(tokens, tokens[1:]):
        if op in REDIRECT_OPS and target not in SAFE_DEVICES:
            p = resolve(target, cwd)
            if p is not None and not is_safe_location(p, root):
                return f"redirection writes outside the repo ({target})"

    tokens = strip_prefix(tokens)
    if not tokens:
        return None
    cmd, args = tokens[0], tokens[1:]
    name = Path(cmd).name

    if name == "sudo":
        return "sudo is not allowed"

    if name == "rm":
        flags = [a for a in args if a.startswith("-")]
        recursive = any(f in {"--recursive", "-r", "-R"} or (not f.startswith("--") and ("r" in f or "R" in f)) for f in flags)
        if recursive:
            for target in (a for a in args if not a.startswith("-")):
                p = resolve(target, cwd)
                if p is None:
                    return f"rm -r on an unresolved path ({target}); spell the path out"
                if p == Path("/") or p == root or not is_safe_location(p, root):
                    return f"rm -r outside the repo or on the repo root ({target})"

    if name == "git":
        sub, rest = git_subcommand(tokens)
        if sub == "push" and any(
            a in {"-f", "--force"} or a.startswith("--force") or re.fullmatch(r"-[a-eg-zA-Z]*f[a-zA-Z]*", a) or a.startswith("+")
            for a in rest
        ):
            return "force-push is not allowed"
        if sub == "reset" and "--hard" in rest:
            return "git reset --hard discards work; use git stash or git restore <file>"
        if sub == "clean":
            return "git clean deletes untracked files; remove specific files instead"

    joined = " ".join(tokens)
    if re.search(r"\bpython[0-9.]*\b", joined) and (
        any(a.endswith("db.py") for a in args) or re.search(r"-m\s+(showcase\.)?db\b", joined)
    ):
        return "running db.py wipes and reseeds the database; use the CLI 'seed --yes' deliberately"
    if "seed" in args and ("showcase.cli" in joined or name == "five-ideas") and "--yes" not in args:
        return "seed wipes the database; pass --yes only if the user asked for it"
    return None


def main() -> int:
    payload = read_payload()
    command = (payload.get("tool_input") or {}).get("command") or ""
    root = project_root(payload)
    cwd = Path(payload.get("cwd") or root).resolve()

    if PIPE_TO_SHELL_RE.search(command):
        reason = "piping a download into a shell is not allowed"
    else:
        reason = next((r for seg in segments(command) if (r := check_segment(seg, root, cwd))), None)

    if reason:
        print(f"Blocked by .claude/hooks/guard-bash.py: {reason}.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
