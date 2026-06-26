"use client"

import { ArrowRight, Check, CircleDashed, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
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
import { SYSTEM_FIELDS, UNMAPPED_VALUE } from "@/lib/import-fields"

type ColumnMappingProps = {
  headers: string[]
  mapping: Record<string, string>
  blindInventory: boolean
  onMappingChange: (fieldId: string, header: string) => void
  onBlindInventoryChange: (value: boolean) => void
}

export function ColumnMapping({
  headers,
  mapping,
  blindInventory,
  onMappingChange,
  onBlindInventoryChange,
}: ColumnMappingProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-hidden rounded-xl border border-border bg-card/40">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="h-11 w-1/2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sistemsko polje
              </TableHead>
              <TableHead className="h-11 w-1/2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                <TableRow key={field.id} className="border-border">
                  <TableCell className="align-top">
                    <div className="flex items-start gap-3 py-1">
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ring-1 transition-colors",
                          isMapped
                            ? "bg-primary/15 text-primary ring-primary/40"
                            : "bg-secondary text-muted-foreground ring-border",
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
                          <span className="font-medium text-foreground">
                            {field.label}
                          </span>
                          {field.required ? (
                            <Badge
                              variant="outline"
                              className="border-primary/40 text-primary"
                            >
                              Obavezno
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-muted-foreground"
                            >
                              Opciono
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {field.hint}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center gap-3 py-1">
                      <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground/50 sm:block" />
                      <Select
                        value={value}
                        onValueChange={(next) =>
                          onMappingChange(field.id, next ?? UNMAPPED_VALUE)
                        }
                      >
                        <SelectTrigger
                          aria-invalid={needsAttention}
                          className={cn(
                            "w-full",
                            needsAttention &&
                              "border-destructive/50 text-destructive",
                          )}
                        >
                          <SelectValue placeholder="Odaberite kolonu..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value={UNMAPPED_VALUE}>
                              <span className="text-muted-foreground">
                                — Ne mapiraj —
                              </span>
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
        htmlFor="blind-inventory"
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card/40 p-4 transition-colors",
          "hover:border-primary/40 hover:bg-primary/5",
          blindInventory && "border-primary/50 bg-primary/10",
        )}
      >
        <Checkbox
          id="blind-inventory"
          checked={blindInventory}
          onCheckedChange={(checked) => onBlindInventoryChange(checked === true)}
          className="mt-0.5"
        />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <EyeOff className="size-4 text-primary" />
            <span className="font-medium text-foreground">Blind Inventory</span>
          </div>
          <span className="text-sm text-muted-foreground text-pretty">
            Čist popis bez vidljivih količina — operateri unose stanje bez uvida u
            knjigovodstvene vrednosti.
          </span>
        </div>
      </label>
    </div>
  )
}
