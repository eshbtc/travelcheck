import crypto from 'crypto'

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('Server misconfiguration: ENCRYPTION_KEY is not set')
  }
  // Derive 32-byte key from provided string
  return crypto.createHash('sha256').update(raw).digest()
}

export function encrypt(text: string): {
  iv: string
  data: string
  tag: string
} {
  const iv = crypto.randomBytes(12)
  const key = getKey()
  const cipher = crypto.createCipheriv('aes-256-gcm', key as any, iv as any)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8') as any, cipher.final() as any])
  const tag = cipher.getAuthTag()
  
  return {
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: tag.toString('base64'),
  }
}

export function decrypt(obj: {
  iv: string
  data: string
  tag: string
} | string): string | null {
  if (typeof obj === 'string') {
    // Handle legacy unencrypted tokens
    return obj
  }
  
  if (!obj || !obj.iv || !obj.data || !obj.tag) return null
  
  try {
    const iv = Buffer.from(obj.iv, 'base64')
    const data = Buffer.from(obj.data, 'base64')
    const tag = Buffer.from(obj.tag, 'base64')
    const key = getKey()

    const decipher = crypto.createDecipheriv('aes-256-gcm', key as any, iv as any)
    decipher.setAuthTag(tag as any)

    const decrypted = Buffer.concat([decipher.update(data as any) as any, decipher.final() as any])
    return decrypted.toString('utf8')
  } catch (error) {
    console.error('Decryption failed:', error)
    return null
  }
}
