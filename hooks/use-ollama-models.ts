'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { buildApiUrl } from '@/lib/api-endpoint'
import { buildAuthHeaders } from '@/lib/auth-headers'
import { AuthType, ServiceDefinition } from './use-settings'
import { getValueAtPath, renderTemplateValue } from '@/lib/service-config'

export interface OllamaModel {
  name: string
  modified_at: string
  size: number
  status?: 'downloading' | 'done'
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
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [pendingPulls, setPendingPulls] = useState<Record<string, 'downloading' | 'done'>>({})
  const doneTimeoutsRef = useRef<Record<string, number>>({})

  const requestHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...buildAuthHeaders(authType, authToken),
    }),
    [authType, authToken]
  )

  const fetchModels = useCallback(async () => {
    if (!apiEndpoint || !serviceDefinition?.endpoints.models) {
      setModels([])
      setIsConnected(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(buildApiUrl(apiEndpoint, serviceDefinition.endpoints.models.path), {
        method: serviceDefinition.endpoints.models.method,
        headers: requestHeaders,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }

      const data = await response.json()
      const rawList = getValueAtPath(data, serviceDefinition.endpoints.models.responseListPath || 'models')
      const modelList: OllamaModel[] = Array.isArray(rawList) ? (rawList as OllamaModel[]) : []
      setModels(modelList)
      setIsConnected(true)
      setError(null)
      setPendingPulls(current => {
        const next = { ...current }
        const availableModels = new Set(modelList.map(model => model.name))

        for (const modelName of Object.keys(current)) {
          if (!availableModels.has(modelName)) {
            continue
          }

          if (current[modelName] === 'done') {
            continue
          }

          next[modelName] = 'done'

          if (!doneTimeoutsRef.current[modelName]) {
            doneTimeoutsRef.current[modelName] = window.setTimeout(() => {
              setPendingPulls(latest => {
                const updated = { ...latest }
                delete updated[modelName]
                return updated
              })
              delete doneTimeoutsRef.current[modelName]
            }, 2500)
          }
        }

        return next
      })
    } catch (err) {
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

  useEffect(() => {
    const doneTimeouts = doneTimeoutsRef.current

    return () => {
      for (const timeoutId of Object.values(doneTimeouts)) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  const pullModel = (modelName: string) => {
    const model = modelName.trim()
    const pullEndpoint = serviceDefinition?.endpoints.pull
    if (!apiEndpoint || !model || !pullEndpoint) {
      return
    }

    setMutationError(null)
    setPendingPulls(current => ({
      ...current,
      [model]: 'downloading',
    }))
    setModels(current =>
      current.some(existingModel => existingModel.name === model)
        ? current
        : [...current, { name: model, modified_at: '', size: 0, status: 'downloading' }]
    )

    void (async () => {
      try {
        const response = await fetch(buildApiUrl(apiEndpoint, pullEndpoint.path), {
          method: pullEndpoint.method,
          headers: requestHeaders,
          body: JSON.stringify(
            renderTemplateValue(pullEndpoint.bodyTemplate ?? {}, {
              modelName: model,
            })
          ),
        })

        if (!response.ok) {
          throw new Error(`Failed to pull model: ${response.statusText}`)
        }

        await fetchModels()
      } catch (err) {
        setMutationError(err instanceof Error ? err.message : 'Failed to pull model')
        setPendingPulls(current => {
          const next = { ...current }
          delete next[model]
          return next
        })
        setModels(current => current.filter(existingModel => existingModel.name !== model || !existingModel.status))
      }
    })()
  }

  const deleteModel = async (modelName: string) => {
    const model = modelName.trim()
    if (!apiEndpoint || !model || !serviceDefinition?.endpoints.delete) {
      return
    }

    setIsDeleting(true)
    setMutationError(null)

    try {
      const response = await fetch(buildApiUrl(apiEndpoint, serviceDefinition.endpoints.delete.path), {
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

      await fetchModels()
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to delete model')
      throw err
    } finally {
      setIsDeleting(false)
    }
  }

  const visibleModels = useMemo(() => {
    const seen = new Set<string>()
    const mergedModels: OllamaModel[] = []

    for (const model of models) {
      if (seen.has(model.name)) {
        continue
      }

      seen.add(model.name)
      mergedModels.push({
        ...model,
        status: pendingPulls[model.name] ?? model.status,
      })
    }

    for (const [modelName, status] of Object.entries(pendingPulls)) {
      if (seen.has(modelName)) {
        continue
      }

      seen.add(modelName)
      mergedModels.push({
        name: modelName,
        modified_at: '',
        size: 0,
        status,
      })
    }

    return mergedModels
  }, [models, pendingPulls])

  return {
    models: visibleModels,
    loading,
    error,
    isConnected,
    isMutating: isDeleting,
    mutationError,
    refresh: fetchModels,
    pullModel,
    deleteModel,
  }
}
