#!/usr/bin/env bash
# =============================================================================
# GitHub Secrets Manager for IAI repos
# Usage:
#   bash scripts/manage-secrets.sh list             # list all secrets
#   bash scripts/manage-secrets.sh set KEY value    # set a secret
#   bash scripts/manage-secrets.sh delete KEY       # delete a secret
#   bash scripts/manage-secrets.sh sync             # set all required secrets
# =============================================================================

set -euo pipefail

FW_REPO="srijanupadhyay11-create/playwright-automation-framework"
IAI_REPO="srijanupadhyay11-create/iai-test-ui"

REQUIRED_SECRETS=(
  "BASE_URL:Target app URL (default: https://rahulshettyacademy.com)"
  "TEST_USERNAME:Test user login"
  "TEST_PASSWORD:Test user password"
  "PLAYWRIGHT_WORKERS:Parallel workers count (default: 4)"
  "GH_TOKEN:GitHub PAT for private repo access"
)

fail() { echo "❌ $*" >&2; exit 1; }
ok()   { echo "✅ $*"; }

command -v gh >/dev/null 2>&1  || fail "gh CLI not installed"
gh auth status >/dev/null 2>&1 || fail "Not logged in to gh. Run: gh auth login"

case "${1:-help}" in
  list)
    echo "── Secrets in $FW_REPO ──"
    gh secret list --repo "$FW_REPO" 2>/dev/null || echo "  (none or no access)"
    echo ""
    echo "── Secrets in $IAI_REPO ──"
    gh secret list --repo "$IAI_REPO" 2>/dev/null || echo "  (none or no access)"
    ;;

  set)
    [[ $# -ge 3 ]] || fail "Usage: $0 set KEY value [--repo owner/repo]"
    KEY="$2"
    VALUE="$3"
    REPO="${5:-$FW_REPO}"
    echo "$VALUE" | gh secret set "$KEY" --repo "$REPO"
    ok "Secret '$KEY' set in $REPO"
    ;;

  delete)
    [[ $# -ge 2 ]] || fail "Usage: $0 delete KEY [--repo owner/repo]"
    KEY="$2"
    REPO="${4:-$FW_REPO}"
    gh secret delete "$KEY" --repo "$REPO"
    ok "Secret '$KEY' deleted from $REPO"
    ;;

  sync)
    echo "Setting required secrets for $FW_REPO..."
    echo ""
    for entry in "${REQUIRED_SECRETS[@]}"; do
      KEY="${entry%%:*}"
      DESC="${entry##*:}"
      echo "  $KEY — $DESC"
      read -r -s -p "  Value (Enter to skip): " VAL
      echo ""
      if [[ -n "$VAL" ]]; then
        echo "$VAL" | gh secret set "$KEY" --repo "$FW_REPO"
        ok "$KEY set"
      else
        echo "  ⏭  Skipped"
      fi
    done
    ;;

  *)
    echo "Usage:"
    echo "  $0 list                           # list secrets in both repos"
    echo "  $0 set KEY value                  # set secret in framework repo"
    echo "  $0 set KEY value --repo owner/r   # set secret in specific repo"
    echo "  $0 delete KEY                     # delete from framework repo"
    echo "  $0 sync                           # interactive setup of all secrets"
    ;;
esac
