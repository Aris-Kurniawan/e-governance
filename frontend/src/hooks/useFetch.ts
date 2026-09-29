import { useEffect, useState } from "react"
import type { AsyncState } from "@/lib/api/types"
import { ApiError } from "@/lib/api/errors"

export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []): {
  state: AsyncState<T>
  refetch: () => void
} {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: "loading" })
    fetcher()
      .then((data) => {
        if (cancelled) return
        const isEmpty = Array.isArray(data) ? data.length === 0 : data == null
        setState(isEmpty ? { status: "empty" } : { status: "success", data })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError) {
          setState({ status: "error", code: err.code, message: err.message })
        } else {
          setState({ status: "error", code: "NETWORK_ERROR", message: "Gagal mengambil data." })
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { state, refetch: () => setTick((t) => t + 1) }
}

export function useStatusPolling<T>(fetcher: () => Promise<T>, intervalMs = 10_000, deps: unknown[] = []): {
  state: AsyncState<T>
  refetch: () => void
} {
  const { state, refetch } = useFetch(fetcher, deps)

  useEffect(() => {
    const id = setInterval(refetch, intervalMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps])

  return { state, refetch }
}