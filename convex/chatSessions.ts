import type { GenericDataModel, GenericMutationCtx, GenericQueryCtx } from 'convex/server'
import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { BASIC_PLAN_AD_INTERVAL, BASIC_PLAN_MAX_CHATS } from '../lib/app-plan'

type ConvexId<TableName extends string> = string & { __tableName: TableName }

interface Identity {
  subject: string
}

interface UserDoc {
  _id: ConvexId<'users'>
  planTier: 'basic' | 'pro'
  persistedChatCount: number
  totalChatsCreated: number
}

interface ChatSessionDoc {
  _id: ConvexId<'chatSessions'>
  ownerUserId: ConvexId<'users'>
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  shareToken?: string
}

async function requireIdentity(ctx: { auth: { getUserIdentity: () => Promise<Identity | null> } }) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Not authenticated')
  }

  return identity
}

type ChatSessionsQueryCtx = Pick<GenericQueryCtx<GenericDataModel>, 'db' | 'auth'>
type ChatSessionsMutationCtx = Pick<GenericMutationCtx<GenericDataModel>, 'db' | 'auth'>
type ChatSessionsDbCtx = Pick<GenericQueryCtx<GenericDataModel>, 'db'> | Pick<GenericMutationCtx<GenericDataModel>, 'db'>

async function getUserByClerkId(ctx: ChatSessionsDbCtx, clerkId: string): Promise<UserDoc | null> {
  return (await ctx.db
    .query('users')
    .withIndex('by_clerk_id', query => query.eq('clerkId', clerkId))
    .unique()) as UserDoc | null
}

async function requireCurrentUser(ctx: ChatSessionsQueryCtx | ChatSessionsMutationCtx): Promise<UserDoc> {
  const identity = await requireIdentity(ctx)
  const user = await getUserByClerkId(ctx, identity.subject)
  if (!user) {
    throw new Error('User is not provisioned')
  }

  return user
}

async function getOwnedSession(
  ctx: ChatSessionsDbCtx,
  ownerUserId: string,
  sessionId: string
): Promise<ChatSessionDoc> {
  const session = (await ctx.db.get(sessionId as ConvexId<'chatSessions'>)) as ChatSessionDoc | null
  if (!session || String(session.ownerUserId) !== String(ownerUserId)) {
    throw new Error('Session not found')
  }

  return session
}

export const listByCurrentUser = queryGeneric({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    const user = await getUserByClerkId(ctx, identity.subject)
    if (!user) {
      return []
    }

    const sessions = await ctx.db
      .query('chatSessions')
      .withIndex('by_owner_user_id', query => query.eq('ownerUserId', user._id))
      .collect()

    return sessions
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(session => ({
        id: session._id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messageCount,
      }))
  },
})

export const createForCurrentUser = mutationGeneric({
  args: {},
  handler: async ctx => {
    const user = await requireCurrentUser(ctx)

    if (user.planTier === 'basic' && user.persistedChatCount >= BASIC_PLAN_MAX_CHATS) {
      return {
        ok: false,
        error: `Basic plan users can keep up to ${BASIC_PLAN_MAX_CHATS} chats.`,
      } as const
    }

    const now = new Date().toISOString()
    const newChatCount = user.totalChatsCreated + 1
    const sessionId = await ctx.db.insert('chatSessions', {
      ownerUserId: user._id,
      title: 'New Chat',
      messageCount: 0,
      transcriptStatus: 'empty',
      transcriptSessionId: '',
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.patch(user._id, {
      persistedChatCount: user.persistedChatCount + 1,
      totalChatsCreated: newChatCount,
      updatedAt: now,
    })

    return {
      ok: true,
      session: {
        id: sessionId,
        title: 'New Chat',
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
      },
      shouldTriggerAdsEvent:
        user.planTier === 'basic' && newChatCount % BASIC_PLAN_AD_INTERVAL === 0,
      newChatCount,
    } as const
  },
})

export const updateMetadataForCurrentUser = mutationGeneric({
  args: {
    sessionId: v.string(),
    title: v.string(),
    messageCount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)
    const session = await getOwnedSession(ctx, user._id, args.sessionId)
    const now = new Date().toISOString()

    await ctx.db.patch(session._id, {
      title: args.title || 'New Chat',
      messageCount: args.messageCount,
      transcriptStatus: args.messageCount > 0 ? 'ready' : 'empty',
      transcriptSessionId: args.sessionId,
      updatedAt: now,
    })

    return null
  },
})

export const deleteForCurrentUser = mutationGeneric({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)
    const session = await getOwnedSession(ctx, user._id, args.sessionId)
    await ctx.db.delete(session._id)

    const now = new Date().toISOString()
    await ctx.db.patch(user._id, {
      persistedChatCount: Math.max(0, user.persistedChatCount - 1),
      updatedAt: now,
    })

    return null
  },
})

export const generateShareToken = mutationGeneric({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)
    const session = await getOwnedSession(ctx, user._id, args.sessionId)

    if (session.shareToken) {
      return { shareToken: session.shareToken }
    }

    const shareToken = crypto.randomUUID()
    await ctx.db.patch(session._id, { shareToken })

    return { shareToken }
  },
})

export const revokeShareToken = mutationGeneric({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)
    const session = await getOwnedSession(ctx, user._id, args.sessionId)

    await ctx.db.patch(session._id, { shareToken: undefined })

    return null
  },
})

export const getByShareToken = queryGeneric({
  args: {
    shareToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('chatSessions')
      .withIndex('by_share_token', query => query.eq('shareToken', args.shareToken))
      .unique()

    if (!session) {
      return null
    }

    return {
      title: session.title,
      transcriptSessionId: session.transcriptSessionId,
      createdAt: session.createdAt,
    }
  },
})
