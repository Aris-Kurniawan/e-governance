import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { login as apiLogin, logout as apiLogout, me as apiMe, isLoggedIn } from "@/lib/api/auth"
import type { Role, UserMe } from "@/lib/api/types"
import { ROLE_LABEL } from "@/lib/api/types"

/**
 * F4.1 — Authenticate state.
 *
 * Token JWT disimpan di `@/lib/api/client` (`tokenStore`, localStorage) dan
 * dipasang otomatis ke header `Authorization` oleh client. Context ini
 * hanya menyimpan profil user untuk kebutuhan UI.
 *
 * Kontrak: INTERFACES.md §1. Field `nik` tidak pernah disimpan di sisi FE.
 */

interface AuthContextType {
  user: UserMe | null
  isAuthenticated: boolean
  isLoading: boolean
  role: Role | null
  roleLabel: string | null
  /** Login ke backend. Throw `ApiError` kalau kredensial ditolak. */
  login: (email: string, password: string) => Promise<UserMe>
  /** Ambil ulang profil dari `GET /auth/me` (setelah refresh/halaman reload). */
  refreshUser: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(() => isLoggedIn())

  // Saat halaman di-reload dengan token tersimpan,Validasi token tetap hidup
  // dengan mengambil profil dari `GET /auth/me`. 401 → token dianggap mati,
  // client.ts sudah membersihkannya, jadi kita tinggal kosongkan state.
  useEffect(() => {
    if (!isLoggedIn() || user) return
    let cancelled = false
    apiMe()
      .then((data) => {
        if (!cancelled) setUser(data)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password)
    const profile = await apiMe()
    setUser(profile)
    setIsLoading(false)
    return profile
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      setUser(await apiMe())
    } catch {
      setUser(null)
    }
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
    setIsLoading(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        role: user?.role ?? null,
        roleLabel: user ? ROLE_LABEL[user.role] : null,
        login,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}