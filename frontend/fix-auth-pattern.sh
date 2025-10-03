#!/bin/bash

# Script to fix auth pattern in all API routes
# Changes from old pattern (authResult.error) to new pattern (instanceof NextResponse)

for file in $(find app/api -type f -name "route.ts"); do
  # Skip if file doesn't contain the old pattern
  if ! grep -q "authResult\.error" "$file"; then
    continue
  fi

  echo "Fixing: $file"

  # Pattern 1: Replace auth check block
  sed -i '' '/const authResult = await requireAuth(request)/,/^  }$/c\
  const session = await requireAuth(request)\
  if (session instanceof NextResponse) return session // Auth failed\
\
  const userId = session.user.id
' "$file"

  # Pattern 2: Replace user.id references
  sed -i '' 's/user\.id/userId/g' "$file"

  # Pattern 3: Replace { user } = authResult references
  sed -i '' 's/const { user } = authResult/const userId = session.user.id/g' "$file"
done

echo "Done! All files fixed."
