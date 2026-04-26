'use client'

import { useMemo, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { OllamaModel } from '@/hooks/use-ollama-models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, RefreshCw } from 'lucide-react'

interface ModelSelectorProps {
  models: OllamaModel[]
  selectedModel: string
  onModelChange: (model: string) => void
  loading: boolean
  isConnected: boolean
  isMutating: boolean
  error: string | null
  onRefresh: () => void
  onAddModel: (modelName: string) => Promise<void>
  onDeleteModels: (modelNames: string[]) => Promise<void>
}

export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  loading,
  isConnected,
  isMutating,
  error,
  onRefresh,
  onAddModel,
  onDeleteModels,
}: ModelSelectorProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [checkedModels, setCheckedModels] = useState<string[]>([])
  const hasModels = models.length > 0
  const checkedSet = useMemo(() => new Set(checkedModels), [checkedModels])

  const triggerLabel = loading
    ? 'Loading models...'
    : selectedModel || (hasModels ? 'Select model...' : 'No models')

  const handleAddModel = () => {
    const modelName = newModelName.trim()
    if (!modelName) {
      return
    }

    void onAddModel(modelName)
    setNewModelName('')
    setAddDialogOpen(false)
  }

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
          <DropdownMenu.Trigger asChild disabled={!isConnected || isMutating}>
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
                {hasModels ? (
                  models.map(model => {
                    const isSelected = model.name === selectedModel
                    const statusLabel =
                      model.status === 'downloading' ? 'Downloading' : model.status === 'done' ? 'Done' : ''

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
                          {statusLabel && (
                            <span
                              className={cn(
                                'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                                model.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              )}
                            >
                              {statusLabel}
                            </span>
                          )}
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
                  setDeleteDialogOpen(false)
                  setAddDialogOpen(true)
                }}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-bold text-emerald-600 outline-none transition-colors hover:bg-emerald-50 focus:bg-emerald-50"
              >
                Add model
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={() => {
                  setAddDialogOpen(false)
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
          disabled={!isConnected || isMutating || loading}
          title="Refresh models"
        >
          <RefreshCw className={`size-4 ${loading || isMutating ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && <p className="max-w-full text-right text-xs text-red-500">{error}</p>}

      <Dialog
        open={addDialogOpen}
        onOpenChange={open => {
          setAddDialogOpen(open)
          if (!open) {
            setNewModelName('')
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Model</DialogTitle>
            <DialogDescription>
              Enter an Ollama model name to pull it onto the configured server.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={newModelName}
              onChange={e => setNewModelName(e.target.value)}
              placeholder="tinyllama:latest"
              className="h-10 rounded-xl border-border bg-background"
            />
          </div>

          <DialogFooter className="items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false)
                setNewModelName('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddModel}
              disabled={!newModelName.trim()}
              className="bg-emerald-600 font-bold text-white hover:bg-emerald-700"
            >
              Add model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                disabled={checkedModels.length === 0 || isMutating}
              >
                {isMutating ? 'Deleting...' : 'Are you sure?'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
