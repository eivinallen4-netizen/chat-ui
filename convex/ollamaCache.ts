import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const getCache = query(async ({ db }) => {
  const cache = await db.query('ollamaModelCache').order('desc').first()
  return cache || null
})

export const setCache = mutation({
  args: {
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
  },
  handler: async ({ db }, { models }) => {
    const existingCaches = await db.query('ollamaModelCache').collect()
    for (const cache of existingCaches) {
      await db.delete(cache._id)
    }

    await db.insert('ollamaModelCache', {
      models,
      scrapedAt: Date.now(),
    })
  },
})
