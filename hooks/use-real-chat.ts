'use client'

import { useEffect, useState } from 'react'
import { ChatHandler, Message } from '@llamaindex/chat-ui'
import { AuthType, ServiceDefinition } from './use-settings'
import { buildApiUrl } from '@/lib/api-endpoint'
import { buildAuthHeaders } from '@/lib/auth-headers'
import { getValueAtPath, renderTemplateValue } from '@/lib/service-config'
import { getMessageText } from '@/lib/chat-message-utils'

interface UseRealChatParams {
  apiEndpoint: string
  serviceDefinition: ServiceDefinition | null
  authType: AuthType
  authToken: string
  selectedModel: string
  systemPrompt: string
  initialMessages: Message[]
  onMessagesChange: (messages: Message[]) => void
  validateBeforeSend?: (message: Message) => Promise<string | null>
}

export type RealChatHandler = ChatHandler & {
  error: string | null
  clearError: () => void
}

interface StreamParseResult {
  chunks: string[]
  done: boolean
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function areMessagesEquivalent(left: Message[], right: Message[]) {
  if (left === right) {
    return true
  }

  if (left.length !== right.length) {
    return false
  }

  return left.every((message, index) => {
    const other = right[index]
    if (!other) {
      return false
    }

    return (
      message.id === other.id &&
      message.role === other.role &&
      getMessageText(message) === getMessageText(other)
    )
  })
}

function extractJsonObjects(input: string) {
  const objects: string[] = []
  let depth = 0
  let inString = false
  let escaping = false
  let start = -1

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (inString) {
      if (escaping) {
        escaping = false
      } else if (char === '\\') {
        escaping = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      if (depth === 0) {
        start = i
      }
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0 && start !== -1) {
        objects.push(input.slice(start, i + 1))
        start = -1
      }
    }
  }

  const remainder = depth > 0 && start !== -1 ? input.slice(start) : ''
  return { objects, remainder }
}

function parseStreamChunk(raw: string): StreamParseResult {
  const chunks: string[] = []
  let done = false

  for (const line of raw.split('\n').map(part => part.trim()).filter(Boolean)) {
    if (line.startsWith('0:"')) {
      try {
        chunks.push(JSON.parse(line.slice(2)))
      } catch {
        // Ignore malformed token lines
      }
      continue
    }

    if (line.startsWith('data: ')) {
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') {
        done = true
        continue
      }

      try {
        const parsed = JSON.parse(payload) as {
          content?: string
          text?: string
          delta?: string
          done?: boolean
          message?: { content?: string }
        }

        const content = getValueAtPath(parsed, DEFAULT_STREAM_CONTENT_PATH) ?? parsed.content ?? parsed.text ?? parsed.delta ?? ''

        if (content) {
          chunks.push(String(content))
        }

        if (Boolean(getValueAtPath(parsed, DEFAULT_STREAM_DONE_PATH) ?? parsed.done)) {
          done = true
        }
      } catch {
        // Ignore malformed SSE payloads
      }
      continue
    }

    try {
      const parsed = JSON.parse(line) as {
        content?: string
        text?: string
        delta?: string
        done?: boolean
        message?: { content?: string }
      }

      const content = getValueAtPath(parsed, DEFAULT_STREAM_CONTENT_PATH) ?? parsed.content ?? parsed.text ?? parsed.delta ?? ''

      if (content) {
        chunks.push(String(content))
      }

      if (Boolean(getValueAtPath(parsed, DEFAULT_STREAM_DONE_PATH) ?? parsed.done)) {
        done = true
      }
    } catch {
      // Ignore malformed plain JSON payloads
    }
  }

  return { chunks, done }
}

const DEFAULT_STREAM_CONTENT_PATH = 'message.content'
const DEFAULT_STREAM_DONE_PATH = 'done'

function buildOllamaMessages(messages: Message[], systemPrompt: string): OllamaMessage[] {
  const mappedMessages = messages
    .map(message => ({
      role: message.role,
      content: getMessageText(message).trim(),
    }))
    .filter((message): message is OllamaMessage => {
      return (
        (message.role === 'system' || message.role === 'user' || message.role === 'assistant') &&
        message.content.length > 0
      )
    })

  if (systemPrompt.trim()) {
    return [{ role: 'system', content: systemPrompt.trim() }, ...mappedMessages]
  }

  return mappedMessages
}

function buildPlainMessages(messages: Message[], systemPrompt: string) {
  const mappedMessages = messages
    .map(message => ({
      role: message.role,
      content: getMessageText(message).trim(),
    }))
    .filter(message => message.content.length > 0)

  if (systemPrompt.trim()) {
    return [{ role: 'system', content: systemPrompt.trim() }, ...mappedMessages]
  }

  return mappedMessages
}

function buildRequestMessages(
  format: ServiceDefinition['messageFormat'],
  messages: Message[],
  systemPrompt: string
) {
  if (format === 'ollama') {
    return buildOllamaMessages(messages, systemPrompt)
  }

  if (format === 'openai') {
    return buildPlainMessages(messages, systemPrompt)
  }

  return buildPlainMessages(messages, systemPrompt)
}

export function useRealChat({
  apiEndpoint,
  serviceDefinition,
  authType,
  authToken,
  selectedModel,
  systemPrompt,
  initialMessages,
  onMessagesChange,
  validateBeforeSend,
}: UseRealChatParams): RealChatHandler {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [status, setStatus] = useState<'streaming' | 'ready' | 'error' | 'submitted'>('ready')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (areMessagesEquivalent(messages, initialMessages)) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      setMessages(initialMessages)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [initialMessages, messages])

  const sendMessageMock = async (message: Message) => {
    setError(null)
    const mockResponse: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      parts: [{ type: 'text', text: '' }],
    }
    const updatedMessages = [...messages, message, mockResponse]
    setMessages(updatedMessages)
    onMessagesChange(updatedMessages)

    const mockContent =
      'This is a mock response. Connect a real API by entering the server IP and auth code in settings.'

    let streamedContent = ''
    const words = mockContent.split(' ')

    setStatus('streaming')
    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 50))
      streamedContent += (streamedContent ? ' ' : '') + word
      const updated = [
        ...messages,
        message,
        {
          ...mockResponse,
          parts: [{ type: 'text', text: streamedContent }],
        },
      ]
      setMessages(updated)
      onMessagesChange(updated)
    }
    setStatus('ready')
  }

  const sendMessageReal = async (message: Message) => {
    const updatedMessages = [...messages, message]
    setMessages(updatedMessages)
    onMessagesChange(updatedMessages)

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      parts: [{ type: 'text', text: '' }],
    }

    setStatus('submitted')
    setMessages(prev => [...prev, assistantMsg])
    setError(null)

    try {
      const chatEndpoint = serviceDefinition?.endpoints.chat
      if (!chatEndpoint) {
        throw new Error('Service definition is missing a chat endpoint')
      }

      const endpoint = buildApiUrl(apiEndpoint, chatEndpoint.path)

      // Build headers based on auth type
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(authType, authToken),
      }

      const formattedMessages = buildRequestMessages(
        serviceDefinition?.messageFormat || 'plain',
        updatedMessages,
        systemPrompt
      )

      const requestBody = renderTemplateValue(chatEndpoint.bodyTemplate ?? {}, {
        selectedModel,
        systemPrompt,
        formattedMessages,
        messages: updatedMessages,
      })

      const response = await fetch(endpoint, {
        method: chatEndpoint.method,
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      setStatus('streaming')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      let streamBuffer = ''

      const commitAssistantMessage = (text: string) => {
        const finalMessages = [
          ...updatedMessages,
          {
            ...assistantMsg,
            parts: [{ type: 'text', text }],
          },
        ]
        setMessages(finalMessages)
        onMessagesChange(finalMessages)
      }

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (streamBuffer.trim()) {
              const { chunks } = parseStreamChunk(streamBuffer)
              if (chunks.length > 0) {
                assistantText += chunks.join('')
              }
            }
            break
          }

          streamBuffer += decoder.decode(value, { stream: true })
          const { objects, remainder } = extractJsonObjects(streamBuffer)

          if (objects.length === 0) {
            continue
          }

          streamBuffer = remainder

          for (const object of objects) {
            const parsedObject = JSON.parse(object) as Record<string, unknown>
            const chunkValue =
              serviceDefinition?.stream?.contentPath
                ? getValueAtPath(parsedObject, serviceDefinition.stream.contentPath)
                : getValueAtPath(parsedObject, DEFAULT_STREAM_CONTENT_PATH)
            const streamDone = Boolean(
              serviceDefinition?.stream?.donePath
                ? getValueAtPath(parsedObject, serviceDefinition.stream.donePath)
                : getValueAtPath(parsedObject, DEFAULT_STREAM_DONE_PATH)
            )
            const chunks = chunkValue == null ? [] : [String(chunkValue)]
            if (chunks.length > 0) {
              assistantText += chunks.join('')
              commitAssistantMessage(assistantText)
            }

            if (streamDone) {
              commitAssistantMessage(assistantText)
            }
          }
        }
      }

      commitAssistantMessage(assistantText)
      setStatus('ready')
    } catch (error) {
      console.error('Chat error:', error)
      setStatus('error')
      setError(error instanceof Error ? error.message : 'Chat request failed')
      setMessages(updatedMessages)
      onMessagesChange(updatedMessages)
    }
  }

  const sendMessage = async (message: Message) => {
    const validationError = await validateBeforeSend?.(message)
    if (validationError) {
      setStatus('error')
      setError(validationError)
      return
    }

    if (!apiEndpoint) {
      await sendMessageMock(message)
    } else {
      await sendMessageReal(message)
    }
  }

  return {
    messages,
    status,
    sendMessage,
    setMessages,
    error,
    clearError: () => setError(null),
  }
}
