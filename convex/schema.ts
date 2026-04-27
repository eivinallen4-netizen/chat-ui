import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    planTier: v.union(v.literal('basic'), v.literal('pro')),
    persistedChatCount: v.number(),
    totalChatsCreated: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
    serviceConnections: v.optional(
      v.record(
        v.string(),
        v.object({
          apiEndpoint: v.string(),
          authType: v.union(v.literal('bearer'), v.literal('key'), v.literal('none')),
          authToken: v.string(),
        })
      )
    ),
    systemPrompt: v.optional(v.string()),
  }).index('by_clerk_id', ['clerkId']),
  chatSessions: defineTable({
    ownerUserId: v.id('users'),
    title: v.string(),
    messageCount: v.number(),
    transcriptStatus: v.union(v.literal('empty'), v.literal('ready')),
    transcriptSessionId: v.string(),
    shareToken: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index('by_owner_user_id', ['ownerUserId']).index('by_share_token', ['shareToken']),
  ollamaModelCache: defineTable({
    models: v.array(
      v.object({
        name: v.string(),
        description: v.union(v.string(), v.null()),
        tags: v.array(v.string()),
        sizes: v.array(v.string()),
        pulls: v.optional(v.string()),
        tagCount: v.optional(v.string()),
        updated: v.optional(v.string()),
        url: v.string(),
      })
    ),
    scrapedAt: v.number(),
  }),
})
