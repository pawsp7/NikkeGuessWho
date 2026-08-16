#!/usr/bin/env python3
"""Download every Nikke portrait used on https://nikke.gg/tier-list/."""

from __future__ import annotations

import json
import ssl
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
PORTRAITS = WEB / "portraits"
DATA_JSON = WEB / "data" / "nikkes.json"
DATA_JS = WEB / "js" / "nikkes-data.js"

TIERLIST_URL = "https://api.dotgg.gg/nikke/tierlist"
IMG_URL = "https://static.dotgg.gg/nikke/characters/{img}.webp"
IMG_URL_PNG = "https://static.dotgg.gg/nikke/characters/{img}.png"

USER_AGENT = "NikkeGuessWho/1.0 (fan project; portraits from nikke.gg tier list)"

FIELDS = (
    "id",
    "name",
    "url",
    "img",
    "manufacturer",
    "squad",
    "class",
    "burst",
    "rarity",
    "weapon",
    "element",
)


def slim(entry: dict) -> dict:
    out = {k: entry.get(k) for k in FIELDS}
    out["name"] = str(out.get("name") or "").strip()
    out["url"] = str(out.get("url") or "").strip()
    out["img"] = str(out.get("img") or "").strip()
    out["id"] = int(out.get("id") if out.get("id") is not None else 0)
    return out


def open_url(url: str, timeout: int = 30) -> bytes:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        return resp.read()


def download_one(img: str) -> tuple[str, Path, int]:
    dest = PORTRAITS / f"{img}.webp"
    if dest.exists() and dest.stat().st_size > 500:
        return img, dest, dest.stat().st_size
    last_err: Exception | None = None
    for url in (IMG_URL.format(img=img), IMG_URL_PNG.format(img=img)):
        for attempt in range(3):
            try:
                data = open_url(url)
                if len(data) < 200:
                    raise RuntimeError(f"tiny response ({len(data)} bytes) from {url}")
                dest.write_bytes(data)
                return img, dest, len(data)
            except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, RuntimeError) as exc:
                last_err = exc
                time.sleep(0.4 * (attempt + 1))
    raise RuntimeError(f"failed to download {img}: {last_err}")


def main() -> int:
    PORTRAITS.mkdir(parents=True, exist_ok=True)
    DATA_JSON.parent.mkdir(parents=True, exist_ok=True)
    DATA_JS.parent.mkdir(parents=True, exist_ok=True)

    print(f"Fetching tier list from {TIERLIST_URL}")
    raw = json.loads(open_url(TIERLIST_URL).decode("utf-8"))
    if not isinstance(raw, list) or not raw:
        print("Tier list API returned no characters", file=sys.stderr)
        return 1

    nikkes = [slim(entry) for entry in raw if entry.get("name") and entry.get("img")]
    nikkes.sort(key=lambda n: (n["name"].lower(), n["id"]))

    names = [n["name"] for n in nikkes]
    if len(names) != len(set(names)):
        print("Warning: duplicate names in tier list", file=sys.stderr)

    DATA_JSON.write_text(json.dumps(nikkes, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    DATA_JS.write_text(
        "window.NIKKES = " + json.dumps(nikkes, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(nikkes)} nikkes to {DATA_JSON.relative_to(ROOT)}")

    unique_imgs = sorted({n["img"] for n in nikkes})
    print(f"Downloading {len(unique_imgs)} unique portraits...")
    failures: list[str] = []
    with ThreadPoolExecutor(max_workers=16) as pool:
        futures = {pool.submit(download_one, img): img for img in unique_imgs}
        done = 0
        for fut in as_completed(futures):
            img = futures[fut]
            done += 1
            try:
                _, dest, size = fut.result()
                print(f"  [{done}/{len(unique_imgs)}] {img} ({size} bytes) -> {dest.name}")
            except Exception as exc:  # noqa: BLE001
                failures.append(f"{img}: {exc}")
                print(f"  [{done}/{len(unique_imgs)}] FAIL {img}: {exc}", file=sys.stderr)

    if failures:
        print(f"Failed {len(failures)} downloads:", file=sys.stderr)
        for line in failures:
            print(" ", line, file=sys.stderr)
        return 1

    missing = [n["name"] for n in nikkes if not (PORTRAITS / f"{n['img']}.webp").exists()]
    if missing:
        print("Missing portraits for:", missing, file=sys.stderr)
        return 1

    print(f"OK: {len(nikkes)} nikkes, {len(unique_imgs)} portraits")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
