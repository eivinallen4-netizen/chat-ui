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
    const contentType = request.headers.get('content-type')
    if (contentType) headers['Content-Type'] = contentType

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

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    return Response.json(data, { status: response.status })
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
