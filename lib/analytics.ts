import type { BasicPlanChatThresholdEvent } from '@/lib/chat-types'

declare global {
  interface Window {
    gtag: (command: string, eventName: string, eventData?: Record<string, string | number>) => void
  }
}

const GOOGLE_TAG_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID
const GOOGLE_ADS_EVENT_NAME = process.env.NEXT_PUBLIC_GOOGLE_ADS_EVENT_NAME ?? 'basic_plan_chat_threshold'
const GOOGLE_ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL

export function trackBasicPlanChatThreshold(payload: BasicPlanChatThresholdEvent) {
  if (
    typeof window === 'undefined' ||
    !GOOGLE_TAG_ID ||
    typeof window.gtag !== 'function'
  ) {
    return
  }

  const eventPayload: Record<string, string | number> = {
    event_category: 'engagement',
    plan_tier: payload.planTier,
    data_mode: payload.dataMode,
    chat_count: payload.chatCount,
    value: payload.chatCount,
  }

  if (GOOGLE_ADS_CONVERSION_LABEL) {
    eventPayload.send_to = `${GOOGLE_TAG_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`
  }

  window.gtag('event', GOOGLE_ADS_EVENT_NAME, eventPayload)
}
