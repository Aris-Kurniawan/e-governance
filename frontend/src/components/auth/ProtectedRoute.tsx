import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import type { Role } from "@/lib/api/types"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  loginPath?: string
  allowedRoles?: Role[]
}

export default function ProtectedRoute({
  children,
  loginPath = "/login",
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm font-medium text-slate-500">Memeriksa autentikasi...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    const separator = loginPath.includes("?") ? "&" : "?"
    return <Navigate to={`${loginPath}${separator}redirect=${redirect}`} replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Jika login sebagai role yang tidak berwenang pada area ini
    const fallbackPath = role === "warga_umum" || role === "warga_terverifikasi" || role === "komite_sekolah"
      ? "/dashboard"
      : "/dinas/dashboard"
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}
