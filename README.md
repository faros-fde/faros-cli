# Faros CLI

[![npm version](https://badge.fury.io/js/@faros-fde-sandbox%2Fcli.svg)](https://www.npmjs.com/package/@faros-fde-sandbox/cli)

CLI for Faros AI - sync test results and CI/CD events.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [faros sync tests](#faros-sync-tests)
  - [faros sync ci-cd](#faros-sync-ci-cd)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Configuration File](#configuration-file)
  - [Configuration Priority](#configuration-priority)
  - [CI/CD Environments](#cicd-environments)
- [Global Options](#global-options)
- [Dry Run & Validation](#dry-run--validation)
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
- `--dry-run` - Sync to staging graph

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

Dry run to staging:
```bash
faros sync tests *.xml --dry-run
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

## Configuration

The CLI uses a two-file configuration approach:

### Environment Variables

The CLI can be configured entirely through environment variables, which is ideal for CI/CD pipelines where `.env` files are not available.

#### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FAROS_API_KEY` | Faros API key (required for all operations) | `your_faros_api_key_here` |

#### Optional Faros Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `FAROS_URL` | Faros API URL | `https://prod.api.faros.ai` | `https://prod.api.faros.ai` |
| `FAROS_GRAPH` | Target graph name | `default` | `my-graph` |
| `FAROS_STAGING_GRAPH` | Staging graph for dry runs | `default-staging` | `my-graph-staging` |
| `FAROS_ORIGIN` | Origin identifier for synced data | - | `my-company-ci` |

#### Logging and Debug

| Variable | Description | Values | Default |
|----------|-------------|--------|---------|
| `FAROS_LOG_LEVEL` | Log level | `debug`, `info`, `warn`, `error` | `info` |
| `FAROS_DEBUG` | Enable debug mode | `true`, `false` | `false` |

### Configuration File

Store non-sensitive configuration in `faros.config.yaml`:

```yaml
# Faros API configuration
url: https://prod.api.faros.ai
graph: default
stagingGraph: default-staging
origin: my-company-ci

# Default values for commands
defaults:
  testSource: Jenkins
  testType: Unit
  concurrency: 8
```

See `faros.config.example.yaml` for a complete template with detailed comments.

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
FAROS_STAGING_GRAPH=production-staging
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

## Dry Run & Validation

The CLI supports three verification modes:

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

### 2. `--dry-run` (Full E2E, Staging Graph)

Sync to a staging graph for full verification:

```bash
faros sync tests *.xml --dry-run
```

**Output:**
```
⚠ Dry-run mode: syncing to staging graph 'default-staging'

Uploading |████████████████████| 100% | 24/24 suites

✓ Synced 24 test suites to staging graph
  Graph: default-staging
  View in Faros: https://app.faros.ai/default-staging/qa

To sync to production, run without --dry-run
```

### 3. `--preview` (Sample Preview)

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

Run with --dry-run to sync to staging
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
- ✅ Dry-run and validation modes

**Continuous Integration:**
Tests run automatically on every push and pull request via GitHub Actions. Coverage reports are uploaded to Codecov.

### Publishing

See [PUBLISHING.md](PUBLISHING.md) for instructions on publishing new versions to npm.

## License

Apache-2.0
