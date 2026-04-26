'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'

const convexClient = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? 'https://placeholder.convex.cloud'
)

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
