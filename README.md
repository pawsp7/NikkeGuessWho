# Guess Who: Nikke Edition

A Guess Who board game using the [nikke.gg tier list](https://nikke.gg/tier-list/), excluding Treasure versions. Recreated from [TheSakurist/GWN](https://github.com/TheSakurist/GWN) — original game by **TheSakurist**.

This is a fan project and is not affiliated with SHIFT UP, Goddess of Victory: NIKKE, or nikke.gg.

## Download the Windows exe

1. Grab `dist/NikkeGuessWho.exe` from this repository (or the GitHub Actions artifact).
2. Double-click it. A native window opens; no extra install is required on Windows 10/11 besides the [WebView2 runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (already present on current Windows).
3. If Windows SmartScreen warns about an unsigned app, choose **More info → Run anyway**.

Linux / macOS: run `go run .` from this repo, or open `web/index.html` after starting any static file server in `web/`.

## How to play

Play it like Guess Who. Each player loads the **same 8-character grid code**, secretly right-clicks their Nikke, then takes turns asking yes/no questions and left-clicking to flip down characters that are out.

1. **Play now** after picking a board size (4×4 through 8×8, default 6×6). The roster is the nikke.gg tier list without Treasure versions.
2. **Copy code** and send it to a friend. Codes look like `6x6-ABCD2345`, so the size comes along.
3. They paste it and click **Load grid** — the same portraits appear in the same order. No extra file is required.
4. Left-click a portrait to dim it (eliminate a guess).
5. Right-click a portrait to set **Your Nikke** (click again to clear).

Optional original-style sharing:

- **Generate codes** writes `gridCodes.txt` (1000 boards). Send that file to a friend, then both use **Load friend's file**. Randomize then picks from the shared pool.

Hover a card for rarity, manufacturer, class, burst, element, and weapon — useful question fodder.

## Roster

Portraits and names come from the public nikke.gg / DotGG tier-list API (`https://api.dotgg.gg/nikke/tierlist`). Treasure variants are kept in the data dump but are not added to the board.

Refresh the dump with:

```bash
python3 scripts/fetch_portraits.py
```

## Build it yourself

```bash
go test ./...
node tests/test_grid.js
python3 -m unittest tests/test_roster.py
bash scripts/build.sh
```

`scripts/build.sh` writes:

- `dist/NikkeGuessWho.exe` — Windows GUI app (WebView2)
- `dist/nikke-guess-who` — Linux helper that serves the game and opens a browser

## License

MIT. Original GWN UI assets are included under that project's MIT license. Nikke character portraits remain the property of their respective owners and are bundled only so the game can run offline.
