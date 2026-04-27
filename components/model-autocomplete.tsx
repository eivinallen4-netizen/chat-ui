'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Loader2, Download, Tag } from 'lucide-react'

interface ModelAutocompleteModel {
  name: string
  description: string | null
  tags: string[]
  sizes: string[]
  pulls: string | null
  tagCount: string | null
  updated: string | null
}

const TAG_COLORS: Record<string, string> = {
  vision: 'bg-blue-100 text-blue-700 border-blue-200',
  tools: 'bg-purple-100 text-purple-700 border-purple-200',
  thinking: 'bg-orange-100 text-orange-700 border-orange-200',
  cloud: 'bg-teal-100 text-teal-700 border-teal-200',
  embedding: 'bg-green-100 text-green-700 border-green-200',
}

interface ModelAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ModelAutocomplete({
  value,
  onChange,
  placeholder = 'tinyllama:latest',
}: ModelAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [models, setModels] = useState<ModelAutocompleteModel[]>([])
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredModels = useMemo(() => {
    if (!value.trim()) {
      return models
    }

    const query = value.toLowerCase().replace(/:latest$/, '')
    return models.filter(
      model =>
        model.name.toLowerCase().includes(query) ||
        (model.description && model.description.toLowerCase().includes(query))
    )
  }, [value, models])

  const fetchModels = useCallback(async () => {
    console.log('[ModelAutocomplete] Fetching Ollama library models')
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/ollama-library')
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      const data = await response.json()
      console.log('[ModelAutocomplete] Models loaded', {
        status: response.status,
        modelCount: data.models?.length ?? 0,
      })
      setModels(data.models || [])
    } catch (err) {
      setError('Failed to load models')
      console.error('[ModelAutocomplete] Error fetching models:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleFocus = () => {
    console.log('[ModelAutocomplete] Input focused', {
      cachedModelCount: models.length,
      isLoading,
    })
    setIsOpen(true)
    if (models.length === 0 && !isLoading) {
      fetchModels()
    }
  }

  const handleSelectModel = (modelName: string) => {
    console.log('[ModelAutocomplete] Model selected', { modelName })
    onChange(`${modelName}:latest`)
    setIsOpen(false)
  }

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    },
    []
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [handleClickOutside])

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-10 rounded-xl border-border bg-background"
        autoComplete="off"
      />

      {isOpen && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-xl border border-border bg-popover shadow-lg">
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center px-4 py-8">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="px-4 py-3 text-sm text-red-500">{error}</div>
            ) : filteredModels.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                {models.length === 0 ? 'No models available' : 'No models found'}
              </div>
            ) : (
              filteredModels.map(model => (
                <div
                  key={model.name}
                  onClick={() => handleSelectModel(model.name)}
                  className="cursor-pointer border-b border-border last:border-b-0 px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  {/* Model name */}
                  <h3 className="text-lg font-bold text-foreground">{model.name}</h3>

                  {/* Description */}
                  {model.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{model.description}</p>}

                  {/* Tags and Sizes */}
                  {(model.tags.length > 0 || model.sizes.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {model.tags.map(tag => (
                        <span
                          key={tag}
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                            TAG_COLORS[tag] || 'bg-gray-100 text-gray-700 border-gray-200'
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                      {model.sizes.map(size => (
                        <span key={size} className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          {size}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bottom row: pulls and tag count */}
                  {(model.pulls || model.tagCount) && (
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      {model.pulls && (
                        <div className="flex items-center gap-1">
                          <Download className="size-3.5" />
                          <span>{model.pulls}</span>
                        </div>
                      )}
                      {model.tagCount && (
                        <div className="flex items-center gap-1">
                          <Tag className="size-3.5" />
                          <span>{model.tagCount}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
