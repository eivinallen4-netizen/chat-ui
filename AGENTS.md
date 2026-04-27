<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Ollama Library Caching

The Ollama model library is cached in Convex for performance:

- **`convex/schema.ts`** — `ollamaModelCache` table stores scraped models and refresh timestamp
- **`convex/ollamaCache.ts`** — `getCache` query and `setCache` mutation for cache lifecycle
- **`app/api/ollama-library/route.ts`** — Checks cache before scraping; cache TTL is 24 hours
