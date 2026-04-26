'use client'

import { SignInButton } from '@clerk/nextjs'
import { Plus, Trash2, Cloud, HardDrive, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { GUEST_MAX_CHATS } from '@/lib/app-plan'
import type { DataMode } from '@/lib/app-plan'
import type { AppUser, ChatSessionSummary } from '@/lib/chat-types'

interface SidebarProps {
  sessions: ChatSessionSummary[]
  activeId: string | null
  onNew: () => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  dataMode: DataMode
  currentUser: AppUser | null
  error: string | null
  isMobileOpen: boolean
  onMobileClose: () => void
  onFeaturesClick?: () => void
}

export function Sidebar({
  sessions,
  activeId,
  onNew,
  onLoad,
  onDelete,
  dataMode,
  currentUser,
  error,
  isMobileOpen,
  onMobileClose,
  onFeaturesClick,
}: SidebarProps) {
  const formatRelativeDate = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden="true"
        onClick={onMobileClose}
        className={cn(
          'fixed inset-0 z-30 bg-black/30 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[280px] flex flex-col bg-sidebar',
          'transition-transform duration-300 ease-out will-change-transform',
          'md:relative md:translate-x-0 md:shadow-none md:shrink-0 md:border-r md:border-border md:h-full',
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={onMobileClose}
              className="md:hidden p-2 rounded-full hover:bg-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <span className="font-display font-bold text-lg tracking-tight">Chats</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {dataMode === 'authenticated' ? (
                <>
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Cloud</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Local</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onNew}
            title="New chat"
            className="p-2 rounded-full hover:bg-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Plus className="w-5 h-5 text-primary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-3">No chats yet</p>
          )}
          {sessions.map(session => (
            <div
              key={session.id}
              className={cn(
                'group flex items-start justify-between px-4 py-3.5 min-h-[52px] cursor-pointer my-0.5',
                'border-l-[3px] border-primary/30',
                'hover:bg-accent/60 transition-colors',
                activeId === session.id && 'bg-accent/80 shadow-sm border-primary'
              )}
            >
              <div onClick={() => { onLoad(session.id); onMobileClose() }} className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelativeDate(session.updatedAt)}
                </p>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onDelete(session.id)
                }}
                className="md:opacity-0 md:group-hover:opacity-100 opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-2 flex-shrink-0 p-1.5 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border">
          {dataMode === 'authenticated' && currentUser ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {currentUser.planTier} plan
              </p>
              <p className="mt-1 text-sm text-foreground">
                {currentUser.persistedChatCount}/8 chats used
              </p>
              <button
                onClick={onFeaturesClick}
                className="mt-2 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                Features
              </button>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest mode</p>
              <p className="mt-1 text-sm text-foreground">
                {sessions.length}/{GUEST_MAX_CHATS} chats used
              </p>
              <button
                onClick={onFeaturesClick}
                className="mt-2 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                Features
              </button>
              <SignInButton mode="modal">
                <Button type="button" size="default" variant="outline" className="mt-3 w-full">
                  Sign In to Sync
                </Button>
              </SignInButton>
            </>
          )}
          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        </div>
      </aside>
    </>
  )
}
