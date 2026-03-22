import { getCurrentWindow } from "@tauri-apps/api/window"
import { Minus, X } from "lucide-react"
import { useMemo } from "react"

import praiseLogo from "../assets/praise-logo.svg"

export function TitleBar() {
  const appWindow = useMemo(() => getCurrentWindow(), [])

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Tauri window drag region
    <div
      data-tauri-drag-region
      onMouseDown={(e) => {
        if (e.buttons === 1) {
          appWindow.startDragging()
        }
      }}
      className="h-8 flex items-center justify-between px-4 select-none shrink-0 cursor-default"
      style={{
        backgroundColor: "#0a0c14",
        borderBottom: "1px solid rgba(59,130,246,0.1)",
      }}
    >
      <div className="flex items-center gap-2 pointer-events-none">
        <img src={praiseLogo} alt="Praise" className="h-5" />
      </div>

      <div className="flex items-center h-full">
        <button
          type="button"
          onClick={() => appWindow.minimize()}
          onMouseDown={(e) => e.stopPropagation()}
          className="h-8 w-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => appWindow.close()}
          onMouseDown={(e) => e.stopPropagation()}
          className="h-8 w-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-500/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
