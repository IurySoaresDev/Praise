import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useStore, ALLOWED_COLLECTIONS } from "./store";
import { Search, Monitor, Play, MonitorDot, ChevronRight, ChevronLeft, Plus, Trash2, GripVertical, Square, Music, ListMusic, BookOpen, ArrowLeft, Loader2, FilePenLine, Upload, Send, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import "./App.css";

function App() {
  const {
    songs,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedSong,
    setSelectedSong,
    activeSlideIndex,
    setActiveSlideIndex,
    playlist,
    biblePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    moveSongInPlaylist,
    addToBiblePlaylist,
    removeFromBiblePlaylist,
    moveSongInBiblePlaylist,
    addSongToCollection,
    importSongsFromJSON,
  } = useStore();

  const [monitors, setMonitors] = useState<string[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<string>("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [isProjecting, setIsProjecting] = useState(false);

  // Bible State
  const [activeTab, setActiveTab] = useState<'songs' | 'bible' | 'editor'>('songs');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchBibleQuery, setSearchBibleQuery] = useState('');
  const [searchChapterQuery, setSearchChapterQuery] = useState('');
  
  const [bibleVersion, setBibleVersion] = useState<'NVI' | 'ACF' | 'ARA'>('ARA');
  const [bibleData, setBibleData] = useState<any[]>([]);
  const [isLoadingBible, setIsLoadingBible] = useState(true);

  // Editor State
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorCollection, setEditorCollection] = useState(ALLOWED_COLLECTIONS[0]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setIsLoadingBible(true);
    const loadBible = async () => {
      let mod;
      switch(bibleVersion) {
        case 'ACF': mod = await import('./assets/pt_acf.json'); break;
        case 'ARA': mod = await import('./assets/pt_ara.json'); break;
        case 'NVI': 
        default: mod = await import('./assets/pt_nvi.json'); break;
      }
      
      const newData = (mod.default as any[]) || [];
      setBibleData(newData);
      
      // Se tivermos um livro Selecionado, atualizamos a referência dele pro novo JSON
      setSelectedBook((prev: any) => {
        if (!prev) return null;
        return newData.find((b: any) => b.abbrev === prev.abbrev) || null;
      });
      setIsLoadingBible(false);
    };
    loadBible();
  }, [bibleVersion]);

  const bibleBooks = searchBibleQuery.trim() === ''
    ? bibleData 
    : bibleData.filter(book => 
        book.name.toLowerCase().includes(searchBibleQuery.toLowerCase()) || 
        book.abbrev.toLowerCase().includes(searchBibleQuery.toLowerCase())
      );
      
  const bibleVerses = selectedBook && selectedChapter 
    ? selectedBook.chapters[selectedChapter - 1].map((text: string, i: number) => ({
        number: i + 1,
        text
      }))
    : [];

  useEffect(() => {
    const getMonitors = async () => {
      try {
        const result = await invoke<string[]>("get_monitors");
        setMonitors(result);
        if (result.length > 0) setSelectedMonitor(result[0]);
      } catch (e) {
        console.error("Failed to get monitors:", e);
      }
    };
    getMonitors();
  }, []);

  const categories = ["Todas", "Coletânea 2018", "Avulsos 2018", "CIA 2018"];

  const filteredSongs = songs.filter((song) => {
    const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Todas" || song.collection === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatContent = (content: string, collection?: string) => {
    const isBible = collection === 'Bíblia';
    // Array com as palavras-chave que devem ficar amarelas
    const highlightWords = ['CORO', 'REFRÃO', 'BIS', 'INSTRUMENTAL', 'INTRO', 'PONTE', 'FINAL'];
    
    return content.split("\n\n").map(slide => {
      // 1. Remove tags HTML (caso haja resquícios do banco), mas vamos manter a nossa própria formatação depois.
      let cleanSlide = slide.replace(/<[^>]+>/g, '');
      
      // 2. Transforma cada linha para maiúsculo (exceto Bíblia)
      const formattedLines = cleanSlide.split('\n').map(line => {
        let trimmed = line.trim();
        if (!trimmed) return '';
        
        let formatted = isBible ? trimmed : trimmed.toUpperCase();
        
        if (isBible) {
          // Destaca a referência do versículo (ex: [Gênesis 1:1]) em amarelo no topo
          formatted = formatted.replace(/^\[(.*?)\]$/, '<span class="text-yellow-400 font-bold block mb-1 text-[0.65em] uppercase tracking-widest opacity-90">$1</span>');
          
          // Remove o número inicial do versículo (ex: "1. ")
          formatted = formatted.replace(/^(\d+\.)\s/, '');
        }
        
        // 3. Destaca as palavras-chave em amarelo
        if (!isBible) {
          highlightWords.forEach(word => {
            // Permite variações como "CORO", "(CORO)", "[CORO]", "CORO:"
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            if (regex.test(formatted)) {
              // Se encontrou a palavra, envolve em um span amarelo
              formatted = formatted.replace(regex, match => `<span class="text-yellow-400 font-bold italic">${match}</span>`);
            }
          });
        }
        
        return formatted;
      });

      // 4. Junta as linhas com <br /> para o HTML
      return formattedLines.join('<br />');
    });
  };

  const slides = selectedSong ? formatContent(selectedSong.content, selectedSong.collection) : [];

  const sendSlideToProjection = useCallback(async (content: string) => {
    try {
      await invoke("project_slide", {
        monitor: selectedMonitor,
        content: content,
      });
    } catch (e) {
      console.error("Erro ao projetar:", e);
    }
  }, [selectedMonitor]);

  const handleSelectSlide = useCallback((index: number) => {
    setActiveSlideIndex(index);
    if (isProjecting && slides[index]) {
      sendSlideToProjection(slides[index]);
    }
  }, [isProjecting, slides, setActiveSlideIndex, sendSlideToProjection]);

  const handleStartProjection = useCallback(async () => {
    if (!selectedSong || slides.length === 0) return;
    setIsProjecting(true);
    const idx = activeSlideIndex >= 0 ? activeSlideIndex : 0;
    setActiveSlideIndex(idx);
    await sendSlideToProjection(slides[idx]);
  }, [selectedSong, slides, activeSlideIndex, setActiveSlideIndex, sendSlideToProjection]);

  const handleStopProjection = useCallback(async () => {
    setIsProjecting(false);
    await sendSlideToProjection("");
  }, [sendSlideToProjection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSong || !isProjecting) return;
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (activeSlideIndex < slides.length - 1) {
          const newIdx = activeSlideIndex + 1;
          setActiveSlideIndex(newIdx);
          sendSlideToProjection(slides[newIdx]);
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (activeSlideIndex > 0) {
          const newIdx = activeSlideIndex - 1;
          setActiveSlideIndex(newIdx);
          sendSlideToProjection(slides[newIdx]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSlideIndex, slides, selectedSong, isProjecting, setActiveSlideIndex, sendSlideToProjection]);

  return (
    <div className="flex h-screen overflow-hidden font-['Inter',system-ui,sans-serif]" style={{ backgroundColor: '#0f172a', color: 'rgba(255,255,255,0.9)' }}>
      
      {/* ═══ SYSTEM NAV (Thick Left Rail) ═══ */}
      <div className="w-[72px] flex flex-col items-center py-4 border-r border-white/5 z-20 shrink-0" style={{ backgroundColor: '#0f172a' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-6 shadow-md" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
          <MonitorDot className="w-5 h-5 text-white" />
        </div>

        <div className="flex flex-col gap-2 w-full px-2">
          <button 
            onClick={() => setActiveTab('songs')}
            className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${
              activeTab === 'songs' 
                ? 'bg-slate-500/30 text-white shadow-inner scale-95 border-emerald-500/20 glow-brand' 
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <Music className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Louvor</span>
          </button>

          <button 
            onClick={() => setActiveTab('bible')}
            className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${
              activeTab === 'bible' 
                ? 'bg-slate-500/30 text-white shadow-inner scale-95 glow-brand' 
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Bíblia</span>
          </button>

          <button 
            onClick={() => setActiveTab('editor')}
            className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${
              activeTab === 'editor' 
                ? 'bg-slate-500/30 text-white shadow-inner scale-95 glow-brand' 
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <FilePenLine className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Editar</span>
          </button>
        </div>
      </div>

      {/* ═══ EDITOR FULL-WIDTH ═══ */}
      {activeTab === 'editor' && (
        <div className="flex-1 flex flex-col h-screen overflow-y-auto" style={{ backgroundColor: '#0f172a' }}>
          {/* Header */}
          <div className="flex flex-col shrink-0 gradient-header border-b border-white/5">
            <div className="p-5 px-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
                <FilePenLine className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-none">Editar Louvores</h1>
                <p className="text-[11px] text-white/40 font-medium mt-0.5">Adicionar e Exportar</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">
              {/* Botão Importar */}
              <div className="p-5 rounded-xl border border-white/5" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <h3 className="text-[14px] font-semibold text-white/80 flex items-center gap-2 mb-2">
                  <Upload className="w-4 h-4 text-slate-400" />
                  Importar Louvores
                </h3>
                <p className="text-[12px] text-white/30 mb-4 leading-relaxed">
                  Selecione um arquivo JSON para importar louvores para a biblioteca.
                </p>
                <button
                  onClick={async () => {
                    try {
                      const filePath = await open({
                        multiple: false,
                        filters: [{ name: 'JSON', extensions: ['json'] }],
                      });
                      if (filePath) {
                        const content = await readTextFile(filePath as string);
                        const data = JSON.parse(content);
                        const result = importSongsFromJSON(Array.isArray(data) ? data : [data]);
                        if (result.added > 0) {
                          setSuccessMessage(`${result.added} louvor(es) importado(s)!${result.duplicates > 0 ? ` (${result.duplicates} duplicata(s) ignorada(s))` : ''}`);
                        } else {
                          setSuccessMessage(`Nenhum louvor novo encontrado. ${result.duplicates} já existiam.`);
                        }
                        setShowSuccessToast(true);
                        setTimeout(() => setShowSuccessToast(false), 4000);
                      }
                    } catch (e) {
                      console.error('Erro ao importar:', e);
                      alert('Erro ao abrir seletor de arquivos: ' + JSON.stringify(e));
                    }
                  }}
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
                  style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}
                >
                  <Upload className="w-4 h-4" />
                  Importar JSON
                </button>
              </div>

              {/* Separador */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/5"></div>
                <span className="text-[11px] text-white/20 font-semibold uppercase tracking-widest">Novo Louvor</span>
                <div className="flex-1 h-px bg-white/5"></div>
              </div>

              {/* Formulário Adicionar */}
              <div className="flex flex-col gap-4">
                {/* Título + Coleção lado a lado */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Título */}
                  <div>
                    <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 block">Título</label>
                    <input
                      type="text"
                      placeholder="Ex: O Sangue de Jesus Tem Poder"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-slate-500/50 focus:ring-1 focus:ring-slate-500/20 placeholder:text-white/20"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      value={editorTitle}
                      onChange={(e) => setEditorTitle(e.target.value)}
                    />
                  </div>

                  {/* Coleção */}
                  <div>
                    <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 block">Coleção</label>
                    <div className="flex gap-1.5">
                      {ALLOWED_COLLECTIONS.map(col => (
                        <button
                          key={col}
                          onClick={() => setEditorCollection(col)}
                          className={`flex-1 text-center px-3 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
                            editorCollection === col 
                              ? 'text-white border-slate-500/40 shadow-md' 
                              : 'text-white/50 border-white/5 hover:text-white/80 hover:border-white/10 hover:bg-white/[0.03]'
                          }`}
                          style={editorCollection === col ? { background: 'linear-gradient(135deg, rgba(100,116,139,0.25), rgba(71,85,105,0.15))' } : { backgroundColor: 'rgba(255,255,255,0.02)' }}
                        >
                          {col.replace(" 2018", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Letra */}
                <div>
                  <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 block">Letra do Louvor</label>
                  <textarea
                    placeholder={"Cole a letra aqui...\n\nSepare estrofes com uma linha em branco.\nCada bloco separado será uma cena na projeção."}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-slate-500/50 focus:ring-1 focus:ring-slate-500/20 placeholder:text-white/15 resize-none leading-relaxed"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', minHeight: '320px' }}
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                  />
                </div>

                {/* Botão Adicionar */}
                <button
                  onClick={() => {
                    if (!editorTitle.trim() || !editorContent.trim()) return;
                    const result = addSongToCollection(editorTitle, editorContent, editorCollection);
                    if (result.duplicate) {
                      setDuplicateTitle(result.existingTitle || editorTitle);
                      setShowDuplicateModal(true);
                    } else {
                      setEditorTitle('');
                      setEditorContent('');
                      setSuccessMessage(`"${editorTitle.trim()}" adicionado com sucesso!`);
                      setShowSuccessToast(true);
                      setTimeout(() => setShowSuccessToast(false), 3000);
                    }
                  }}
                  disabled={!editorTitle.trim() || !editorContent.trim()}
                  className="w-full py-3 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                >
                  <Send className="w-4 h-4" />
                  Adicionar Louvor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SIDEBAR ═══ */}
      {activeTab !== 'editor' && (
      <div className="w-[340px] flex flex-col border-r border-white/5" style={{ backgroundColor: '#1e293b' }}>
        
        {/* Header */}
        <div className="flex flex-col shrink-0 gradient-header border-b border-white/5">
          <div className="p-4 flex items-center gap-2.5">
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-none">
                {activeTab === 'songs' ? 'Louvores' : `Bíblia Sagrada (${bibleVersion})`}
              </h1>
              <p className="text-[10px] text-white/40 font-medium mt-0.5">
                {activeTab === 'songs' ? 'Biblioteca e Adoração' : 'Navegação por Livros'}
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo Dinâmico */}
        {activeTab === 'songs' ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search + Categories */}
            <div className="p-4 flex flex-col gap-3 shrink-0 border-b border-white/5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Buscar louvor..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-slate-500/50 focus:ring-1 focus:ring-slate-500/20 placeholder:text-white/25"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all flex-shrink-0 ${
                      selectedCategory === cat 
                        ? "text-white shadow-md" 
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    }`}
                    style={selectedCategory === cat ? { background: 'linear-gradient(135deg, #64748b, #475569)' } : {}}
                  >
                    {cat.replace(" 2018", "")}
                  </button>
                ))}
              </div>
            </div>

            {/* Biblioteca de Louvores */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {filteredSongs.map((song, idx) => (
                <div
                  key={idx}
                  onDoubleClick={() => addToPlaylist(song)}
                  className="w-full text-left px-2 py-1.5 mb-0.5 rounded-lg text-[13px] flex items-center group cursor-pointer transition-all hover:bg-white/5"
                >
                  <span className="text-white/15 text-[10px] font-mono w-6 text-right shrink-0">{idx + 1}.</span>
                  <span className="flex-1 truncate text-white/60 group-hover:text-white/90 font-medium ml-2">
                    {song.title}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); addToPlaylist(song); }}
                    className="p-1 rounded-md text-white/20 hover:text-slate-300 hover:bg-slate-500/20 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="Adicionar ao Culto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {filteredSongs.length === 0 && (
                <div className="p-6 text-center text-white/20 text-xs mt-8">
                  Nenhum louvor encontrado.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 bg-slate-900/30">
            {/* Nav Header Bible */}
            <div className="p-3 flex items-center justify-between gap-2 border-b border-white/5 shrink-0 min-h-[53px]">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {selectedBook && (
                  <button 
                    onClick={() => {
                      if (selectedChapter) {
                        setSelectedChapter(null);
                      } else {
                        setSelectedBook(null);
                        setSearchChapterQuery('');
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
                {(['ACF', 'ARA', 'NVI'] as const).map(version => (
                  <button
                    key={version}
                    onClick={() => setBibleVersion(version)}
                    className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all flex-shrink-0 ${
                      bibleVersion === version 
                        ? "text-white shadow-md" 
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    }`}
                    style={bibleVersion === version ? { background: 'linear-gradient(135deg, #64748b, #475569)' } : {}}
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
                  <span className="text-white/60 text-xs font-semibold">Carregando Bíblia ({bibleVersion})...</span>
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
                      className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-slate-500/50 focus:ring-1 focus:ring-slate-500/20 placeholder:text-white/25"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      value={searchBibleQuery}
                      onChange={(e) => setSearchBibleQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1">
                    {bibleBooks.length > 0 ? bibleBooks.map(book => (
                      <button
                        key={book.abbrev}
                        onClick={() => {
                          setSelectedBook(book);
                          setSearchBibleQuery('');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition-all flex justify-between items-center group"
                      >
                        <span className="font-medium">{book.name}</span>
                        <span className="text-[10px] text-white/20 group-hover:text-white/40 bg-white/5 px-2 py-0.5 rounded-md">{book.chapters.length} cap.</span>
                      </button>
                    )) : (
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
                      className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-slate-500/50 focus:ring-1 focus:ring-slate-500/20 placeholder:text-white/25"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      value={searchChapterQuery}
                      onChange={(e) => setSearchChapterQuery(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-1 p-1">
                    {Array.from({ length: selectedBook.chapters.length })
                      .map((_, i) => i + 1)
                      .filter(chapNumber => 
                        searchChapterQuery.trim() === '' || 
                        chapNumber.toString().includes(searchChapterQuery.trim())
                      )
                      .map(chapNumber => (
                        <button
                          key={chapNumber}
                          onClick={() => {
                            setSelectedChapter(chapNumber);
                            setSearchChapterQuery('');
                            
                            // Carrega o capítulo inteiro no Lobby
                            const chapterVerses = selectedBook.chapters[chapNumber - 1];
                            const chapterSongTitle = `${selectedBook.name} ${chapNumber}`;
                            const chapterContent = chapterVerses.map((text: string, vIdx: number) => `[${selectedBook.name} ${chapNumber}:${vIdx + 1}]\n${vIdx + 1}. ${text}`).join('\n\n');
                            
                            setSelectedSong({
                              title: chapterSongTitle,
                              content: chapterContent,
                              collection: 'Bíblia'
                            });
                            setActiveSlideIndex(0);
                          }}
                          className="aspect-square flex items-center justify-center rounded-lg text-[13px] font-medium text-white/70 hover:text-white hover:bg-slate-500/20 hover:border-slate-500/30 border border-transparent transition-all"
                        >
                          {chapNumber}
                        </button>
                      ))}
                  </div>
                  {Array.from({ length: selectedBook.chapters.length })
                    .filter((c: any) => (c + 1).toString().includes(searchChapterQuery.trim())).length === 0 && (
                      <div className="px-3 py-6 text-center text-white/20 text-xs">
                        Nenhum capítulo encontrado.
                      </div>
                  )}
                </div>
              )}

              {/* Versículos */}
              {selectedBook && selectedChapter && (
                <div className="flex flex-col gap-1">
                  {bibleVerses.map((verse: any, index: number) => {
                    const chapterSongTitle = `${selectedBook.name} ${selectedChapter}`;
                    const isVerseActive = selectedSong?.title === chapterSongTitle && activeSlideIndex === index;
                    
                    const singleVerseSong = {
                      title: `${selectedBook.name} ${selectedChapter}:${verse.number}`,
                      content: `[${selectedBook.name} ${selectedChapter}:${verse.number}]\n${verse.number}. ${verse.text}`,
                      collection: 'Bíblia'
                    };

                    return (
                      <div
                        key={verse.number}
                        onDoubleClick={() => addToBiblePlaylist(singleVerseSong)}
                        onClick={() => {
                          // Se o capítulo inteiro não for mais a "música" atual, a recria
                          if (selectedSong?.title !== chapterSongTitle) {
                            const chapterContent = bibleVerses.map((v: any) => `[${selectedBook.name} ${selectedChapter}:${v.number}]\n${v.number}. ${v.text}`).join('\n\n');
                            setSelectedSong({
                              title: chapterSongTitle,
                              content: chapterContent,
                              collection: 'Bíblia'
                            });
                          }
                          setActiveSlideIndex(index);
                        }}
                        className={`w-full text-left p-2 rounded-lg flex gap-2 group cursor-pointer transition-all border ${
                          isVerseActive ? "border-slate-500/40 bg-slate-500/20" : "border-transparent hover:bg-white/5"
                        }`}
                      >
                        <span className="text-slate-400 font-bold text-[10px] pt-[3px] shrink-0 w-4 text-right">{verse.number}</span>
                        <p className="flex-1 text-[13px] text-white/70 group-hover:text-white/90 leading-relaxed">
                          {verse.text}
                        </p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); addToBiblePlaylist(singleVerseSong); }}
                          className="p-1.5 h-7 w-7 flex items-center justify-center rounded-md text-white/20 hover:text-slate-300 hover:bg-slate-500/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Adicionar ao único versículo Culto"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              </>
            )}
            </div>
          </div>
        )}

        {/* ─── PLAYLIST DO CULTO (Dinâmica por Aba) ─── */}
        <div className="border-t border-white/5 flex flex-col min-h-0" style={{ height: '45%', backgroundColor: '#0f172a' }}>
          <div className="px-4 py-3 flex items-center gap-2 shrink-0 border-b border-white/5">
            {activeTab === 'songs' ? <ListMusic className="w-4 h-4 text-slate-400" /> : <BookOpen className="w-4 h-4 text-slate-400" />}
            <span className="text-[13px] font-semibold text-white/70 flex-1">
              {activeTab === 'songs' ? 'Louvores do Culto' : 'Textos Bíblicos'}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-slate-300" style={{ backgroundColor: 'rgba(100,116,139,0.2)' }}>
              {activeTab === 'songs' ? playlist.length : biblePlaylist.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {(activeTab === 'songs' ? playlist : biblePlaylist).length === 0 ? (
              <div className="p-6 text-center text-white/15 text-xs">
                Duplo-clique ou clique no <Plus className="inline w-3 h-3 text-slate-400" /> para adicionar {activeTab === 'songs' ? 'louvores' : 'versículos'}.
              </div>
            ) : (
              (activeTab === 'songs' ? playlist : biblePlaylist).map((item, idx) => (
                <div 
                  key={item.title + '-' + idx}
                  draggable
                  onDragStart={(e) => { 
                    setDragIdx(idx);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(idx));
                  }}
                  onDragOver={(e) => { 
                    e.preventDefault(); 
                    e.dataTransfer.dropEffect = "move";
                    setOverIdx(idx); 
                  }}
                  onDragEnd={() => {
                    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
                      if (activeTab === 'songs') {
                        moveSongInPlaylist(dragIdx, overIdx);
                      } else {
                        moveSongInBiblePlaylist(dragIdx, overIdx);
                      }
                    }
                    setDragIdx(null);
                    setOverIdx(null);
                  }}
                  onClick={() => {
                    setSelectedSong(item);
                    setActiveSlideIndex(0);
                  }}
                  className={`w-full px-1 py-1.5 mb-0.5 rounded-lg transition-all duration-100 text-[13px] flex items-center group cursor-grab active:cursor-grabbing select-none border ${
                    dragIdx === idx ? "opacity-40 border-slate-500/50 bg-slate-500/10 scale-95" :
                    overIdx === idx && dragIdx !== null && dragIdx !== idx ? "border-slate-400/40 bg-slate-500/10 scale-[1.02]" :
                    selectedSong?.title === item.title ? "border-slate-500/40 bg-slate-500/20" : 
                    "border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="p-1 text-white/15 group-hover:text-white/30 flex-shrink-0">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-white/25 text-[10px] font-mono w-6 text-right shrink-0">{idx + 1}.</span>
                  <span className={`flex-1 truncate font-medium ml-2 ${
                    selectedSong?.title === item.title ? "text-slate-200" : "text-white/60"
                  }`}>
                    {item.title}
                  </span>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (activeTab === 'songs') removeFromPlaylist(idx); 
                      else removeFromBiblePlaylist(idx);
                    }} 
                    className="p-1 rounded-md text-white/15 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      {activeTab !== 'editor' && (
      <div className="flex-1 flex flex-col h-screen" style={{ backgroundColor: '#0f172a' }}>
        
        {/* Top Bar */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 glass" style={{ backgroundColor: 'rgba(15,23,42,0.8)' }}>
          <div className="flex items-center gap-3 text-white/50">
            <Monitor className="w-4 h-4" />
            <span className="text-[13px] font-medium">Projetar em:</span>
            <select
              className="border border-white/10 rounded-lg py-1.5 px-3 text-[13px] outline-none focus:border-slate-500/50 text-white/80"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              value={selectedMonitor}
              onChange={(e) => setSelectedMonitor(e.target.value)}
            >
              {monitors.length > 0 ? (
                monitors.map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))
              ) : (
                <option value="">Carregando monitores...</option>
              )}
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            {isProjecting && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20" style={{ backgroundColor: 'rgba(16,185,129,0.08)' }}>
                <span className="w-2 h-2 bg-emerald-400 rounded-full live-dot"></span>
                <span className="text-emerald-400 text-[11px] font-semibold uppercase tracking-wide">Ao Vivo</span>
              </div>
            )}
            
            {!isProjecting ? (
              <button 
                className="text-white px-5 py-1.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-lg"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                onClick={handleStartProjection}
                disabled={!selectedSong}
              >
                <Play className="w-4 h-4" /> Projetar
              </button>
            ) : (
              <button 
                className="text-white px-5 py-1.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                onClick={handleStopProjection}
              >
                <Square className="w-3.5 h-3.5" /> Parar
              </button>
            )}
          </div>
        </div>

        {selectedSong ? (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Seção de Estrofes */}
            <div className="flex-1 overflow-y-auto p-6 border-r border-white/5 bg-slate-900/50">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white/90">{selectedSong.title}</h2>
                  <p className="text-[11px] text-white/25 mt-0.5">{slides.length} estrofes</p>
                </div>
                {isProjecting && (
                  <span className="text-[11px] text-white/30 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    Setas <ChevronLeft className="w-3 h-3 text-slate-400"/> <ChevronRight className="w-3 h-3 text-slate-400"/> para navegar
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-2.5">
                {slides.map((slideHTML, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectSlide(index)}
                    className={`
                      group relative p-4 rounded-xl border cursor-pointer transition-all duration-200 
                      ${
                        activeSlideIndex === index
                          ? isProjecting 
                            ? "border-emerald-500/30 bg-emerald-500/5 glow-green"
                            : "border-slate-500/50 bg-slate-500/10 glow-brand"
                          : "border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                      }
                    `}
                    style={activeSlideIndex !== index ? { backgroundColor: 'rgba(255,255,255,0.02)' } : {}}
                  >
                    {/* Indicador de cena ativa */}
                    <div className={`
                      absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center transition-all
                      ${activeSlideIndex === index && isProjecting 
                        ? "bg-emerald-500 text-white opacity-100 shadow-md" 
                        : activeSlideIndex === index 
                          ? "bg-slate-500 text-white opacity-100" 
                          : "bg-white/5 text-white/20 opacity-0 group-hover:opacity-100"}
                    `}>
                      <Play className="w-3 h-3 ml-0.5" />
                    </div>
                    
                    <div 
                      className="text-[14px] text-white/70 leading-relaxed font-medium pr-8 text-left"
                      dangerouslySetInnerHTML={{ __html: slideHTML }} 
                    />
                    
                    <div className="mt-3 text-[10px] font-mono text-white/15 uppercase tracking-wider">
                      Estrofe {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Preview */}
            <div className="w-[340px] flex flex-col p-4 shrink-0" style={{ backgroundColor: '#0f172a' }}>
              <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5" />
                {isProjecting ? (
                  <span className="text-emerald-400">● AO VIVO</span>
                ) : (
                  <span className="text-white/30">Preview</span>
                )}
              </h3>
              
              <div className={`w-full aspect-video rounded-xl border relative overflow-hidden flex items-center justify-center shadow-md shadow-black/20 ${
                isProjecting 
                  ? "border-emerald-500/30 glow-green" 
                  : "border-white/10"
              }`} style={{ backgroundColor: '#000' }}>
                <div className="absolute inset-0 flex items-center justify-center p-3">
                  {activeSlideIndex >= 0 && activeSlideIndex < slides.length ? (
                    <div 
                      className="text-white text-[10px] md:text-xs font-bold text-left max-w-full leading-snug tracking-wide projection-shadow"
                      dangerouslySetInnerHTML={{ __html: slides[activeSlideIndex] }} 
                    />
                  ) : (
                    <div className="text-white/10 text-[10px] text-center">Tela Preta</div>
                  )}
                </div>
              </div>

              {/* Info da cena atual */}
              {activeSlideIndex >= 0 && activeSlideIndex < slides.length && (
                <div className="mt-4 flex items-center justify-between text-[11px] text-white/25 px-1">
                  <span>Estrofe {activeSlideIndex + 1} de {slides.length}</span>
                  <span className="font-mono">{Math.round(((activeSlideIndex + 1) / slides.length) * 100)}%</span>
                </div>
              )}

              {/* Progress bar */}
              {slides.length > 0 && (
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((activeSlideIndex + 1) / slides.length) * 100}%`,
                      background: isProjecting 
                        ? 'linear-gradient(90deg, #10b981, #34d399)' 
                        : 'linear-gradient(90deg, #64748b, #94a3b8)'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
              <MonitorDot className="w-10 h-10 text-slate-500/50" />
            </div>
            <p className="text-lg font-semibold text-white/25">Selecione um louvor do culto</p>
            <p className="text-sm mt-1.5 text-white/15">Adicione louvores pela lista à esquerda</p>
          </div>
        )}
      </div>
      )}
      {/* ═══ MODAL DE DUPLICATA ═══ */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" onClick={() => setShowDuplicateModal(false)}>
          <div className="modal-content p-6 rounded-2xl border border-white/10 shadow-2xl max-w-sm w-full mx-4" style={{ backgroundColor: '#1e293b' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-white">Louvor Duplicado</h3>
                <p className="text-[11px] text-white/40">Este louvor já existe na lista</p>
              </div>
            </div>
            <p className="text-[13px] text-white/60 mb-5 leading-relaxed">
              O louvor <span className="font-semibold text-amber-300">"{duplicateTitle}"</span> já está cadastrado na biblioteca.
            </p>
            <button
              onClick={() => setShowDuplicateModal(false)}
              className="w-full py-2 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}
            >
              <X className="w-4 h-4" />
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* ═══ TOAST DE SUCESSO ═══ */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 toast-enter">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 shadow-xl" style={{ backgroundColor: 'rgba(6,78,59,0.9)', backdropFilter: 'blur(12px)' }}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-[13px] font-medium text-emerald-100">{successMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
