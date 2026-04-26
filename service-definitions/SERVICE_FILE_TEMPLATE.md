# SERVICE NAME

One sentence describing the API shape.

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
      "bodyTemplate": {
        "model": "{{selectedModel}}",
        "messages": "{{formattedMessages}}"
      }
    }
  },
  "stream": {
    "contentPath": "message.content",
    "donePath": "done"
  }
}
```

## Notes

- Do not put base URLs or secrets in this file.
- Only use supported placeholders.
- Remove unused endpoints.
