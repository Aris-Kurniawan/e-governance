import { forwardRef, type ComponentProps, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Input gaya mockup auth split-dark: label melayang kecil di dalam field
 * (kiri atas), teks nilai di bawahnya, ikon dekoratif di kanan atau
 * trailing control (mis. tombol lihat sandi).
 */
export interface AuthFieldProps extends ComponentProps<"input"> {
  label: string
  icon?: ReactNode
  trailing?: ReactNode
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, icon, trailing, className, ...props }, ref) => {
    return (
      <div className="relative">
        <label className="pointer-events-none absolute left-4 top-2 z-10 text-[10px] font-semibold uppercase tracking-wider text-white/45">
          {label}
        </label>
        <input
          ref={ref}
          className={cn(
            "h-[58px] w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 pt-6 pb-2 text-sm font-medium text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/50 transition-shadow",
            !trailing && icon ? "pr-11" : trailing ? "pr-11" : "",
            className,
          )}
          {...props}
        />
        {trailing ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
        ) : icon ? (
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/35">
            {icon}
          </div>
        ) : null}
      </div>
    )
  },
)
AuthField.displayName = "AuthField"

export default AuthField
