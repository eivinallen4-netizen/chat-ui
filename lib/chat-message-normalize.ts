import type { Message } from '@llamaindex/chat-ui'

type RawMessage = Partial<Message> & {
  content?: unknown
}

interface RawFileData {
  filename?: unknown
  mediaType?: unknown
  url?: unknown
}

function normalizeRole(role: unknown): Message['role'] {
  return role === 'system' || role === 'assistant' || role === 'user' ? role : 'assistant'
}

function normalizeFilePart(data: unknown): Extract<Message['parts'][number], { type: 'data-file' }> | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const file = data as RawFileData
  if (
    typeof file.filename !== 'string' ||
    typeof file.mediaType !== 'string' ||
    typeof file.url !== 'string'
  ) {
    return null
  }

  return {
    type: 'data-file',
    data: {
      filename: file.filename,
      mediaType: file.mediaType,
      url: file.url,
    },
  }
}

function normalizeParts(value: unknown, fallbackContent: unknown): Message['parts'] {
  if (Array.isArray(value)) {
    const parts = value.flatMap(part => {
      if (!part || typeof part !== 'object') {
        return []
      }

      const typedPart = part as { type?: unknown; text?: unknown; data?: unknown }

      if (typedPart.type === 'text' && typeof typedPart.text === 'string') {
        return [{ type: 'text', text: typedPart.text } satisfies Message['parts'][number]]
      }

      if (typedPart.type === 'data-file') {
        const filePart = normalizeFilePart(typedPart.data)
        return filePart ? [filePart] : []
      }

      return []
    })

    if (parts.length > 0) {
      return parts
    }
  }

  if (typeof fallbackContent === 'string' && fallbackContent.trim()) {
    return [{ type: 'text', text: fallbackContent }]
  }

  return [{ type: 'text', text: '' }]
}

export function normalizeMessage(input: unknown, index = 0): Message {
  const raw = (input && typeof input === 'object' ? input : {}) as RawMessage

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `message-${index}`,
    role: normalizeRole(raw.role),
    parts: normalizeParts(raw.parts, raw.content),
  }
}

export function normalizeMessages(messages: unknown): Message[] {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages.map((message, index) => normalizeMessage(message, index))
}
