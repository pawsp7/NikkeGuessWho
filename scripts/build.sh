#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
echo "Building Windows exe..."
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -H windowsgui" -o dist/NikkeGuessWho.exe .
echo "Building Linux binary..."
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o dist/nikke-guess-who .
ls -lh dist/NikkeGuessWho.exe dist/nikke-guess-who
