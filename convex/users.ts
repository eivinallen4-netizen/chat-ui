import type { GenericDataModel, GenericMutationCtx, GenericQueryCtx } from 'convex/server'
import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { BASIC_PLAN_MAX_MESSAGE_CHARS } from '../lib/app-plan'

type ConvexId<TableName extends string> = string & { __tableName: TableName }

interface Identity {
  subject: string
}

interface UserDoc {
  _id: ConvexId<'users'>
  clerkId: string
  planTier: 'basic' | 'pro'
  persistedChatCount: number
  totalChatsCreated: number
  serviceConnections?: Record<string, {
    apiEndpoint: string
    authType: 'bearer' | 'key' | 'none'
    authToken: string
  }>
}

async function requireIdentity(ctx: { auth: { getUserIdentity: () => Promise<Identity | null> } }) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Not authenticated')
  }

  return identity
}

type UsersCtx = Pick<GenericQueryCtx<GenericDataModel>, 'db'> | Pick<GenericMutationCtx<GenericDataModel>, 'db'>

async function getUserByClerkId(ctx: UsersCtx, clerkId: string): Promise<UserDoc | null> {
  const query = ctx.db.query('users')
  return (await query
    .withIndex('by_clerk_id', indexQuery => indexQuery.eq('clerkId', clerkId))
    .unique()) as UserDoc | null
}

export const getCurrentUser = queryGeneric({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const user = await getUserByClerkId(ctx, identity.subject)
    if (!user) {
      return null
    }

    return {
      id: user._id,
      clerkId: user.clerkId,
      planTier: user.planTier,
      persistedChatCount: user.persistedChatCount,
      totalChatsCreated: user.totalChatsCreated,
      serviceConnections: user.serviceConnections ?? null,
    }
  },
})

export const bootstrapCurrentUser = mutationGeneric({
  args: {},
  handler: async ctx => {
    const identity = await requireIdentity(ctx)
    const existingUser = await getUserByClerkId(ctx, identity.subject)
    const now = new Date().toISOString()

    if (existingUser) {
      await ctx.db.patch(existingUser._id, { updatedAt: now })
      return {
        id: existingUser._id,
        clerkId: existingUser.clerkId,
        planTier: existingUser.planTier,
        persistedChatCount: existingUser.persistedChatCount,
        totalChatsCreated: existingUser.totalChatsCreated,
        serviceConnections: existingUser.serviceConnections ?? null,
      }
    }

    const userId = await ctx.db.insert('users', {
      clerkId: identity.subject,
      planTier: 'basic',
      persistedChatCount: 0,
      totalChatsCreated: 0,
      createdAt: now,
      updatedAt: now,
    })

    return {
      id: userId,
      clerkId: identity.subject,
      planTier: 'basic',
      persistedChatCount: 0,
      totalChatsCreated: 0,
      serviceConnections: null,
    }
  },
})

export const saveApiSettings = mutationGeneric({
  args: {
    serviceConnections: v.record(
      v.string(),
      v.object({
        apiEndpoint: v.string(),
        authType: v.union(v.literal('bearer'), v.literal('key'), v.literal('none')),
        authToken: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const user = await getUserByClerkId(ctx, identity.subject)
    if (!user) throw new Error('User is not provisioned')
    await ctx.db.patch(user._id, {
      serviceConnections: args.serviceConnections,
      updatedAt: new Date().toISOString(),
    })
    return { ok: true }
  },
})

export const validateMessageForCurrentUser = mutationGeneric({
  args: {
    textLength: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const user = await getUserByClerkId(ctx, identity.subject)
    const planTier = user?.planTier ?? 'basic'
    const maxChars = planTier === 'basic' ? BASIC_PLAN_MAX_MESSAGE_CHARS : Number.MAX_SAFE_INTEGER
    const allowed = args.textLength <= maxChars

    return {
      allowed,
      error: allowed ? null : `Basic plan messages are limited to ${BASIC_PLAN_MAX_MESSAGE_CHARS} characters.`,
      maxChars,
    }
  },
})
