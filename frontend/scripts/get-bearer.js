#!/usr/bin/env node
/*
  Prints a Supabase JWT (access_token) to stdout for smoke testing.
  Env vars required:
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SMOKE_EMAIL
    SMOKE_PASSWORD
*/

const { createClient } = require('@supabase/supabase-js')

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const email = process.env.SMOKE_EMAIL
  const password = process.env.SMOKE_PASSWORD

  if (!url || !anon) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }
  if (!email || !password) {
    console.error('Missing SMOKE_EMAIL or SMOKE_PASSWORD')
    process.exit(1)
  }

  const sb = createClient(url, anon)
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('Sign-in failed:', error.message)
    process.exit(1)
  }
  const token = data.session?.access_token
  if (!token) {
    console.error('No access token returned from Supabase')
    process.exit(1)
  }
  process.stdout.write(token)
}

main().catch((e) => {
  console.error('Unexpected error:', e?.message || e)
  process.exit(1)
})

