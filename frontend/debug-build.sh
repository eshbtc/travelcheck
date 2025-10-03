#!/bin/bash
echo "=== Debug Build Environment ==="
echo "Current directory: $(pwd)"
echo ""
echo "Directory listing:"
ls -la
echo ""
echo "src directory:"
ls -la src/ || echo "src/ not found"
echo ""
echo "src/lib directory:"
ls -la src/lib/ || echo "src/lib/ not found"
echo ""
echo "Checking if src/lib/utils.ts exists:"
[ -f src/lib/utils.ts ] && echo "✓ src/lib/utils.ts EXISTS" || echo "✗ src/lib/utils.ts NOT FOUND"
echo ""
echo "tsconfig.json baseUrl and paths:"
grep -A 5 "baseUrl\|paths" tsconfig.json
echo ""
echo "next.config.js webpack section:"
grep -A 10 "webpack:" next.config.js
echo ""
echo "=== End Debug ==="
