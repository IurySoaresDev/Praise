import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ListMusic,
  Plus,
  Trash2,
} from "lucide-react"
import { useState } from "react"

import { type Song, useStore } from "../store"

interface PlaylistProps {
  activeTab: "songs" | "bible"
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function Playlist({
  activeTab,
  isCollapsed,
  onToggleCollapse,
}: PlaylistProps) {
  const {
    selectedSong,
    setSelectedSong,
    setActiveSlideIndex,
    playlist,
    biblePlaylist,
    removeFromPlaylist,
    removeFromBiblePlaylist,
    moveSongInPlaylist,
    moveSongInBiblePlaylist,
  } = useStore()

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  const items: Song[] = activeTab === "songs" ? playlist : biblePlaylist

  return (
    <div
      className="border-t border-white/[0.07] flex flex-col min-h-0"
      style={{
        height: isCollapsed ? "auto" : "45%",
        backgroundColor: "#0a0c14",
      }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: collapsible header with complex layout */}
      <div
        className="px-4 py-3 flex items-center gap-2 shrink-0 border-b border-white/[0.07] cursor-pointer select-none hover:bg-white/[0.03] transition-colors"
        role="button"
        tabIndex={0}
        onClick={onToggleCollapse}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggleCollapse()
          }
        }}
        title={isCollapsed ? "Expandir" : "Recolher"}
      >
        {activeTab === "songs" ? (
          <ListMusic className="w-4 h-4 text-brand-400" />
        ) : (
          <BookOpen className="w-4 h-4 text-brand-400" />
        )}
        <span className="text-[13px] font-semibold text-white/70 flex-1">
          {activeTab === "songs" ? "Louvores do Culto" : "Textos Bíblicos"}
        </span>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-md text-brand-300"
          style={{ backgroundColor: "rgba(99,102,241,0.15)" }}
        >
          {items.length}
        </span>
        <span className="p-1 rounded-md text-white/40 transition-all">
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="p-6 text-center text-white/15 text-xs">
              Duplo-clique ou clique no{" "}
              <Plus className="inline w-3 h-3 text-brand-400" /> para adicionar{" "}
              {activeTab === "songs" ? "louvores" : "versículos"}.
            </div>
          ) : (
            items.map((item, idx) => (
              // biome-ignore lint/a11y/useSemanticElements: complex draggable div with drag-and-drop
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: playlist allows duplicate entries
                key={`${item.title}-${idx}`}
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => {
                  setDragIdx(idx)
                  e.dataTransfer.effectAllowed = "move"
                  e.dataTransfer.setData("text/plain", String(idx))
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "move"
                  setOverIdx(idx)
                }}
                onDragEnd={() => {
                  if (
                    dragIdx !== null &&
                    overIdx !== null &&
                    dragIdx !== overIdx
                  ) {
                    if (activeTab === "songs") {
                      moveSongInPlaylist(dragIdx, overIdx)
                    } else {
                      moveSongInBiblePlaylist(dragIdx, overIdx)
                    }
                  }
                  setDragIdx(null)
                  setOverIdx(null)
                }}
                onClick={() => {
                  setSelectedSong(item)
                  setActiveSlideIndex(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setSelectedSong(item)
                    setActiveSlideIndex(0)
                  }
                }}
                className={`w-full px-1 py-1.5 mb-0.5 rounded-lg transition-all duration-100 text-[13px] flex items-center group cursor-grab active:cursor-grabbing select-none border ${
                  dragIdx === idx
                    ? "opacity-40 border-brand-500/50 bg-brand-500/10 scale-95"
                    : overIdx === idx && dragIdx !== null && dragIdx !== idx
                      ? "border-brand-400/40 bg-brand-500/10 scale-[1.02]"
                      : selectedSong?.title === item.title
                        ? "border-brand-500/40 bg-brand-500/20"
                        : "border-transparent hover:bg-white/5"
                }`}
              >
                <div className="p-1 text-white/15 group-hover:text-white/30 flex-shrink-0">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
                <span className="text-white/25 text-[10px] font-mono w-6 text-right shrink-0">
                  {idx + 1}.
                </span>
                <span
                  className={`flex-1 truncate font-medium ml-2 ${
                    selectedSong?.title === item.title
                      ? "text-brand-200"
                      : "text-white/60"
                  }`}
                >
                  {item.title}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (activeTab === "songs") removeFromPlaylist(idx)
                    else removeFromBiblePlaylist(idx)
                  }}
                  className="p-1 rounded-md text-white/15 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
