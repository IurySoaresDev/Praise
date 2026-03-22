import { CheckCircle2 } from "lucide-react"

interface SuccessToastProps {
  isVisible: boolean
  message: string
}

export function SuccessToast({ isVisible, message }: SuccessToastProps) {
  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 toast-enter">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-500/20 shadow-xl"
        style={{
          backgroundColor: "rgba(5,11,24,0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
        <span className="text-[13px] font-medium text-brand-100">
          {message}
        </span>
      </div>
    </div>
  )
}
