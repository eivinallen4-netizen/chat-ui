# OPENAI

Shared API shape for OpenAI-compatible chat APIs.

```json
{
  "id": "openai",
  "name": "OPENAI",
  "provider": "openai",
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
    },
    "models": {
      "method": "GET",
      "path": "/v1/models",
      "responseListPath": "data"
    }
  },
  "stream": {
    "contentPath": "choices.0.delta.content",
    "donePath": ""
  }
}
```
