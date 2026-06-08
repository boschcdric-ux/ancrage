#!/bin/bash

# Script de lancement automatique pour adhd-app (macOS)

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR" || exit 1

open -a Terminal "$PROJECT_DIR"
osascript <<EOF
tell application "Terminal"
    activate
    do script "cd \"$PROJECT_DIR\" && npm run dev"
end tell
EOF

sleep 2
open "http://localhost:5173"
