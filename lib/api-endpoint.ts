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

export function buildApiUrl(endpoint: string, path: string) {
  const normalizedEndpoint = normalizeApiEndpoint(endpoint)

  if (!normalizedEndpoint) {
    return ''
  }

  return new URL(path, `${normalizedEndpoint}/`).toString()
}
