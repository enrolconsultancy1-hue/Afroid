"""One-off maintenance: remove the verify-* probe rows from orchestrator_kv.

Connects through the local Cloud SQL Auth Proxy (127.0.0.1:5433). Reads the DB
credentials from the DBURL environment variable (set it to the DATABASE_URL secret
value) so the password never appears in this file or on the command line.

Usage (from the repo root, proxy running on port 5433):
    set DBURL=<paste DATABASE_URL secret value>
    .venv\\Scripts\\python.exe cleanup_verify.py
"""

import asyncio
import os
from urllib.parse import unquote, urlparse


async def main() -> None:
    raw = os.environ.get("DBURL", "").strip()
    if not raw:
        print("ERROR: set DBURL to the DATABASE_URL secret value first.")
        return

    # Normalize any SQLAlchemy driver suffix so urlparse/asyncpg accept it.
    norm = raw.replace("postgresql+asyncpg://", "postgresql://").replace("postgres+asyncpg://", "postgresql://")
    p = urlparse(norm)
    user = unquote(p.username or "afroid")
    password = unquote(p.password or "")
    database = (p.path or "/afroid").lstrip("/").split("?")[0] or "afroid"

    import asyncpg

    # Always route through the local proxy, ignoring the original (private) host.
    conn = await asyncpg.connect(host="127.0.0.1", port=5433, user=user, password=password, database=database)
    try:
        before = await conn.fetchval("SELECT count(*) FROM orchestrator_kv WHERE key LIKE 'verify-%'")
        print(f"before : {before} verify-* row(s)")
        result = await conn.execute("DELETE FROM orchestrator_kv WHERE key LIKE 'verify-%'")
        print(f"delete : {result}")
        after = await conn.fetchval("SELECT count(*) FROM orchestrator_kv WHERE key LIKE 'verify-%'")
        print(f"after  : {after} verify-* row(s)")
        print("DONE — cleanup complete." if after == 0 else "WARNING: rows remain.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
