import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  try {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      const startedAt = new Date().toISOString()
      // Basic inbound request log (avoid logging bodies)
      console.log(
        JSON.stringify({
          type: 'api_request_start',
          method: request.method,
          path: url.pathname,
          requestId,
          startedAt,
        })
      )

      const res = NextResponse.next()
      res.headers.set('x-request-id', requestId)
      return res
    }
  } catch (e) {
    // Non-fatal
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}

