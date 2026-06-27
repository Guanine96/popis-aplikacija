import { PopisReconciliationTable } from "@/components/dashboard/PopisReconciliationTable"
import { AuthGate, RoleGate } from "@/components/AuthGate"

export default function ReconciliationPage() {
  return (
    <AuthGate>
      <RoleGate role="admin">
        <PopisReconciliationTable />
      </RoleGate>
    </AuthGate>
  )
}
