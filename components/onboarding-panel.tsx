'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [currentStep, setCurrentStep] = useState(0)

  const goToPrevious = () => {
    setCurrentStep((prev) => (prev === 0 ? STEPS.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentStep((prev) => (prev === STEPS.length - 1 ? 0 : prev + 1))
  }

  const goToStep = (index: number) => {
    setCurrentStep(index)
  }

  const handleClose = () => {
    setCurrentStep(0)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) handleClose()
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

          {/* Desktop: 4-Column Grid */}
          <div className="hidden lg:grid grid-cols-4 divide-x divide-border">
            {STEPS.map(step => (
              <div
                key={step.number}
                className="flex flex-col items-center gap-3 px-6 py-8 text-center"
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

          {/* Mobile/Tablet: Carousel View */}
          <div className="lg:hidden">
            <div className="relative min-h-[420px] overflow-hidden bg-gradient-to-b from-muted/20 to-transparent">
              <div className="flex flex-col items-center gap-5 px-6 py-10 sm:py-12 text-center">
                {/* Step Indicator with Progress */}
                <div className="flex items-center gap-2">
                  <span className="font-display text-6xl sm:text-7xl font-bold leading-none text-primary tabular-nums">
                    {STEPS[currentStep].number}
                  </span>
                  <div className="flex flex-col justify-center">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Step
                    </span>
                    <span className="text-xs text-muted-foreground">
                      of {STEPS.length}
                    </span>
                  </div>
                </div>

                {/* Image with Animation */}
                <div className="relative flex aspect-video w-full max-w-xs sm:max-w-sm items-center justify-center overflow-hidden rounded-3xl bg-muted/40 shadow-lg border border-border/50 animate-in fade-in duration-300">
                  <Image
                    key={currentStep}
                    src={STEPS[currentStep].src}
                    alt={STEPS[currentStep].alt}
                    fill
                    sizes="(max-width: 640px) 90vw, 440px"
                    className="object-contain"
                    draggable={false}
                    priority
                  />
                </div>

                {/* Title and Description */}
                <div className="space-y-2">
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                    {STEPS[currentStep].title}
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed text-muted-foreground max-w-sm mx-auto">
                    {STEPS[currentStep].subtext}
                  </p>
                </div>

                {/* Progress Dots */}
                <div className="flex gap-2 pt-2">
                  {STEPS.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToStep(index)}
                      className={`transition-all duration-300 rounded-full ${
                        index === currentStep
                          ? 'w-8 h-2 bg-primary'
                          : 'w-2 h-2 bg-muted-foreground/40 hover:bg-muted-foreground/60'
                      }`}
                      aria-label={`Go to step ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="absolute inset-y-0 left-0 flex items-center px-3 sm:px-4">
                <button
                  onClick={goToPrevious}
                  className="group inline-flex items-center justify-center h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border/50 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/50 active:scale-95"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                </button>
              </div>

              <div className="absolute inset-y-0 right-0 flex items-center px-3 sm:px-4">
                <button
                  onClick={goToNext}
                  className="group inline-flex items-center justify-center h-10 w-10 rounded-full bg-background/80 backdrop-blur border border-border/50 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/50 active:scale-95"
                  aria-label="Next step"
                >
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-border bg-muted/30 px-4 py-4 sm:px-6 sm:py-5">
            <button
              onClick={handleClose}
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
