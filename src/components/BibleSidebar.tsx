import { ArrowLeft, Loader2, Plus, Search } from "lucide-react"

import type { BibleVerse, UseBibleReturn } from "../hooks/useBible"
import { useStore } from "../store"

interface BibleSidebarProps {
  bible: UseBibleReturn
}

export function BibleSidebar({ bible }: BibleSidebarProps) {
  const {
    selectedSong,
    setSelectedSong,
    activeSlideIndex,
    setActiveSlideIndex,
    addToBiblePlaylist,
  } = useStore()

  const {
    selectedBook,
    setSelectedBook,
    selectedChapter,
    setSelectedChapter,
    searchBibleQuery,
    setSearchBibleQuery,
    searchChapterQuery,
    setSearchChapterQuery,
    bibleVersion,
    setBibleVersion,
    isLoadingBible,
    bibleBooks,
    bibleVerses,
  } = bible

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#0f1219]/30">
      <div className="p-3 flex items-center justify-between gap-2 border-b border-white/[0.07] shrink-0 min-h-[53px]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedBook && (
            <button
              type="button"
              onClick={() => {
                if (selectedChapter) {
                  setSelectedChapter(null)
                } else {
                  setSelectedBook(null)
                  setSearchChapterQuery("")
                }
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1 truncate text-sm font-semibold text-white/80 pr-2 block">
            {!selectedBook
              ? "Selecione o Livro"
              : !selectedChapter
                ? selectedBook.name
                : `${selectedBook.name} ${selectedChapter}`}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
          {(["ACF", "ARA", "NVI"] as const).map((version) => (
            <button
              type="button"
              key={version}
              onClick={() => setBibleVersion(version)}
              className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all flex-shrink-0 ${
                bibleVersion === version
                  ? "text-white shadow-md bg-brand-500"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
              style={
                bibleVersion === version
                  ? { background: "linear-gradient(135deg, #64748b, #475569)" }
                  : {}
              }
            >
              {version}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {isLoadingBible ? (
          <div className="flex-1 flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <span className="text-white/60 text-xs font-semibold">
              Carregando Bíblia ({bibleVersion})...
            </span>
          </div>
        ) : (
          <>
            {/* Livros */}
            {!selectedBook && (
              <div className="flex flex-col gap-3">
                <div className="relative shrink-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder="Buscar livro..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 placeholder:text-white/25"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                    value={searchBibleQuery}
                    onChange={(e) => setSearchBibleQuery(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {bibleBooks.length > 0 ? (
                    bibleBooks.map((book) => (
                      <button
                        type="button"
                        key={book.abbrev}
                        onClick={() => {
                          setSelectedBook(book)
                          setSearchBibleQuery("")
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition-all flex justify-between items-center group"
                      >
                        <span className="font-medium">{book.name}</span>
                        <span className="text-[10px] text-white/20 group-hover:text-white/40 bg-white/5 px-2 py-0.5 rounded-md">
                          {book.chapters.length} cap.
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-6 text-center text-white/20 text-xs">
                      Nenhum livro encontrado.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Capítulos */}
            {selectedBook && !selectedChapter && (
              <div className="flex flex-col gap-3">
                <div className="relative shrink-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder={`Buscar no livro de ${selectedBook.name}...`}
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 placeholder:text-white/25"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                    value={searchChapterQuery}
                    onChange={(e) => setSearchChapterQuery(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-5 gap-1 p-1">
                  {Array.from({ length: selectedBook.chapters.length })
                    .map((_, i) => i + 1)
                    .filter(
                      (chapNumber) =>
                        searchChapterQuery.trim() === "" ||
                        chapNumber
                          .toString()
                          .includes(searchChapterQuery.trim()),
                    )
                    .map((chapNumber) => (
                      <button
                        type="button"
                        key={chapNumber}
                        onClick={() => {
                          setSelectedChapter(chapNumber)
                          setSearchChapterQuery("")
                          const chapterVerses =
                            selectedBook.chapters[chapNumber - 1]
                          const chapterSongTitle = `${selectedBook.name} ${chapNumber}`
                          const chapterContent = chapterVerses
                            .map(
                              (text: string, vIdx: number) =>
                                `[${selectedBook.name} ${chapNumber}:${vIdx + 1}]\n${vIdx + 1}. ${text}`,
                            )
                            .join("\n\n")
                          setSelectedSong({
                            title: chapterSongTitle,
                            content: chapterContent,
                            collection: "Bíblia",
                          })
                          setActiveSlideIndex(0)
                        }}
                        className={`aspect-square flex items-center justify-center rounded-lg text-[13px] font-medium text-white/70 hover:text-white hover:bg-brand-500/20 hover:border-brand-500/30 border border-transparent transition-all ${
                          selectedChapter === chapNumber
                            ? "bg-brand-500/20 text-brand-400 border-brand-500/30 glow-brand shadow-inner"
                            : ""
                        }`}
                      >
                        {chapNumber}
                      </button>
                    ))}
                </div>
                {Array.from({ length: selectedBook.chapters.length }).filter(
                  (_c: unknown, i: number) =>
                    (i + 1).toString().includes(searchChapterQuery.trim()),
                ).length === 0 && (
                  <div className="px-3 py-6 text-center text-white/20 text-xs">
                    Nenhum capítulo encontrado.
                  </div>
                )}
              </div>
            )}

            {/* Versículos */}
            {selectedBook && selectedChapter && (
              <div className="flex flex-col gap-1">
                {bibleVerses.map((verse: BibleVerse, index: number) => {
                  const chapterSongTitle = `${selectedBook.name} ${selectedChapter}`
                  const isVerseActive =
                    selectedSong?.title === chapterSongTitle &&
                    activeSlideIndex === index
                  const singleVerseSong = {
                    title: `${selectedBook.name} ${selectedChapter}:${verse.number}`,
                    content: `[${selectedBook.name} ${selectedChapter}:${verse.number}]\n${verse.number}. ${verse.text}`,
                    collection: "Bíblia",
                  }
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: complex interactive div with double-click and verse navigation
                    <div
                      key={verse.number}
                      role="button"
                      tabIndex={0}
                      onDoubleClick={() => addToBiblePlaylist(singleVerseSong)}
                      onClick={() => {
                        if (selectedSong?.title !== chapterSongTitle) {
                          const chapterContent = bibleVerses
                            .map(
                              (v: BibleVerse) =>
                                `[${selectedBook.name} ${selectedChapter}:${v.number}]\n${v.number}. ${v.text}`,
                            )
                            .join("\n\n")
                          setSelectedSong({
                            title: chapterSongTitle,
                            content: chapterContent,
                            collection: "Bíblia",
                          })
                        }
                        setActiveSlideIndex(index)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          if (selectedSong?.title !== chapterSongTitle) {
                            const chapterContent = bibleVerses
                              .map(
                                (v: BibleVerse) =>
                                  `[${selectedBook.name} ${selectedChapter}:${v.number}]\n${v.number}. ${v.text}`,
                              )
                              .join("\n\n")
                            setSelectedSong({
                              title: chapterSongTitle,
                              content: chapterContent,
                              collection: "Bíblia",
                            })
                          }
                          setActiveSlideIndex(index)
                        }
                      }}
                      className={`w-full text-left p-2 rounded-lg flex gap-2 group cursor-pointer transition-all border ${
                        isVerseActive
                          ? "border-brand-500/40 bg-brand-500/20"
                          : "border-transparent hover:bg-white/5"
                      }`}
                    >
                      <span className="text-brand-400 font-bold text-[10px] pt-[3px] shrink-0 w-4 text-right">
                        {verse.number}
                      </span>
                      <p className="flex-1 text-[13px] text-white/70 group-hover:text-white/90 leading-relaxed">
                        {verse.text}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          addToBiblePlaylist(singleVerseSong)
                        }}
                        className="p-1.5 h-7 w-7 flex items-center justify-center rounded-md text-white/20 hover:text-accent-300 hover:bg-accent-500/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Adicionar ao único versículo Culto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
