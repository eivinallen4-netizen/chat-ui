import { AuthType } from '@/lib/service-config'

export function buildAuthHeaders(
  authType: AuthType,
  authToken: string
) {
  const headers: Record<string, string> = {}

  if (!authToken || authType === 'none') {
    return headers
  }

  if (authType === 'bearer') {
    headers['Authorization'] = `Bearer ${authToken}`
  } else if (authType === 'key') {
    headers['X-API-Key'] = authToken
  }

  return headers
}
