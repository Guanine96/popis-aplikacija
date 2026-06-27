const DB_NAME = "popis-offline-v1"
const STORE = "pending_counts"
const DB_VERSION = 1

export interface PendingCount {
  id: string
  orgId: string
  popisId: string
  profileId: string
  sku: string
  quantity: number
  createdAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function enqueuePendingCount(
  entry: Omit<PendingCount, "id" | "createdAt">,
): Promise<PendingCount> {
  const record: PendingCount = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return record
}

export async function listPendingCounts(orgId: string, popisId: string) {
  const db = await openDb()
  const all = await new Promise<PendingCount[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as PendingCount[])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return all.filter((r) => r.orgId === orgId && r.popisId === popisId)
}

export async function removePendingCount(id: string) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function countPending(orgId: string, popisId: string) {
  const list = await listPendingCounts(orgId, popisId)
  return list.length
}
