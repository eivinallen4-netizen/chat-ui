# Service File Rules

Use this spec when creating a service definition file for ChatUI.

## Goal

Each file defines a shared API shape for one provider or one API style.

Keep the file easy for an LLM to edit.

## File Format

- File extension: `.md`
- Start with one `#` title
- Add one short description line or paragraph if useful
- Include one JSON object
- The JSON object can be:
  - inside a ` ```json ` code block, or
  - inside a ` ```chatui-service ` block, or
  - written directly in markdown as a top-level JSON object

Preferred format:

```md
# SERVICE NAME

Short description.

```json
{
  "id": "service-id",
  "name": "SERVICE NAME",
  "provider": "custom",
  "messageFormat": "plain",
  "endpoints": {
    "chat": {
      "method": "POST",
      "path": "/v1/chat",
      "bodyTemplate": {}
    }
  },
  "stream": {
    "contentPath": "message.content",
    "donePath": "done"
  }
}
```
```

## Do Not Put These In The File

Do not store user-specific values:

- base URL
- bearer token
- API key
- env var names for secrets
- per-user headers

Those belong in local settings, not shared definitions.

## Required JSON Fields

- `name`
- `endpoints.chat.path`

## Supported Top-Level Fields

```json
{
  "id": "string",
  "name": "string",
  "provider": "ollama | openai | custom",
  "messageFormat": "ollama | openai | plain",
  "endpoints": {
    "chat": {
      "method": "GET | POST | PUT | PATCH | DELETE",
      "path": "string",
      "bodyTemplate": {},
      "responseListPath": "string"
    },
    "models": {
      "method": "GET | POST | PUT | PATCH | DELETE",
      "path": "string",
      "bodyTemplate": {},
      "responseListPath": "string"
    },
    "pull": {
      "method": "GET | POST | PUT | PATCH | DELETE",
      "path": "string",
      "bodyTemplate": {}
    },
    "delete": {
      "method": "GET | POST | PUT | PATCH | DELETE",
      "path": "string",
      "bodyTemplate": {}
    }
  },
  "stream": {
    "contentPath": "string",
    "donePath": "string"
  }
}
```

## Supported Template Variables

Only use these placeholders inside `bodyTemplate`:

- `{{selectedModel}}`
- `{{formattedMessages}}`
- `{{messages}}`
- `{{systemPrompt}}`
- `{{modelName}}`

If the placeholder is the whole value, the app preserves the real type.

Example:

```json
{
  "messages": "{{formattedMessages}}"
}
```

## Current Limits

Do not use:

- Handlebars loops like `{{#each ...}}`
- conditional template syntax
- custom per-endpoint headers
- `baseUrl`
- `apiKeyEnv`
- `stream.type`
- `stream.event`
- `doneEvent`
- unsupported `messageFormat` values like `openai-responses`

## Best Practices

- Keep `id` stable and slug-like
- Use uppercase `name` if you want the UI label uppercase
- Use relative endpoint paths
- Omit `models`, `pull`, or `delete` if the API does not support them
- Keep the file focused on request and response structure only

## Minimal Example

```md
# CUSTOM API

Simple OpenAI-compatible API shape.

```json
{
  "id": "custom-api",
  "name": "CUSTOM API",
  "provider": "custom",
  "messageFormat": "openai",
  "endpoints": {
    "chat": {
      "method": "POST",
      "path": "/v1/chat/completions",
      "bodyTemplate": {
        "model": "{{selectedModel}}",
        "messages": "{{formattedMessages}}",
        "stream": true
      }
    }
  },
  "stream": {
    "contentPath": "choices.0.delta.content",
    "donePath": ""
  }
}
```
```
