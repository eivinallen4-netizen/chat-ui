import type { AuthConfig } from 'convex/server'

console.log('[auth.config] CLERK_JWT_ISSUER_DOMAIN:', process.env.CLERK_JWT_ISSUER_DOMAIN)

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig
