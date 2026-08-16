#!/usr/bin/env python3
"""Roster completeness checks for the nikke.gg tier-list dump."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NIKKES = json.loads((ROOT / "web" / "data" / "nikkes.json").read_text(encoding="utf-8"))
PORTRAITS = ROOT / "web" / "portraits"


class RosterTests(unittest.TestCase):
    def test_every_tier_list_nikke_is_present(self) -> None:
        self.assertEqual(len(NIKKES), 205)
        names = [n["name"] for n in NIKKES]
        self.assertEqual(len(names), len(set(names)))

    def test_portraits_exist(self) -> None:
        missing = [n["name"] for n in NIKKES if not (PORTRAITS / f"{n['img']}.webp").exists()]
        self.assertEqual(missing, [])

    def test_portrait_files_are_images(self) -> None:
        for nikke in NIKKES:
            data = (PORTRAITS / f"{nikke['img']}.webp").read_bytes()[:12]
            self.assertEqual(data[:4], b"RIFF")
            self.assertEqual(data[8:12], b"WEBP")

    def test_index_is_self_contained(self) -> None:
        html = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
        self.assertIn("js/nikkes-data.js", html)
        self.assertIn("js/grid.js", html)
        self.assertIn("js/game.js", html)


if __name__ == "__main__":
    unittest.main()
