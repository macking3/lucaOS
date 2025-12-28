#!/bin/bash

# Safety check script
# Runs all checks before committing

echo "🔍 Running safety checks..."
echo ""

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes"
    git status --short
    echo ""
fi

# Run linter
echo "📝 Running linter..."
npm run lint
LINT_EXIT=$?

# Run type check
echo ""
echo "🔧 Running TypeScript type check..."
npm run type-check
TYPE_EXIT=$?

# Check file sizes
echo ""
echo "📊 Checking# Check core file sizes"
echo "lucaService.ts: $(wc -l < services/lucaService.ts) lines"
echo "schemas.ts: $(wc -l < services/schemas.ts) lines"
echo "server.js: $(wc -l < server.js) lines"
echo "App.tsx: $(wc -l < App.tsx) lines"

# Final status
echo ""
if [ $LINT_EXIT -eq 0 ] && [ $TYPE_EXIT -eq 0 ]; then
    echo "✅ All safety checks passed!"
    exit 0
else
    echo "❌ Safety checks failed!"
    echo "Please fix errors before committing."
    exit 1
fi

