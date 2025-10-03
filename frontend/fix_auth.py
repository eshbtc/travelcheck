#!/usr/bin/env python3
import re
import glob

files = glob.glob('app/api/**/route.ts', recursive=True)

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    # Skip if already fixed
    if 'instanceof NextResponse' in content:
        continue

    # Skip if doesn't have old pattern
    if 'authResult.error' not in content:
        continue

    print(f"Fixing: {filepath}")

    # Replace the auth check block
    # Pattern: const authResult = await requireAuth(request)\n  if (authResult.error) { ... }
    pattern = r'''const authResult = await requireAuth\(request\)\s+if \(authResult\.error\) \{\s+return NextResponse\.json\(\s+\{ success: false, error: authResult\.error \},\s+\{ status: authResult\.status \|\| 401 \}\s+\)\s+\}\s+const \{ user \} = authResult\s+if \(!user\) \{\s+return NextResponse\.json\(\{ error: ['"]User not found['"] \}, \{ status: 401 \}\)\s+\}'''

    replacement = '''const session = await requireAuth(request)
  if (session instanceof NextResponse) return session

  const userId = session.user.id'''

    content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

    # Replace user.id with userId
    content = re.sub(r'\buser\.id\b', 'userId', content)

    with open(filepath, 'w') as f:
        f.write(content)

print("Done!")
