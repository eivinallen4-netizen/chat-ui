import type { AuthConfig } from 'convex/server'

const domain = process.env.NEXT_PUBLIC_CONVEX_URL

export default {
  providers: domain ? [{ domain, applicationID: 'convex' }] : [],
} satisfies AuthConfig
