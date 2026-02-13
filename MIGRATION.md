# Migration Guide: Credentials Separation

## Overview

The Faros CLI now separates credentials from configuration for improved security:

- **Before**: Everything in `.farosrc.json` or `faros.config.json`
- **After**: Credentials in `.env`, configuration in `faros.config.json`

## Why This Change?

1. **Security**: Credentials never accidentally committed to git
2. **Best Practice**: Industry standard (dotenv pattern)
3. **Flexibility**: Easy to use different credentials per environment
4. **CI/CD Friendly**: Secrets management integrates naturally

## Migration Steps

### Step 1: Create `.env` File

Create a `.env` file in your project root:

```bash
cp .env.example .env
```

### Step 2: Move Credentials

**Old** (`.farosrc.json` or `faros.config.json`):
```json
{
  "apiKey": "far_abc123...",
  "graph": "default",
  "sources": {
    "linear": {
      "type": "Linear",
      "apiKey": "lin_xyz789..."
    },
    "github": {
      "type": "GitHub",
      "token": "ghp_abc123..."
    }
  }
}
```

**New** - Split into two files:

`.env`:
```bash
FAROS_API_KEY=far_abc123...
LINEAR_API_KEY=lin_xyz789...
GITHUB_TOKEN=ghp_abc123...
```

`faros.config.yaml`:
```yaml
# Target graph
graph: default

# Data sources (credentials in .env)
sources:
  linear:
    type: Linear
  
  github:
    type: GitHub
```

### Step 3: Update `.gitignore`

Ensure your `.gitignore` includes:

```gitignore
.env
.env.local
.env.*.local
faros.config.json  # Optional: include if it contains sensitive data
```

### Step 4: Update Documentation

Update your project's README to document required environment variables:

```markdown
## Setup

1. Copy `.env.example` to `.env`
2. Add your credentials to `.env`
3. Run `faros sync tests ...`
```

### Step 5: Update CI/CD

**GitHub Actions** - Use secrets:

```yaml
env:
  FAROS_API_KEY: ${{ secrets.FAROS_API_KEY }}
  LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
```

**Jenkins** - Use credentials():

```groovy
environment {
  FAROS_API_KEY = credentials('faros-api-key')
  LINEAR_API_KEY = credentials('linear-api-key')
}
```

**GitLab CI** - Use variables:

```yaml
variables:
  FAROS_API_KEY: $FAROS_API_KEY
  LINEAR_API_KEY: $LINEAR_API_KEY
```

### Step 6: Switch to YAML (Optional but Recommended)

YAML supports comments, making config more maintainable:

```bash
# Copy YAML example
cp faros.config.example.yaml faros.config.yaml

# Or convert your JSON config to YAML
# (manually, or use a tool like yq)
```

## Credential Mapping

### Faros Credentials

| Old (config file) | New (environment) |
|-------------------|-------------------|
| `apiKey` | `FAROS_API_KEY` |
| `url` | `FAROS_URL` (optional) |
| `graph` | `FAROS_GRAPH` (optional) |
| `origin` | `FAROS_ORIGIN` (optional) |

### Data Source Credentials

| Old (config file) | New (environment) |
|-------------------|-------------------|
| `sources.linear.apiKey` | `LINEAR_API_KEY` |
| `sources.github.token` | `GITHUB_TOKEN` |
| AWS credentials in config | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |

## Configuration That Stays

These settings remain in `faros.config.json` (non-sensitive):

- `url` - API URL (default is fine)
- `graph` - Graph name (can be overridden)
- `origin` - Origin identifier
- `sources[].type` - Source type
- `sources[].syncInterval` - Sync frequency
- `sources[].streams` - Streams to sync
- `sources[].bucket` - S3 bucket name (not sensitive)
- `sources[].region` - AWS region (not sensitive)
- `defaults.*` - Default values
- `logs.*` - Logging configuration

## Backward Compatibility

The CLI still supports the old format, but will show a warning:

```
⚠ Warning: API key found in config file. Please move to .env file.
```

To silence the warning, migrate to the new format.

## Testing Your Migration

1. **Test locally**:
```bash
faros sync tests *.xml --validate
```

2. **Verify credentials are hidden**:
```bash
faros --debug sync tests *.xml --validate 2>&1 | grep -i "api"
# Should NOT show your actual API key
```

## Common Issues

### "API key is required"

**Problem**: CLI can't find your API key.

**Solution**: Check `.env` file exists and has `FAROS_API_KEY=...`

### Config changes not taking effect

**Problem**: Still using old config values.

**Solution**: Remember the priority order:
1. CLI options (highest)
2. Environment variables
3. Config file
4. Defaults (lowest)

### CI/CD build failing

**Problem**: Secrets not available in CI.

**Solution**: Add secrets to your CI/CD platform:
- GitHub: Settings → Secrets → Actions
- Jenkins: Credentials → Add Credentials
- GitLab: Settings → CI/CD → Variables

## Rollback

If you need to temporarily rollback to the old format:

1. Keep credentials in config file
2. CLI will still work, but show warnings
3. Full backward compatibility maintained

## Questions?

- See [CONFIGURATION.md](CONFIGURATION.md) for detailed config docs
- See [README.md](README.md) for usage examples
- Open an issue if you encounter problems

## Checklist

- [ ] Created `.env` file
- [ ] Moved credentials from config to `.env`
- [ ] Updated `.gitignore` to ignore `.env`
- [ ] Removed credentials from config file
- [ ] (Optional) Converted config to YAML for better comments
- [ ] Tested locally with `--validate`
- [ ] Updated CI/CD to use environment variables
- [ ] Documented required env vars in project README
- [ ] Verified credentials are not committed to git
