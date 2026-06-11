#!/usr/bin/env bash
# =============================================================================
# IAI Self-Hosted GitHub Actions Runner Setup
# =============================================================================
# Usage:
#   bash scripts/setup-runner.sh
#
# Prerequisites:
#   - gh CLI installed and authenticated (gh auth login)
#   - The target GitHub repo must exist
#   - Run from the iai-test-ui directory
# =============================================================================

set -euo pipefail

RUNNER_DIR="$HOME/actions-runner"
RUNNER_VERSION="2.321.0"
RUNNER_LABEL="iai-runner"

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
log()  { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
ok()   { echo -e "\033[1;32m[OK]\033[0m    $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m  $*"; }
fail() { echo -e "\033[1;31m[FAIL]\033[0m  $*"; exit 1; }

# --------------------------------------------------------------------------
# 1. Detect repos
# --------------------------------------------------------------------------
detect_repos() {
  log "Detecting GitHub repos..."

  IAI_REPO=$(git -C "$(dirname "$0")/.." remote get-url origin 2>/dev/null \
    | sed 's|.*github.com[:/]||' | sed 's|\.git$||') || true

  FW_REPO=$(git -C "$HOME/Git/playwright-automation-framework" remote get-url origin 2>/dev/null \
    | sed 's|.*github.com[:/]||' | sed 's|\.git$||') || true

  log "IAI repo:       ${IAI_REPO:-<not found>}"
  log "Framework repo: ${FW_REPO:-<not found>}"

  if [[ -z "$IAI_REPO" && -z "$FW_REPO" ]]; then
    fail "Could not detect any GitHub repo. Run from inside a git repo."
  fi
}

# --------------------------------------------------------------------------
# 2. Install runner binary
# --------------------------------------------------------------------------
install_runner() {
  if [[ -f "$RUNNER_DIR/run.sh" ]]; then
    ok "Runner binary already present at $RUNNER_DIR"
    return
  fi

  log "Installing GitHub Actions runner v${RUNNER_VERSION}..."
  mkdir -p "$RUNNER_DIR"

  ARCH="x64"
  if [[ "$(uname -m)" == "arm64" ]]; then ARCH="arm64"; fi

  TARBALL="actions-runner-osx-${ARCH}-${RUNNER_VERSION}.tar.gz"
  URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${TARBALL}"

  log "Downloading from $URL"
  curl -fsSL "$URL" -o "/tmp/${TARBALL}"
  tar xzf "/tmp/${TARBALL}" -C "$RUNNER_DIR"
  rm "/tmp/${TARBALL}"
  ok "Runner binary installed."
}

# --------------------------------------------------------------------------
# 3. Register runner with a repo
# --------------------------------------------------------------------------
register_runner() {
  local REPO="$1"
  log "Registering runner with repo: $REPO"

  # Get registration token via gh CLI
  REG_TOKEN=$(gh api \
    --method POST \
    -H "Accept: application/vnd.github+json" \
    "/repos/${REPO}/actions/runners/registration-token" \
    --jq '.token')

  RUNNER_NAME="${RUNNER_LABEL}-$(hostname | tr '[:upper:]' '[:lower:]' | tr ' ' '-')"

  cd "$RUNNER_DIR"
  ./config.sh \
    --url "https://github.com/${REPO}" \
    --token "$REG_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "self-hosted,macOS,${RUNNER_LABEL}" \
    --unattended \
    --replace

  ok "Runner '$RUNNER_NAME' registered with $REPO"
}

# --------------------------------------------------------------------------
# 4. Install as a launchd service (macOS)
# --------------------------------------------------------------------------
install_service() {
  log "Installing runner as a launchd service..."
  cd "$RUNNER_DIR"

  # Use the built-in service install script
  ./svc.sh install 2>/dev/null || warn "Service install requires sudo — run: sudo $RUNNER_DIR/svc.sh install"
  ./svc.sh start  2>/dev/null  || warn "Service start requires sudo — run:  sudo $RUNNER_DIR/svc.sh start"

  ok "Runner service configured."
  log "To check status: sudo $RUNNER_DIR/svc.sh status"
  log "To stop:         sudo $RUNNER_DIR/svc.sh stop"
}

# --------------------------------------------------------------------------
# 5. Set required GitHub Secrets
# --------------------------------------------------------------------------
set_secrets() {
  local REPO="$1"
  log "Setting GitHub Secrets for $REPO..."

  # Only set secrets that aren't already present
  set_if_missing() {
    local NAME="$1"
    local VALUE="$2"
    if gh secret list --repo "$REPO" 2>/dev/null | grep -q "^${NAME}"; then
      warn "Secret $NAME already exists, skipping."
    else
      echo "$VALUE" | gh secret set "$NAME" --repo "$REPO"
      ok "Secret $NAME set."
    fi
  }

  set_if_missing "BASE_URL"            "https://rahulshettyacademy.com"
  set_if_missing "PLAYWRIGHT_WORKERS"  "4"

  # Prompt for sensitive secrets
  echo ""
  read -r -p "Enter TEST_USERNAME (or press Enter to skip): " TEST_USER
  if [[ -n "$TEST_USER" ]]; then
    echo "$TEST_USER" | gh secret set "TEST_USERNAME" --repo "$REPO"
    ok "TEST_USERNAME set."
  fi

  read -r -s -p "Enter TEST_PASSWORD (or press Enter to skip): " TEST_PASS
  echo ""
  if [[ -n "$TEST_PASS" ]]; then
    echo "$TEST_PASS" | gh secret set "TEST_PASSWORD" --repo "$REPO"
    ok "TEST_PASSWORD set."
  fi

  # GitHub token for IAI to access private repo
  read -r -s -p "Enter GitHub PAT token for repo access (or Enter to skip): " GH_PAT
  echo ""
  if [[ -n "$GH_PAT" ]]; then
    echo "$GH_PAT" | gh secret set "GH_TOKEN" --repo "$REPO"
    ok "GH_TOKEN set."
  fi
}

# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
main() {
  echo ""
  echo "╔═══════════════════════════════════════════════╗"
  echo "║   IAI Self-Hosted Runner Setup                ║"
  echo "╚═══════════════════════════════════════════════╝"
  echo ""

  # Check prerequisites
  command -v gh >/dev/null 2>&1   || fail "gh CLI not found. Install: brew install gh && gh auth login"
  command -v curl >/dev/null 2>&1 || fail "curl not found."
  gh auth status >/dev/null 2>&1  || fail "Not authenticated with gh. Run: gh auth login"

  detect_repos
  install_runner

  # Register with framework repo (tests run here)
  if [[ -n "${FW_REPO:-}" ]]; then
    register_runner "$FW_REPO"
    set_secrets "$FW_REPO"
  fi

  # Register with IAI repo (CI for the web app)
  if [[ -n "${IAI_REPO:-}" ]]; then
    # Ask if user wants to register with IAI repo too
    echo ""
    read -r -p "Also register runner with iai-test-ui repo ($IAI_REPO)? [y/N] " REGISTER_IAI
    if [[ "$REGISTER_IAI" =~ ^[Yy]$ ]]; then
      register_runner "$IAI_REPO"
      set_secrets "$IAI_REPO"
    fi
  fi

  install_service

  echo ""
  echo "╔═══════════════════════════════════════════════════════════╗"
  echo "║   ✅  Self-hosted runner setup complete!                  ║"
  echo "╠═══════════════════════════════════════════════════════════╣"
  echo "║  Runner dir:   $RUNNER_DIR"
  echo "║  Runner label: self-hosted, macOS, $RUNNER_LABEL"
  echo "║                                                           ║"
  echo "║  Trigger a test run:                                      ║"
  if [[ -n "${FW_REPO:-}" ]]; then
  echo "║  gh workflow run playwright-tests.yml \\                   ║"
  echo "║    --repo $FW_REPO"
  fi
  echo "╚═══════════════════════════════════════════════════════════╝"
  echo ""
}

main "$@"
