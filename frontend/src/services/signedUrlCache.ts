import { supabaseStorage } from './supabaseStorage'

type CacheEntry = { url: string; expiresAt: number }

const cache = new Map<string, CacheEntry>()
const SAFETY_BUFFER_MS = 15_000 // renew 15s before expiry

function now() {
  return Date.now()
}

export function getCachedSignedUrl(key: string): string | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt - now() > SAFETY_BUFFER_MS) return entry.url
  return null
}

export async function getOrCreateSignedUrl(path: string, ttlSeconds: number = 3600): Promise<string | null> {
  const key = `sb:${path}`
  const cached = getCachedSignedUrl(key)
  if (cached) return cached

  const res = await supabaseStorage.createSignedUrl(path, ttlSeconds)
  if (res.success && res.data?.signedUrl) {
    const url = res.data.signedUrl
    cache.set(key, { url, expiresAt: now() + ttlSeconds * 1000 })
    return url
  }
  return null
}

