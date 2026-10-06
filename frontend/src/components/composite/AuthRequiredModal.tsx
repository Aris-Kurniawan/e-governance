import { Link, useLocation } from "react-router-dom"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ShieldAlert, CheckCircle2, LogIn, UserPlus, Lock } from "lucide-react"

interface AuthRequiredModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  redirectUrl?: string
  schoolName?: string
}

export default function AuthRequiredModal({
  open,
  onOpenChange,
  redirectUrl,
  schoolName,
}: AuthRequiredModalProps) {
  const location = useLocation()
  const targetUrl = redirectUrl || location.pathname + location.search
  const loginUrl = `/login?redirect=${encodeURIComponent(targetUrl)}&action=report`
  const registerUrl = `/registrasi?redirect=${encodeURIComponent(targetUrl)}&action=report`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 sm:rounded-2xl border-slate-200 overflow-hidden">
        {/* Header Visual */}
        <div className="bg-gradient-to-br from-[#07162C] to-[#0B3052] p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/20 text-white shadow-inner mb-3">
            <ShieldAlert className="h-7 w-7 text-amber-400" />
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold tracking-tight text-white text-center">
              Wajib Masuk / Daftar Akun
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs mt-1.5 leading-relaxed text-center">
              Untuk melaporkan sarana {schoolName ? <span className="text-white font-semibold">{schoolName}</span> : "sekolah"}, Anda harus memiliki akun warga terverifikasi.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3.5 space-y-2 text-xs text-slate-600">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <Lock className="h-3.5 w-3.5 text-[#0B3052]" /> Mengapa Diperlukan Akun?
            </span>
            <ul className="space-y-1.5 text-[11px] leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Prinsip 1 NIK = 1 Suara Sah:</strong> Mencegah laporan fiktif, spam, dan manipulasi data bot.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Kerahasiaan Terjamin (UU PDP):</strong> Identitas NIK disamarkan (mis. Pelapor #W012) di hadapan sekolah.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Pantauan Status Real-Time:</strong> Anda dapat melacak progres audit hingga perbaikan fisik selesai.</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <Button
              asChild
              className="w-full h-11 bg-[#0B3052] hover:bg-[#07213A] text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Link to={loginUrl} onClick={() => onOpenChange(false)}>
                <LogIn className="h-4 w-4" /> Masuk ke Akun Terdaftar
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full h-11 border-slate-200 text-slate-800 font-bold hover:bg-slate-50 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Link to={registerUrl} onClick={() => onOpenChange(false)}>
                <UserPlus className="h-4 w-4 text-[#2563EB]" /> Daftar Akun Warga Baru
              </Link>
            </Button>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors cursor-pointer"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
