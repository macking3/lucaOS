#!/bin/bash

# Backup script for LUCA codebase
# Creates a backup branch before making changes

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_BRANCH="backup/auto-$TIMESTAMP"
CURRENT_BRANCH=$(git branch --show-current)

echo "📦 Creating backup branch: $BACKUP_BRANCH"
echo "Current branch: $CURRENT_BRANCH"

# Create backup branch from current state
git checkout -b "$BACKUP_BRANCH"
git push -u origin "$BACKUP_BRANCH" 2>/dev/null || echo "⚠️  Could not push to remote (local backup created)"

# Return to original branch
git checkout "$CURRENT_BRANCH"

echo "✅ Backup created: $BACKUP_BRANCH"
echo ""
echo "To restore this backup:"
echo "  git checkout $BACKUP_BRANCH"

