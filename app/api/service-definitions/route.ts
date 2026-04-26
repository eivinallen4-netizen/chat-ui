import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseServiceDefinitionMarkdown } from '@/lib/service-config'

export const dynamic = 'force-dynamic'

const SERVICE_DEFINITIONS_DIR = path.join(process.cwd(), 'service-definitions')
const IGNORED_SERVICE_FILES = new Set(['SERVICE_FILE_RULES.md', 'SERVICE_FILE_TEMPLATE.md'])

export async function GET() {
  const entries = await fs.readdir(SERVICE_DEFINITIONS_DIR, { withFileTypes: true })
  const markdownFiles = entries.filter(
    entry => entry.isFile() && entry.name.endsWith('.md') && !IGNORED_SERVICE_FILES.has(entry.name)
  )

  const loadedServices = await Promise.all(
    markdownFiles.map(async entry => {
      const fullPath = path.join(SERVICE_DEFINITIONS_DIR, entry.name)
      const content = await fs.readFile(fullPath, 'utf8')

      try {
        return parseServiceDefinitionMarkdown(content)
      } catch {
        return null
      }
    })
  )

  const services = loadedServices.filter(service => service !== null)

  return Response.json({ services })
}
