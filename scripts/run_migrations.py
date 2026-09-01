"""Afroid Platform — Database Migration Runner.

Applies Alembic schema migrations against the target database (Local, Staging, or Cloud SQL Production).
Usage:
    uv run python scripts/run_migrations.py [--check | --upgrade | --downgrade]
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
ALEMBIC_DIR = WORKSPACE_ROOT / "services" / "platform"


def run_alembic(command: list[str]) -> int:
    """Execute an alembic command in the platform service context."""
    env = os.environ.copy()
    if "PYTHONPATH" in env:
        env["PYTHONPATH"] = f"{WORKSPACE_ROOT}{os.pathsep}{env['PYTHONPATH']}"
    else:
        env["PYTHONPATH"] = str(WORKSPACE_ROOT)

    print(f"Running: alembic {' '.join(command)}")
    result = subprocess.run(
        ["uv", "run", "alembic", *command],
        cwd=str(ALEMBIC_DIR),
        env=env,
        check=False,
    )
    return result.returncode


def main() -> None:
    parser = argparse.ArgumentParser(description="Afroid Database Migration Runner")
    parser.add_argument(
        "--action",
        choices=["upgrade", "current", "history", "heads", "check"],
        default="upgrade",
        help="Alembic action to perform (default: upgrade)",
    )
    parser.add_argument(
        "--revision",
        default="head",
        help="Target revision for upgrade (default: head)",
    )
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        masked_url = db_url.split("@")[-1] if "@" in db_url else "[configured]"
        print(f"[INFO] Target Database: ...@{masked_url}")
    else:
        print("[INFO] DATABASE_URL not set in env, using alembic.ini defaults")

    if args.action == "upgrade":
        code = run_alembic(["upgrade", args.revision])
    elif args.action == "current":
        code = run_alembic(["current"])
    elif args.action == "history":
        code = run_alembic(["history", "--verbose"])
    elif args.action == "heads":
        code = run_alembic(["heads"])
    elif args.action == "check":
        code = run_alembic(["check"])
    else:
        code = 1

    if code == 0:
        print("[SUCCESS] Migration operation completed successfully.")
    else:
        print(f"[ERROR] Migration operation failed with exit code {code}.", file=sys.stderr)

    sys.exit(code)


if __name__ == "__main__":
    main()
