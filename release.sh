#!/usr/bin/env bash
# release.sh — Tag and prepare a KSoR release
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}$1${NC}"; }
warn() { echo -e "${YELLOW}$1${NC}"; }
error() { echo -e "${RED}$1${NC}" >&2; exit 1; }

# Check prerequisites
command -v git >/dev/null || error "git not found"
command -v npm >/dev/null || error "npm not found"

# Ensure we're in the KSoR directory
cd "$(dirname "$0")"

# Check for uncommitted changes
if ! git diff --quiet; then
  error "Uncommitted changes. Commit or stash before releasing."
fi

# Get version from instance.md
VERSION=$(grep "^scaffolded:" instance.md | awk '{print $2}' | tr -d '"')
if [ -z "$VERSION" ]; then
  error "Could not determine version from instance.md"
fi

log "Releasing KSoR version: $VERSION"

# Build the static site
log "Building static site..."
npm run build

# Check build.lock.json exists and has content
if [ ! -f "build.lock.json" ]; then
  error "build.lock.json not found after build"
fi

BUILD_ID=$(grep '"build_id"' build.lock.json | awk -F'"' '{print $4}')
log "Build ID: $BUILD_ID"

# Commit build artifacts
git add build.lock.json
git commit -m "Release $VERSION — build $BUILD_ID" --allow-empty

# Tag the release
git tag -a "v$VERSION" -m "KSoR release $VERSION"
log "Tagged: v$VERSION"

# Push
read -p "Push to remote? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git push origin main
  git push origin "v$VERSION"
  log "Pushed to remote"
fi

log "Release $VERSION complete!"
log ""
log "Next steps:"
log "  1. Verify deployment at your Vercel URL"
log "  2. Test MCP server: curl -X POST https://your-mcp-url/mcp -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"search\",\"arguments\":{\"query\":\"cancellation\",\"k\":1}}}'"
log "  3. Verify admin dashboard sign-in works"
