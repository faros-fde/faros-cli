# Faros CLI

[![npm version](https://badge.fury.io/js/@faros-fde-sandbox%2Fcli.svg)](https://www.npmjs.com/package/@faros-fde-sandbox/cli)

CLI for Faros AI - sync data, manage sources, view logs.

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

# View logs
faros logs

# List configured sources
faros sources list
```

## Commands

### `faros sync`

Sync data from various sources to Faros.

#### `faros sync tests`

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

From S3:
```bash
faros sync tests s3://bucket/junit/ \
  --pattern ".*\\.xml$" \
  --s3-region us-east-1 \
  --source "Jenkins"
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

### `faros sources`

Manage data sources.

**Commands:**
- `faros sources list` - List all configured sources
- `faros sources get <name>` - Get source details

**Example:**
```bash
$ faros sources list

Configured Sources:

┌────────┬────────┬────────┬────────────────────┐
│ Source │ Type   │ Status │ Config             │
├────────┼────────┼────────┼────────────────────┤
│ linear │ Linear │ ✓      │ Configured         │
│ github │ GitHub │ ✓      │ Configured         │
│ s3     │ S3     │ ⚠      │ Missing credentials│
└────────┴────────┴────────┴────────────────────┘
```

### `faros logs`

View sync logs and debug information.

**Usage:**
```bash
faros logs [options]
```

**Options:**
- `--level <level>` - Filter by log level (info, warn, error, debug)
- `--since <time>` - Show logs since time (ISO-8601)
- `--until <time>` - Show logs until time (ISO-8601)
- `--out-file <path>` - Export logs to file

**Examples:**
```bash
# Recent logs
faros logs

# Error logs only
faros logs --level error

# Export logs
faros logs --out-file sync-logs.json

# Logs from specific time
faros logs --since "2024-01-15T10:00:00Z"
```

## Configuration

The CLI uses a two-file configuration approach:

### 1. Credentials (`.env`)

Store sensitive credentials in a `.env` file (never commit this!):

```bash
# Required
FAROS_API_KEY=your_faros_api_key_here

# Optional overrides
FAROS_URL=https://prod.api.faros.ai
FAROS_GRAPH=default

# Data source credentials
LINEAR_API_KEY=your_linear_api_key
GITHUB_TOKEN=your_github_token

# AWS credentials (for S3 test results)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
```

See `.env.example` for a complete template.

### 2. Configuration (`faros.config.yaml`)

Store non-sensitive configuration in `faros.config.yaml`:

```yaml
# Faros API configuration
url: https://prod.api.faros.ai
graph: default
stagingGraph: default-staging
origin: my-company-ci

# Data sources (credentials in .env)
sources:
  linear:
    type: Linear
    syncInterval: 1h
    streams:
      - issues
      - projects
      - teams
      - users

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

stage('Sync Results') {
  steps {
    sh '''
      faros sync tests test-results/*.xml \
        --source "Jenkins" \
        --commit "GitHub://org/repo/${GIT_COMMIT}"
    '''
  }
}
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

### Publishing

See [PUBLISHING.md](PUBLISHING.md) for instructions on publishing new versions to npm.

## License

Apache-2.0
