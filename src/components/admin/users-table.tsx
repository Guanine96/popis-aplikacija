"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { formatLastLogin, type SubAccount, type UserRole } from "@/lib/users-data"

interface UsersTableProps {
  users: SubAccount[]
}

const roleStyles: Record<UserRole, string> = {
  Owner: "border-primary/40 bg-primary/10 text-primary",
  Admin: "border-primary/30 bg-primary/5 text-primary/90",
  Manager: "border-border bg-secondary text-foreground/80",
  Member: "border-border bg-secondary text-foreground/80",
  Viewer: "border-border bg-transparent text-muted-foreground",
}

function initials(username: string): string {
  const parts = username.replace(/[._-]/g, " ").trim().split(" ")
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

export function UsersTable({ users }: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">
              Username
            </TableHead>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">
              Role
            </TableHead>
            <TableHead className="text-xs uppercase tracking-widest text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-right text-xs uppercase tracking-widest text-muted-foreground">
              Last Login
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="border-border/40 transition-colors hover:bg-primary/5"
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 border border-border/60">
                    <AvatarFallback className="bg-secondary font-mono text-xs text-primary">
                      {initials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {user.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-xs uppercase tracking-wider",
                    roleStyles[user.role],
                  )}
                >
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "relative flex size-2",
                      user.active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {user.active && (
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                    )}
                    <span
                      className={cn(
                        "relative inline-flex size-2 rounded-full",
                        user.active ? "bg-primary" : "bg-muted-foreground/50",
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      user.active
                        ? "text-foreground/90"
                        : "text-muted-foreground",
                    )}
                  >
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-muted-foreground">
                {formatLastLogin(user.lastLogin)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
