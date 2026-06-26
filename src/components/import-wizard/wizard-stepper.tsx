import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

type Step = {
  id: number
  title: string
  subtitle: string
}

type WizardStepperProps = {
  steps: Step[]
  currentStep: number
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isComplete = currentStep > step.id
        const isActive = currentStep === step.id

        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  isComplete &&
                    "border-primary bg-primary text-primary-foreground",
                  isActive &&
                    "border-primary bg-primary/15 text-primary shadow-[0_0_0_4px] shadow-primary/15",
                  !isComplete &&
                    !isActive &&
                    "border-border bg-secondary text-muted-foreground",
                )}
              >
                {isComplete ? <Check className="size-4" /> : step.id}
              </span>
              <div className="hidden flex-col sm:flex">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isActive || isComplete
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {step.subtitle}
                </span>
              </div>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "h-px flex-1 transition-colors",
                  isComplete ? "bg-primary/60" : "bg-border",
                )}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
