export type AuthType = 'bearer' | 'key' | 'none'
export type ApiProvider = 'ollama' | 'openai' | 'custom'

export interface EndpointDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  bodyTemplate?: unknown
  responseListPath?: string
}

export interface StreamDefinition {
  contentPath: string
  donePath: string
}

export interface ServiceDefinition {
  id: string
  name: string
  provider: ApiProvider
  messageFormat: 'ollama' | 'openai' | 'plain'
  endpoints: {
    chat: EndpointDefinition
    models?: EndpointDefinition
    pull?: EndpointDefinition
    delete?: EndpointDefinition
  }
  stream: StreamDefinition
}

export const DEFAULT_STREAM: StreamDefinition = {
  contentPath: 'message.content',
  donePath: 'done',
}

function slugifyName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeServiceDefinition(definition: ServiceDefinition): ServiceDefinition {
  return {
    ...definition,
    id: definition.id || slugifyName(definition.name),
    stream: {
      contentPath: definition.stream?.contentPath || DEFAULT_STREAM.contentPath,
      donePath: definition.stream?.donePath || DEFAULT_STREAM.donePath,
    },
  }
}

function extractMarkdownTitle(markdown: string) {
  const titleMatch = markdown.match(/^#\s+(.+)$/m)
  return titleMatch?.[1]?.trim() || ''
}

function extractJsonObject(input: string) {
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
        return input.slice(start, i + 1).trim()
      }
    }
  }

  return ''
}

function extractConfigBlock(markdown: string) {
  const chatuiBlockMatch = markdown.match(/```chatui-service\s*([\s\S]*?)```/i)
  if (chatuiBlockMatch) {
    return chatuiBlockMatch[1].trim()
  }

  const jsonBlockMatch = markdown.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (jsonBlockMatch) {
    const jsonFromFence = extractJsonObject(jsonBlockMatch[1])
    if (jsonFromFence) {
      return jsonFromFence
    }
  }

  const jsonObject = extractJsonObject(markdown)
  if (jsonObject) {
    return jsonObject
  }

  throw new Error('Service definition markdown must include a JSON object')
}

export function parseServiceDefinitionMarkdown(markdown: string): ServiceDefinition {
  const rawConfig = JSON.parse(extractConfigBlock(markdown)) as Partial<ServiceDefinition>
  const name = rawConfig.name || extractMarkdownTitle(markdown)

  if (!name) {
    throw new Error('Service definition is missing a name')
  }

  if (!rawConfig.endpoints?.chat?.path) {
    throw new Error('Service definition is missing chat endpoint path')
  }

  return normalizeServiceDefinition({
    id: rawConfig.id || slugifyName(name),
    name,
    provider: rawConfig.provider || 'custom',
    messageFormat: rawConfig.messageFormat || 'plain',
    endpoints: {
      chat: {
        method: rawConfig.endpoints.chat.method || 'POST',
        path: rawConfig.endpoints.chat.path,
        bodyTemplate: rawConfig.endpoints.chat.bodyTemplate,
        responseListPath: rawConfig.endpoints.chat.responseListPath,
      },
      models: rawConfig.endpoints.models,
      pull: rawConfig.endpoints.pull,
      delete: rawConfig.endpoints.delete,
    },
    stream: {
      contentPath: rawConfig.stream?.contentPath || DEFAULT_STREAM.contentPath,
      donePath: rawConfig.stream?.donePath || DEFAULT_STREAM.donePath,
    },
  })
}

export function getValueAtPath(value: unknown, path: string) {
  if (!path) {
    return value
  }

  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }

    return undefined
  }, value)
}

export function renderTemplateValue(template: unknown, values: Record<string, unknown>): unknown {
  if (Array.isArray(template)) {
    return template.map(item => renderTemplateValue(item, values))
  }

  if (template && typeof template === 'object') {
    return Object.fromEntries(
      Object.entries(template).map(([key, value]) => [key, renderTemplateValue(value, values)])
    )
  }

  if (typeof template !== 'string') {
    return template
  }

  const exactMatch = template.match(/^{{\s*([a-zA-Z0-9_]+)\s*}}$/)
  if (exactMatch) {
    return values[exactMatch[1]]
  }

  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
    const replacement = values[key]
    return replacement == null ? '' : String(replacement)
  })
}
