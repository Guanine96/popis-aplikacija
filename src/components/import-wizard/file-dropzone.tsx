"use client"

import { useCallback, useRef, useState } from "react"
import { FileSpreadsheet, FileUp, Loader2, UploadCloud, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { formatBytes } from "@/lib/parse-file"

type FileDropzoneProps = {
  file: File | null
  isParsing: boolean
  error: string | null
  rowCount: number | null
  onFileSelected: (file: File) => void
  onClear: () => void
}

const ACCEPTED = ".csv,.xlsx,.xls"

export function FileDropzone({
  file,
  isParsing,
  error,
  rowCount,
  onFileSelected,
  onClear,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const selected = files?.[0]
      if (selected) onFileSelected(selected)
    },
    [onFileSelected],
  )

  if (file && !error) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/40">
            {isParsing ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-6" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate font-medium text-foreground">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatBytes(file.size)}
              {isParsing
                ? " — Analiziram zaglavlja..."
                : rowCount !== null
                  ? ` — ${rowCount.toLocaleString("sr-Latn")} redova detektovano`
                  : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            disabled={isParsing}
            aria-label="Ukloni datoteku"
          >
            <X />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Učitaj datoteku — prevucite ili kliknite"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          handleFiles(event.dataTransfer.files)
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border bg-card/40 px-6 py-14 text-center transition-colors outline-none",
          "hover:border-primary/50 hover:bg-primary/5 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring",
          isDragging && "border-primary bg-primary/10",
        )}
      >
        <div
          className={cn(
            "flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary ring-1 ring-primary/30 transition-transform",
            "group-hover:scale-105",
            isDragging && "scale-110",
          )}
        >
          {isDragging ? (
            <FileUp className="size-7" />
          ) : (
            <UploadCloud className="size-7" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium text-foreground text-balance">
            Prevucite datoteku ovde ili{" "}
            <span className="text-primary underline-offset-4 group-hover:underline">
              kliknite za odabir
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Podržani formati: CSV, XLSX, XLS — maksimalno 1 datoteka
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
