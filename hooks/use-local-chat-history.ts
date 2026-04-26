'use client'

import { useEffect, useState } from 'react'
import type { Message } from '@llamaindex/chat-ui'
import type { ChatSession } from '@/lib/chat-types'
import { getFirstUserMessageTitle } from '@/lib/chat-message-utils'
import { GUEST_MAX_CHATS } from '@/lib/app-plan'

const HISTORY_STORAGE_KEY = 'chatui_history'

export function useLocalChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(HISTORY_STORAGE_KEY)
        const parsed: ChatSession[] = saved ? JSON.parse(saved) : []
        setSessions(parsed)
      } catch {
        setSessions([])
      }
      setHydrated(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  const persist = (nextSessions: ChatSession[]) => {
    setSessions(nextSessions)
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextSessions))
  }

  const createSession = async () => {
    if (sessions.length >= GUEST_MAX_CHATS) {
      return {
        ok: false as const,
        error: `Local storage limit reached. Maximum ${GUEST_MAX_CHATS} chats allowed.`,
      }
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newSession: ChatSession = {
      id,
      title: 'New Chat',
      messages: [],
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    persist([newSession, ...sessions])
    setActiveId(id)
    return {
      ok: true as const,
      session: {
        id,
        title: newSession.title,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
      },
      shouldTriggerAdsEvent: false,
      newChatCount: 0,
    }
  }

  const loadSession = async (id: string) => {
    setActiveId(id)
  }

  const updateSession = async (id: string, messages: Message[]) => {
    const updated = sessions.map(session => {
      if (session.id !== id) {
        return session
      }

      return {
        ...session,
        title: getFirstUserMessageTitle(messages),
        messages,
        messageCount: messages.length,
        updatedAt: new Date().toISOString(),
      }
    })

    persist(updated)
  }

  const deleteSession = async (id: string) => {
    const updated = sessions.filter(session => session.id !== id)
    persist(updated)

    if (activeId === id) {
      setActiveId(updated[0]?.id ?? null)
    }
  }

  const activeSession = sessions.find(session => session.id === activeId) ?? null

  return {
    mode: 'guest' as const,
    sessions,
    activeId,
    activeSession,
    hydrated,
    error: null as string | null,
    createSession,
    loadSession,
    updateSession,
    deleteSession,
    currentUser: null,
    validateMessageLength: async () => ({
      allowed: true,
      error: null,
      maxChars: Number.MAX_SAFE_INTEGER,
    }),
  }
}
