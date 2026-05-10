#!/usr/bin/env bash
set -euo pipefail
DEST="${HOME}/.claude/skills/tokenometer"
mkdir -p "$DEST"
cp "$(dirname "$0")/SKILL.md" "$DEST/SKILL.md"
echo "Installed Tokenometer skill to $DEST/SKILL.md"
