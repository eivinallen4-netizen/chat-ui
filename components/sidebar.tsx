'use client'

import { SignInButton } from '@clerk/nextjs'
import { Plus, Trash2, Cloud, HardDrive } from 'lucide-react'
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
    <aside className="w-[260px] h-full flex flex-col border-r border-border bg-sidebar shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
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
          className="p-1 rounded-lg hover:bg-accent transition-colors"
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
              'group flex items-start justify-between px-4 py-3 cursor-pointer rounded-none',
              'hover:bg-accent transition-colors',
              activeId === session.id && 'border-l-2 border-primary bg-accent/50'
            )}
          >
            <div onClick={() => onLoad(session.id)} className="flex-1 min-w-0">
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
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-2 flex-shrink-0"
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
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guest mode</p>
            <p className="mt-1 text-sm text-foreground">
              {sessions.length}/{GUEST_MAX_CHATS} chats used
            </p>
            <SignInButton mode="modal">
              <Button type="button" size="sm" variant="outline" className="mt-3 w-full">
                Sign In to Sync
              </Button>
            </SignInButton>
          </>
        )}
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </div>
    </aside>
  )
}
