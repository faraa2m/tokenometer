#!/usr/bin/env bash
set -euo pipefail

echo "▸ npm run lint"
npm run lint

echo "▸ npm run typecheck"
npm run typecheck

echo "▸ npm test"
npm test

echo "▸ npm run build"
npm run build

echo "▸ npm run build -w @tokenometer/web"
npm run build -w @tokenometer/web

echo "▸ npm run benchmarks"
npm run benchmarks

echo "▸ tokenometer --version"
node packages/cli/dist/index.js --version

echo "▸ tokenometer SARIF smoke"
node packages/cli/dist/index.js README.md --model claude-opus-4-7 --output sarif | jq -e '.version == "2.1.0"' >/dev/null

echo "▸ tokenometer --by-file smoke"
node packages/cli/dist/index.js README.md packages/cli/README.md --model claude-opus-4-7 --by-file >/dev/null

echo "▸ tokenometer auto-detect smoke (ANTHROPIC_API_KEY=fake)"
ANTHROPIC_API_KEY=fake-key node packages/cli/dist/index.js README.md >/dev/null

echo "▸ Action bundle present"
test -f packages/action/dist/index.cjs

echo "▸ VS Code extension dist present"
test -f packages/vscode/dist/extension.js

echo "✅ All smoke checks passed."
