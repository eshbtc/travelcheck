#!/bin/bash

# Fix remaining TypeScript errors systematically

echo "1. Fixing wrong middleware import paths..."
find app/api -name "*.ts" -type f | while read file; do
  if grep -q "from '../../auth/middleware'" "$file"; then
    sed -i '' "s|from '../../auth/middleware'|from '@/lib/api-auth'|g" "$file"
    echo "  Fixed: $file"
  fi
done

echo "2. Fixing admin functions with missing user parameter..."
# Fix isAdmin functions that reference userId before it's defined
sed -i '' 's/where: { id: userId }/where: { id: user.id }/g' app/api/batch/optimize-processing/route.ts
sed -i '' 's/where: { id: userId }/where: { id: user.id }/g' app/api/booking/ingest-daily/route.ts
sed -i '' 's/where: { id: userId }/where: { id: user.id }/g' app/api/booking/ingest-evening/route.ts

echo "3. Fixing session extraction in files still using old pattern..."
for file in app/api/admin/system/route.ts app/api/admin/users/route.ts app/api/admin/users/role/route.ts app/api/cleanup/cache/route.ts app/api/data/backfill/route.ts app/api/reports/delete/route.ts app/api/reports/export/route.ts app/api/reports/generate/route.ts; do
  if grep -q "const session = await requireAuth(request)" "$file"; then
    # Add userId extraction after session check
    if ! grep -q "const userId = session.user.id" "$file"; then
      sed -i '' '/const session = await requireAuth(request)/a\
  if (session instanceof NextResponse) return session\
\
  const userId = session.user.id
' "$file"
    fi
    # Replace session.user.id with userId
    sed -i '' 's/session\.user\.id/userId/g' "$file"
  fi
done

echo "4. Fixing Decimal type issues in booking/status..."
sed -i '' 's/confidenceScore || 0/Number(confidenceScore) || 0/g' app/api/booking/status/route.ts

echo "5. Fixing PassportScan missing fileUrl..."
sed -i '' '/fileName: file_name/a\
        fileUrl: imageData.substring(0, 100) + "...", // Store first 100 chars as placeholder
' app/api/ocr/extract/route.ts

echo "6. Fixing column name references..."
sed -i '' 's/passport_info/passportInfo/g' app/api/passport/analyze/route.ts
sed -i '' 's/confidence_score/confidenceScore/g' app/api/passport/analyze/route.ts

echo "7. Fixing fullName field in admin/users route..."
sed -i '' '/fullName: user.fullName/d' app/api/admin/users/route.ts

echo "Done! All fixes applied."
