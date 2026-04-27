'use client'

import { useMemo, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { OllamaModel } from '@/hooks/use-ollama-models'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Loader2, RefreshCw } from 'lucide-react'

interface ModelSelectorProps {
  models: OllamaModel[]
  selectedModel: string
  onModelChange: (model: string) => void
  loading: boolean
  isConnected: boolean
  isDeleting: boolean
  error: string | null
  onRefresh: () => void
  onDeleteModels: (modelNames: string[]) => Promise<void>
  pullingModelName?: string | null
}

export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  loading,
  isConnected,
  isDeleting,
  error,
  onRefresh,
  onDeleteModels,
  pullingModelName = null,
}: ModelSelectorProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [checkedModels, setCheckedModels] = useState<string[]>([])
  const hasModels = models.length > 0
  const checkedSet = useMemo(() => new Set(checkedModels), [checkedModels])

  const triggerLabel = loading
    ? 'Loading models...'
    : selectedModel || (hasModels ? 'Select model...' : 'No models')

  const toggleCheckedModel = (modelName: string) => {
    setCheckedModels(current =>
      current.includes(modelName) ? current.filter(model => model !== modelName) : [...current, modelName]
    )
  }

  const handleDeleteModels = async () => {
    if (checkedModels.length === 0) {
      return
    }

    await onDeleteModels(checkedModels)
    setCheckedModels([])
    setDeleteDialogOpen(false)
  }

  return (
    <div className="flex max-w-80 flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger asChild disabled={!isConnected || isDeleting}>
            <button
              type="button"
              className="flex h-10 min-w-48 max-w-64 items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="truncate">{triggerLabel}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={8}
              align="end"
              className="z-50 min-w-64 rounded-xl border border-border bg-popover p-1.5 shadow-lg outline-none"
            >
              <div className="max-h-72 overflow-y-auto">
                {pullingModelName ? (
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground">
                    <span className="truncate">{pullingModelName}</span>
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                  </div>
                ) : null}
                {hasModels ? (
                  models.map(model => {
                    const isSelected = model.name === selectedModel
                    return (
                      <DropdownMenu.Item
                        key={model.name}
                        onSelect={() => onModelChange(model.name)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors',
                          isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{model.name}</span>
                        </div>
                        {isSelected && <Check className="size-4 shrink-0" />}
                      </DropdownMenu.Item>
                    )
                  })
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No models available.</div>
                )}
              </div>

              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={() => {
                  setCheckedModels(selectedModel ? [selectedModel] : [])
                  setDeleteDialogOpen(true)
                }}
                disabled={!hasModels}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-bold text-red-600 outline-none transition-colors hover:bg-red-50 focus:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
              >
                Delete models
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onRefresh}
          disabled={!isConnected || isDeleting || loading}
          title="Refresh models"
        >
          <RefreshCw className={`size-4 ${loading || isDeleting ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && <p className="max-w-full text-right text-xs text-red-500">{error}</p>}

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={open => {
          setDeleteDialogOpen(open)
          if (!open) {
            setCheckedModels([])
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Models</DialogTitle>
            <DialogDescription>
              Select the models to remove. This action deletes them from the Ollama server.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {hasModels ? (
              models.map(model => {
                const checked = checkedSet.has(model.name)

                return (
                  <label
                    key={model.name}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{model.name}</p>
                    </div>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        checked
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-border bg-background text-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleCheckedModel(model.name)}
                      />
                      <Check className="size-3.5" />
                    </span>
                  </label>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">No models available.</p>
            )}
          </div>

          <DialogFooter className="items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {checkedModels.length === 0 ? 'No models selected' : `${checkedModels.length} selected`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setCheckedModels([])
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteModels}
                disabled={checkedModels.length === 0 || isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Are you sure?'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
