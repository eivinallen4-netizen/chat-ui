'use client'

import { useRef, useState } from 'react'
import { Check, Copy, Plus, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { AuthType, ServiceDefinition } from '@/hooks/use-settings'

const CUSTOM_IMPORT_VALUE = '__custom_import__'
const SERVICE_FILE_TEMPLATE = `# SERVICE NAME

One sentence describing the API shape.

\`\`\`json
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
\`\`\`
`

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  services: ServiceDefinition[]
  activeServiceId: string
  apiEndpoint: string
  authType: AuthType
  authToken: string
  onSelectService: (serviceId: string) => void
  onImportMarkdown: (markdown: string) => void
  onApiEndpointChange: (value: string) => void
  onAuthTypeChange: (value: AuthType) => void
  onAuthTokenChange: (value: string) => void
}

export function SettingsPanel({
  open,
  onClose,
  services,
  activeServiceId,
  apiEndpoint,
  authType,
  authToken,
  onSelectService,
  onImportMarkdown,
  onApiEndpointChange,
  onAuthTypeChange,
  onAuthTokenChange,
}: SettingsPanelProps) {
  const [importError, setImportError] = useState<string | null>(null)
  const [showCustomTemplate, setShowCustomTemplate] = useState(false)
  const [copiedTemplate, setCopiedTemplate] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const resetCustomState = () => {
    setShowCustomTemplate(false)
    setCopiedTemplate(false)
    setImportError(null)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const markdown = await file.text()
      onImportMarkdown(markdown)
      resetCustomState()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import markdown service')
    } finally {
      event.target.value = ''
    }
  }

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(SERVICE_FILE_TEMPLATE)
      setCopiedTemplate(true)
      window.setTimeout(() => setCopiedTemplate(false), 1500)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to copy template')
    }
  }

  return (
    <>
      <Dialog
        open={open && !showCustomTemplate}
        onOpenChange={v => {
          if (!v) {
            resetCustomState()
            onClose()
          }
        }}
      >
        <DialogContent className="w-full max-w-2xl rounded-xl border border-border p-0 shadow-lg animate-none">
          <div className="flex flex-col h-full">
            <DialogHeader className="border-b border-border px-6 py-4">
              <DialogTitle className="font-display text-xl tracking-tight">Service Settings</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-5 px-6 py-6">
              <div className="flex flex-col">
                <Label htmlFor="serviceProfile" className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                  Service
                </Label>
                <select
                  id="serviceProfile"
                  value={activeServiceId}
                  onChange={e => {
                    if (e.target.value === CUSTOM_IMPORT_VALUE) {
                      setShowCustomTemplate(true)
                      return
                    }

                    resetCustomState()
                    onSelectService(e.target.value)
                  }}
                  className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground hover:border-primary transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                  <option value={CUSTOM_IMPORT_VALUE}>+ Custom</option>
                </select>
              </div>

              <div className="flex flex-col">
                <Label htmlFor="apiEndpoint" className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                  API Endpoint
                </Label>
                <Input
                  id="apiEndpoint"
                  value={apiEndpoint}
                  onChange={e => onApiEndpointChange(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="h-10 rounded-lg border-border bg-background px-3"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
                <div className="flex flex-col">
                  <Label htmlFor="authType" className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                    Auth
                  </Label>
                  <select
                    id="authType"
                    value={authType}
                    onChange={e => onAuthTypeChange(e.target.value as AuthType)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground hover:border-primary transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="none">None</option>
                    <option value="bearer">Bearer token</option>
                    <option value="key">API key</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <Label htmlFor="authToken" className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                    {authType === 'key' ? 'API Key' : 'Token'}
                  </Label>
                  <Input
                    id="authToken"
                    type="password"
                    value={authToken}
                    onChange={e => onAuthTokenChange(e.target.value)}
                    placeholder={authType === 'key' ? 'Enter API key' : 'Enter token'}
                    disabled={authType === 'none'}
                    className="h-10 rounded-lg border-border bg-background px-3"
                  />
                </div>
              </div>

              <input
                ref={importInputRef}
                type="file"
                accept=".md,text/markdown"
                className="hidden"
                onChange={handleImport}
              />

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Plus className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Important</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Service files are shared shapes only. Keep host URLs and secrets here in local settings. Use
                      `+ Custom` in the service list to copy the template or upload a markdown file for APIs that need a
                      different endpoint layout or request body.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    resetCustomState()
                    onClose()
                  }}
                  className="flex-1 bg-primary text-primary-foreground hover:opacity-90 transition-opacity py-2 text-sm font-semibold rounded-lg"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCustomTemplate}
        onOpenChange={nextOpen => {
          if (!nextOpen) {
            resetCustomState()
          }
        }}
      >
        <DialogContent className="!w-[min(96vw,1400px)] !max-w-[min(96vw,1400px)] rounded-xl border border-border p-0 shadow-lg animate-none">
          <div className="flex flex-col">
            <DialogHeader className="border-b border-border px-6 py-4">
              <DialogTitle className="font-display text-xl tracking-tight">New Custom Service</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 px-6 py-6 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Template</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Copy the template, edit it, save it as `.md`, then upload it.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyTemplate}
                    className="justify-start"
                  >
                    {copiedTemplate ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copiedTemplate ? 'Copied template' : 'Copy template'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => importInputRef.current?.click()}
                    className="justify-start"
                  >
                    <Upload className="size-4" />
                    Upload MD
                  </Button>
                </div>

                {importError && <p className="text-xs text-red-500">{importError}</p>}
              </div>

              <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-background">
                <pre className="max-h-96 overflow-auto p-4 text-xs leading-5 text-foreground">
                  <code>{SERVICE_FILE_TEMPLATE}</code>
                </pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
