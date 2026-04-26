# OLLAMA
Use this service definition as the default local Ollama preset. You can duplicate this file,
rename it, and change the config block to support a different API shape.

```json
{
  "id": "OLLAMA",
  "name": "OLLAMA",
  "provider": "ollama",
  "messageFormat": "ollama",
  "endpoints": {
    "chat": {
      "method": "POST",
      "path": "/api/chat",
      "bodyTemplate": {
        "model": "{{selectedModel}}",
        "messages": "{{formattedMessages}}",
        "stream": true
      }
    },
    "models": {
      "method": "GET",
      "path": "/api/tags",
      "responseListPath": "models"
    },
    "pull": {
      "method": "POST",
      "path": "/api/pull",
      "bodyTemplate": {
        "model": "{{modelName}}",
        "stream": false
      }
    },
    "delete": {
      "method": "DELETE",
      "path": "/api/delete",
      "bodyTemplate": {
        "model": "{{modelName}}"
      }
    }
  },
  "stream": {
    "contentPath": "message.content",
    "donePath": "done"
  }
}
```
