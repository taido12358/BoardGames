#!/bin/bash
# Polls a git branch every POLL_INTERVAL seconds.
# When a new commit is detected: pulls code, rebuilds images, restarts containers.
set -uo pipefail

BRANCH="${BRANCH:-master}"
POLL_INTERVAL="${POLL_INTERVAL:-60}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
REPO_DIR="${REPO_DIR:-/home/taido/boardgame}"

log()  { printf '\033[0;36m[%s]\033[0m %s\n'  "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
ok()   { printf '\033[0;32m[%s] ✓ %s\033[0m\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
warn() { printf '\033[0;33m[%s] ⚠ %s\033[0m\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >&2; }
err()  { printf '\033[0;31m[%s] ✗ %s\033[0m\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >&2; }

# ── Startup ──────────────────────────────────────────────────────────────────
log "Git branch watcher started"
log "  Repo:     $REPO_DIR"
log "  Branch:   $BRANCH"
log "  Interval: ${POLL_INTERVAL}s"
log "  Compose:  $COMPOSE_FILE"

cd "$REPO_DIR" || { err "Cannot access $REPO_DIR — is the volume mounted?"; exit 1; }

# Verify docker is reachable
if ! docker info >/dev/null 2>&1; then
  err "Cannot reach Docker daemon — is /var/run/docker.sock mounted?"
  exit 1
fi
ok "Docker daemon reachable"

# ── Poll loop ─────────────────────────────────────────────────────────────────
while true; do
  # Fetch remote refs without touching working tree
  if ! git fetch origin "$BRANCH" --quiet 2>&1; then
    warn "git fetch failed — retrying in ${POLL_INTERVAL}s"
    sleep "$POLL_INTERVAL"
    continue
  fi

  REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "")
  LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "")

  if [ -z "$REMOTE" ] || [ -z "$LOCAL" ]; then
    warn "Could not resolve commit hashes — retrying"
    sleep "$POLL_INTERVAL"
    continue
  fi

  if [ "$REMOTE" != "$LOCAL" ]; then
    log "───────────────────────────────────────────"
    log "New commits on '$BRANCH'"
    log "  Before: ${LOCAL:0:8}"
    log "  After:  ${REMOTE:0:8}"

    # Show commit messages
    git log --oneline "${LOCAL}..${REMOTE}" 2>/dev/null | head -10 | while IFS= read -r line; do
      log "  → $line"
    done

    # ── Pull ──────────────────────────────────────────────────────────────
    log "Pulling code..."
    if ! git reset --hard "origin/$BRANCH"; then
      err "git reset failed — aborting deploy, keeping old containers"
      sleep "$POLL_INTERVAL"
      continue
    fi
    ok "Code updated to ${REMOTE:0:8}"

    # ── Build ─────────────────────────────────────────────────────────────
    log "Building images (this may take a few minutes)..."
    if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build; then
      err "Build failed — keeping old containers running"
      sleep "$POLL_INTERVAL"
      continue
    fi
    ok "Build complete"

    # ── Deploy ────────────────────────────────────────────────────────────
    log "Restarting services..."
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans; then
      ok "Deploy complete ✓  (commit ${REMOTE:0:8})"
    else
      err "docker compose up failed — services may be in a degraded state"
    fi
    log "───────────────────────────────────────────"
  fi

  sleep "$POLL_INTERVAL"
done
