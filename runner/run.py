#!/usr/bin/env python3
"""
LinkSeaAI agent runner — loads an agent's system prompt + skills from disk
and runs a single LLM turn against the Claude API.

Usage:
    python run.py <agent> [-m "message"] [--input file.txt] [--no-stream]

Examples:
    python run.py copywriter -m "给 C2eJmSy 写 LinkedIn 母稿"
    cat brief.md | python run.py content-planner
    python run.py visualizer --input strategy_input.md
"""

import argparse
import os
import sys
from pathlib import Path

import anthropic


REPO_ROOT = Path(__file__).resolve().parent.parent
AGENTS_DIR = REPO_ROOT / "agents"

MODEL = "claude-opus-4-7"
MAX_TOKENS = 32000


def load_system_prompt(agent_name: str) -> str:
    agent_dir = AGENTS_DIR / agent_name
    system_file = agent_dir / "system.md"
    if not system_file.exists():
        sys.exit(f"agent '{agent_name}' not found: {system_file} missing")

    parts = [system_file.read_text(encoding="utf-8")]

    skills_dir = agent_dir / "skills"
    if skills_dir.is_dir():
        for skill_file in sorted(skills_dir.glob("*.md")):
            parts.append("\n\n---\n\n" + skill_file.read_text(encoding="utf-8"))

    return "".join(parts)


def read_user_input(args) -> str:
    if args.message:
        return args.message
    if args.input:
        return Path(args.input).read_text(encoding="utf-8")
    if not sys.stdin.isatty():
        return sys.stdin.read()
    sys.exit("no input — use -m, --input, or pipe via stdin")


def run(agent: str, user_input: str, stream: bool) -> None:
    client = anthropic.Anthropic()

    system_blocks = [{
        "type": "text",
        "text": load_system_prompt(agent),
        "cache_control": {"type": "ephemeral"},
    }]
    messages = [{"role": "user", "content": user_input}]

    if stream:
        with client.messages.stream(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            thinking={"type": "adaptive"},
            system=system_blocks,
            messages=messages,
        ) as s:
            for text in s.text_stream:
                print(text, end="", flush=True)
            print()
            final = s.get_final_message()
    else:
        final = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            thinking={"type": "adaptive"},
            system=system_blocks,
            messages=messages,
        )
        for block in final.content:
            if block.type == "text":
                print(block.text)

    u = final.usage
    print(
        f"\n--- usage: input={u.input_tokens} output={u.output_tokens} "
        f"cache_write={u.cache_creation_input_tokens} cache_read={u.cache_read_input_tokens} ---",
        file=sys.stderr,
    )


def main() -> None:
    available = sorted(p.name for p in AGENTS_DIR.iterdir() if p.is_dir())

    p = argparse.ArgumentParser(description="Run a LinkSeaAI agent against Claude.")
    p.add_argument("agent", choices=available, help="agent to run")
    p.add_argument("-m", "--message", help="user message (inline)")
    p.add_argument("--input", help="read user message from file")
    p.add_argument("--no-stream", action="store_true", help="disable streaming")
    args = p.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("ANTHROPIC_API_KEY not set (export it or put it in .env)")

    user_input = read_user_input(args)
    run(args.agent, user_input, stream=not args.no_stream)


if __name__ == "__main__":
    main()
