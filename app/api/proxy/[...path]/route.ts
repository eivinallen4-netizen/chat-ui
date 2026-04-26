function getBaseUrl(request: Request): string | null {
  const url = new URL(request.url)
  const baseUrl = url.searchParams.get('base')
  if (!baseUrl) return null
  try {
    new URL(baseUrl)
    return baseUrl
  } catch {
    return null
  }
}

async function proxyRequest(
  request: Request,
  baseUrl: string,
  pathSegments: string[],
  method: string
) {
  const url = new URL(request.url)
  const queryString = url.search
  const targetUrl = `${baseUrl}/${pathSegments.join('/')}${queryString}`

  try {
    const headers: Record<string, string> = {}

    // Forward request headers that the upstream service might need
    const forwardHeaders = [
      'content-type',
      'authorization',
      'x-api-key',
      'accept',
      'accept-encoding',
      'accept-language',
      'user-agent',
    ]

    for (const headerName of forwardHeaders) {
      const headerValue = request.headers.get(headerName)
      if (headerValue) {
        headers[headerName.charAt(0).toUpperCase() + headerName.slice(1).replace(/-([a-z])/g, (_, c) => '-' + c.toUpperCase())] = headerValue
      }
    }

    let body: string | undefined
    if (method !== 'GET' && method !== 'DELETE') {
      body = await request.text()
    } else if (method === 'DELETE' && request.headers.get('content-length')) {
      body = await request.text()
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
    })

    // Forward response as-is to preserve streaming and content-type
    // Create new Response to allow modification of headers if needed
    const responseHeaders = new Headers(response.headers)

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    return Response.json(
      { error: 'Proxy request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const baseUrl = getBaseUrl(request)
  if (!baseUrl) {
    return Response.json({ error: 'Missing base URL parameter' }, { status: 400 })
  }
  const { path } = await params
  return proxyRequest(request, baseUrl, path, 'GET')
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const baseUrl = getBaseUrl(request)
  if (!baseUrl) {
    return Response.json({ error: 'Missing base URL parameter' }, { status: 400 })
  }
  const { path } = await params
  return proxyRequest(request, baseUrl, path, 'POST')
}

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const baseUrl = getBaseUrl(request)
  if (!baseUrl) {
    return Response.json({ error: 'Missing base URL parameter' }, { status: 400 })
  }
  const { path } = await params
  return proxyRequest(request, baseUrl, path, 'PUT')
}

export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const baseUrl = getBaseUrl(request)
  if (!baseUrl) {
    return Response.json({ error: 'Missing base URL parameter' }, { status: 400 })
  }
  const { path } = await params
  return proxyRequest(request, baseUrl, path, 'DELETE')
}
