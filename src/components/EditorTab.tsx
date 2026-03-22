import { FilePenLine, Music, Plus, Search, Send, Upload, X } from "lucide-react"

import { SONG_CATEGORIES } from "../constants"
import type { UseEditorReturn } from "../hooks/useEditor"
import { EDITABLE_COLLECTIONS, useStore } from "../store"

const isColetanea = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("coletanea")

interface EditorTabProps {
  editor: UseEditorReturn
}

export function EditorTab({ editor }: EditorTabProps) {
  const { songs } = useStore()
  const {
    editorTitle,
    setEditorTitle,
    editorContent,
    setEditorContent,
    editorCollection,
    setEditorCollection,
    editingSongTitle,
    searchEditQuery,
    setSearchEditQuery,
    selectedEditCategory,
    setSelectedEditCategory,
    resetForm,
    handleSave,
    handleImportJSON,
    selectSongForEditing,
  } = editor

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: "#0a0c14" }}
    >
      <div
        className="flex-1 flex h-full overflow-hidden min-w-0"
        style={{ backgroundColor: "#0a0c14" }}
      >
        {/* Sidebar de Seleção para Edição */}
        <div className="w-[300px] flex flex-col border-r border-white/[0.07] bg-[#161b26]/40 h-full min-h-0 overflow-hidden">
          <div className="p-4 border-b border-white/[0.07] bg-[#0f1219]/20">
            <h2 className="text-[13px] font-bold text-white/70 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Music className="w-4 h-4" />
              Editar Louvor
              <span className="ml-auto bg-white/5 px-1.5 py-0.5 rounded text-[9px] lowercase font-normal">
                {songs.length} total
              </span>
            </h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Buscar para editar..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border border-white/[0.07] transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/10 placeholder:text-white/20 bg-white/5"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={searchEditQuery}
                onChange={(e) => setSearchEditQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-1 overflow-x-auto mt-3 pb-1 no-scrollbar">
              {SONG_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedEditCategory(cat)}
                  className={`whitespace-nowrap px-2 py-1 text-[10px] font-bold rounded-lg transition-all flex-shrink-0 border ${
                    selectedEditCategory === cat
                      ? "text-white border-brand-500/30 bg-brand-500/20 shadow-sm"
                      : "text-white/30 border-transparent hover:text-white/60 hover:bg-white/5"
                  }`}
                >
                  {cat.replace(" 2018", "")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
            {(() => {
              const filtered = songs
                .filter((song) => {
                  const matchesSearch = song.title
                    .toLowerCase()
                    .includes(searchEditQuery.toLowerCase())
                  const matchesCategory =
                    selectedEditCategory === "Todas" ||
                    song.collection === selectedEditCategory
                  return matchesSearch && matchesCategory
                })
                .sort((a, b) => a.title.localeCompare(b.title))

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-10 opacity-20 text-[10px]">
                    Nenhum louvor encontrado
                  </div>
                )
              }

              return filtered.map((song) => (
                <button
                  type="button"
                  key={`${song.title}-${song.collection}`}
                  onClick={() => selectSongForEditing(song)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex flex-col gap-0.5 border ${
                    editingSongTitle === song.title
                      ? "bg-brand-500/20 border-brand-500/30 text-white shadow-sm"
                      : "border-transparent text-white/40 hover:bg-white/5 hover:text-white/60"
                  }`}
                >
                  <span className="font-semibold truncate">{song.title}</span>
                  <span className="text-[10px] opacity-50">
                    {song.collection}
                  </span>
                </button>
              ))
            })()}
          </div>

          {editingSongTitle && (
            <div className="p-3 border-t border-white/[0.07] bg-[#0f1219]/40">
              <button
                type="button"
                onClick={resetForm}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/50 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-3 h-3" />
                Novo Louvor
              </button>
            </div>
          )}
        </div>

        {/* Painel de Conteúdo */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-950/20 custom-scroll">
          <div className="max-w-2xl mx-auto flex flex-col gap-8 pb-32">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {editingSongTitle ? "Editar Louvor" : "Adicionar Louvor"}
                </h2>
                <p className="text-sm text-white/30 mt-1">
                  {editingSongTitle
                    ? `Editando: ${editingSongTitle}`
                    : "Adicione um novo louvor à sua biblioteca ou importe um arquivo JSON."}
                </p>
              </div>
              {editingSongTitle && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {!editingSongTitle && (
              <>
                <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                  <h3 className="text-[14px] font-semibold text-white/80 flex items-center gap-2 mb-2">
                    <Upload className="w-4 h-4 text-slate-400" />
                    Importar Louvores
                  </h3>
                  <p className="text-[12px] text-white/30 mb-4 leading-relaxed">
                    Selecione um arquivo JSON para importar louvores massa para
                    a biblioteca.
                  </p>
                  <button
                    type="button"
                    onClick={handleImportJSON}
                    className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
                    style={{
                      background: "linear-gradient(135deg, #64748b, #475569)",
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    Importar JSON
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[11px] text-white/20 font-semibold uppercase tracking-widest">
                    Ou Manualmente
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              </>
            )}

            {/* Formulário */}
            <div className="flex flex-col gap-6">
              <div
                className={`grid gap-6 ${editingSongTitle && isColetanea(editorCollection) ? "grid-cols-1" : "grid-cols-2"}`}
              >
                <div>
                  <label
                    htmlFor="editor-title"
                    className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 block"
                  >
                    Título
                  </label>
                  <input
                    id="editor-title"
                    type="text"
                    placeholder="Ex: O Sangue de Jesus Tem Poder"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 placeholder:text-white/20 bg-white/5 text-white"
                    value={editorTitle}
                    onChange={(e) => setEditorTitle(e.target.value)}
                  />
                </div>

                {!(editingSongTitle && isColetanea(editorCollection)) && (
                  <div>
                    <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 block">
                      Coleção
                    </span>
                    <div className="flex gap-1.5 h-[46px]">
                      {EDITABLE_COLLECTIONS.map((col) => (
                        <button
                          type="button"
                          key={col}
                          onClick={() => setEditorCollection(col)}
                          className={`flex-1 text-center px-1 py-1 rounded-xl text-[11px] font-medium border transition-all ${
                            editorCollection === col
                              ? "text-white border-brand-500/40 shadow-md"
                              : "text-white/50 border-white/[0.07] hover:text-white/80 hover:border-white/10 hover:bg-white/[0.03]"
                          }`}
                          style={
                            editorCollection === col
                              ? {
                                  background:
                                    "linear-gradient(135deg, #3b82f6, #2563eb)",
                                }
                              : {
                                  backgroundColor: "rgba(255,255,255,0.02)",
                                }
                          }
                        >
                          {col.replace(" 2018", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="editor-lyrics"
                  className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 block"
                >
                  Letra do Louvor
                </label>
                <textarea
                  id="editor-lyrics"
                  placeholder={
                    "Cole a letra aqui...\n\nSepare estrofes com uma linha em branco.\nCada bloco separado será uma cena na projeção."
                  }
                  className="w-full px-4 py-4 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 placeholder:text-white/15 resize-none leading-relaxed text-white"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    minHeight: "400px",
                  }}
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                {editingSongTitle && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-3.5 rounded-xl text-[14px] font-semibold text-white/60 bg-white/5 hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!editorTitle.trim() || !editorContent.trim()}
                  className="flex-[2] py-3.5 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #B93BEA, #9b30c9)",
                  }}
                >
                  {editingSongTitle ? (
                    <FilePenLine className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {editingSongTitle ? "Salvar Alterações" : "Adicionar Louvor"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
