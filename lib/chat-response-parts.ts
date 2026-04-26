import type { Message } from '@llamaindex/chat-ui'

type MessagePart = Message['parts'][number]

interface FilePayload {
  filename?: string
  name?: string
  title?: string
  mediaType?: string
  mimeType?: string
  contentType?: string
  url?: string
  href?: string
  content?: unknown
  text?: string
  data?: unknown
  base64?: string
}

interface ResponsePayload {
  text: string
  parts: MessagePart[]
}

function isTextPart(part: MessagePart): part is MessagePart & { text: string } {
  return part.type === 'text' && 'text' in part && typeof part.text === 'string'
}

type RawTextPart = { type: 'text'; text: string }

const CODE_BLOCK_DOWNLOAD_LANGUAGES = new Map([
  ['json', 'application/json'],
  ['svg', 'image/svg+xml'],
])

function inferExtension(mediaType: string) {
  switch (mediaType) {
    case 'application/json':
      return 'json'
    case 'image/svg+xml':
      return 'svg'
    case 'application/pdf':
      return 'pdf'
    case 'text/plain':
      return 'txt'
    default:
      return 'txt'
  }
}

function ensureFilename(filename: string | undefined, mediaType: string, index: number) {
  if (filename && filename.trim()) {
    return filename.trim()
  }

  return `download-${index}.${inferExtension(mediaType)}`
}

function normalizeTextContent(value: unknown, mediaType: string) {
  if (typeof value === 'string') {
    return value
  }

  if (mediaType === 'application/json' && value !== undefined) {
    return JSON.stringify(value, null, 2)
  }

  if (value == null) {
    return ''
  }

  return String(value)
}

function createBlobUrl(content: string, mediaType: string) {
  return URL.createObjectURL(new Blob([content], { type: mediaType }))
}

function createBlobUrlFromBase64(base64: string, mediaType: string) {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return URL.createObjectURL(new Blob([bytes], { type: mediaType }))
}

function partKey(part: MessagePart) {
  if (isTextPart(part)) {
    return `text:${part.text}`
  }

  return `${part.type}:${JSON.stringify(part.data ?? null)}`
}

function dedupeParts(parts: MessagePart[]) {
  const seen = new Set<string>()
  return parts.filter(part => {
    const key = partKey(part)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function normalizeFilePayload(payload: FilePayload, index: number): MessagePart | null {
  const mediaType = payload.mediaType ?? payload.mimeType ?? payload.contentType ?? 'text/plain'
  const filename = ensureFilename(payload.filename ?? payload.name ?? payload.title, mediaType, index)
  const url = payload.url ?? payload.href

  if (typeof url === 'string' && url.trim()) {
    return {
      type: 'data-file',
      data: {
        filename,
        mediaType,
        url: url.trim(),
      },
    }
  }

  const inlineContent = payload.content ?? payload.text ?? payload.data
  if (inlineContent !== undefined) {
    return {
      type: 'data-file',
      data: {
        filename,
        mediaType,
        url: createBlobUrl(normalizeTextContent(inlineContent, mediaType), mediaType),
      },
    }
  }

  if (typeof payload.base64 === 'string' && payload.base64.trim()) {
    return {
      type: 'data-file',
      data: {
        filename,
        mediaType,
        url: createBlobUrlFromBase64(payload.base64.trim(), mediaType),
      },
    }
  }

  return null
}

function extractTextFromParts(parts: unknown[]) {
  const textParts = parts.filter(
    (part): part is RawTextPart =>
      Boolean(part) && typeof part === 'object' && (part as { type?: string }).type === 'text' && typeof (part as { text?: unknown }).text === 'string'
  )

  return textParts.map(part => part.text).join('\n\n')
}

function normalizeParts(parts: unknown[]) {
  const normalized: MessagePart[] = []

  for (const part of parts) {
    if (!part || typeof part !== 'object') {
      continue
    }

    const typedPart = part as { type?: string; text?: unknown; data?: unknown }
    if (typedPart.type === 'text' && typeof typedPart.text === 'string') {
      normalized.push({ type: 'text', text: typedPart.text })
      continue
    }

    if (typedPart.type === 'data-file' && typedPart.data && typeof typedPart.data === 'object') {
      const filePart = normalizeFilePayload(typedPart.data as FilePayload, normalized.length + 1)
      if (filePart) {
        normalized.push(filePart)
      }
      continue
    }

    if (typedPart.type?.startsWith('data-')) {
      normalized.push(typedPart as MessagePart)
    }
  }

  return normalized
}

function extractDeclaredFiles(payload: Record<string, unknown>) {
  const fileCollections = [
    payload.files,
    payload.attachments,
    payload.downloads,
    payload.message && typeof payload.message === 'object' ? (payload.message as Record<string, unknown>).files : undefined,
    payload.message && typeof payload.message === 'object' ? (payload.message as Record<string, unknown>).attachments : undefined,
    payload.message && typeof payload.message === 'object' ? (payload.message as Record<string, unknown>).downloads : undefined,
  ]

  return fileCollections.flatMap(collection => {
    if (!Array.isArray(collection)) {
      return []
    }

    return collection
      .map((item, index) =>
        item && typeof item === 'object' ? normalizeFilePayload(item as FilePayload, index + 1) : null
      )
      .filter((part): part is MessagePart => part !== null)
  })
}

function extractCodeBlockFiles(text: string) {
  const files: MessagePart[] = []
  let index = 1

  const regex = /```([a-zA-Z0-9_-]+)\n([\s\S]*?)```/g
  for (const match of text.matchAll(regex)) {
    const language = match[1]?.toLowerCase()
    const content = match[2]?.trim()
    const mediaType = language ? CODE_BLOCK_DOWNLOAD_LANGUAGES.get(language) : undefined

    if (!mediaType || !content) {
      continue
    }

    files.push({
      type: 'data-file',
      data: {
        filename: ensureFilename(undefined, mediaType, index),
        mediaType,
        url: createBlobUrl(content, mediaType),
      },
    })
    index += 1
  }

  return files
}

export function extractResponsePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return { text: typeof raw === 'string' ? raw : '', parts: [] } satisfies ResponsePayload
  }

  const payload = raw as Record<string, unknown>
  const messagePayload =
    payload.message && typeof payload.message === 'object'
      ? (payload.message as Record<string, unknown>)
      : null

  const rootParts = Array.isArray(payload.parts) ? normalizeParts(payload.parts) : []
  const messageParts = messagePayload && Array.isArray(messagePayload.parts) ? normalizeParts(messagePayload.parts) : []
  const declaredFiles = extractDeclaredFiles(payload)

  const text =
    extractTextFromParts(rootParts) ||
    extractTextFromParts(messageParts) ||
    (typeof payload.content === 'string' ? payload.content : '') ||
    (typeof payload.text === 'string' ? payload.text : '') ||
    (messagePayload && typeof messagePayload.content === 'string' ? messagePayload.content : '')

  const parts = dedupeParts([
    ...rootParts.filter(part => part.type !== 'text'),
    ...messageParts.filter(part => part.type !== 'text'),
    ...declaredFiles,
    ...extractCodeBlockFiles(text),
  ])

  return { text, parts } satisfies ResponsePayload
}

export function buildAssistantParts(text: string, extraParts: MessagePart[] = []) {
  const parts: MessagePart[] = []

  if (text.trim()) {
    parts.push({ type: 'text', text })
  }

  return dedupeParts([...parts, ...extraParts])
}
