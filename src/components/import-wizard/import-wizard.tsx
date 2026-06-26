"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Database } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { autoMap, SYSTEM_FIELDS, UNMAPPED_VALUE } from "@/lib/import-fields"
import { parseFile, type ParsedFile } from "@/lib/parse-file"
import { ColumnMapping } from "@/components/import-wizard/column-mapping"
import { FileDropzone } from "@/components/import-wizard/file-dropzone"
import { WizardStepper } from "@/components/import-wizard/wizard-stepper"

const STEPS = [
  { id: 1, title: "Učitavanje datoteke", subtitle: "CSV ili XLSX" },
  { id: 2, title: "Mapiranje kolona", subtitle: "Povezivanje polja" },
]

export function ImportWizard({
  onComplete,
}: {
  onComplete?: (options: { blindInventory: boolean }) => void
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [blindInventory, setBlindInventory] = useState(false)

  const requiredMapped = useMemo(() => {
    return SYSTEM_FIELDS.filter((field) => field.required).every(
      (field) => mapping[field.id] && mapping[field.id] !== UNMAPPED_VALUE,
    )
  }, [mapping])

  const mappedCount = useMemo(
    () =>
      Object.values(mapping).filter((value) => value && value !== UNMAPPED_VALUE)
        .length,
    [mapping],
  )

  async function handleFileSelected(selected: File) {
    setFile(selected)
    setError(null)
    setIsParsing(true)
    setParsed(null)

    try {
      const result = await parseFile(selected)
      setParsed(result)
      setMapping(autoMap(result.headers))
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Greška pri obradi datoteke.",
      )
      setFile(null)
      setParsed(null)
    } finally {
      setIsParsing(false)
    }
  }

  function handleClear() {
    setFile(null)
    setParsed(null)
    setError(null)
    setMapping({})
  }

  function handleMappingChange(fieldId: string, header: string) {
    setMapping((previous) => ({ ...previous, [fieldId]: header }))
  }

  const canContinue = currentStep === 1 ? Boolean(parsed) && !isParsing : true

  return (
    <Card className="w-full max-w-3xl overflow-hidden border-border/80 bg-card/60 shadow-2xl backdrop-blur-sm">
      <CardHeader className="gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/40">
            <Database className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-xl">Uvoz podataka</CardTitle>
            <CardDescription>
              Import inventara iz CSV ili XLSX datoteke
            </CardDescription>
          </div>
        </div>
        <WizardStepper steps={STEPS} currentStep={currentStep} />
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        {currentStep === 1 ? (
          <FileDropzone
            file={file}
            isParsing={isParsing}
            error={error}
            rowCount={parsed?.rowCount ?? null}
            onFileSelected={handleFileSelected}
            onClear={handleClear}
          />
        ) : parsed ? (
          <ColumnMapping
            headers={parsed.headers}
            mapping={mapping}
            blindInventory={blindInventory}
            onMappingChange={handleMappingChange}
            onBlindInventoryChange={setBlindInventory}
          />
        ) : null}
      </CardContent>

      <Separator />

      <CardFooter className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {currentStep === 2 ? (
            <>
              <CheckCircle2
                className={
                  requiredMapped ? "size-4 text-primary" : "size-4 opacity-40"
                }
              />
              <span>
                {mappedCount} / {SYSTEM_FIELDS.length} polja mapirano
              </span>
            </>
          ) : (
            <span>Korak {currentStep} od {STEPS.length}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentStep === 2 ? (
            <Button variant="ghost" onClick={() => setCurrentStep(1)}>
              <ArrowLeft data-icon="inline-start" />
              Nazad
            </Button>
          ) : null}

          {currentStep === 1 ? (
            <Button disabled={!canContinue} onClick={() => setCurrentStep(2)}>
              Nastavi
              <ArrowRight data-icon="inline-end" />
            </Button>
          ) : (
            <Button
              disabled={!requiredMapped}
              onClick={() => onComplete?.({ blindInventory })}
            >
              Pokreni uvoz
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
