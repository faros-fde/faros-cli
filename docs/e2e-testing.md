# End-to-End Testing Guide

This guide explains how to run end-to-end tests for the Faros CLI that actually sync data to Faros AI.

## Overview

The E2E test script (`scripts/e2e-test-sync.sh`) validates the full CLI workflow:

1. ✅ **Parsing** - Parse test result files (JUnit, TestNG, Mocha, etc.)
2. ✅ **Validation** - Validate test data structure
3. ✅ **Transformation** - Transform to Faros event format
4. ✅ **API Communication** - Send events to Faros API
5. ✅ **Error Handling** - Handle failures gracefully

## Prerequisites

### 1. Build the CLI

```bash
npm run build
```

### 2. Set up Faros API credentials

You need a valid Faros API key. Get one from your Faros instance:

```bash
export FAROS_API_KEY="your_api_key_here"
```

### 3. Configure Faros instance (optional)

```bash
export FAROS_URL="https://prod.api.faros.ai"  # default
export FAROS_GRAPH="your-graph-name"          # default: "default"
export FAROS_STAGING_GRAPH="your-staging"     # default: "default-staging"
```

## Running E2E Tests

### Dry Run Mode (Recommended)

Syncs to staging graph without affecting production:

```bash
./scripts/e2e-test-sync.sh
```

or

```bash
FAROS_API_KEY=xxx ./scripts/e2e-test-sync.sh
```

### Production Mode

⚠️  Syncs to production graph (use with caution):

```bash
DRY_RUN=false FAROS_API_KEY=xxx ./scripts/e2e-test-sync.sh
```

## What Gets Tested

The script runs the following test scenarios:

### Test 1: JUnit XML (Passing Tests)
- **File**: `test/fixtures/junit-pass.xml`
- **Format**: JUnit
- **Type**: Unit tests
- **Expected**: All tests pass, data syncs successfully

### Test 2: JUnit XML (Failing Tests)
- **File**: `test/fixtures/junit-fail.xml`
- **Format**: JUnit
- **Type**: Integration tests
- **Expected**: Some tests fail, data syncs successfully

### Test 3: TestNG XML
- **File**: `test/fixtures/testng-pass.xml`
- **Format**: TestNG
- **Expected**: Data syncs successfully

### Test 4: Mocha JSON
- **File**: `test/fixtures/mocha.json`
- **Format**: Mocha
- **Expected**: Data syncs successfully

### Test 5: Validation Mode
- **Mode**: `--validate` (offline, no API calls)
- **Expected**: Validation passes without syncing

## Verifying Results

After running the e2e tests, verify the data in Faros:

1. **Visit your Faros instance**
   - URL: `https://your-instance.faros.ai` (or `https://prod.api.faros.ai`)

2. **Navigate to your graph**
   - Production: `your-graph-name`
   - Staging: `your-graph-name-staging` (if dry-run)

3. **Query for test execution records**
   ```graphql
   {
     qa_TestExecution {
       nodes {
         uid
         source
         status
         testCase {
           name
         }
       }
     }
   }
   ```

4. **Check for e2e test data**
   - Look for records with `source: "e2e-test"`
   - Verify commit URIs contain `faros-fde/faros-cli/e2e-test-`

## Troubleshooting

### Error: "FAROS_API_KEY environment variable is not set"

**Solution**: Export the API key:
```bash
export FAROS_API_KEY="your_key"
```

### Error: "CLI binary not found"

**Solution**: Build the CLI first:
```bash
npm run build
```

### Error: "Request failed with status code 404"

**Possible causes**:
1. Graph doesn't exist - create it in Faros UI
2. Wrong `FAROS_URL` - check your instance URL
3. Wrong `FAROS_GRAPH` - verify graph name
4. API key lacks permissions - check API key scope

**Debug**:
```bash
# Check API connectivity
curl -H "Authorization: Bearer $FAROS_API_KEY" \
  https://prod.api.faros.ai/graphs

# List available graphs
curl -H "Authorization: Bearer $FAROS_API_KEY" \
  https://prod.api.faros.ai/graphs
```

### Error: "Request failed with status code 401"

**Cause**: Invalid or expired API key

**Solution**: Generate a new API key from Faros UI

### Error: "Request failed with status code 403"

**Cause**: API key lacks write permissions

**Solution**: Ensure API key has `write` scope

## CI/CD Integration

You can run e2e tests in CI/CD pipelines:

### GitHub Actions Example

```yaml
name: E2E Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build CLI
        run: npm run build
      
      - name: Run E2E tests
        env:
          FAROS_API_KEY: ${{ secrets.FAROS_API_KEY }}
          DRY_RUN: true  # Always use staging in CI
        run: ./scripts/e2e-test-sync.sh
```

### Environment Variables in CI

Store secrets securely:
- GitHub Actions: Repository Settings > Secrets
- GitLab CI: Settings > CI/CD > Variables
- CircleCI: Project Settings > Environment Variables

**Required secrets**:
- `FAROS_API_KEY`

**Optional**:
- `FAROS_URL`
- `FAROS_GRAPH`
- `FAROS_STAGING_GRAPH`

## Manual Testing

For quick manual tests, you can run individual sync commands:

```bash
# Test with a single file
node bin/faros sync tests test/fixtures/junit-pass.xml \
  --source "manual-test" \
  --commit "GitHub://faros-fde/faros-cli/test" \
  --dry-run

# Test validation only (offline)
node bin/faros sync tests test/fixtures/*.xml --validate

# Test with preview (see sample records)
node bin/faros sync tests test/fixtures/mocha.json \
  --source "manual" \
  --commit "GitHub://test/test/abc123" \
  --preview
```

## Test Data Cleanup

E2E tests create data with identifiable patterns:
- **Source**: `e2e-test`
- **Commit**: `GitHub://faros-fde/faros-cli/e2e-test-<timestamp>`

To clean up test data from Faros:

```graphql
# Query for e2e test records
{
  qa_TestExecution(where: { source: { _eq: "e2e-test" } }) {
    nodes {
      uid
    }
  }
}
```

Then delete via Faros UI or API.

## Next Steps

- **Production testing**: Run with `DRY_RUN=false` after validating staging
- **Custom fixtures**: Add your own test result files to `test/fixtures/`
- **Scheduled tests**: Set up cron job or scheduled CI workflow
- **Monitoring**: Set up alerts for failed e2e tests
