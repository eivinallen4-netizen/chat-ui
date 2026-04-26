'use client'

import { SignInButton, UserButton, useAuth } from '@clerk/nextjs'
import { Settings, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { AppUser } from '@/lib/chat-types'

interface ChatHeaderProps {
  title: string
  serviceName: string
  isConnected: boolean
  onSettingsOpen: () => void
  onMenuOpen: () => void
  currentUser: AppUser | null
}

export function ChatHeader({
  title,
  serviceName,
  isConnected,
  onSettingsOpen,
  onMenuOpen,
  currentUser,
}: ChatHeaderProps) {
  const { isSignedIn } = useAuth()

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuOpen}
          className="md:hidden p-2 rounded-full hover:bg-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display font-bold text-base tracking-tight truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <div className="flex items-center gap-1.5 rounded-full bg-accent/40 px-3 py-1.5">
          <span className="hidden sm:inline text-sm font-medium text-foreground">{serviceName}</span>
          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500' : 'bg-red-400'}`}
            aria-hidden="true"
          />
        </div>
        {isSignedIn ? (
          <>
            <UserButton />
            <span
              className={cn(
                'hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-full border',
                currentUser?.planTier === 'pro'
                  ? 'border-yellow-400 text-yellow-700 bg-yellow-50'
                  : 'border-muted-foreground/40 text-muted-foreground'
              )}
            >
              {currentUser?.planTier ?? 'basic'}
            </span>
          </>
        ) : (
          <SignInButton mode="modal">
            <Button type="button" variant="outline" size="sm" className="rounded-full">
              Sign In
            </Button>
          </SignInButton>
        )}
        <button
          onClick={onSettingsOpen}
          className="rounded-full p-2 hover:bg-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
