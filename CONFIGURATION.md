# Faros CLI Configuration Guide

## Overview

The Faros CLI uses a two-file configuration approach to separate sensitive credentials from non-sensitive configuration:

- **`.env`**: Credentials and secrets (never commit!)
- **`faros.config.json`**: Non-sensitive configuration (safe to commit)

## Quick Start

### 1. Setup Credentials

Create a `.env` file in your project root:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```bash
FAROS_API_KEY=your_actual_api_key_here
```

### 2. Setup Configuration

Create a `faros.config.json` file:

```bash
cp faros.config.example.json faros.config.json
```

Edit `faros.config.json` to match your environment:

```json
{
  "graph": "production",
  "origin": "my-company-ci",
  "defaults": {
    "testSource": "Jenkins"
  }
}
```

## Configuration Files

### `.env` - Credentials File

Store all sensitive credentials here. This file should be added to `.gitignore` and never committed.

**Required:**
```bash
FAROS_API_KEY=your_faros_api_key
```

**Optional:**
```bash
# Faros Configuration
FAROS_URL=https://prod.api.faros.ai
FAROS_GRAPH=default
FAROS_ORIGIN=my-company-ci

# Data Source Credentials
LINEAR_API_KEY=your_linear_api_key
GITHUB_TOKEN=your_github_token

# AWS Credentials (for S3)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_PROFILE=default
```

### `faros.config.yaml` - Configuration File

Store non-sensitive configuration here. This file can be committed to version control.

**Why YAML?** Unlike JSON, YAML supports comments to explain each field!

**Minimal:**
```yaml
graph: default
```

**Complete:**
```yaml
# Faros API configuration
url: https://prod.api.faros.ai
graph: default
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
  
  github:
    type: GitHub
    syncInterval: 30m
  
  s3-tests:
    type: S3
    bucket: my-test-results
    region: us-east-1
    prefix: junit/
    pattern: ".*\\.xml$"

# Default values
defaults:
  testSource: Jenkins
  testType: Unit
  concurrency: 8

# Logging configuration
logs:
  level: info
  directory: ~/.faros/logs
  retention: 7d
```

See `faros.config.example.yaml` for a complete template with detailed comments explaining each field.

**Note:** JSON format is still supported for backward compatibility.

## Configuration Options

### Core Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | `https://prod.api.faros.ai` | Faros API URL |
| `graph` | string | `default` | Target graph name |
| `origin` | string | `faros-cli` | Origin identifier for events |

### Sources

Configure data sources for the CLI. Credentials should be in `.env`.

**Linear:**
```json
{
  "sources": {
    "linear": {
      "type": "Linear",
      "syncInterval": "1h",
      "streams": ["issues", "projects", "teams", "users"]
    }
  }
}
```

Environment: `LINEAR_API_KEY`

**GitHub:**
```json
{
  "sources": {
    "github": {
      "type": "GitHub",
      "syncInterval": "30m"
    }
  }
}
```

Environment: `GITHUB_TOKEN`

**S3 Test Results:**
```json
{
  "sources": {
    "s3-tests": {
      "type": "S3",
      "bucket": "my-test-results",
      "region": "us-east-1",
      "prefix": "junit/",
      "pattern": ".*\\.xml$"
    }
  }
}
```

Environment: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

### Defaults

Set default values for common options:

```json
{
  "defaults": {
    "testSource": "Jenkins",
    "testType": "Unit",
    "concurrency": 8
  }
}
```

### Logs

Configure logging behavior:

```json
{
  "logs": {
    "level": "info",
    "directory": "~/.faros/logs",
    "retention": "7d"
  }
}
```

## Configuration Priority

Settings are loaded in this order (highest priority first):

1. **CLI Arguments**: `--api-key`, `--graph`, etc.
2. **Environment Variables**: `FAROS_API_KEY`, `FAROS_GRAPH`, etc.
3. **Config File**: `faros.config.json`, `.farosrc.json`
4. **Defaults**: Built-in defaults

Example:
```bash
# Config file says graph: "default"
# Environment says FAROS_GRAPH=staging
# CLI says --graph production

# Result: Uses "production" (CLI wins)
```

## Environment Variables

### Faros Settings

| Variable | Description | Example |
|----------|-------------|---------|
| `FAROS_API_KEY` | Faros API key (required) | `far_abc123...` |
| `FAROS_URL` | Faros API URL | `https://prod.api.faros.ai` |
| `FAROS_GRAPH` | Target graph name | `production` |
| `FAROS_ORIGIN` | Origin identifier | `my-company-ci` |

### Data Source Credentials

| Variable | Description |
|----------|-------------|
| `LINEAR_API_KEY` | Linear API key |
| `GITHUB_TOKEN` | GitHub personal access token |
| `AWS_ACCESS_KEY_ID` | AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | AWS secret access key |
| `AWS_REGION` | AWS region |
| `AWS_PROFILE` | AWS profile name |

### CI/CD Detection

| Variable | Description |
|----------|-------------|
| `CI` | Detected automatically by most CI systems |

## File Locations

The CLI searches for configuration files in this order:

1. `faros.config.yaml` (recommended - supports comments!)
2. `faros.config.yml` (alternative YAML extension)
3. `faros.config.json` (JSON format, no comments)
4. `faros.config.js` (JavaScript format)
5. `faros.config.cjs` (CommonJS format)
6. `.farosrc.yaml` (hidden YAML config)
7. `.farosrc.yml` (hidden YAML config)
8. `.farosrc.json` (hidden JSON config)
9. `.farosrc.js` (hidden JS config)
10. `.farosrc.cjs` (hidden CommonJS config)

For credentials, it searches:

1. `.env` (current directory)
2. `.env.local` (current directory)

## Best Practices

### ✅ Do

- **Store credentials in `.env`** - Never in config files
- **Add `.env` to `.gitignore`** - Prevent accidental commits
- **Commit `faros.config.yaml`** - Share non-sensitive config with team
- **Use YAML for config** - Supports comments to explain fields
- **Use environment variables in CI/CD** - Don't use `.env` in CI
- **Use staging graph for testing** - Test with `--dry-run` first
- **Document required credentials** - In your project README

### ❌ Don't

- **Never commit `.env`** - Contains secrets
- **Don't put credentials in config files** - Use `.env` instead
- **Don't hardcode API keys** - Always use environment variables
- **Don't share `.env` files** - Each developer/environment should have their own

## Examples

### Local Development

`.env`:
```bash
FAROS_API_KEY=far_dev_key_123
FAROS_GRAPH=dev-sam
```

`faros.config.yaml`:
```yaml
# Local development config
origin: local-dev
defaults:
  testSource: Local
```

### CI/CD (GitHub Actions)

Don't use `.env` in CI. Use secrets:

```yaml
env:
  FAROS_API_KEY: ${{ secrets.FAROS_API_KEY }}
  FAROS_GRAPH: production
```

### Multiple Environments

Use different `.env` files:

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production
```

Load with:
```bash
# Load staging config
cp .env.staging .env
faros sync tests *.xml
```

## Troubleshooting

### "API key is required"

**Problem**: CLI can't find your API key.

**Solutions**:
1. Check `.env` file exists and has `FAROS_API_KEY=...`
2. Check `.env` is in the current directory
3. Try setting in environment: `export FAROS_API_KEY=...`
4. Try CLI argument: `--api-key your-key`

### "Cannot find configuration"

**Problem**: CLI can't find config file.

**Solutions**:
1. Config is optional - CLI will use defaults
2. Create from example: `cp faros.config.example.yaml faros.config.yaml`
3. Check file name is exactly `faros.config.yaml` (or `.yml`)

### Config changes not taking effect

**Problem**: Changes to config not being used.

**Solutions**:
1. Check configuration priority - CLI args override everything
2. Check environment variables - they override config file
3. Try `--debug` to see what config is loaded

## Security Notes

- **`.env` files are sensitive** - Treat like passwords
- **Use strong API keys** - Generate from Faros dashboard
- **Rotate keys regularly** - Especially if exposed
- **Use fine-grained tokens** - Minimum required permissions
- **Use separate keys per environment** - Dev, staging, production
- **Never log credentials** - CLI strips them from debug output
- **Use secrets management in CI/CD** - GitHub Secrets, AWS Secrets Manager, etc.

## Migration from Previous Versions

If you're migrating from an older config format:

**Old** (`.farosrc.json`):
```json
{
  "apiKey": "far_123...",
  "sources": {
    "linear": {
      "apiKey": "lin_456..."
    }
  }
}
```

**New** (split into two files):

`.env`:
```bash
FAROS_API_KEY=far_123...
LINEAR_API_KEY=lin_456...
```

`faros.config.yaml`:
```yaml
# Linear integration
sources:
  linear:
    type: Linear
    # API key is in .env as LINEAR_API_KEY
```

## Further Reading

- [README.md](README.md) - Main documentation
- [.env.example](.env.example) - Credentials template
- [faros.config.example.yaml](faros.config.example.yaml) - Config template with detailed comments
