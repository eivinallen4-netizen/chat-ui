'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ModelDiscovery } from '@/components/model-discovery'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface OllamaLibraryModel {
  name: string
  description: string | null
  tags: string[]
  sizes: string[]
  pulls: string | null
  tagCount: string | null
  updated: string | null
  url: string
}

interface ModelLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  refreshKey?: number
  onPullModel?: (modelName: string) => Promise<void>
  pullingModelName?: string | null
}

export function ModelLibraryDialog({
  open,
  onOpenChange,
  refreshKey = 0,
  onPullModel,
  pullingModelName = null,
}: ModelLibraryDialogProps) {
  const [models, setModels] = useState<OllamaLibraryModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    if (models.length > 0 && refreshKey === 0) {
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const fetchModels = async () => {
      console.log('[ModelLibraryDialog] Loading Ollama library models')
      setLoading(true)
      setError(null)

      try {
        const query = refreshKey > 0 ? '?refresh=1' : ''
        const response = await fetch(`/api/ollama-library${query}`, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to load models: ${response.status}`)
        }

        const data = (await response.json()) as { models?: OllamaLibraryModel[] }
        console.log('[ModelLibraryDialog] Ollama library loaded', {
          status: response.status,
          modelCount: data.models?.length ?? 0,
        })

        if (!cancelled) {
          setModels(data.models ?? [])
        }
      } catch (fetchError) {
        const isAbortError =
          fetchError instanceof DOMException && fetchError.name === 'AbortError'
        if (isAbortError) {
          console.warn('[ModelLibraryDialog] Ollama library request was aborted')
          return
        }
        console.error('[ModelLibraryDialog] Failed to load Ollama library', fetchError)
        if (!cancelled) {
          setError(
            fetchError instanceof Error ? fetchError.message : 'Failed to load models'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchModels()

    return () => {
      console.log('[ModelLibraryDialog] Cleaning up pending Ollama library request')
      cancelled = true
      controller.abort()
    }
  }, [models.length, open, refreshKey])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!w-[calc(100vw-1rem)] !max-w-[1560px] flex h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden rounded-[24px] border border-border p-0 shadow-xl animate-none sm:!w-[min(96vw,1560px)] sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px]"
        showCloseButton
      >
        <DialogHeader className="border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Add Model
          </DialogTitle>
          <DialogDescription>
            Browse the Ollama library and inspect available model sizes from the main menu.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto bg-[#fcfcfc]">
          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : models.length === 0 ? (
            <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
              No models found.
            </div>
          ) : (
            <ModelDiscovery
              models={models}
              showHeader={false}
              className="px-4 py-4 sm:px-6 sm:py-6"
              onPullModel={onPullModel}
              pullingModelName={pullingModelName}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
