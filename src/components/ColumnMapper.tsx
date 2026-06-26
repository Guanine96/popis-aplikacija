"use client"

import { ArrowRight, Check, CircleDashed, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { SYSTEM_FIELDS, UNMAPPED_VALUE } from "@/lib/import-fields"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ColumnMapperProps = {
  headers: string[]
  mapping: Record<string, string>
  blindInventory: boolean
  onMappingChange: (fieldId: string, header: string) => void
  onBlindInventoryChange: (value: boolean) => void
}

export function ColumnMapper({
  headers,
  mapping,
  blindInventory,
  onMappingChange,
  onBlindInventoryChange,
}: ColumnMapperProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-xl border border-cyan-500/20 bg-zinc-950/60">
        <Table>
          <TableHeader>
            <TableRow className="border-cyan-500/10 hover:bg-transparent">
              <TableHead className="h-11 w-1/2 text-xs font-medium uppercase tracking-wider text-cyan-400/70">
                Sistemsko polje
              </TableHead>
              <TableHead className="h-11 w-1/2 text-xs font-medium uppercase tracking-wider text-cyan-400/70">
                Kolona iz datoteke
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SYSTEM_FIELDS.map((field) => {
              const value = mapping[field.id] ?? UNMAPPED_VALUE
              const isMapped = value !== UNMAPPED_VALUE
              const needsAttention = field.required && !isMapped

              return (
                <TableRow key={field.id} className="border-cyan-500/10">
                  <TableCell className="align-top">
                    <div className="flex items-start gap-3 py-1">
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ring-1 transition-colors",
                          isMapped
                            ? "bg-cyan-500/15 text-cyan-400 ring-cyan-500/40"
                            : "bg-zinc-900 text-zinc-500 ring-zinc-700",
                        )}
                      >
                        {isMapped ? (
                          <Check className="size-4" />
                        ) : (
                          <CircleDashed className="size-4" />
                        )}
                      </span>
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-zinc-100">
                            {field.label}
                          </span>
                          {field.required ? (
                            <Badge className="border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                              Obavezno
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-zinc-400">
                              Opciono
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-zinc-500">{field.hint}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-3 py-1">
                      <ArrowRight className="hidden size-4 shrink-0 text-zinc-600 sm:block" />
                      <Select
                        value={value}
                        onValueChange={(next) =>
                          onMappingChange(field.id, next ?? UNMAPPED_VALUE)
                        }
                      >
                        <SelectTrigger
                          aria-invalid={needsAttention}
                          className={cn(
                            "w-full border-zinc-800 bg-zinc-900",
                            needsAttention && "border-red-500/50 text-red-400",
                          )}
                        >
                          <SelectValue placeholder="Odaberite kolonu..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value={UNMAPPED_VALUE}>
                              <span className="text-zinc-500">— Ne mapiraj —</span>
                            </SelectItem>
                            {headers.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <label
        htmlFor="slepi-popis"
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
          blindInventory
            ? "border-teal-500/50 bg-teal-500/10"
            : "border-cyan-500/20 bg-zinc-950/60 hover:border-cyan-500/40",
        )}
      >
        <Checkbox
          id="slepi-popis"
          checked={blindInventory}
          onCheckedChange={(checked) => onBlindInventoryChange(checked === true)}
          className="mt-0.5"
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <EyeOff className="size-4 text-teal-400" />
            <span className="font-medium text-zinc-100">Slepi popis</span>
          </div>
          <span className="text-sm text-zinc-400 text-pretty">
            Čist popis bez prikaza očekivanih količina radnicima. Idealno za
            nezavisnu proveru stanja.
          </span>
        </div>
      </label>
    </div>
  )
}
