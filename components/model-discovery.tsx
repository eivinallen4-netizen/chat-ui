'use client'

import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Link2,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Model {
  name: string
  description: string | null
  tags: string[]
  sizes: string[]
  pulls: string | null
  tagCount: string | null
  updated: string | null
  url: string
}

interface ModelDiscoveryProps {
  models: Model[]
  showHeader?: boolean
  className?: string
  onPullModel?: (modelName: string) => Promise<void>
  pullingModelName?: string | null
}

const TABS = ['Overview', 'Details', 'Use cases', 'License'] as const
const GRID_PAGE_SIZE = 8

const SIZE_DOWNLOADS: Record<string, string> = {
  '0.5b': '399MB',
  '1b': '1.1GB',
  '3b': '2.0GB',
  '7b': '4.7GB',
  '8b': '4.9GB',
  '11b': '7.3GB',
  '13b': '8.0GB',
  '14b': '9.0GB',
  '22b': '13GB',
  '32b': '20GB',
  '33b': '20GB',
  '34b': '20GB',
  '70b': '40GB',
  '72b': '43GB',
  '90b': '55GB',
  '405b': '231GB',
}

const FALLBACK_MODEL: Model = {
  name: 'llama-3.1',
  description:
    "Meta's state-of-the-art open model with excellent reasoning and instruction following.",
  tags: ['llm', 'chat', 'general'],
  sizes: ['8B', '70B', '405B'],
  pulls: '4.2M',
  tagCount: null,
  updated: null,
  url: 'https://ollama.com/library/llama3.1',
}

function formatPulls(value: string | null) {
  return value ?? '4.2M'
}

function getSizeValue(size: string) {
  return SIZE_DOWNLOADS[size.toLowerCase()] ?? 'Unknown'
}

function getDescription(model: Model) {
  return (
    model.description ||
    "Meta's state-of-the-art open model with excellent reasoning and instruction following."
  )
}

function getDisplayTags(model: Model) {
  if (model.tags.length >= 3) {
    return model.tags.slice(0, 3)
  }

  return [...model.tags, 'general', 'chat', 'llm'].slice(0, 3)
}

function getOverviewCopy(model: Model) {
  if (model.name.toLowerCase().includes('llama-3.1')) {
    return 'Llama 3.1 is a collection of pretrained and instruction-tuned large language models in 8B, 70B and 405B sizes. The models are optimized for multilingual dialog use cases, including agentic retrieval and summarization tasks.'
  }

  const description = getDescription(model)
  const sizes = model.sizes.slice(0, 3).join(', ')
  return `${description}${sizes ? ` Available in ${sizes} variants for local deployment.` : ''}`
}

export function ModelDiscovery({
  models,
  showHeader = true,
  className,
  onPullModel,
  pullingModelName = null,
}: ModelDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Overview')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeModel, setActiveModel] = useState<Model | null>(null)
  const [showSizePicker, setShowSizePicker] = useState(false)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  const allModels = useMemo(() => (models.length > 0 ? models : [FALLBACK_MODEL]), [models])

  const filteredModels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return allModels
    }

    return allModels.filter(model => {
      const haystacks = [model.name, model.description ?? '', ...model.tags, ...model.sizes]
      return haystacks.some(value => value.toLowerCase().includes(query))
    })
  }, [allModels, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredModels.length / GRID_PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageModels = filteredModels.slice((safePage - 1) * GRID_PAGE_SIZE, safePage * GRID_PAGE_SIZE)

  const handlePullModel = async (size: string) => {
    if (!onPullModel || !activeModel) {
      return
    }

    await onPullModel(`${activeModel.name}:${size.toLowerCase()}`)
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden bg-[#fcfcfc] px-4 py-4 sm:px-6 sm:py-6 lg:px-8', className)}>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1680px] flex-col gap-6">
        <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {showHeader ? (
            <div className="space-y-1">
              <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#1f1f1f]">
                Discover models
              </h1>
              <p className="text-[14px] text-[#747474]">
                Search the Ollama library and compare model sizes.
              </p>
            </div>
          ) : (
            <div />
          )}

          <div className="relative w-full max-w-full lg:max-w-[420px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[16px] -translate-y-1/2 text-[#8b8b8b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={event => {
                setSearchQuery(event.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search models, tags, or sizes"
              className="h-[48px] w-full rounded-[14px] border border-[#eee8e8] bg-white pl-11 pr-4 text-[14px] text-[#2a2a2a] outline-none transition-colors placeholder:text-[#9b9b9b] focus:border-[#ff9f9f]"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div className="flex flex-col divide-y divide-[#efebeb] pb-2">
            {pageModels.map(model => (
              <button
                key={model.name}
                onClick={() => {
                  setActiveModel(model)
                  setActiveTab('Overview')
                }}
                className="w-full text-left p-4 active:bg-[#faf7f7] transition-colors hover:bg-[#faf7f7]"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-[15px] text-[#1f1f1f] tracking-[-0.02em]">
                    {model.name}
                  </span>
                  <span className="text-[12px] text-[#7b7b7b] ml-2 shrink-0 flex items-center gap-1">
                    <Download className="size-[12px] stroke-[1.9]" />
                    {formatPulls(model.pulls)}
                  </span>
                </div>
                <p className="text-[13px] text-[#6d6d6d] line-clamp-1 mb-1.5">
                  {getDescription(model)}
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {getDisplayTags(model).map(tag => (
                    <span
                      key={tag}
                      className="text-[11px] text-[#7b7b7b] bg-[#f4efef] px-1.5 py-0.5 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Sheet Backdrop */}
        {activeModel && (
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setActiveModel(null)}
          />
        )}

        {/* Bottom Sheet */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto transition-transform duration-300 ${
            activeModel ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          {activeModel && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#efebeb] sticky top-0 bg-white rounded-t-2xl">
                <h2 className="font-semibold text-[17px] text-[#1f1f1f]">
                  {activeModel.name}
                </h2>
                <button
                  onClick={() => setActiveModel(null)}
                  className="p-1.5 rounded-full hover:bg-[#f4efef]"
                >
                  <X className="w-5 h-5 text-[#6d6d6d]" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#efebeb] px-4">
                {(['Overview', 'Details'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 mr-4 text-[14px] font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-[#ff6a6a] text-[#ff5d5d]'
                        : 'border-transparent text-[#7b7b7b]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-4">
                {activeTab === 'Overview' && (
                  <p className="text-[14px] text-[#6d6d6d]">
                    {getOverviewCopy(activeModel)}
                  </p>
                )}
                {activeTab === 'Details' && (
                  <p className="text-[14px] text-[#6d6d6d]">
                    {activeModel.description}
                  </p>
                )}
              </div>

              {/* Model sizes */}
              <div className="px-4 pb-4">
                <p className="text-[12px] font-semibold text-[#7b7b7b] uppercase tracking-[0.06em] mb-2">
                  Model Sizes
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {activeModel.sizes.slice(0, 3).map(size => (
                    <span
                      key={size}
                      className="text-[13px] text-[#6d6d6d] bg-[#f4efef] px-2.5 py-1 rounded-lg"
                    >
                      {size} — {getSizeValue(size)}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowSizePicker(true)
                    setSelectedSize(null)
                  }}
                  disabled={!onPullModel || pullingModelName !== null}
                  className="w-full bg-[#ff5d5d] text-white py-3 rounded-xl font-medium text-[15px] disabled:opacity-50 active:bg-[#e04f4f] transition-colors"
                >
                  {pullingModelName?.startsWith(activeModel.name) ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Downloading…
                    </span>
                  ) : (
                    'Download'
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Size Picker Modal */}
        {showSizePicker && activeModel && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-60"
              onClick={() => setShowSizePicker(false)}
            />
            {/* Picker sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-70 bg-white rounded-t-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[16px] text-[#1f1f1f]">
                  Select Model Size
                </h3>
                <button
                  onClick={() => setShowSizePicker(false)}
                  className="p-1 rounded-full hover:bg-[#f4efef]"
                >
                  <X className="w-5 h-5 text-[#6d6d6d]" />
                </button>
              </div>
              <div className="flex flex-col gap-2 mb-3">
                {activeModel.sizes.slice(0, 3).map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-full flex justify-between items-center p-3 border rounded-xl transition-colors ${
                      selectedSize === size
                        ? 'border-[#ff5d5d] bg-[#fffdfd] text-[#ff5d5d]'
                        : 'border-[#efebeb] text-[#1f1f1f]'
                    }`}
                  >
                    <span className="font-medium text-[14px]">{size}</span>
                    <span className="text-[13px] text-[#7b7b7b]">
                      {getSizeValue(size)}
                    </span>
                  </button>
                ))}
              </div>
              <button
                disabled={!selectedSize}
                onClick={async () => {
                  if (!selectedSize) return
                  setShowSizePicker(false)
                  await handlePullModel(selectedSize)
                }}
                className="w-full bg-black text-white py-3 rounded-xl font-medium text-[15px] mt-1 disabled:opacity-50 transition-colors"
              >
                Download Selected Model
              </button>
            </div>
          </>
        )}

        <div className="shrink-0 flex items-center justify-center gap-4 sm:gap-[24px]">
          <button
            type="button"
            onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="flex h-[48px] w-[48px] items-center justify-center rounded-[12px] border border-[#f0eaea] bg-white text-[#444] transition-colors hover:bg-[#faf7f7] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="size-[20px] stroke-[2]" />
          </button>

          <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[12px] border border-[#ff8f8f] bg-white text-[16px] font-semibold text-[#ff6161]">
            {safePage}
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="flex h-[48px] w-[48px] items-center justify-center rounded-[12px] border border-[#f0eaea] bg-white text-[#444] transition-colors hover:bg-[#faf7f7] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronRight className="size-[20px] stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  )
}
