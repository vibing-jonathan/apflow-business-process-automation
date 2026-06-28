#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"
SKIP_INSTALL=0
SKIP_BUILD=0
NO_START=0
RESET_AND_SEED=0
FORCE_MOCK_AI=0

usage() {
  cat <<'EOF'
Usage: scripts/deploy-local.sh [options]

Build and run APFlow locally in production mode.

Options:
  --port PORT              Port for next start. Defaults to 3000 or $PORT.
  --host HOST              Hostname for next start. Defaults to 127.0.0.1 or $HOST.
  --skip-install           Do not run npm ci.
  --skip-build             Do not run npm run build.
  --no-start               Prepare the app but do not start the server.
  --mock-ai                Force deterministic mock extraction for this process.
  --reset-and-seed-demo    Reset local SQLite data and seed demo data. Destructive.
  -h, --help               Show this help.

By default the script preserves existing SQLite data. If the database has no
users after schema sync, it seeds demo data automatically so the app can run.
EOF
}

log() {
  printf '\n==> %s\n' "$1"
}

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      [[ $# -ge 2 ]] || die "--port requires a value"
      PORT="$2"
      shift 2
      ;;
    --host)
      [[ $# -ge 2 ]] || die "--host requires a value"
      HOST="$2"
      shift 2
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --no-start)
      NO_START=1
      shift
      ;;
    --mock-ai)
      FORCE_MOCK_AI=1
      shift
      ;;
    --reset-and-seed-demo)
      RESET_AND_SEED=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

[[ "$PORT" =~ ^[0-9]+$ ]] || die "--port must be numeric"

cd "$ROOT_DIR"

command -v node >/dev/null 2>&1 || die "node is required"
command -v npm >/dev/null 2>&1 || die "npm is required"

log "Deploying APFlow from $ROOT_DIR"

if [[ "$FORCE_MOCK_AI" -eq 1 ]]; then
  export APFLOW_EXTRACTION_PROVIDER=mock
fi

if [[ -z "${GEMINI_API_KEY:-}${GOOGLE_API_KEY:-}${GOOGLE_GENERATIVE_AI_API_KEY:-}" ]]; then
  printf 'No Gemini API key found; extraction will use the mock fallback unless configured otherwise.\n'
fi

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  log "Installing dependencies"
  npm ci
fi

log "Preparing runtime directories"
mkdir -p uploads

if [[ "$RESET_AND_SEED" -eq 1 ]]; then
  log "Resetting and seeding local demo database"
  npm run db:reset
else
  log "Generating Prisma client"
  npm run db:generate

  log "Syncing local database schema"
  npm run db:push

  USER_COUNT="$(
    node <<'NODE'
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  console.log(count);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
NODE
  )"

  if [[ "$USER_COUNT" == "0" ]]; then
    log "Seeding demo data because the database has no users"
    npm run db:seed
  else
    printf 'Existing local data detected; skipping demo seed.\n'
  fi
fi

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  log "Building production app"
  npm run build
fi

if [[ "$NO_START" -eq 1 ]]; then
  log "Local deploy prepared"
  printf 'Start with: npm run start -- -p %s -H %s\n' "$PORT" "$HOST"
  exit 0
fi

log "Starting APFlow at http://$HOST:$PORT"
exec npm run start -- -p "$PORT" -H "$HOST"
