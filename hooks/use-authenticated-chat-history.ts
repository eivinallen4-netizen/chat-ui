'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Message } from '@llamaindex/chat-ui'
import { useMutation, useQuery } from 'convex/react'
import { BASIC_PLAN_MAX_MESSAGE_CHARS } from '@/lib/app-plan'
import { getFirstUserMessageTitle } from '@/lib/chat-message-utils'
import { convexApi } from '@/lib/convex-api'
import type { AppUser, ChatSession, ChatSessionSummary } from '@/lib/chat-types'

async function fetchTranscript(sessionId: string, userId: string) {
  const url = new URL(`/api/chat-transcripts/${encodeURIComponent(sessionId)}`, window.location.origin)
  url.searchParams.set('userId', userId)

  const response = await fetch(url.toString(), {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Failed to load chat transcript')
  }

  const data = (await response.json()) as { messages?: Message[] }
  return Array.isArray(data.messages) ? data.messages : []
}

async function persistTranscript(sessionId: string, messages: Message[], userId: string) {
  const response = await fetch(`/api/chat-transcripts/${encodeURIComponent(sessionId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, userId }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? 'Failed to persist chat transcript')
  }
}

async function removeTranscript(sessionId: string, userId: string) {
  await fetch(`/api/chat-transcripts/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  })
}

export function useAuthenticatedChatHistory(enabled: boolean) {
  const currentUser = useQuery(convexApi.users.getCurrentUser, enabled ? {} : 'skip') as AppUser | null | undefined
  const sessionsQuery = useQuery(
    convexApi.chatSessions.listByCurrentUser,
    enabled ? {} : 'skip'
  ) as ChatSessionSummary[] | undefined

  const bootstrapCurrentUser = useMutation(convexApi.users.bootstrapCurrentUser)
  const validateMessageForCurrentUser = useMutation(convexApi.users.validateMessageForCurrentUser)
  const createSessionMutation = useMutation(convexApi.chatSessions.createForCurrentUser)
  const updateMetadataMutation = useMutation(convexApi.chatSessions.updateMetadataForCurrentUser)
  const deleteSessionMutation = useMutation(convexApi.chatSessions.deleteForCurrentUser)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [transcriptsById, setTranscriptsById] = useState<Record<string, Message[]>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    void bootstrapCurrentUser().catch(() => {
      setError('Failed to initialize your account.')
    })
  }, [bootstrapCurrentUser, enabled])

  const resolvedActiveId =
    activeId && sessionsQuery?.some(session => session.id === activeId)
      ? activeId
      : sessionsQuery?.[0]?.id ?? null

  useEffect(() => {
    if (!enabled || !resolvedActiveId || transcriptsById[resolvedActiveId] || !currentUser?.clerkId) {
      return
    }

    let cancelled = false

    void fetchTranscript(resolvedActiveId, currentUser.clerkId)
      .then(messages => {
        if (cancelled) {
          return
        }

        setTranscriptsById(current => ({
          ...current,
          [resolvedActiveId]: messages,
        }))
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load the selected chat.')
          setTranscriptsById(current => ({
            ...current,
            [resolvedActiveId]: [],
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [enabled, resolvedActiveId, transcriptsById, currentUser])

  const sessions = useMemo<ChatSession[]>(() => {
    return (sessionsQuery ?? []).map(session => ({
      ...session,
      messages: transcriptsById[session.id] ?? [],
    }))
  }, [sessionsQuery, transcriptsById])

  const activeSession = sessions.find(session => session.id === resolvedActiveId) ?? null

  const createSession = async () => {
    if (!enabled) {
      return { ok: false as const, error: 'Authentication is required.' }
    }

    setError(null)

    try {
      const result = await createSessionMutation({})
      if (!result.ok) {
        setError(result.error)
        return result
      }

      setTranscriptsById(current => ({
        ...current,
        [result.session.id]: [],
      }))
      setActiveId(result.session.id)
      return result
    } catch {
      const nextError = 'Failed to create a new chat.'
      setError(nextError)
      return { ok: false as const, error: nextError }
    }
  }

  const loadSession = async (id: string) => {
    setError(null)
    setActiveId(id)
  }

  const updateSession = async (id: string, messages: Message[]) => {
    setError(null)

    if (!currentUser?.clerkId) {
      setError('User not authenticated. Cannot save chat.')
      return
    }

    setTranscriptsById(current => ({
      ...current,
      [id]: messages,
    }))

    try {
      await persistTranscript(id, messages, currentUser.clerkId)
      await updateMetadataMutation({
        sessionId: id,
        title: getFirstUserMessageTitle(messages),
        messageCount: messages.length,
      })
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to save the chat.')
    }
  }

  const deleteSession = async (id: string) => {
    setError(null)

    if (!currentUser?.clerkId) {
      setError('User not authenticated. Cannot delete chat.')
      return
    }

    try {
      await deleteSessionMutation({ sessionId: id })
      await removeTranscript(id, currentUser.clerkId)
      setTranscriptsById(current => {
        const next = { ...current }
        delete next[id]
        return next
      })
      if (activeId === id) {
        setActiveId(null)
      }
    } catch {
      setError('Failed to delete the chat.')
    }
  }

  const validateMessageLength = async (text: string) => {
    if (!enabled) {
      return {
        allowed: true,
        error: null,
        maxChars: Number.MAX_SAFE_INTEGER,
      }
    }

    try {
      return await validateMessageForCurrentUser({ textLength: text.length })
    } catch {
      return {
        allowed: text.length <= BASIC_PLAN_MAX_MESSAGE_CHARS,
        error: `Basic plan messages are limited to ${BASIC_PLAN_MAX_MESSAGE_CHARS} characters.`,
        maxChars: BASIC_PLAN_MAX_MESSAGE_CHARS,
      }
    }
  }

  return {
    mode: 'authenticated' as const,
    sessions,
    activeId: resolvedActiveId,
    activeSession,
    hydrated:
      !enabled ||
      (sessionsQuery !== undefined &&
        (!resolvedActiveId ||
          Object.prototype.hasOwnProperty.call(transcriptsById, resolvedActiveId))),
    error,
    currentUser: currentUser ?? null,
    createSession,
    loadSession,
    updateSession,
    deleteSession,
    validateMessageLength,
  }
}
