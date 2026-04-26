const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//

function withProtocol(endpoint: string) {
  if (ABSOLUTE_URL_PATTERN.test(endpoint)) {
    return endpoint
  }

  return `http://${endpoint}`
}

export function normalizeApiEndpoint(endpoint: string) {
  const trimmed = endpoint.trim().replace(/\/+$/, '')

  if (!trimmed) {
    return ''
  }

  return withProtocol(trimmed)
}

function shouldUseProxy(endpoint: string): boolean {
  if (typeof window === 'undefined') return false

  const isHttpsPage = window.location.protocol === 'https:'
  const isHttpEndpoint = endpoint.startsWith('http://')

  return isHttpsPage && isHttpEndpoint
}

export function buildApiUrl(endpoint: string, path: string) {
  const normalizedEndpoint = normalizeApiEndpoint(endpoint)

  if (!normalizedEndpoint) {
    return ''
  }

  if (shouldUseProxy(normalizedEndpoint)) {
    const encodedBase = encodeURIComponent(normalizedEndpoint)
    const pathWithoutLeadingSlash = path.replace(/^\//, '')
    return `/api/proxy/${pathWithoutLeadingSlash}?base=${encodedBase}`
  }

  return new URL(path, `${normalizedEndpoint}/`).toString()
}
