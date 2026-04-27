import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const dynamic = 'force-dynamic'

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
const OLLAMA_FETCH_TIMEOUT_MS = 12000

interface OllamaLibraryModel {
  name: string
  description: string
  tags: string[]
  sizes: string[]
  pulls: string | null
  tagCount: string | null
  updated: string | null
  url: string
}

const CAPABILITY_TAGS = new Set(['tools', 'thinking', 'vision', 'cloud', 'embedding'])

function extractCapabilityTags(badges: string[]): string[] {
  return badges.filter(badge => CAPABILITY_TAGS.has(badge.toLowerCase()))
}

function extractSizes(text: string): string[] {
  const matches = text.match(/\b\d+(?:\.\d+)?B\b/g) || []
  return [...new Set(matches)]
}

async function fetchModelSizes(name: string): Promise<string[]> {
  try {
    const response = await fetch(`https://ollama.com/library/${name}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(OLLAMA_FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      return []
    }

    const html = await response.text()
    const $$ = cheerio.load(html)
    const pageText = $$.text().toUpperCase()
    const sizes = extractSizes(pageText)

    console.log({
      name,
      extractedText: pageText,
      sizes,
    })

    return sizes
  } catch {
    return []
  }
}

async function scrapeOllamaLibrary(html: string): Promise<OllamaLibraryModel[]> {
  const $ = cheerio.load(html)
  const seenNames = new Set<string>()
  const modelCards: {
    name: string
    description: string
    tags: string[]
    pulls: string | null
    tagCount: string | null
    updated: string | null
    url: string
  }[] = []

  $('li[x-test-model]').each((_, element) => {
    const $card = $(element)
    const $link = $card.find('a[href^="/library/"]').first()
    const href = $link.attr('href')

    if (!href) return

    const nameMatch = href.match(/^\/library\/([^/]+)$/)
    if (!nameMatch) return

    const name = nameMatch[1]

    if (seenNames.has(name)) return
    seenNames.add(name)

    const description = $card.find('[x-test-model-title] p').first().text().trim()

    const allLabels: string[] = []
    $card.find('[x-test-capability]').each((_, el) => {
      const text = $(el).text().trim().toLowerCase()
      if (text) {
        allLabels.push(text)
      }
    })

    const text = $card.text().replace(/\s+/g, ' ').trim().toUpperCase()
    const tags = extractCapabilityTags(allLabels)

    let pulls: string | null = null
    const pullsText = $card.find('[x-test-pull-count]').first().text().trim()
    if (pullsText) {
      pulls = pullsText
    }

    let tagCount: string | null = null
    const tagCountText = $card.find('[x-test-tag-count]').first().text().trim()
    if (tagCountText) {
      tagCount = tagCountText
    }

    let updated: string | null = null
    const updatedText = $card.find('[x-test-updated]').first().text().trim()
    if (updatedText) {
      updated = updatedText
    }

    if (!pulls) {
      const pullsMatch = text.match(/(\d+(?:\.\d+)?[KMB]?)\s*PULLS?/)
      if (pullsMatch) {
        pulls = pullsMatch[1]
      }
    }

    if (!tagCount) {
      const tagCountMatch = text.match(/(\d+)\s*TAGS?/)
      if (tagCountMatch) {
        tagCount = tagCountMatch[1]
      }
    }

    if (!updated) {
      const updatedMatch = text.match(/UPDATED\s+(.+?\s+AGO)/i)
      if (updatedMatch) {
        updated = updatedMatch[1]
      }
    }

    modelCards.push({
      name,
      description: description || '',
      tags: [...new Set(tags)],
      pulls,
      tagCount,
      updated,
      url: `https://ollama.com/library/${name}`,
    })
  })

  return Promise.all(
    modelCards.map(async model => ({
      ...model,
      sizes: await fetchModelSizes(model.name),
    }))
  )
}

function toCacheModels(models: OllamaLibraryModel[]) {
  return models.map(model => ({
    ...model,
    pulls: model.pulls ?? undefined,
    tagCount: model.tagCount ?? undefined,
    updated: model.updated ?? undefined,
  }))
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const shouldRefresh = url.searchParams.get('refresh') === '1'
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    console.log('[ollama-library] GET request received', {
      hasConvexUrl: Boolean(convexUrl),
      cacheTtlMs: CACHE_TTL,
      shouldRefresh,
    })
    let staleCache:
      | {
          models: {
            name: string
            description: string | null
            tags: string[]
            sizes: string[]
            pulls?: string | undefined
            tagCount?: string | undefined
            updated?: string | undefined
            url: string
          }[]
          scrapedAt: number
        }
      | null = null

    // Check cache if Convex is configured
    if (convexUrl) {
      try {
        const convex = new ConvexHttpClient(convexUrl)
        const cache = await convex.query(api.ollamaCache.getCache, {})
        staleCache = cache
        console.log('[ollama-library] Cache lookup completed', {
          hasCache: Boolean(cache),
          scrapedAt: cache?.scrapedAt ?? null,
          ageMs: cache ? Date.now() - cache.scrapedAt : null,
          modelCount: cache?.models.length ?? 0,
        })

        if (!shouldRefresh && cache && Date.now() - cache.scrapedAt < CACHE_TTL) {
          console.log('[ollama-library] Returning fresh cached models', {
            modelCount: cache.models.length,
          })
          return NextResponse.json({ models: cache.models })
        }
        console.log('[ollama-library] Cache miss, forced refresh, or stale cache, fetching upstream library')
      } catch (cacheError) {
        console.error('[ollama-library] Cache check failed, will scrape:', cacheError)
      }
    } else {
      console.log('[ollama-library] Convex URL missing, skipping cache lookup')
    }

    // Fetch fresh data
    console.log('[ollama-library] Fetching upstream Ollama library', {
      timeoutMs: OLLAMA_FETCH_TIMEOUT_MS,
    })
    const response = await fetch('https://ollama.com/library', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(OLLAMA_FETCH_TIMEOUT_MS),
    })
    console.log('[ollama-library] Upstream response received', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    })

    if (!response.ok) {
      if (staleCache) {
        console.warn('[ollama-library] Upstream fetch failed, returning stale cache', {
          modelCount: staleCache.models.length,
        })
        return NextResponse.json({ models: staleCache.models, stale: true })
      }
      return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
    }

    const html = await response.text()
    const models = await scrapeOllamaLibrary(html)
    console.log('[ollama-library] Scrape completed', {
      htmlLength: html.length,
      modelCount: models.length,
      sampleModels: models.slice(0, 5).map(model => model.name),
    })

    // Cache the results if Convex is configured
    if (convexUrl) {
      try {
        const convex = new ConvexHttpClient(convexUrl)
        await convex.mutation(api.ollamaCache.setCache, { models: toCacheModels(models) })
        console.log('[ollama-library] Cache write completed', {
          modelCount: models.length,
        })
      } catch (cacheError) {
        console.error('[ollama-library] Cache write failed:', cacheError)
      }
    }

    console.log('[ollama-library] Returning freshly scraped models', {
      modelCount: models.length,
    })
    return NextResponse.json({ models })
  } catch (error) {
    console.error('[ollama-library] Error:', error)
    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
      if (convexUrl) {
        const convex = new ConvexHttpClient(convexUrl)
        const cache = await convex.query(api.ollamaCache.getCache, {})
        if (cache) {
          console.warn('[ollama-library] Returning stale cache after error', {
            modelCount: cache.models.length,
            scrapedAt: cache.scrapedAt,
          })
          return NextResponse.json({ models: cache.models, stale: true })
        }
      }
    } catch (cacheFallbackError) {
      console.error('[ollama-library] Stale cache fallback failed:', cacheFallbackError)
    }
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 })
  }
}
