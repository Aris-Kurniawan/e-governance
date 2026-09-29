import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary menangkap error:", error, info)
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-body-lg font-semibold text-ink">Terjadi kendala tak terduga</p>
          <p className="max-w-md text-body-sm text-ink-secondary">
            Halaman ini gagal dimuat. Silakan muat ulang untuk mencoba lagi.
          </p>
          <Button onClick={this.handleRetry} variant="default">
            Muat Ulang
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}