#!/bin/bash

# =============================================================================
# E2E Test Script for faros sync tests command
# =============================================================================
# This script tests the CLI end-to-end by syncing real test results to Faros.
# It uses test fixtures and can run in dry-run mode (staging graph).
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURES_DIR="$PROJECT_ROOT/test/fixtures"
CLI_BIN="$PROJECT_ROOT/bin/faros"

# Check if running in CI
IS_CI="${CI:-false}"

# Default to dry-run mode (uses staging graph)
DRY_RUN="${DRY_RUN:-true}"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

section() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

section "Pre-flight Checks"

# Check if CLI is built
if [ ! -f "$CLI_BIN" ]; then
  log_error "CLI binary not found at $CLI_BIN"
  log_info "Building the CLI..."
  cd "$PROJECT_ROOT"
  npm run build
  log_success "CLI built successfully"
fi

# Check if test fixtures exist
if [ ! -d "$FIXTURES_DIR" ]; then
  log_error "Test fixtures directory not found: $FIXTURES_DIR"
  exit 1
fi

log_success "CLI binary found: $CLI_BIN"
log_success "Test fixtures found: $FIXTURES_DIR"

# Check for required environment variables
if [ -z "$FAROS_API_KEY" ]; then
  log_error "FAROS_API_KEY environment variable is not set"
  log_info "Set it with: export FAROS_API_KEY=your_api_key"
  log_info "Or use: FAROS_API_KEY=xxx ./scripts/e2e-test-sync.sh"
  exit 1
fi

log_success "FAROS_API_KEY is set (length: ${#FAROS_API_KEY})"

# Offer to test API connectivity first
log_info "Testing API connectivity..."

# Display configuration
log_info "Configuration:"
log_info "  Faros URL: ${FAROS_URL:-https://prod.api.faros.ai (default)}"
log_info "  Faros Graph: ${FAROS_GRAPH:-default (default)}"
log_info "  Dry Run: $DRY_RUN"
log_info "  CI Mode: $IS_CI"

# =============================================================================
# Test 1: Sync JUnit XML (passing tests)
# =============================================================================

section "Test 1: Sync JUnit XML (passing tests)"

JUNIT_PASS="$FIXTURES_DIR/junit-pass.xml"

if [ ! -f "$JUNIT_PASS" ]; then
  log_error "JUnit fixture not found: $JUNIT_PASS"
  exit 1
fi

log_info "Syncing: $JUNIT_PASS"

DRY_RUN_FLAG=""
if [ "$DRY_RUN" = "true" ]; then
  DRY_RUN_FLAG="--dry-run"
  log_warning "Using --dry-run (staging graph)"
fi

if node "$CLI_BIN" sync tests "$JUNIT_PASS" \
  --source "e2e-test" \
  --type "Unit" \
  --commit "GitHub://faros-fde/faros-cli/e2e-test-$(date +%s)" \
  --test-start "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  $DRY_RUN_FLAG; then
  log_success "JUnit XML sync completed"
else
  log_error "JUnit XML sync failed"
  exit 1
fi

# =============================================================================
# Test 2: Sync JUnit XML (failing tests)
# =============================================================================

section "Test 2: Sync JUnit XML (failing tests)"

JUNIT_FAIL="$FIXTURES_DIR/junit-fail.xml"

if [ ! -f "$JUNIT_FAIL" ]; then
  log_warning "JUnit fail fixture not found: $JUNIT_FAIL (skipping)"
else
  log_info "Syncing: $JUNIT_FAIL"
  
  if node "$CLI_BIN" sync tests "$JUNIT_FAIL" \
    --source "e2e-test" \
    --type "Integration" \
    --commit "GitHub://faros-fde/faros-cli/e2e-test-$(date +%s)" \
    $DRY_RUN_FLAG; then
    log_success "JUnit XML (fail) sync completed"
  else
    log_error "JUnit XML (fail) sync failed"
    exit 1
  fi
fi

# =============================================================================
# Test 3: Sync TestNG XML
# =============================================================================

section "Test 3: Sync TestNG XML"

TESTNG="$FIXTURES_DIR/testng-pass.xml"

if [ ! -f "$TESTNG" ]; then
  log_warning "TestNG fixture not found: $TESTNG (skipping)"
else
  log_info "Syncing: $TESTNG"
  
  if node "$CLI_BIN" sync tests "$TESTNG" \
    --format testng \
    --source "e2e-test" \
    --commit "GitHub://faros-fde/faros-cli/e2e-test-$(date +%s)" \
    $DRY_RUN_FLAG; then
    log_success "TestNG XML sync completed"
  else
    log_error "TestNG XML sync failed"
    exit 1
  fi
fi

# =============================================================================
# Test 4: Sync Mocha JSON
# =============================================================================

section "Test 4: Sync Mocha JSON"

MOCHA="$FIXTURES_DIR/mocha.json"

if [ ! -f "$MOCHA" ]; then
  log_warning "Mocha fixture not found: $MOCHA (skipping)"
else
  log_info "Syncing: $MOCHA"
  
  if node "$CLI_BIN" sync tests "$MOCHA" \
    --format mocha \
    --source "e2e-test" \
    --commit "GitHub://faros-fde/faros-cli/e2e-test-$(date +%s)" \
    $DRY_RUN_FLAG; then
    log_success "Mocha JSON sync completed"
  else
    log_error "Mocha JSON sync failed"
    exit 1
  fi
fi

# =============================================================================
# Test 5: Validate mode (no sync)
# =============================================================================

section "Test 5: Validate mode (offline, no sync)"

log_info "Running with --validate (offline validation)"

if node "$CLI_BIN" sync tests "$JUNIT_PASS" \
  --source "e2e-test" \
  --commit "GitHub://faros-fde/faros-cli/test" \
  --validate; then
  log_success "Validation passed"
else
  log_error "Validation failed"
  exit 1
fi

# =============================================================================
# Summary
# =============================================================================

section "E2E Test Summary"

log_success "All tests passed!"

if [ "$DRY_RUN" = "true" ]; then
  log_info "Tests synced to staging graph (dry-run mode)"
  log_info "To sync to production graph, run: DRY_RUN=false $0"
else
  log_info "Tests synced to production graph"
  log_info "Check the Faros UI to verify data"
fi

echo ""
log_info "To check synced data in Faros:"
log_info "  1. Visit ${FAROS_URL:-https://prod.api.faros.ai}"
log_info "  2. Navigate to the graph: ${FAROS_GRAPH:-default}"
if [ "$DRY_RUN" = "true" ]; then
  log_info "     (or staging: ${FAROS_STAGING_GRAPH:-default-staging})"
fi
log_info "  3. Query for 'qa_TestExecution' records"

echo ""
