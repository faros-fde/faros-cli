# Faros CLI

[![npm version](https://badge.fury.io/js/@faros-fde-sandbox%2Fcli.svg)](https://www.npmjs.com/package/@faros-fde-sandbox/cli)
[![Test](https://github.com/faros-fde/faros-cli/actions/workflows/test.yml/badge.svg)](https://github.com/faros-fde/faros-cli/actions/workflows/test.yml)

CLI for Faros AI - sync test results, CI/CD events, and Linear data.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [faros sync tests](#faros-sync-tests)
  - [faros sync ci-cd](#faros-sync-ci-cd)
  - [faros sync linear](#faros-sync-linear)
  - [faros logs](#faros-logs)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Configuration File](#configuration-file)
  - [Configuration Priority](#configuration-priority)
  - [CI/CD Environments](#cicd-environments)
- [Global Options](#global-options)
- [Validation](#validation)
- [CI/CD Integration](#cicd-integration)
  - [GitHub Actions](#github-actions)
  - [Jenkins](#jenkins)
  - [GitLab CI](#gitlab-ci)
  - [CircleCI](#circleci)
  - [Bitbucket Pipelines](#bitbucket-pipelines)
- [URI Formats](#uri-formats)
- [Development](#development)
- [License](#license)

## Installation

```bash
npm install -g @faros-fde-sandbox/cli
```

## Quick Start

```bash
# Sync test results
faros sync tests test-results/*.xml \
  --source "Jenkins" \
  --commit "GitHub://myorg/myrepo/abc123"

# Report build status
faros sync ci-cd build \
  --status Success \
  --commit "GitHub://myorg/myrepo/abc123" \
  --run "Jenkins://myorg/pipeline/456"

# Report deployment status
faros sync ci-cd deploy \
  --status Success \
  --commit "GitHub://myorg/myrepo/abc123" \
  --deploy "Kubernetes://myapp/Prod/deploy-789"

# Sync Linear data (after setting LINEAR_API_KEY env var)
faros sync linear --cutoff-days 30
```

## Commands

### `faros sync tests`

Sync test results (JUnit, TestNG, xUnit, Cucumber, Mocha) to Faros.

**Usage:**
```bash
faros sync tests <paths...> [options]
```

**Options:**
- `--format <format>` - Test format (junit, testng, xunit, cucumber, mocha)
- `--type <type>` - Test type (Unit, Integration, Functional, etc.)
- `--source <source>` - Test source system (e.g. Jenkins, GitHub-Actions)
- `--commit <uri>` - Commit URI: `<source>://<org>/<repo>/<sha>`
- `--test-start <time>` - Test start time (ISO-8601, epoch millis, or "Now")
- `--test-end <time>` - Test end time (ISO-8601, epoch millis, or "Now")
- `--concurrency <number>` - Concurrent uploads (default: 8)
- `--validate` - Validate only, don't send (fast, offline)
- `--preview` - Show sample records

**Examples:**

Local files:
```bash
faros sync tests test-results/*.xml \
  --source "Jenkins" \
  --commit "GitHub://myorg/myrepo/abc123"
```

Validate before syncing:
```bash
faros sync tests *.xml --validate
```

#### `faros sync ci-cd`

Sync CI/CD events (builds and deployments) to Faros.

**Subcommands:**
- `faros sync ci-cd build` - Report build status
- `faros sync ci-cd deploy` - Report deployment status

**Build Example:**
```bash
faros sync ci-cd build \
  --status Success \
  --commit "GitHub://myorg/myrepo/abc123" \
  --run "Jenkins://myorg/pipeline/456" \
  --run-start-time "2024-01-15T10:00:00Z" \
  --run-end-time "2024-01-15T10:05:00Z" \
  --artifact "Docker://myorg/image/v1.0.0"
```

**Deploy Example:**
```bash
faros sync ci-cd deploy \
  --status Success \
  --commit "GitHub://myorg/myrepo/abc123" \
  --deploy "Kubernetes://myapp/Prod/deploy-789" \
  --deploy-start-time "2024-01-15T11:00:00Z" \
  --deploy-end-time "2024-01-15T11:03:00Z"
```

### `faros sync linear`

Sync Linear issues, projects, teams, and users to Faros.

**Usage:**
```bash
faros sync linear [options]
```

**Options:**
- `--cutoff-days <days>` - Fetch issues updated in the last N days (default: 90)
- `--page-size <size>` - Number of records per API call, 1-250 (default: 50)
- `--preview` - Show sync configuration without executing

**Required Environment Variables:**
- `LINEAR_API_KEY` - Linear API key (get from https://linear.app/settings/api)
- `FAROS_API_KEY` - Faros API key

**Configuration Priority:**
1. CLI options (`--linear-api-key`, `--cutoff-days`)
2. Environment variables (`LINEAR_API_KEY`, `FAROS_API_KEY`, `FAROS_GRAPH`, `FAROS_ORIGIN`)
3. Config file (`faros.config.yaml`)
4. Built-in defaults (ships with the CLI)

**Examples:**

Minimal setup - just create a `.env` file:
```bash
# .env
LINEAR_API_KEY=lin_api_xxx
FAROS_API_KEY=your_faros_key
```

Then run (uses default config):
```bash
faros sync linear
```

Override defaults with your own `faros.config.yaml`:
```yaml
graph: production
origin: my-company

sources:
  linear:
    cutoffDays: 30    # Fetch last 30 days
    pageSize: 100     # Larger page size
```

**Security Note:** 
- ✅ API keys go in `.env` file (auto-loaded, never commit)
- ✅ Config goes in `faros.config.yaml` (safe to commit)
- ❌ Never put API keys in `faros.config.yaml` (CLI strips them anyway)

Sync only recent issues (override config):
```bash
faros sync linear --cutoff-days 7
```

Preview configuration before syncing:
```bash
faros sync linear --preview
```

**What gets synced:**
- **Teams** - All teams in your Linear workspace
- **Projects** - All projects including leads and team assignments
- **Issues** - Issues updated within the cutoff period (default: 90 days)
- **Users** - All users in your workspace

**Requirements:**
- Docker must be running
- Linear API key with read permissions
- Faros API key and graph configured

**Notes:**
- Issues are filtered by update date using the `--cutoff-days` parameter
- The connector uses pagination to handle large datasets
- All timestamps and relationships are preserved

### `faros logs`

View and manage the CLI log file.

**Usage:**
```bash
faros logs [options]
```

**Options:**
- `-f, --tail` - Follow log file in real-time (like `tail -f`)
- `-n, --lines <count>` - Show last n lines
- `--clear` - Clear the log file
- `--path` - Show log file path

**Examples:**

View entire log file:
```bash
faros logs
```

Follow log file in real-time:
```bash
faros logs --tail
```

Show last 100 lines:
```bash
faros logs --lines 100
```

Clear the log file:
```bash
faros logs --clear
```

Show log file path:
```bash
faros logs --path
```

**Log File Location:**
- Logs are written to `./faros.log` in the working directory
- Log file is created automatically on first CLI operation
- Use `faros logs --clear` to clean up old logs

**Log Format:**
- JSON format (one entry per line)
- Includes timestamp, level, process ID, and message
- Credentials are automatically redacted

## Configuration

The CLI ships with sensible defaults in `faros.config.yaml`, so most users only need to set up a `.env` file with their API keys.

**Quick Setup:**
1. Create a `.env` file with your API keys:
   ```
   FAROS_API_KEY=your_faros_api_key
   LINEAR_API_KEY=your_linear_api_key  # if using Linear sync
   ```
2. Run CLI commands - the default config handles the rest!

### Two-File Configuration Approach

The CLI separates configuration into two types:
- **`.env` file** - Secrets and API keys (never commit this!)
- **`faros.config.yaml`** - Non-sensitive defaults (safe to commit)

A default `faros.config.yaml` is included with sensible defaults:
- API URL: `https://prod.api.faros.ai`
- Graph: `default`
- Origin: `faros-cli`
- Linear cutoff: 180 days

You can override these by creating your own `faros.config.yaml` or using environment variables.

### Environment Variables

The CLI can be configured entirely through environment variables, which is ideal for CI/CD pipelines where `.env` files are not available.

#### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FAROS_API_KEY` | Faros API key (required for all operations) | `your_faros_api_key_here` |
| `LINEAR_API_KEY` | Linear API key (required for `faros sync linear`) | `lin_api_xxx` |

#### Optional Faros Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `FAROS_URL` | Faros API URL | `https://prod.api.faros.ai` | `https://prod.api.faros.ai` |
| `FAROS_GRAPH` | Target graph name | `default` | `my-graph` |
| `FAROS_ORIGIN` | Origin identifier for synced data | `faros-cli` | `my-company-ci` |

#### Logging and Debug

| Variable | Description | Values | Default |
|----------|-------------|--------|---------|
| `FAROS_LOG_LEVEL` | Log level | `debug`, `info`, `warn`, `error` | `info` |
| `FAROS_DEBUG` | Enable debug mode | `true`, `false` | `false` |

### Configuration File

The CLI ships with a default `faros.config.yaml` that works out of the box. You can override it by creating your own `faros.config.yaml` in your project:

```yaml
# Override API configuration (optional)
url: https://prod.api.faros.ai
graph: production  # use a different graph
origin: my-company-ci  # custom origin identifier

# Customize Linear sync defaults
sources:
  linear:
    cutoffDays: 30  # fetch last 30 days instead of default 180

# Default values for commands
defaults:
  testSource: Jenkins
  testType: Unit
  concurrency: 8
```

**Important:** Never put API keys in `faros.config.yaml`! The CLI automatically strips any credentials from config files. All secrets must be in `.env` or environment variables.

### Configuration Priority

Configuration is loaded in this order (highest priority first):

1. **CLI options**: `--api-key`, `--graph`, etc.
2. **Environment variables**: `FAROS_API_KEY`, `FAROS_GRAPH`, etc.
3. **Config file**: `faros.config.yaml` (or `.yml`, `.json`)
4. **Defaults**: Built-in defaults

**Config file search order**: `faros.config.yaml` → `faros.config.yml` → `faros.config.json` → `.farosrc.*`

### CI/CD Environments

In CI/CD pipelines where `.env` files cannot be used, configure the CLI entirely through environment variables stored as secrets in your CI/CD platform.

#### Setting Up Environment Variables

**GitHub Actions:**
1. Go to repository Settings → Secrets and variables → Actions
2. Add `FAROS_API_KEY` as a repository secret
3. Reference in workflows using `${{ secrets.FAROS_API_KEY }}`

**GitLab CI:**
1. Go to Settings → CI/CD → Variables
2. Add `FAROS_API_KEY` as a masked and protected variable
3. Variables are automatically available in pipeline jobs

**Jenkins:**
1. Go to Credentials → System → Global credentials
2. Add secret text with ID `faros-api-key`
3. Reference using `credentials('faros-api-key')`

**CircleCI:**
1. Go to Project Settings → Environment Variables
2. Add `FAROS_API_KEY`
3. Variables are automatically available in jobs

**Bitbucket Pipelines:**
1. Go to Repository settings → Pipelines → Repository variables
2. Add `FAROS_API_KEY` as a secured variable
3. Variables are automatically available in pipeline steps

#### Example: Minimal CI/CD Configuration

For most CI/CD use cases, only `FAROS_API_KEY` is required:

```bash
# Set this as a secret in your CI/CD platform
FAROS_API_KEY=your_api_key_here

# Optional: Override defaults
FAROS_GRAPH=production
FAROS_URL=https://prod.api.faros.ai
```

Then in your pipeline:

```bash
# Environment variables are automatically picked up
faros sync tests test-results/*.xml \
  --source "Jenkins" \
  --commit "GitHub://myorg/myrepo/$COMMIT_SHA"
```

#### Example: Full Configuration via Environment Variables

For advanced setups, all configuration can be provided via environment variables:

```bash
# Required
FAROS_API_KEY=your_api_key_here

# Faros configuration
FAROS_URL=https://prod.api.faros.ai
FAROS_GRAPH=production
FAROS_ORIGIN=github-actions

# Logging
FAROS_LOG_LEVEL=info
```

## Global Options

All commands support these global options:

- `-k, --api-key <key>` - Faros API key
- `-u, --url <url>` - Faros API URL
- `-g, --graph <name>` - Faros graph name
- `--debug` - Enable debug logging
- `--quiet` - Minimal output
- `--json` - Output JSON (for scripting)
- `--no-color` - Disable colors

## Validation

The CLI supports two verification modes before syncing to production:

### 1. `--validate` (Fast, Offline)

Validate data without sending to Faros:

```bash
faros sync tests *.xml --validate
```

**Output:**
```
✓ Parsed 24 test suites
✓ All data is valid

Would create:
  • 24 qa_TestExecution records
  • 1,234 qa_TestCase records

Run without --validate to sync to Faros
```

### 2. `--preview` (Sample Preview)

Show sample records that would be created:

```bash
faros sync tests *.xml --preview
```

**Output:**
```
✓ Parsed 24 test suites

Sample records (first 2):

qa_TestExecution:
  {
    "suite": "AuthTests",
    "source": "Jenkins",
    "status": "Success",
    "stats": { "passed": 45, "failed": 0 }
  }

Run without --preview to sync to Faros
```

**Testing with Different Environments:**

To sync to different environments or graphs, use the `FAROS_GRAPH` environment variable or the `-g/--graph` flag:

```bash
# Sync to staging graph
FAROS_GRAPH=staging faros sync tests *.xml

# Or use the flag
faros sync tests *.xml --graph staging
```

## CI/CD Integration

The Faros CLI integrates seamlessly with CI/CD platforms using environment variables. Store `FAROS_API_KEY` as a secret in your CI/CD platform and reference it in your pipeline configuration.

### GitHub Actions

```yaml
- name: Sync Test Results
  if: always()
  run: |
    npx @faros-fde-sandbox/cli sync tests test-results/*.xml \
      --source "GitHub-Actions" \
      --commit "GitHub://${{ github.repository }}/${{ github.sha }}"
  env:
    FAROS_API_KEY: ${{ secrets.FAROS_API_KEY }}

- name: Report Build Status
  run: |
    npx @faros-fde-sandbox/cli sync ci-cd build \
      --status Success \
      --commit "GitHub://${{ github.repository }}/${{ github.sha }}" \
      --run "GitHub-Actions://${{ github.repository }}/${{ github.run_id }}"
  env:
    FAROS_API_KEY: ${{ secrets.FAROS_API_KEY }}
```

### Jenkins

```groovy
environment {
  FAROS_API_KEY = credentials('faros-api-key')
}

stage('Test') {
  steps {
    sh 'npm test'
  }
}

stage('Sync Results') {
  steps {
    sh '''
      faros sync tests test-results/*.xml \
        --source "Jenkins" \
        --commit "GitHub://org/repo/${GIT_COMMIT}"
    '''
  }
}

stage('Report Build Status') {
  steps {
    sh '''
      faros sync ci-cd build \
        --status Success \
        --commit "GitHub://org/repo/${GIT_COMMIT}" \
        --run "Jenkins://org/pipeline/${BUILD_ID}"
    '''
  }
}
```

### GitLab CI

```yaml
test:
  stage: test
  script:
    - npm test
  artifacts:
    reports:
      junit: test-results/*.xml

sync_results:
  stage: deploy
  script:
    - npm install -g @faros-fde-sandbox/cli
    - |
      faros sync tests test-results/*.xml \
        --source "GitLab-CI" \
        --commit "GitLab://${CI_PROJECT_PATH}/${CI_COMMIT_SHA}"
  variables:
    FAROS_API_KEY: $FAROS_API_KEY
  when: always

report_build:
  stage: deploy
  script:
    - |
      faros sync ci-cd build \
        --status Success \
        --commit "GitLab://${CI_PROJECT_PATH}/${CI_COMMIT_SHA}" \
        --run "GitLab-CI://${CI_PROJECT_PATH}/${CI_PIPELINE_ID}"
  variables:
    FAROS_API_KEY: $FAROS_API_KEY
```

### CircleCI

```yaml
version: 2.1

jobs:
  test:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - run:
          name: Run Tests
          command: npm test
      - store_test_results:
          path: test-results
      - run:
          name: Sync Test Results to Faros
          when: always
          command: |
            npx @faros-fde-sandbox/cli sync tests test-results/*.xml \
              --source "CircleCI" \
              --commit "GitHub://${CIRCLE_PROJECT_USERNAME}/${CIRCLE_PROJECT_REPONAME}/${CIRCLE_SHA1}"
          environment:
            FAROS_API_KEY: ${FAROS_API_KEY}
      - run:
          name: Report Build Status
          command: |
            npx @faros-fde-sandbox/cli sync ci-cd build \
              --status Success \
              --commit "GitHub://${CIRCLE_PROJECT_USERNAME}/${CIRCLE_PROJECT_REPONAME}/${CIRCLE_SHA1}" \
              --run "CircleCI://${CIRCLE_PROJECT_USERNAME}/${CIRCLE_PROJECT_REPONAME}/${CIRCLE_BUILD_NUM}"
          environment:
            FAROS_API_KEY: ${FAROS_API_KEY}

workflows:
  test-and-sync:
    jobs:
      - test
```

### Bitbucket Pipelines

```yaml
pipelines:
  default:
    - step:
        name: Test
        script:
          - npm test
        artifacts:
          - test-results/**
    - step:
        name: Sync Results to Faros
        script:
          - npm install -g @faros-fde-sandbox/cli
          - |
            faros sync tests test-results/*.xml \
              --source "Bitbucket-Pipelines" \
              --commit "Bitbucket://${BITBUCKET_REPO_FULL_NAME}/${BITBUCKET_COMMIT}"
          - |
            faros sync ci-cd build \
              --status Success \
              --commit "Bitbucket://${BITBUCKET_REPO_FULL_NAME}/${BITBUCKET_COMMIT}" \
              --run "Bitbucket-Pipelines://${BITBUCKET_REPO_FULL_NAME}/${BITBUCKET_BUILD_NUMBER}"
        condition:
          changesets:
            includePaths:
              - "**"
```

## URI Formats

### Commit URI
`<source>://<org>/<repo>/<sha>`

Examples:
- `GitHub://myorg/myrepo/abc123def`
- `GitLab://company/project/xyz789`

### Run URI
`<source>://<org>/<pipeline>/<id>`

Examples:
- `Jenkins://myorg/pipeline/456`
- `GitHub-Actions://myorg/repo/12345`

### Deploy URI
`<source>://<app>/<env>/<id>`

Examples:
- `Kubernetes://myapp/Prod/deploy-789`
- `ECS://api-service/Staging/deploy-456`

### Artifact URI
`<source>://<org>/<repo>/<id>`

Examples:
- `Docker://myorg/image/v1.0.0`
- `NPM://myorg/package/2.3.4`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Link for local testing
npm link

# Test
npm test

# Lint
npm run lint
```

### Testing

The CLI has comprehensive test coverage to ensure reliability:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

**Test Structure:**
- `src/**/*.test.ts` - Unit and integration tests alongside source files
- `test/fixtures/` - Sample test result files for various formats
- `test/utils/` - Test utilities and helpers

**Coverage Thresholds:**
- Core modules (config, API client, logger): >80% coverage
- Critical paths enforce per-file thresholds
- Overall project: >25% (command handlers require E2E testing)

**What's Tested:**
- ✅ Configuration loading and priority (CLI > env > file > defaults)
- ✅ API client with retry logic and error handling
- ✅ Logger with redaction of sensitive data
- ✅ Test result parsing (JUnit, TestNG, xUnit, Cucumber, Mocha)
- ✅ CI/CD event creation and validation
- ✅ URI format validation
- ✅ Validation and preview modes

**Continuous Integration:**
Tests run automatically on every push and pull request via GitHub Actions. Coverage reports are uploaded to Codecov.

**Test Result Syncing:**
Test results are automatically synced to Faros AI after every test run on the `main` branch. This provides observability into test health, trends, and failures over time. Results are synced using the CLI itself:

```bash
faros sync tests test-results/junit.xml \
  --source "GitHub-Actions" \
  --type "Unit" \
  --commit "GitHub://faros-fde/faros-cli/$COMMIT_SHA"
```

View synced test results in the Faros UI under the `qa_TestExecution` model.

### End-to-End Testing

E2E tests validate the full CLI workflow by actually syncing test results to Faros AI.

**Run E2E tests:**

```bash
# Run E2E tests
FAROS_API_KEY=xxx ./scripts/e2e-test-sync.sh
```

**What's tested:**
- ✅ Parsing test result files (JUnit, TestNG, Mocha)
- ✅ Data validation and transformation
- ✅ API communication with Faros
- ✅ Error handling and reporting

**See the full guide:** [docs/e2e-testing.md](docs/e2e-testing.md)

### Publishing

See [PUBLISHING.md](PUBLISHING.md) for instructions on publishing new versions to npm.

## License

Apache-2.0
