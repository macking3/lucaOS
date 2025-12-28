# Code Safety Guide - Preventing Code Breakage

## 🛡️ Overview

This guide outlines strategies to prevent code breaking when adding new features to LUCA. Follow these practices to maintain code stability.

---

## 📋 Table of Contents

1. [Git Workflow Best Practices](#1-git-workflow-best-practices)
2. [Testing Strategy](#2-testing-strategy)
3. [Pre-Commit Hooks](#3-pre-commit-hooks)
4. [Incremental Changes Protocol](#4-incremental-changes-protocol)
5. [Backup & Recovery](#5-backup--recovery)
6. [Code Review Checklist](#6-code-review-checklist)
7. [AI Assistant Guidelines](#7-ai-assistant-guidelines)

---

## 1. Git Workflow Best Practices

### Always Use Feature Branches

```bash
# Before making ANY changes
git checkout -b feature/your-feature-name
git push -u origin feature/your-feature-name

# Make your changes
# Test thoroughly

# Only merge when everything works
git checkout main
git merge feature/your-feature-name
```

### Commit Frequently

```bash
# Small, atomic commits
git add file1.ts
git commit -m "feat: add tool X validation schema"

# Not:
# git add . && git commit -m "huge changes"
```

### Use Descriptive Commit Messages

```
feat: add mobile file browser component
fix: restore missing tool schemas
refactor: improve memory service sync
test: add schema validation tests
docs: update roadmap comparison
```

### Tag Stable Versions

```bash
# Before major changes
git tag -a v1.0.0 -m "Stable baseline"
git push origin v1.0.0

# If something breaks, you can always:
git checkout v1.0.0
```

---

## 2. Testing Strategy

### Setup Testing Framework

```bash
# Install testing dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

### Write Tests Before Adding Features (TDD)

1. Write a failing test
2. Implement the feature
3. Make the test pass
4. Refactor if needed

### Test Coverage Goals

- **Critical Services**: 80%+ coverage
  - `geminiService.ts`
  - `memoryService.ts`
  - `toolRegistry.ts`
  - `schemas.ts`

- **Components**: 60%+ coverage
  - Core UI components
  - Modal components
  - Critical workflows

### Run Tests Before Committing

```bash
npm run test
npm run test:watch  # For development
npm run test:coverage  # Check coverage
```

---

## 3. Pre-Commit Hooks

### Setup Husky

```bash
npm install --save-dev husky lint-staged

# Initialize husky
npx husky init

# Add pre-commit hook
echo "npm run lint && npm run test" > .husky/pre-commit
```

### Lint-Staged Configuration

Add to `package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{ts,tsx,js,jsx}": [
      "npm run test -- --findRelatedTests"
    ]
  }
}
```

---

## 4. Incremental Changes Protocol

### ⚠️ CRITICAL: Always Make Small, Incremental Changes

#### ❌ DON'T:
- Change multiple files at once
- Refactor and add features simultaneously
- Delete code before verifying replacements
- Overwrite entire files

#### ✅ DO:
1. **One feature/file at a time**
2. **Test after each change**
3. **Commit frequently**
4. **Review diffs before committing**

### Feature Addition Workflow

```bash
# Step 1: Create feature branch
git checkout -b feature/new-tool

# Step 2: Add tool to schemas.ts ONLY
# Test: npm run lint
git add services/schemas.ts
git commit -m "feat: add newTool schema"

# Step 3: Add tool to geminiService.ts
# Test: npm run lint
git add services/geminiService.ts
git commit -m "feat: add newTool to geminiService"

# Step 4: Add handler in App.tsx
# Test: npm run lint
git add App.tsx
git commit -m "feat: add newTool handler in App.tsx"

# Step 5: Add endpoint in server.js
# Test: npm run lint && npm run server
git add server.js
git commit -m "feat: add /api/new-tool endpoint"

# Step 6: Test entire feature
# Test manually: Use the tool in UI
git commit -m "test: verify newTool integration"

# Step 7: Merge only if ALL tests pass
git checkout main
git merge feature/new-tool
```

---

## 5. Backup & Recovery

### Automatic Backups

#### Before Major Changes

```bash
# Create backup branch
git checkout -b backup/pre-feature-$(date +%Y%m%d)
git push origin backup/pre-feature-$(date +%Y%m%d)

# Tag current state
git tag -a backup-v$(date +%Y%m%d) -m "Backup before feature X"
git push origin backup-v$(date +%Y%m%d)
```

#### Script for Auto-Backup

Create `scripts/backup.sh`:
```bash
#!/bin/bash
BACKUP_BRANCH="backup/auto-$(date +%Y%m%d-%H%M%S)"
git checkout -b $BACKUP_BRANCH
git push origin $BACKUP_BRANCH
git checkout -
echo "Backup created: $BACKUP_BRANCH"
```

### Recovery Strategy

If code breaks:

```bash
# Option 1: Revert last commit
git revert HEAD

# Option 2: Reset to previous commit
git reset --hard HEAD~1

# Option 3: Restore from backup branch
git checkout backup/pre-feature-YYYYMMDD
git checkout -b recovery/restore-from-backup
git push origin recovery/restore-from-backup

# Option 4: Restore specific file
git checkout backup/pre-feature-YYYYMMDD -- path/to/file.ts
```

---

## 6. Code Review Checklist

### Before Committing Changes

- [ ] **Linting passes**: `npm run lint`
- [ ] **Integrity Check**: `node scripts/verify_integrity.cjs` (CRITICAL)
- [ ] **Tests pass**: `npm run test`
- [ ] **No console errors**: Check browser console
- [ ] **File sizes reasonable**: Compare before/after line counts
- [ ] **No deleted exports**: Verify all exports still exist
- [ ] **Imports work**: No broken import statements
- [ ] **Schema validation**: All tools have schemas
- [ ] **Type safety**: No TypeScript errors

### Before Merging to Main

- [ ] **All tests pass**: `npm run test`
- [ ] **Manual testing**: Test new features manually
- [ ] **No breaking changes**: Existing features still work
- [ ] **Documentation updated**: Update docs if needed
- [ ] **Code review**: Self-review your changes

---

## 7. AI Assistant Guidelines

### Instructions for AI (Copy this when requesting changes)

```
IMPORTANT: Before making any changes:

1. READ existing code first - understand current implementation
2. NEVER delete code without checking if it's used elsewhere
3. Make INCREMENTAL changes - one feature/file at a time
4. PRESERVE existing functionality - add, don't replace
5. TEST after each change - verify nothing broke
6. SHOW diffs before applying - let me review changes
7. MAINTAIN file structure - don't reorganize without asking
8. KEEP exports - never remove exported functions/types
9. VALIDATE schemas - ensure all tools have validation
10. VERIFY imports - check all imports still work

If making large changes:
- Create a backup branch first
- Break into smaller PRs
- Test each piece independently
- Show me the plan before executing
```

### Safe Change Request Template

When asking for new features, use this format:

```
I want to add [FEATURE]. 

Please:
1. Show me the changes you'll make BEFORE applying them
2. List all files that will be modified
3. Confirm no existing code will be deleted
4. Verify all imports will still work
5. Make changes incrementally (one file at a time)
6. Test after each change

Files to modify:
- [file1.ts] - add [X]
- [file2.ts] - add [Y]

No files should be deleted or completely rewritten.
```

---

## 🚨 Emergency Procedures

### If Code Breaks Immediately

1. **STOP** - Don't make more changes
2. **CHECKOUT** - `git checkout main` (safe state)
3. **REVIEW** - `git log` to see what changed
4. **REVERT** - `git revert <commit-hash>` or restore from backup
5. **TEST** - Verify everything works
6. **ANALYZE** - Understand what went wrong

### Rollback Script

```bash
#!/bin/bash
# scripts/rollback.sh

echo "⚠️  WARNING: This will reset to last commit"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
    git reset --hard HEAD~1
    echo "✅ Rolled back to previous commit"
else
    echo "❌ Rollback cancelled"
fi
```

---

## 📊 Monitoring & Prevention

### File Size Monitoring

Create `scripts/check-file-sizes.sh`:
```bash
#!/bin/bash
echo "Checking file sizes..."
wc -l services/geminiService.ts
wc -l services/schemas.ts
wc -l server.js
wc -l App.tsx

# Alert if file decreased significantly
```

### Automated Checks

Add to `package.json`:
```json
{
  "scripts": {
    "pre-commit": "npm run lint && npm run test && node scripts/verify_integrity.cjs",
    "safety-check": "npm run lint && npm run test && npm run type-check && node scripts/verify_integrity.cjs",
    "backup": "git checkout -b backup/$(date +%Y%m%d) && git push origin backup/$(date +%Y%m%d)"
  }
}
```

---

## ✅ Best Practices Summary

1. ✅ **Always use feature branches**
2. ✅ **Commit frequently with descriptive messages**
3. ✅ **Make incremental changes**
4. ✅ **Test after each change**
5. ✅ **Create backups before major changes**
6. ✅ **Review diffs before committing**
7. ✅ **Never delete code before verifying replacement**
8. ✅ **Maintain file structure**
9. ✅ **Keep all exports**
10. ✅ **Validate schemas for all tools**

---

## 📞 Quick Reference

```bash
# Before starting work
git checkout -b feature/my-feature
npm run backup  # If script exists

# During work
npm run lint
npm run test
git add .
git commit -m "feat: description"

# Before merging
npm run safety-check
git checkout main
git merge feature/my-feature

# If something breaks
git checkout main
git checkout backup/YYYYMMDD  # Or specific backup
```

---

**Remember**: It's always better to make 10 small commits than 1 large commit that breaks everything!

