'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { buildApiUrl } from '@/lib/api-endpoint'
import { buildAuthHeaders } from '@/lib/auth-headers'
import { AuthType, ServiceDefinition } from './use-settings'
import { getValueAtPath, renderTemplateValue } from '@/lib/service-config'

export interface OllamaModel {
  name: string
  modified_at: string
  size: number
}

export function useOllamaModels(
  apiEndpoint: string,
  serviceDefinition: ServiceDefinition | null,
  authType: AuthType,
  authToken: string
) {
  const [models, setModels] = useState<OllamaModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const requestHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...buildAuthHeaders(authType, authToken),
    }),
    [authType, authToken]
  )

  const fetchModels = useCallback(async () => {
    if (!apiEndpoint || !serviceDefinition?.endpoints.models) {
      console.log('[useOllamaModels] Skipping model fetch', {
        hasApiEndpoint: Boolean(apiEndpoint),
        hasModelsEndpoint: Boolean(serviceDefinition?.endpoints.models),
        serviceId: serviceDefinition?.id ?? null,
      })
      setModels([])
      setIsConnected(false)
      return
    }

    const requestUrl = buildApiUrl(apiEndpoint, serviceDefinition.endpoints.models.path)
    console.log('[useOllamaModels] Fetching models', {
      serviceId: serviceDefinition.id,
      method: serviceDefinition.endpoints.models.method,
      url: requestUrl,
    })
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(requestUrl, {
        method: serviceDefinition.endpoints.models.method,
        headers: requestHeaders,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }

      const data = await response.json()
      const rawList = getValueAtPath(data, serviceDefinition.endpoints.models.responseListPath || 'models')
      const modelList: OllamaModel[] = Array.isArray(rawList) ? (rawList as OllamaModel[]) : []
      console.log('[useOllamaModels] Model fetch succeeded', {
        serviceId: serviceDefinition.id,
        status: response.status,
        modelCount: modelList.length,
      })
      setModels(modelList)
      setIsConnected(true)
      setError(null)
    } catch (err) {
      console.error('[useOllamaModels] Model fetch failed', {
        serviceId: serviceDefinition.id,
        message: err instanceof Error ? err.message : String(err),
      })
      setError(err instanceof Error ? err.message : 'Failed to connect')
      setModels([])
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }, [apiEndpoint, requestHeaders, serviceDefinition])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchModels()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchModels])

  const deleteModel = async (modelName: string) => {
    const model = modelName.trim()
    if (!apiEndpoint || !model || !serviceDefinition?.endpoints.delete) {
      console.log('[useOllamaModels] Skipping delete', {
        hasApiEndpoint: Boolean(apiEndpoint),
        model,
        hasDeleteEndpoint: Boolean(serviceDefinition?.endpoints.delete),
        serviceId: serviceDefinition?.id ?? null,
      })
      return
    }

    const requestUrl = buildApiUrl(apiEndpoint, serviceDefinition.endpoints.delete.path)
    console.log('[useOllamaModels] Deleting model', {
      serviceId: serviceDefinition.id,
      model,
      method: serviceDefinition.endpoints.delete.method,
      url: requestUrl,
    })
    setIsDeleting(true)
    setMutationError(null)

    try {
      const response = await fetch(requestUrl, {
        method: serviceDefinition.endpoints.delete.method,
        headers: requestHeaders,
        body: JSON.stringify(
          renderTemplateValue(serviceDefinition.endpoints.delete.bodyTemplate ?? {}, {
            modelName: model,
          })
        ),
      })

      if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.statusText}`)
      }

      console.log('[useOllamaModels] Delete succeeded', {
        serviceId: serviceDefinition.id,
        model,
        status: response.status,
      })
      await fetchModels()
    } catch (err) {
      console.error('[useOllamaModels] Delete failed', {
        serviceId: serviceDefinition.id,
        model,
        message: err instanceof Error ? err.message : String(err),
      })
      setMutationError(err instanceof Error ? err.message : 'Failed to delete model')
      throw err
    } finally {
      setIsDeleting(false)
    }
  }

  const pullModel = async (modelName: string) => {
    const model = modelName.trim()
    if (!apiEndpoint || !model || !serviceDefinition?.endpoints.pull) {
      console.log('[useOllamaModels] Skipping pull', {
        hasApiEndpoint: Boolean(apiEndpoint),
        model,
        hasPullEndpoint: Boolean(serviceDefinition?.endpoints.pull),
        serviceId: serviceDefinition?.id ?? null,
      })
      return
    }

    const requestUrl = buildApiUrl(apiEndpoint, serviceDefinition.endpoints.pull.path)
    console.log('[useOllamaModels] Pulling model', {
      serviceId: serviceDefinition.id,
      model,
      method: serviceDefinition.endpoints.pull.method,
      url: requestUrl,
    })
    setIsPulling(true)
    setMutationError(null)

    try {
      const response = await fetch(requestUrl, {
        method: serviceDefinition.endpoints.pull.method,
        headers: requestHeaders,
        body: JSON.stringify(
          renderTemplateValue(serviceDefinition.endpoints.pull.bodyTemplate ?? {}, {
            modelName: model,
          })
        ),
      })

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`)
      }

      console.log('[useOllamaModels] Pull succeeded', {
        serviceId: serviceDefinition.id,
        model,
        status: response.status,
      })
      await fetchModels()
    } catch (err) {
      console.error('[useOllamaModels] Pull failed', {
        serviceId: serviceDefinition.id,
        model,
        message: err instanceof Error ? err.message : String(err),
      })
      setMutationError(err instanceof Error ? err.message : 'Failed to pull model')
      throw err
    } finally {
      setIsPulling(false)
    }
  }

  return {
    models,
    loading,
    error,
    isConnected,
    isDeleting,
    isPulling,
    isMutating: isDeleting || isPulling,
    mutationError,
    refresh: fetchModels,
    pullModel,
    deleteModel,
  }
}
