"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ROLE_OPTIONS, type SubAccount, type UserRole } from "@/lib/users-data"
import { Lock, TriangleAlert, UserPlus } from "lucide-react"

interface GenerateUserDialogProps {
  atLimit: boolean
  seatsAllowed: number
  onCreate: (user: Omit<SubAccount, "id">) => void
  onUpgrade: () => void
}

export function GenerateUserDialog({
  atLimit,
  seatsAllowed,
  onCreate,
  onUpgrade,
}: GenerateUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("Member")
  const [touched, setTouched] = useState(false)

  const usernameValid = /^[a-z0-9._-]{3,}$/i.test(username)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const formValid = usernameValid && emailValid

  function reset() {
    setUsername("")
    setEmail("")
    setRole("Member")
    setTouched(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!formValid) return
    onCreate({ username, email, role, active: true, lastLogin: null })
    reset()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger
        disabled={atLimit}
        render={
          <Button disabled={atLimit}>
            <UserPlus data-icon="inline-start" />
            Generate New User
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono uppercase tracking-wide">
            <UserPlus className="size-4 text-primary" />
            Provision Sub-Account
          </DialogTitle>
          <DialogDescription>
            Create a new sub-account under your organization. The account
            consumes one seat from your plan.
          </DialogDescription>
        </DialogHeader>

        {atLimit ? (
          <Alert className="border-destructive/40 bg-destructive/10">
            <TriangleAlert className="size-4" />
            <AlertTitle className="font-mono uppercase tracking-wide">
              Seat limit reached
            </AlertTitle>
            <AlertDescription>
              You have used all {seatsAllowed} seats on your current plan.
              Upgrade to provision additional sub-accounts.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} id="generate-user-form">
            <FieldGroup>
              <Field data-invalid={touched && !usernameValid}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  placeholder="e.g. j.doe"
                  value={username}
                  autoComplete="off"
                  aria-invalid={touched && !usernameValid}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <FieldDescription>
                  Min 3 characters. Letters, numbers, dots, dashes.
                </FieldDescription>
              </Field>

              <Field data-invalid={touched && !emailValid}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  autoComplete="off"
                  aria-invalid={touched && !emailValid}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="role">Role</FieldLabel>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as UserRole)}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </form>
        )}

        <DialogFooter>
          {atLimit ? (
            <Button onClick={onUpgrade} className="w-full sm:w-auto">
              <Lock data-icon="inline-start" />
              Upgrade Plan
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" form="generate-user-form">
                Create Account
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
