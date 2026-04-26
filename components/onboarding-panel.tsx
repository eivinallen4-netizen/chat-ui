'use client'

import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface OnboardingPanelProps {
  open: boolean
  onClose: () => void
}

const STEPS = [
  {
    number: 1,
    title: 'Add your token',
    subtext: 'Choose your auth method and paste the token or API key for your provider.',
    src: '/features/step1.png',
    alt: 'Add your token',
  },
  {
    number: 2,
    title: 'Configure your service',
    subtext: 'Pick a provider, then confirm the API endpoint and authentication settings.',
    src: '/features/step2.png',
    alt: 'Configure your service',
  },
  {
    number: 3,
    title: 'Manage your models',
    subtext: 'Select a model to use, add new ones, or remove models you no longer need.',
    src: '/features/step3.png',
    alt: 'Manage your models',
  },
  {
    number: 4,
    title: 'Start chatting',
    subtext: 'Once setup is done, send your first prompt and start the conversation.',
    src: '/features/step4.png',
    alt: 'Start chatting',
  },
]

export function OnboardingPanel({ open, onClose }: OnboardingPanelProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onClose()
      }}
    >
      <DialogContent
        className="!w-[min(96vw,1400px)] !max-w-[min(96vw,1400px)] rounded-3xl border border-border p-0 shadow-xl overflow-hidden"
        showCloseButton={false}
      >
        <div className="flex flex-col">
          <DialogHeader className="border-b border-border bg-muted/30 px-4 py-3 sm:px-6 sm:py-4">
            <DialogTitle className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              Welcome - here&apos;s how it works
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
            {STEPS.map(step => (
              <div
                key={step.number}
                className="flex flex-col items-center gap-3 px-5 py-6 text-center sm:py-8"
              >
                <span className="font-display text-5xl font-bold leading-none text-primary">
                  {step.number}
                </span>
                <div className="relative flex aspect-video w-full max-w-[180px] items-center justify-center overflow-hidden rounded-2xl bg-muted/40">
                  <Image
                    src={step.src}
                    alt={step.alt}
                    fill
                    sizes="180px"
                    className="object-contain"
                    draggable={false}
                  />
                </div>
                <p className="font-display text-base font-bold leading-tight text-foreground sm:text-lg">
                  {step.title}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {step.subtext}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t border-border bg-muted/30 px-4 py-4 sm:px-6 sm:py-5">
            <button
              onClick={onClose}
              className="min-h-[48px] rounded-2xl bg-primary px-8 font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
            >
              Get Started
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
