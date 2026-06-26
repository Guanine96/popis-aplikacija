"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
} from "lucide-react"
import { toast } from "sonner"

import { PopisnaColumnMapper } from "@/components/PopisnaColumnMapper"
import { CyberCard } from "@/components/CyberCard"
import { AuthGate, RoleGate } from "@/components/AuthGate"
import { FileDropzone } from "@/components/import-wizard/file-dropzone"
import { WizardStepper } from "@/components/import-wizard/wizard-stepper"
import { useInventory } from "@/context/InventoryContext"
import { UNMAPPED_VALUE } from "@/lib/import-fields"
import { autoMapPopisna, POPISNA_FIELDS } from "@/lib/popisna-import-fields"
import { parseFile } from "@/lib/parse-file"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const STEPS = [
  { id: 1, title: "Popisna lista", subtitle: "CSV ili XLSX" },
  { id: 2, title: "Mapiranje", subtitle: "Šifra + količina" },
]

function PopisnaImportContent() {
  const router = useRouter()
  const { applyPopisnaImport, products } = useInventory()
  const [currentStep, setCurrentStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<Awaited<ReturnType<typeof parseFile>> | null>(
    null,
  )
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})

  const requiredMapped = useMemo(
    () =>
      POPISNA_FIELDS.filter((f) => f.required).every(
        (f) => mapping[f.id] && mapping[f.id] !== UNMAPPED_VALUE,
      ),
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
      setMapping(autoMapPopisna(result.headers))
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
    setIsImporting(true)
    try {
      const result = await applyPopisnaImport({
        mapping,
        rows: parsed.allRows,
      })
      toast.success("Popisna lista uvezena", {
        description: `${result.updated} stavki · ${result.missing} nije u šifrarniku`,
      })
      router.push("/dashboard")
    } catch (error) {
      toast.error("Uvoz nije uspeo", {
        description:
          error instanceof Error
            ? error.message
            : "Proverite mapiranje kolona i pokušajte ponovo.",
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <CyberCard className="w-full max-w-3xl overflow-hidden">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/40">
            <ClipboardList className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Uvoz popisne liste</h1>
            <p className="text-sm text-zinc-500">
              Poseban dokument za ovaj popis — šifra + količina. Šifrarnik (
              {products.length.toLocaleString("sr-RS")} šifri) ostaje nepromenjen.
            </p>
          </div>
        </div>
        <p className="rounded-lg border border-teal-500/20 bg-teal-500/5 px-3 py-2 text-sm text-teal-100/90">
          Popisna lista je <strong>odvojena</strong> od šifrarnika. Uvoz zamenjuje
          stavke popisa za ovu sesiju i povezuje ih sa šifrarnikom po šifri (ili
          barkodu / kataloškom broju).
        </p>
        <WizardStepper steps={STEPS} currentStep={currentStep} />
      </div>

      <Separator className="bg-teal-500/10" />

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
          <PopisnaColumnMapper
            headers={parsed.headers}
            mapping={mapping}
            onMappingChange={(fieldId, header) =>
              setMapping((p) => ({ ...p, [fieldId]: header }))
            }
          />
        ) : null}
      </div>

      <Separator className="bg-teal-500/10" />

      <div className="flex items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          {currentStep === 2 ? (
            <>
              <CheckCircle2
                className={requiredMapped ? "size-4 text-teal-400" : "size-4 opacity-40"}
              />
              Mapiranje spremno
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
              disabled={!parsed || isParsing || products.length === 0}
              onClick={() => setCurrentStep(2)}
              className="bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/40"
            >
              Nastavi
              <ArrowRight data-icon="inline-end" />
            </Button>
          ) : (
            <Button
              disabled={!requiredMapped || isImporting}
              onClick={handleImport}
              className="bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/40"
            >
              {isImporting ? "Uvozim…" : "Uvezi popisnu listu"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
    </CyberCard>
  )
}

export default function PopisnaImportPage() {
  return (
    <AuthGate>
      <RoleGate role="admin">
        <div className="flex w-full justify-center">
          <PopisnaImportContent />
        </div>
      </RoleGate>
    </AuthGate>
  )
}
