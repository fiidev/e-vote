#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "   UNIVERSAL WEB OPTIMIZER: PERFORMANCE & SECURITY AUDIT  "
echo "=========================================================="

# 1. Audit Large Static Assets (> 150KB)
echo ""
echo "--> 1. Scanning for oversized uncompressed media (> 150KB)..."
find public/ assets/ src/ -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) -size +150k 2>/dev/null | while read -r file; do
    size=$(ls -lh "$file" | awk '{print $5}')
    echo "  [WARN] Large image: $file ($size) - Consider converting to WebP/AVIF"
done || true

# 2. Audit Potential Hardcoded Credentials or Production Domains in Code
echo ""
echo "--> 2. Scanning for potential hardcoded secrets or production URLs..."
grep -rnE '(https?://[a-zA-Z0-9.-]+\.my\.id|https?://[a-zA-Z0-9.-]+\.com|0\.0\.0\.0:[0-9]+)' src/ app/ 2>/dev/null | grep -v 'node_modules' | grep -v '.next' | head -n 10 || true

# 3. Audit Gitignore Protection for Test Seeds
echo ""
echo "--> 3. Checking .gitignore for test artifacts..."
if [ -f .gitignore ]; then
    if grep -q "tokens_" .gitignore 2>/dev/null || grep -q "*.json" .gitignore 2>/dev/null; then
        echo "  [OK] Test dataset exclusion rules found in .gitignore"
    else
        echo "  [INFO] Recommend adding test artifacts/seeds to .gitignore"
    fi
fi

echo ""
echo "--> Audit Complete!"
