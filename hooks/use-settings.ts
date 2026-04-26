'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  parseServiceDefinitionMarkdown,
  ServiceDefinition,
  AuthType,
} from '@/lib/service-config'

const IMPORTED_SERVICE_DEFINITIONS_KEY = 'chatui_importedServiceDefinitions'
const ACTIVE_SERVICE_ID_KEY = 'chatui_activeServiceId'
const SELECTED_MODEL_BY_SERVICE_KEY = 'chatui_selectedModelByService'
const SERVICE_CONNECTIONS_KEY = 'chatui_serviceConnections'

interface ServiceConnectionSettings {
  apiEndpoint: string
  authType: AuthType
  authToken: string
}

const DEFAULT_CONNECTION_SETTINGS: ServiceConnectionSettings = {
  apiEndpoint: '',
  authType: 'none',
  authToken: '',
}

export function useSettings() {
  const [services, setServices] = useState<ServiceDefinition[]>([])
  const [activeServiceId, setActiveServiceIdState] = useState('')
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({})
  const [serviceConnections, setServiceConnections] = useState<Record<string, ServiceConnectionSettings>>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch('/api/service-definitions')
        const data = (await response.json()) as { services: ServiceDefinition[] }
        const importedMarkdown =
          JSON.parse(localStorage.getItem(IMPORTED_SERVICE_DEFINITIONS_KEY) || '[]') as string[]
        const importedServices = importedMarkdown.map(parseServiceDefinitionMarkdown)
        const allServices = [...data.services, ...importedServices]

        setServices(allServices)

        const savedActiveServiceId = localStorage.getItem(ACTIVE_SERVICE_ID_KEY) || allServices[0]?.id || ''
        setActiveServiceIdState(
          allServices.some(service => service.id === savedActiveServiceId)
            ? savedActiveServiceId
            : allServices[0]?.id || ''
        )

        setSelectedModels(JSON.parse(localStorage.getItem(SELECTED_MODEL_BY_SERVICE_KEY) || '{}'))
        setServiceConnections(JSON.parse(localStorage.getItem(SERVICE_CONNECTIONS_KEY) || '{}'))
      } catch {
        const importedMarkdown =
          JSON.parse(localStorage.getItem(IMPORTED_SERVICE_DEFINITIONS_KEY) || '[]') as string[]
        const importedServices = importedMarkdown.map(parseServiceDefinitionMarkdown)
        setServices(importedServices)
        setActiveServiceIdState(importedServices[0]?.id || '')
        setSelectedModels(JSON.parse(localStorage.getItem(SELECTED_MODEL_BY_SERVICE_KEY) || '{}'))
        setServiceConnections(JSON.parse(localStorage.getItem(SERVICE_CONNECTIONS_KEY) || '{}'))
      } finally {
        setHydrated(true)
      }
    }

    void loadServices()
  }, [])

  const activeService = useMemo(() => {
    return services.find(service => service.id === activeServiceId) ?? services[0] ?? null
  }, [services, activeServiceId])

  const activeConnection = activeService
    ? serviceConnections[activeService.id] ?? DEFAULT_CONNECTION_SETTINGS
    : DEFAULT_CONNECTION_SETTINGS

  const selectedModel = activeService ? selectedModels[activeService.id] || '' : ''

  const setActiveServiceId = (serviceId: string) => {
    setActiveServiceIdState(serviceId)
    localStorage.setItem(ACTIVE_SERVICE_ID_KEY, serviceId)
  }

  const importServiceMarkdown = (markdown: string) => {
    const parsed = parseServiceDefinitionMarkdown(markdown)
    const importedMarkdown =
      JSON.parse(localStorage.getItem(IMPORTED_SERVICE_DEFINITIONS_KEY) || '[]') as string[]

    const nextImportedMarkdown = [
      ...importedMarkdown.filter(item => parseServiceDefinitionMarkdown(item).id !== parsed.id),
      markdown,
    ]

    localStorage.setItem(IMPORTED_SERVICE_DEFINITIONS_KEY, JSON.stringify(nextImportedMarkdown))

    const nextServices = [...services.filter(service => service.id !== parsed.id), parsed]
    setServices(nextServices)
    setActiveServiceId(parsed.id)
  }

  const setSelectedModel = (value: string) => {
    if (!activeService) {
      return
    }

    const next = {
      ...selectedModels,
      [activeService.id]: value,
    }

    setSelectedModels(next)
    localStorage.setItem(SELECTED_MODEL_BY_SERVICE_KEY, JSON.stringify(next))
  }

  const updateActiveServiceConnection = (patch: Partial<ServiceConnectionSettings>) => {
    if (!activeService) {
      return
    }

    const current = serviceConnections[activeService.id] ?? DEFAULT_CONNECTION_SETTINGS
    const nextConnection = {
      ...current,
      ...patch,
    }
    const nextConnections = {
      ...serviceConnections,
      [activeService.id]: nextConnection,
    }

    setServiceConnections(nextConnections)
    localStorage.setItem(SERVICE_CONNECTIONS_KEY, JSON.stringify(nextConnections))
  }

  const setApiEndpoint = (value: string) => {
    updateActiveServiceConnection({
      apiEndpoint: value,
    })
  }

  const setAuthType = (value: AuthType) => {
    updateActiveServiceConnection({
      authType: value,
    })
  }

  const setAuthToken = (value: string) => {
    updateActiveServiceConnection({
      authToken: value,
    })
  }

  return {
    services,
    activeService,
    activeServiceId,
    apiProvider: activeService?.provider ?? 'custom',
    apiEndpoint: activeConnection.apiEndpoint,
    authType: activeConnection.authType,
    authToken: activeConnection.authToken,
    selectedModel,
    systemPrompt: '',
    serviceDefinition: activeService,
    setActiveServiceId,
    importServiceMarkdown,
    setSelectedModel,
    setApiEndpoint,
    setAuthType,
    setAuthToken,
    hydrated,
  }
}

export type { ApiProvider, AuthType, ServiceDefinition } from '@/lib/service-config'
