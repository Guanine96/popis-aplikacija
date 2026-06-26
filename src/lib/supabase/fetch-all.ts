import type { PostgrestError } from "@supabase/supabase-js"

const PAGE_SIZE = 1000

type PageResult<T> = {
  data: T[] | null
  error: PostgrestError | null
}

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
): Promise<T[]> {
  const all: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data?.length) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}
