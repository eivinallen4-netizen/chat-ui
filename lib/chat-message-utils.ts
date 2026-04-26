import type { Message } from '@llamaindex/chat-ui'

function isTextPart(part: Message['parts'][number]): part is Message['parts'][number] & { text: string } {
  return part.type === 'text' && 'text' in part && typeof part.text === 'string'
}

export function getMessageText(message: Message) {
  return message.parts
    .filter(isTextPart)
    .map(part => part.text)
    .join('')
}

export function getFirstUserMessageTitle(messages: Message[]) {
  const firstUserMessage = messages.find(message => message.role === 'user')
  const text = firstUserMessage ? getMessageText(firstUserMessage).trim() : ''
  return text ? text.slice(0, 40) : 'New Chat'
}

export function getLongestUserMessageLength(messages: Message[]) {
  return messages.reduce((longest, message) => {
    if (message.role !== 'user') {
      return longest
    }

    return Math.max(longest, getMessageText(message).length)
  }, 0)
}
