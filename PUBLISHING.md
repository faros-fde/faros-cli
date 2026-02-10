# Publishing @faros-fde-sandbox-sandbox/cli to NPM

## Overview

The Faros CLI is published as a **scoped package** under the `@faros-fde-sandbox-sandbox` namespace on npm.

**Package name**: `@faros-fde-sandbox-sandbox/cli`

## Prerequisites

### 1. NPM Account

You need an npm account to publish packages.

```bash
# Create account at https://www.npmjs.com/signup
# Or sign up via CLI
npm adduser
```

### 2. Organization/Scope Setup

The `@faros-fde-sandbox-sandbox` scope needs to exist on npm. Two options:

#### Option A: NPM Organization (Recommended)

Create an npm organization named `faros-fde-sandbox`:

1. Go to https://www.npmjs.com/org/create
2. Create organization: `faros-fde-sandbox`
3. Add team members who can publish

**Cost**: Free for public packages, $7/month for private packages

#### Option B: Personal Scope

If you own the npm username `faros-fde-sandbox`, you can use it as a scope.

**Note**: Organizations are better for team collaboration.

### 3. Authentication

Log in to npm:

```bash
npm login
```

Enter your credentials:
- Username
- Password
- Email
- 2FA code (if enabled)

Verify you're logged in:

```bash
npm whoami
# Should show your npm username
```

### 4. Organization Membership

If using an organization, verify you're a member:

```bash
npm org ls faros-fde-sandbox
# Should show your username with publish permissions
```

Add members to organization:

```bash
npm org set faros-fde-sandbox <username> developer
```

## Publishing Process

### One-Time Setup

1. **Configure package as public**

   The `.npmrc` file is already configured:
   ```
   access=public
   ```

2. **Verify package.json**

   Already configured:
   ```json
   {
     "name": "@faros-fde-sandbox-sandbox/cli",
     "version": "1.0.0",
     "publishConfig": {
       "access": "public"
     }
   }
   ```

### Publishing Steps

#### 1. Prepare Release

```bash
cd faros-repos/faros-cli

# Make sure everything is committed
git status

# Run tests (if you have them)
npm test

# Build
npm run build

# Verify build output
ls -la lib/
```

#### 2. Update Version

Follow semantic versioning:
- **Patch** (1.0.0 → 1.0.1): Bug fixes
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes

```bash
# Patch release (bug fixes)
npm version patch

# Minor release (new features)
npm version minor

# Major release (breaking changes)
npm version major

# Or manually set version
npm version 1.2.3
```

This will:
- Update `package.json` version
- Create a git commit
- Create a git tag

#### 3. Publish to NPM

**First-time publish:**

```bash
npm publish --access public
```

The `--access public` flag is required for the first publish of a scoped package.

**Subsequent publishes:**

```bash
npm publish
```

The access level is remembered after the first publish.

#### 4. Push to Git

```bash
# Push commits and tags
git push && git push --tags
```

#### 5. Verify Publication

```bash
# Check package info
npm info @faros-fde-sandbox-sandbox/cli

# View on npm
open https://www.npmjs.com/package/@faros-fde-sandbox-sandbox/cli

# Test installation
npm install -g @faros-fde-sandbox-sandbox/cli
faros --version
```

## Complete Release Script

Save this as `scripts/release.sh`:

```bash
#!/bin/bash
set -e

# Release script for @faros-fde-sandbox-sandbox/cli

echo "🚀 Starting release process..."

# Check if logged in to npm
if ! npm whoami > /dev/null 2>&1; then
  echo "❌ Not logged in to npm. Run: npm login"
  exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo "❌ Uncommitted changes found. Commit or stash them first."
  exit 1
fi

# Build
echo "📦 Building..."
npm run build

# Ask for version type
echo ""
echo "Select version bump:"
echo "  1) patch (bug fixes)"
echo "  2) minor (new features)"
echo "  3) major (breaking changes)"
read -p "Enter choice (1-3): " choice

case $choice in
  1) VERSION_TYPE="patch" ;;
  2) VERSION_TYPE="minor" ;;
  3) VERSION_TYPE="major" ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

# Bump version
echo ""
echo "📝 Bumping $VERSION_TYPE version..."
npm version $VERSION_TYPE

NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: $NEW_VERSION"

# Publish
echo ""
echo "📤 Publishing to npm..."
npm publish

# Push to git
echo ""
echo "📌 Pushing to git..."
git push && git push --tags

echo ""
echo "✅ Release complete!"
echo "📦 Published: @faros-fde-sandbox-sandbox/cli@$NEW_VERSION"
echo "🔗 View at: https://www.npmjs.com/package/@faros-fde-sandbox-sandbox/cli"
```

Make it executable:

```bash
chmod +x scripts/release.sh
```

Use it:

```bash
./scripts/release.sh
```

## Publishing to GitHub Packages (Alternative)

If you want to use GitHub Packages instead of npmjs.com:

### 1. Update .npmrc

```
@faros-fde-sandbox-sandbox:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 2. Add to package.json

```json
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com/@faros-fde-sandbox-sandbox"
  }
}
```

### 3. Create GitHub Token

1. Go to https://github.com/settings/tokens
2. Create token with `write:packages` scope
3. Set as environment variable:
   ```bash
   export GITHUB_TOKEN=ghp_your_token_here
   ```

### 4. Publish

```bash
npm publish
```

### 5. Install from GitHub

```bash
npm install -g @faros-fde-sandbox-sandbox/cli --registry=https://npm.pkg.github.com
```

**Note**: Users will need to authenticate to install from GitHub Packages.

## Unpublishing

**Warning**: Unpublishing is permanent and should be avoided.

Unpublish a specific version (within 72 hours):

```bash
npm unpublish @faros-fde-sandbox-sandbox/cli@1.0.0
```

Deprecate a version (preferred):

```bash
npm deprecate @faros-fde-sandbox-sandbox/cli@1.0.0 "Please upgrade to 1.0.1"
```

## Automated Publishing with GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Setup:
1. Create NPM token: https://www.npmjs.com/settings/tokens
2. Add to GitHub Secrets as `NPM_TOKEN`
3. Push a git tag to trigger publish:
   ```bash
   git tag v1.0.0
   git push --tags
   ```

## Troubleshooting

### Error: 402 Payment Required

Your organization requires payment for private packages.

**Solutions:**
1. Make package public: `npm publish --access public`
2. Or upgrade organization to paid plan

### Error: 403 Forbidden

You don't have permission to publish to this scope.

**Solutions:**
1. Verify you're logged in: `npm whoami`
2. Check organization membership: `npm org ls faros-fde-sandbox`
3. Ask organization owner to grant publish permissions

### Error: 404 Not Found - PUT https://registry.npmjs.org/@faros-fde-sandbox-sandbox%2fcli

The scope doesn't exist on npm.

**Solution:** Create the organization at https://www.npmjs.com/org/create

### Error: Package name too similar to existing package

Another package has a similar name.

**Solution:** Choose a different name or contact npm support.

### Error: You must sign in to publish packages

Not logged in to npm.

**Solution:**
```bash
npm login
```

## Package Naming Best Practices

✅ **Good:**
- `@faros-fde-sandbox-sandbox/cli` - Clear scope and purpose
- `@faros-fde-sandbox-sandbox/api-client` - Descriptive
- `@faros-fde-sandbox-sandbox/test-utils` - Clear function

❌ **Avoid:**
- `@faros-fde-sandbox-sandbox/utils` - Too generic
- `@faros-fde-sandbox-sandbox/thing` - Not descriptive
- `@faros-fde-sandbox-sandbox/CLI` - Use lowercase

## Security

### 2FA (Highly Recommended)

Enable two-factor authentication on your npm account:

```bash
npm profile enable-2fa auth-and-writes
```

This requires 2FA for:
- Login
- Publishing packages
- Changing profile settings

### NPM Tokens

For CI/CD, use automation tokens:

1. Go to https://www.npmjs.com/settings/tokens
2. Create new token → Automation
3. Store securely in CI secrets

**Token types:**
- **Automation**: For CI/CD (recommended)
- **Publish**: For manual publishing
- **Read-only**: For private package installation

### Package Provenance

Enable provenance to prove package authenticity:

```bash
npm publish --provenance
```

Requires:
- Publishing from GitHub Actions
- Public repository
- OIDC token permissions

## Monitoring

### Download Stats

View package downloads:

```bash
npm info @faros-fde-sandbox-sandbox/cli

# Or visit
https://www.npmjs.com/package/@faros-fde-sandbox-sandbox/cli
```

### Version History

See all published versions:

```bash
npm view @faros-fde-sandbox-sandbox/cli versions
```

### Package Health

Check package health score:

https://snyk.io/advisor/npm-package/@faros-fde-sandbox-sandbox/cli

## Support

- **NPM Support**: https://www.npmjs.com/support
- **NPM Docs**: https://docs.npmjs.com/
- **GitHub Issues**: For package-specific issues

## Quick Reference

```bash
# Login
npm login

# Verify auth
npm whoami

# Build
npm run build

# Version bump
npm version patch|minor|major

# Publish
npm publish --access public

# View package
npm info @faros-fde-sandbox-sandbox/cli

# Install globally
npm install -g @faros-fde-sandbox-sandbox/cli

# Update
npm update -g @faros-fde-sandbox-sandbox/cli

# Uninstall
npm uninstall -g @faros-fde-sandbox-sandbox/cli
```

## Checklist

Before publishing:

- [ ] All tests pass
- [ ] Built successfully (`npm run build`)
- [ ] Version bumped appropriately
- [ ] CHANGELOG.md updated
- [ ] README.md up to date
- [ ] No uncommitted changes
- [ ] Logged in to npm
- [ ] Organization membership verified
- [ ] `.npmrc` configured for public access

After publishing:

- [ ] Verify on npmjs.com
- [ ] Test installation: `npm install -g @faros-fde-sandbox-sandbox/cli`
- [ ] Push git tags
- [ ] Update release notes
- [ ] Announce release (if applicable)
