#!/bin/bash
set -e

# Release script for @faros-fde-sandbox/cli

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
echo "📦 Published: @faros-fde-sandbox/cli@$NEW_VERSION"
echo "🔗 View at: https://www.npmjs.com/package/@faros-fde-sandbox/cli"
