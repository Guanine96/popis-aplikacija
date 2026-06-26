"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, CheckCircle2, Database } from "lucide-react"
import { toast } from "sonner"

import { ColumnMapper } from "@/components/ColumnMapper"
import { CyberCard } from "@/components/CyberCard"
import { AuthGate, RoleGate } from "@/components/AuthGate"
import { FileDropzone } from "@/components/import-wizard/file-dropzone"
import { WizardStepper } from "@/components/import-wizard/wizard-stepper"
import { useInventory } from "@/context/InventoryContext"
import { autoMap, SYSTEM_FIELDS, UNMAPPED_VALUE } from "@/lib/import-fields"
import { parseFile } from "@/lib/parse-file"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const STEPS = [
  { id: 1, title: "Učitavanje datoteke", subtitle: "CSV ili XLSX" },
  { id: 2, title: "Mapiranje kolona", subtitle: "Povezivanje polja" },
]

function ImportWizardContent() {
  const router = useRouter()
  const { applyImport } = useInventory()
  const [currentStep, setCurrentStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<Awaited<ReturnType<typeof parseFile>> | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [blindInventory, setBlindInventory] = useState(false)

  const requiredMapped = useMemo(
    () =>
      SYSTEM_FIELDS.filter((f) => f.required).every(
        (f) => mapping[f.id] && mapping[f.id] !== UNMAPPED_VALUE,
      ),
    [mapping],
  )

  const mappedCount = useMemo(
    () =>
      Object.values(mapping).filter((v) => v && v !== UNMAPPED_VALUE).length,
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
        caught instanceof Error ? caught.message : "Greška pri obradi datoteke.",
      )
      setFile(null)
      setParsed(null)
    } finally {
      setIsParsing(false)
    }
  }

  async function handleImport() {
    if (!parsed) return
    const count = await applyImport({
      mapping,
      rows: parsed.allRows,
      blindInventory,
    })
    toast.success("Šifrarnik uvezen", {
      description: `${count} artikala spremno za popis.`,
    })
    router.push("/dashboard")
  }

  return (
    <CyberCard className="w-full max-w-3xl overflow-hidden">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/40">
            <Database className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Uvoz šifrarnika</h1>
            <p className="text-sm text-zinc-500">
              Prevucite CSV ili Excel i mapirajte kolone
            </p>
          </div>
        </div>
        <WizardStepper steps={STEPS} currentStep={currentStep} />
      </div>

      <Separator className="bg-cyan-500/10" />

      <div className="p-6">
        {currentStep === 1 ? (
          <FileDropzone
            file={file}
            isParsing={isParsing}
            error={error}
            rowCount={parsed?.rowCount ?? null}
            onFileSelected={handleFileSelected}
            onClear={() => {
              setFile(null)
              setParsed(null)
              setError(null)
              setMapping({})
            }}
          />
        ) : parsed ? (
          <ColumnMapper
            headers={parsed.headers}
            mapping={mapping}
            blindInventory={blindInventory}
            onMappingChange={(fieldId, header) =>
              setMapping((p) => ({ ...p, [fieldId]: header }))
            }
            onBlindInventoryChange={setBlindInventory}
          />
        ) : null}
      </div>

      <Separator className="bg-cyan-500/10" />

      <div className="flex items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          {currentStep === 2 ? (
            <>
              <CheckCircle2
                className={requiredMapped ? "size-4 text-teal-400" : "size-4 opacity-40"}
              />
              {mappedCount} / {SYSTEM_FIELDS.length} polja mapirano
            </>
          ) : (
            <span>Korak {currentStep} od {STEPS.length}</span>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep === 2 && (
            <Button variant="ghost" onClick={() => setCurrentStep(1)}>
              <ArrowLeft data-icon="inline-start" />
              Nazad
            </Button>
          )}
          {currentStep === 1 ? (
            <Button
              disabled={!parsed || isParsing}
              onClick={() => setCurrentStep(2)}
              className="bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
            >
              Nastavi
              <ArrowRight data-icon="inline-end" />
            </Button>
          ) : (
            <Button
              disabled={!requiredMapped}
              onClick={handleImport}
              className="bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/40"
            >
              Pokreni uvoz
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
    </CyberCard>
  )
}

export default function ImportPage() {
  return (
    <AuthGate>
      <RoleGate role="admin">
        <div className="flex w-full justify-center">
          <ImportWizardContent />
        </div>
      </RoleGate>
    </AuthGate>
  )
}
