'use client'

import { SignInButton, UserButton, useAuth } from '@clerk/nextjs'
import { Settings, Cloud, HardDrive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { AppUser } from '@/lib/chat-types'
import type { DataMode } from '@/lib/app-plan'

interface ChatHeaderProps {
  title: string
  serviceName: string
  isConnected: boolean
  onSettingsOpen: () => void
  dataMode: DataMode
  currentUser: AppUser | null
}

export function ChatHeader({
  title,
  serviceName,
  isConnected,
  onSettingsOpen,
  dataMode,
  currentUser,
}: ChatHeaderProps) {
  const { isSignedIn } = useAuth()

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background">
      <h1 className="font-display font-bold text-base tracking-tight truncate">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-accent/30 px-3 py-1.5">
          <span className="text-sm font-medium text-foreground">{serviceName}</span>
          <span
            className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
            aria-hidden="true"
          />
        </div>
        {isSignedIn ? (
          <>
            <UserButton />
            <span
              className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded border',
                currentUser?.planTier === 'pro'
                  ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                  : 'border-muted-foreground text-muted-foreground'
              )}
            >
              {currentUser?.planTier ?? 'basic'}
            </span>
          </>
        ) : (
          <SignInButton mode="modal">
            <Button type="button" variant="outline" size="sm">
              Sign In
            </Button>
          </SignInButton>
        )}
        <button
          onClick={onSettingsOpen}
          className="rounded-lg p-2 hover:bg-accent transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
