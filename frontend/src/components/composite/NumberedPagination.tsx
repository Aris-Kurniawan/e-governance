import { Button } from "@/components/ui/button"

interface NumberedPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export default function NumberedPagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: NumberedPaginationProps) {
  if (totalPages <= 1) return null

  const pages: (number | "...")[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push("...")
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push("...")
    pages.push(totalPages)
  }

  return (
    <nav className={`flex items-center justify-center gap-1 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="h-8 px-2.5 text-xs font-semibold border-slate-200 cursor-pointer disabled:cursor-not-allowed"
        aria-label="Halaman sebelumnya"
      >
        &laquo;
      </Button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-slate-400 text-xs">...</span>
        ) : (
          <Button
            key={p}
            variant={p === currentPage ? "default" : "outline"}
            size="sm"
            className={`h-8 min-w-[32px] px-2.5 text-xs font-semibold cursor-pointer ${
              p === currentPage
                ? "bg-[#0B3052] hover:bg-[#07213A] text-white border-[#0B3052]"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="h-8 px-2.5 text-xs font-semibold border-slate-200 cursor-pointer disabled:cursor-not-allowed"
        aria-label="Halaman berikutnya"
      >
        &raquo;
      </Button>
    </nav>
  )
}