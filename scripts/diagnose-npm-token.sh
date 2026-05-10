#!/usr/bin/env bash
# Diagnose an npm token without touching ~/.npmrc.
# Usage:  bash scripts/diagnose-npm-token.sh <NPM_TOKEN>
#
# Writes a temp .npmrc at $TMPDIR/tokenometer-diag.npmrc, points npm at it
# via NPM_CONFIG_USERCONFIG, runs whoami / org-list / dry-run publishes,
# then deletes the temp file.

set -u

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <NPM_TOKEN>" >&2
  exit 2
fi

TOKEN="$1"
TMPDIR="${TMPDIR:-/tmp}"
NPMRC="${TMPDIR}/tokenometer-diag-$$-$(date +%s).npmrc"
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

echo "▸ npm whoami"
npm whoami --registry="$REGISTRY" 2>&1 || true
echo

echo "▸ npm org ls tokenometer"
npm org ls tokenometer --registry="$REGISTRY" 2>&1 || true
echo

echo "▸ npm access list packages tokenometer"
npm access list packages tokenometer --registry="$REGISTRY" 2>&1 | head -20 || true
echo

echo "▸ Dry-run publish: @tokenometer/core"
( cd "$repo_root/packages/core" && npm publish --access public --dry-run --registry="$REGISTRY" 2>&1 | tail -25 ) || true
echo

echo "▸ Dry-run publish: tokenometer"
( cd "$repo_root/packages/cli" && npm publish --access public --dry-run --registry="$REGISTRY" 2>&1 | tail -25 ) || true
echo

echo "✅ Done. Temp .npmrc deleted. Your real ~/.npmrc was never touched."
