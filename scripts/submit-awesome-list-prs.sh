#!/usr/bin/env bash
# Submit Tokenometer to 5 awesome-* lists.
#
# For each list this script:
#   1. Forks the upstream repo to your GitHub account.
#   2. Clones the fork to /tmp/awesome-prs/<repo>.
#   3. Adds the Tokenometer one-liner to the README.
#   4. Commits + pushes to a `add-tokenometer` branch on your fork.
#   5. Opens a PR upstream.
#
# Requires:
#   - `gh` CLI authenticated (`gh auth status`)
#   - Working internet
#
# Usage: bash scripts/submit-awesome-list-prs.sh
#
# To dry-run without forking / pushing / opening PRs:
#   DRY_RUN=1 bash scripts/submit-awesome-list-prs.sh

set -uo pipefail

DRY_RUN="${DRY_RUN:-0}"
WORKDIR=/tmp/awesome-prs
mkdir -p "$WORKDIR"

LINE='- [Tokenometer](https://github.com/faraa2m/tokenometer) — LLM token cost + latency CLI + GitHub Action + VS Code extension + Claude Code skill. 63 models across Claude, GPT-4o, Gemini, Mistral, Cohere. Empirical mode, CI-native cost guardrail.'

# Each entry: "upstream_owner/repo|section_marker_grep_pattern"
# `section_marker_grep_pattern` is matched against README lines; we insert
# the new entry on the next blank line after the first match. If no match,
# we insert at the end of the file with a "## Tools" heading as fallback.
LISTS=(
  "tensorchord/Awesome-LLMOps|^##.*[Cc]ost"
  "sdras/awesome-actions|^##.*[Uu]tility|^##.*[Cc]ode [Qq]uality"
  "promptslab/Awesome-Prompt-Engineering|^##.*[Tt]ools|^##.*[Aa]pps"
  "mahseema/awesome-ai-tools|^##.*[Dd]eveloper|^##.*CLI|^##.*[Tt]ools"
  "Shubhamsaboo/awesome-llm-apps|^##.*[Tt]ools|^##.*Apps|^##.*Cost"
)

run() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [dry-run] $*"
  else
    eval "$@"
  fi
}

submit_one() {
  local entry="$1"
  local upstream pattern
  upstream="${entry%%|*}"
  pattern="${entry#*|}"
  local repo_name="${upstream##*/}"
  local fork_dir="$WORKDIR/$repo_name"

  echo
  echo "=== $upstream ==="

  # Fork
  if [ ! -d "$fork_dir" ]; then
    run "gh repo fork '$upstream' --clone --remote --fork-name '$repo_name' --default-branch-only" || {
      echo "  fork failed; skipping"
      return 1
    }
    run "mv '$repo_name' '$fork_dir' 2>/dev/null || true"
  fi

  pushd "$fork_dir" >/dev/null || return 1

  run "git checkout -B add-tokenometer"

  # Locate README (case-insensitive) and the right section heading.
  local readme
  readme=$(ls README* 2>/dev/null | head -1)
  if [ -z "$readme" ]; then
    echo "  no README found; skipping"
    popd >/dev/null
    return 1
  fi

  # Find line number of first matching section heading.
  local target_line=""
  IFS='|' read -ra patterns <<< "$pattern"
  for p in "${patterns[@]}"; do
    target_line=$(grep -n -E "$p" "$readme" | head -1 | cut -d: -f1)
    if [ -n "$target_line" ]; then break; fi
  done

  if [ -z "$target_line" ]; then
    echo "  no matching section in README; appending at end"
    if [ "$DRY_RUN" = "0" ]; then
      printf '\n%s\n' "$LINE" >> "$readme"
    else
      echo "  [dry-run] would append to $readme"
    fi
  else
    # Insert after the first blank-line break following the matched heading.
    if [ "$DRY_RUN" = "0" ]; then
      awk -v target="$target_line" -v line="$LINE" '
        NR==target { print; matched=1; next }
        matched && /^$/ { print line; matched=0 }
        { print }
      ' "$readme" > "$readme.new" && mv "$readme.new" "$readme"
      echo "  inserted under section at line $target_line"
    else
      echo "  [dry-run] would insert under section at line $target_line of $readme"
    fi
  fi

  run "git add '$readme'"
  run "git commit -m 'Add Tokenometer — LLM cost CLI + GitHub Action'"
  run "git push -u origin add-tokenometer --force"

  run "gh pr create \
        --repo '$upstream' \
        --title 'Add Tokenometer — LLM cost CLI + GitHub Action' \
        --body 'Adds Tokenometer to the appropriate section.

**Tokenometer** — empirical LLM token-cost CLI + GitHub Action + VS Code / Cursor extension + Claude Code skill. Multi-provider (Claude, GPT-4o, Gemini, Mistral, Cohere), offline + empirical modes, CI cost-guardrail with sticky PR comments and budget gates.

- Repo: https://github.com/faraa2m/tokenometer
- npm: \`npx tokenometer ./prompt.md --model claude-opus-4-7\`
- GitHub Marketplace: https://github.com/marketplace/actions/tokenometer
- Live demo: https://tokenometer.dev
- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=faraa2m.tokenometer-vscode

If the placement is in the wrong section happy to adjust.'"

  popd >/dev/null
}

for entry in "${LISTS[@]}"; do
  submit_one "$entry"
done

echo
echo "Done. Forks live under $WORKDIR. Review each PR before merging upstream."
