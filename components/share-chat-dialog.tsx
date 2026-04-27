'use client'

import { useState } from 'react'
import { Copy, Check, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface ShareChatDialogProps {
  open: boolean
  shareToken: string | null
  onClose: () => void
  onRevoke: () => Promise<void>
}

export function ShareChatDialog({
  open,
  shareToken,
  onClose,
  onRevoke,
}: ShareChatDialogProps) {
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/shared/${shareToken}`
    : ''

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRevoke = async () => {
    setRevoking(true)
    try {
      await onRevoke()
    } finally {
      setRevoking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Share this chat</DialogTitle>
          <DialogDescription>
            Anyone with this link can view your chat transcript
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {shareUrl && (
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Share link
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all text-xs sm:text-sm font-mono text-foreground">
                  {shareUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-background border border-border hover:border-primary transition-colors active:scale-95 shrink-0"
                  title={copied ? 'Copied!' : 'Copy link'}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-xs leading-relaxed text-amber-900">
              This link is public. Anyone who has it can view your messages. Share only with people you trust.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-border hover:border-primary bg-background hover:bg-accent transition-colors font-semibold text-sm min-h-[44px]"
            >
              Done
            </button>
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-destructive/50 hover:border-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors font-semibold text-sm text-destructive min-h-[44px] disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Revoke
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
