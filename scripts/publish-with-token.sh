#!/usr/bin/env bash
# Publish @tokenometer/core and tokenometer to npm using a one-shot
# isolated config. Does NOT touch ~/.npmrc.
#
# Usage:  bash scripts/publish-with-token.sh <NPM_TOKEN>
#
# Order matters: core first (CLI depends on it).

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <NPM_TOKEN>" >&2
  exit 2
fi

TOKEN="$1"
TMPDIR="${TMPDIR:-/tmp}"
NPMRC="${TMPDIR}/tokenometer-publish-$$-$(date +%s).npmrc"
REGISTRY="https://registry.npmjs.org/"

cleanup() {
  rm -f "$NPMRC"
  unset NPM_CONFIG_USERCONFIG
}
trap cleanup EXIT INT TERM

cat > "$NPMRC" <<EOF
registry=${REGISTRY}
//registry.npmjs.org/:_authToken=${TOKEN}
EOF
chmod 600 "$NPMRC"

export NPM_CONFIG_USERCONFIG="$NPMRC"

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

echo "▸ Identity: $(npm whoami --registry="$REGISTRY")"
echo

echo "▸ Building all workspaces"
( cd "$repo_root" && npm run build >/dev/null 2>&1 )
echo "  done"
echo

echo "▸ Publishing @tokenometer/core@0.1.0"
( cd "$repo_root/packages/core" && npm publish --access public --registry="$REGISTRY" )
echo

echo "▸ Publishing tokenometer@0.1.0"
( cd "$repo_root/packages/cli" && npm publish --access public --registry="$REGISTRY" )
echo

echo "✅ Both packages published to npm. Temp .npmrc deleted."
echo
echo "Next steps:"
echo "  1. git tag -a v0.1.0 -m 'v0.1.0'"
echo "  2. git push origin v0.1.0"
echo "  3. gh release create v0.1.0 --generate-notes"
echo "     (creates the GitHub Release that triggers Marketplace re-publish for the Action)"
