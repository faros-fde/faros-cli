# Publishing @faros-fde-sandbox/cli to NPM

## Overview

The Faros CLI is published as a scoped package under the `@faros-fde-sandbox` namespace on npm.

**Package**: [@faros-fde-sandbox/cli](https://www.npmjs.com/package/@faros-fde-sandbox/cli)

## Automated Publishing (Recommended)

We use GitHub Actions for automated publishing triggered by git tags.

### Prerequisites

1. **NPM Token** - Create an automation token at [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
2. **GitHub Secret** - Add the token as `NPM_TOKEN` in repository secrets

### Publishing Process

#### 1. Prepare Release

```bash
cd faros-repos/faros-cli

# Make sure everything is committed and tests pass
git status
npm test
npm run build
```

#### 2. Bump Version

Follow semantic versioning:
- **Patch** (1.1.0 → 1.1.1): Bug fixes
- **Minor** (1.1.0 → 1.2.0): New features, backward compatible
- **Major** (1.1.0 → 2.0.0): Breaking changes

```bash
# Patch release (bug fixes)
npm version patch

# Minor release (new features)
npm version minor

# Major release (breaking changes)
npm version major

# Or set specific version
npm version 1.2.3
```

This updates `package.json` and creates a git commit with the version.

#### 3. Create and Push Tag

```bash
# Create tag (matches version in package.json)
git tag v$(node -p "require('./package.json').version")

# Push commits and tags
git push && git push --tags
```

#### 4. GitHub Actions Takes Over

The [`.github/workflows/publish.yml`](.github/workflows/publish.yml) workflow automatically:
- Detects the tag push
- Checks out code
- Installs dependencies
- Builds the package
- Publishes to npm with `--access public`

#### 5. Verify Publication

```bash
# Check published version
npm view @faros-fde-sandbox/cli version

# View on npm
open https://www.npmjs.com/package/@faros-fde-sandbox/cli

# Test installation
npm install -g @faros-fde-sandbox/cli
faros --version
```

### GitHub Actions Workflow

The workflow triggers on tags matching `v*` pattern:

```yaml
on:
  push:
    tags:
      - 'v*'
```

See [`.github/workflows/publish.yml`](.github/workflows/publish.yml) for the complete workflow.

### Quick Release Script

For convenience, use this one-liner:

```bash
# Patch release
npm version patch && git push && git push --tags

# Minor release
npm version minor && git push && git push --tags

# Major release
npm version major && git push && git push --tags
```

## Manual Publishing (Alternative)

If you need to publish manually:

### Prerequisites

```bash
# Log in to npm
npm login

# Verify authentication
npm whoami
```

### Publish

```bash
# Build first
npm run build

# Publish
npm publish --access public
```

## Troubleshooting

### Error: 403 Forbidden

You don't have permission to publish.

**Solutions:**
1. Verify you're logged in: `npm whoami`
2. Check you're a member of the npm organization
3. Verify `NPM_TOKEN` secret is set in GitHub

### Error: Tag already exists

A tag with this version already exists.

**Solutions:**
1. Delete the tag locally and remotely:
   ```bash
   git tag -d v1.2.3
   git push origin :refs/tags/v1.2.3
   ```
2. Bump to a new version

### GitHub Action Fails

Check the workflow run in the Actions tab:
- Verify `NPM_TOKEN` secret is configured
- Check build logs for errors
- Ensure package.json version matches tag

## Security

### 2FA (Highly Recommended)

Enable two-factor authentication:

```bash
npm profile enable-2fa auth-and-writes
```

### NPM Tokens

Use **Automation** tokens for CI/CD:
1. Go to [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
2. Create new token → Automation
3. Add as `NPM_TOKEN` in GitHub Secrets

## Versioning Best Practices

- Use semantic versioning (semver)
- Update version before tagging
- Never reuse version numbers
- Document changes in git commit messages

## Checklist

Before releasing:

- [ ] All tests pass
- [ ] Built successfully (`npm run build`)
- [ ] Version bumped appropriately
- [ ] No uncommitted changes
- [ ] Reviewed changes since last release

After releasing:

- [ ] Verify on npmjs.com
- [ ] Test installation: `npm install -g @faros-fde-sandbox/cli`
- [ ] Check GitHub Actions workflow passed
- [ ] Document release notes (if applicable)

## Quick Reference

```bash
# Patch release (bug fixes)
npm version patch && git push && git push --tags

# Minor release (new features)
npm version minor && git push && git push --tags

# Major release (breaking changes)
npm version major && git push && git push --tags

# Check published version
npm view @faros-fde-sandbox/cli version

# Install globally
npm install -g @faros-fde-sandbox/cli

# View package page
open https://www.npmjs.com/package/@faros-fde-sandbox/cli
```
