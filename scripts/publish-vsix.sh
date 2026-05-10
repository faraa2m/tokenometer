#!/usr/bin/env bash
# Publish the prebuilt .vsix to VS Code Marketplace + Open VSX.
# Tokens taken as argv; never written to ~/.npmrc.
#
# Usage:  bash scripts/publish-vsix.sh <VSCE_PAT> <OVSX_PAT>
#
# Pass an empty string ("") for either token to skip that registry.

set -u

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <VSCE_PAT> <OVSX_PAT>"
  echo "(pass '' for either to skip)"
  exit 2
fi

VSCE_PAT="$1"
OVSX_PAT="$2"

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
VSIX=$(ls "$repo_root"/packages/vscode/*.vsix 2>/dev/null | head -1 || true)

if [ -z "${VSIX:-}" ]; then
  echo "No .vsix found. Run first:"
  echo "  npm run package:vsix --workspace=packages/vscode"
  exit 1
fi

echo "▸ Found .vsix: $VSIX"
echo

if [ -n "$VSCE_PAT" ]; then
  echo "▸ Publishing to VS Code Marketplace via vsce"
  npx --yes @vscode/vsce publish --packagePath "$VSIX" --pat "$VSCE_PAT"
  echo
else
  echo "▸ VSCE_PAT empty — skipping VS Code Marketplace"
  echo
fi

if [ -n "$OVSX_PAT" ]; then
  echo "▸ Publishing to Open VSX via ovsx"
  npx --yes ovsx publish "$VSIX" --pat "$OVSX_PAT"
  echo
else
  echo "▸ OVSX_PAT empty — skipping Open VSX"
  echo
fi

echo "✅ Done."
