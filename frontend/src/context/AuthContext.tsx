import React, { createContext, useContext, useState } from "react"

export interface AuthUser {
  id: string
  nama: string
  nik: string
  peran: string
  email?: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (userData?: Partial<AuthUser>) => void
  logout: () => void
}

const STORAGE_KEY_USER = "simakis_auth_user"
const STORAGE_KEY_TOKEN = "simakis_auth_token"

const defaultMockUser: AuthUser = {
  id: "usr-001",
  nama: "Siti Aminah",
  nik: "3524015809920003",
  peran: "Warga Terverifikasi",
  email: "siti.aminah@warga.lamongan.go.id"
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const isAuthenticated = !!user

  const login = (userData?: Partial<AuthUser>) => {
    const newUser: AuthUser = {
      ...defaultMockUser,
      ...userData,
    }
    setUser(newUser)
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser))
      localStorage.setItem(STORAGE_KEY_TOKEN, "mock-jwt-token-lamongan-2026")
    } catch {
      // ignore storage errors
    }
  }

  const logout = () => {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY_USER)
      localStorage.removeItem(STORAGE_KEY_TOKEN)
    } catch {
      // ignore storage errors
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
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
