# Publishing @faros-fde-sandbox/cli

**Package**: [@faros-fde-sandbox/cli](https://www.npmjs.com/package/@faros-fde-sandbox/cli)

## Quick Start

Publishing is automated via GitHub Actions. Just bump the version and push:

```bash
# Patch release (bug fixes like 1.1.1 → 1.1.2)
npm version patch -m "[FAR-XX] Release v%s" && git push && git push --tags

# Minor release (new features like 1.1.2 → 1.2.0)
npm version minor -m "[FAR-XX] Release v%s" && git push && git push --tags

# Major release (breaking changes like 1.2.0 → 2.0.0)
npm version major -m "[FAR-XX] Release v%s" && git push && git push --tags
```

That's it! GitHub Actions will automatically publish to npm.

## Release Process

### 1. Create Linear Task

Create a Linear task for the release:

```bash
# Example: "Release faros-cli v1.2.3"
```

### 2. Prepare Release

```bash
# Ensure everything is clean
git status
git pull

# Run tests
npm test

# Build
npm run build
```

### 3. Bump Version

Use semantic versioning:
- **Patch** (1.1.1 → 1.1.2): Bug fixes only
- **Minor** (1.1.0 → 1.2.0): New features, backward compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes

```bash
# Replace FAR-XX with your Linear task ID
npm version patch -m "[FAR-XX] Release v%s"
```

This will:
- Update `package.json` version
- Create a git commit with the message
- Create a git tag (e.g., `v1.1.2`)

### 4. Push

```bash
# Push commit and tags
git push && git push --tags
```

### 5. Automated Publishing

The [`.github/workflows/publish.yml`](.github/workflows/publish.yml) workflow:
- Triggers on `v*` tags
- Runs tests
- Builds the package
- Publishes to npm with `--access public`

### 6. Verify

```bash
# Wait 1-2 minutes, then check
npm view @faros-fde-sandbox/cli version

# Test installation
npm install -g @faros-fde-sandbox/cli@latest
faros --version
```

### 7. Create GitHub Release (Optional)

Visit the [Releases page](https://github.com/faros-fde/faros-cli/releases) and create a release with:

**Title**: `v1.2.3`

**Description**:
```markdown
## What's Changed

### Features
- New feature description ([FAR-XX](linear-link))

### Bug Fixes  
- Bug fix description ([FAR-XX](linear-link))

### Breaking Changes
- Breaking change description (if major version)

**Full Changelog**: https://github.com/faros-fde/faros-cli/compare/v1.1.1...v1.2.3
```

## Prerequisites (One-time Setup)

### NPM Token

1. Create automation token at [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
2. Add as `NPM_TOKEN` secret in [repository settings](https://github.com/faros-fde/faros-cli/settings/secrets/actions)

### GitHub Actions Workflow

The workflow is already configured in [`.github/workflows/publish.yml`](.github/workflows/publish.yml):

```yaml
on:
  push:
    tags:
      - 'v*'
```

## Troubleshooting

### Build Fails

Check the [Actions tab](https://github.com/faros-fde/faros-cli/actions):
- Ensure all tests pass locally first
- Verify `NPM_TOKEN` secret is configured
- Check if version already exists on npm

### Tag Already Exists

```bash
# Delete local and remote tag
git tag -d v1.2.3
git push origin :refs/tags/v1.2.3

# Then bump to a new version
npm version patch -m "[FAR-XX] Release v%s"
git push && git push --tags
```

### Version Mismatch

Ensure the git tag matches the version in `package.json`:

```bash
# Check package.json version
node -p "require('./package.json').version"

# Check latest tag
git describe --tags --abbrev=0
```

## Manual Publishing (Emergency Only)

If GitHub Actions is down:

```bash
# Build
npm run build

# Login (requires npm account)
npm login

# Publish
npm publish --access public
```

## Checklist

**Before Release:**
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)  
- [ ] Linear task created
- [ ] No uncommitted changes
- [ ] Reviewed changes since last release

**After Release:**
- [ ] GitHub Actions workflow passed
- [ ] Package published on [npmjs.com](https://www.npmjs.com/package/@faros-fde-sandbox/cli)
- [ ] Installation works: `npm install -g @faros-fde-sandbox/cli@latest`
- [ ] GitHub release created (optional)
- [ ] Linear task marked as Done
