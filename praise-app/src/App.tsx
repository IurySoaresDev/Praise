import { useEffect, useState, useCallback, useMemo } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useStore, ALLOWED_COLLECTIONS } from "./store";
import { Play, Square, Settings, X, Plus, Trash2, CheckCircle2, FilePenLine, GripVertical, AlertTriangle, ListMusic, BookOpen, Monitor, Send, Image as ImageIcon, Search, ArrowLeft, Loader2, MonitorDot, Snowflake, RotateCw, DownloadCloud, Minus, Music, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
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
    updateSong,
    activeTab,
    setActiveTab,
    songBackground,
    songBodyBackground,
    bibleBackground,
    setSongBackground,
    setSongBodyBackground,
    setBibleBackground,
    songTitleColor,
    songLyricsColor,
    bibleTitleColor,
    bibleLyricsColor,
    setSongTitleColor,
    setSongLyricsColor,
    setBibleTitleColor,
    setBibleLyricsColor,
  } = useStore();

  const [monitors, setMonitors] = useState<string[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<string>("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [isProjecting, setIsProjecting] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ downloaded: number, total: number } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Bible State
  // REMOVIDO: const [activeTab, setActiveTab] = useState<'songs' | 'bible' | 'editor'>('songs');
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
  const [editingSongTitle, setEditingSongTitle] = useState<string | null>(null);
  const [searchEditQuery, setSearchEditQuery] = useState('');
  const [selectedEditCategory, setSelectedEditCategory] = useState("Todas");

  useEffect(() => {
    setIsLoadingBible(true);
    const loadBible = async () => {
      let mod;
      switch (bibleVersion) {
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
          // Remove a referência original do versículo do corpo do texto (pois agora ela vai para o título da janela)
          if (/^\[(.*?)\]$/.test(formatted)) {
            return '';
          }

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

  const sendSlideToProjection = useCallback(async (content: string, background?: string | null, itemType: string = "song", title: string = "", titleColor?: string, lyricsColor?: string) => {
    if (isFrozen) return;
    try {
      await invoke("project_slide", {
        monitor: selectedMonitor,
        title: title,
        content: content,
        background: background || null,
        itemType: itemType,
        titleColor: titleColor,
        lyricsColor: lyricsColor
      });
    } catch (e) {
      console.error("Erro ao projetar:", e);
    }
  }, [selectedMonitor, isFrozen]);

  const getSlideTitle = useCallback((index: number) => {
    if (!selectedSong) return '';
    const isBible = selectedSong.collection === 'Bíblia';
    if (isBible) {
      // Extrai a referência do versículo (ex: [Gênesis 1:1]) do texto original
      const rawSlide = selectedSong.content.split('\n\n')[index] || '';
      const match = rawSlide.match(/^\[(.*?)\]/);
      return match ? match[1] : selectedSong.title;
    }
    // Para louvores, o título só aparece no primeiro slide
    return index === 0 ? selectedSong.title : '';
  }, [selectedSong]);

  const handleSelectSlide = useCallback((index: number) => {
    setActiveSlideIndex(index);
    if (isProjecting && slides[index] !== undefined) {
      const isBible = selectedSong?.collection === 'Bíblia';
      sendSlideToProjection(
        slides[index],
        isBible ? bibleBackground : (index === 0 ? songBackground : songBodyBackground),
        isBible ? 'bible' : 'song',
        getSlideTitle(index),
        isBible ? bibleTitleColor : songTitleColor,
        isBible ? bibleLyricsColor : songLyricsColor
      );
    }
  }, [isProjecting, slides, setActiveSlideIndex, sendSlideToProjection, selectedSong, bibleBackground, songBackground, songBodyBackground, getSlideTitle, songTitleColor, songLyricsColor, bibleTitleColor, bibleLyricsColor]);

  const handleStartProjection = useCallback(async () => {
    if (!selectedSong || slides.length === 0) return;
    setIsProjecting(true);
    const idx = activeSlideIndex >= 0 ? activeSlideIndex : 0;
    setActiveSlideIndex(idx);
    const isBible = selectedSong?.collection === 'Bíblia';
    if (slides[idx] !== undefined) {
      await sendSlideToProjection(
        slides[idx],
        isBible ? bibleBackground : (idx === 0 ? songBackground : songBodyBackground),
        isBible ? 'bible' : 'song',
        getSlideTitle(idx),
        isBible ? bibleTitleColor : songTitleColor,
        isBible ? bibleLyricsColor : songLyricsColor
      );
    }
  }, [selectedSong, slides, activeSlideIndex, setActiveSlideIndex, sendSlideToProjection, bibleBackground, songBackground, songBodyBackground, getSlideTitle, songTitleColor, songLyricsColor, bibleTitleColor, bibleLyricsColor]);

  const handleStopProjection = useCallback(async () => {
    setIsProjecting(false);
    try {
      await invoke("close_projection");
    } catch (e) {
      console.error("Erro ao fechar projeção:", e);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSong || !isProjecting) return;
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (activeSlideIndex < slides.length - 1) {
          const newIdx = activeSlideIndex + 1;
          setActiveSlideIndex(newIdx);
          const isBible = selectedSong?.collection === 'Bíblia';
          sendSlideToProjection(
            slides[newIdx],
            isBible ? bibleBackground : (newIdx === 0 ? songBackground : songBodyBackground),
            isBible ? 'bible' : 'song',
            getSlideTitle(newIdx),
            isBible ? bibleTitleColor : songTitleColor,
            isBible ? bibleLyricsColor : songLyricsColor
          );
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (activeSlideIndex > 0) {
          const newIdx = activeSlideIndex - 1;
          setActiveSlideIndex(newIdx);
          const isBible = selectedSong?.collection === 'Bíblia';
          sendSlideToProjection(
            slides[newIdx],
            isBible ? bibleBackground : (newIdx === 0 ? songBackground : songBodyBackground),
            isBible ? 'bible' : 'song',
            getSlideTitle(newIdx),
            isBible ? bibleTitleColor : songTitleColor,
            isBible ? bibleLyricsColor : songLyricsColor
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSlideIndex, slides, selectedSong, isProjecting, setActiveSlideIndex, sendSlideToProjection, bibleBackground, songBackground, songBodyBackground, getSlideTitle, songTitleColor, songLyricsColor, bibleTitleColor, bibleLyricsColor]);

  // Sincroniza cores em tempo real se o usuário mudar enquanto projeta
  useEffect(() => {
    if (isProjecting && activeSlideIndex >= 0 && slides[activeSlideIndex]) {
      const isBible = selectedSong?.collection === 'Bíblia';
      sendSlideToProjection(
        slides[activeSlideIndex],
        isBible ? bibleBackground : (activeSlideIndex === 0 ? songBackground : songBodyBackground),
        isBible ? 'bible' : 'song',
        getSlideTitle(activeSlideIndex),
        isBible ? bibleTitleColor : songTitleColor,
        isBible ? bibleLyricsColor : songLyricsColor
      );
    }
  }, [songTitleColor, songLyricsColor, bibleTitleColor, bibleLyricsColor, isProjecting, activeSlideIndex, slides, selectedSong, sendSlideToProjection, bibleBackground, songBackground, songBodyBackground, getSlideTitle]);

  const appWindow = useMemo(() => getCurrentWindow(), []);

  return (
    <div className="flex flex-col h-screen overflow-hidden font-['Inter',system-ui,sans-serif]" style={{ backgroundColor: '#0f172a', color: 'rgba(255,255,255,0.9)' }}>

      {/* ═══ CUSTOM TITLE BAR ═══ */}
      <div
        data-tauri-drag-region
        onMouseDown={(e) => {
          // Apenas se for o botão esquerdo e não estiver clicando nos botões de controle
          if (e.buttons === 1) {
            appWindow.startDragging();
          }
        }}
        className="h-8 flex items-center justify-between px-4 select-none shrink-0 cursor-default"
        style={{ backgroundColor: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <MonitorDot className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Praise</span>
        </div>

        <div className="flex items-center h-full">
          <button
            onClick={() => {
              console.log("Minimizing...");
              appWindow.minimize();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="h-8 w-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              console.log("Closing...");
              appWindow.close();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="h-8 w-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-500/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ═══ SYSTEM NAV (Thick Left Rail) ═══ */}
        <div className="w-[72px] flex flex-col items-center py-4 border-r border-white/5 z-20 shrink-0" style={{ backgroundColor: '#0f172a' }}>


          <div className="flex flex-col gap-2 w-full px-2">
            <button
              onClick={() => setActiveTab('songs')}
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'songs'
                  ? 'bg-blue-500/30 text-white shadow-inner scale-95 border-blue-500/20 glow-brand'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
            >
              <Music className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Louvor</span>
            </button>

            <button
              onClick={() => setActiveTab('bible')}
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'bible'
                  ? 'bg-blue-500/30 text-white shadow-inner scale-95 glow-brand'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Bíblia</span>
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'editor'
                  ? 'bg-blue-500/30 text-white shadow-inner scale-95 glow-brand'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
            >
              <FilePenLine className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Editar</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'settings'
                  ? 'bg-blue-500/30 text-white shadow-inner scale-95 glow-brand'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Opções</span>
            </button>
          </div>
        </div>

        {/* ═══ EDITOR FULL-WIDTH ═══ */}
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
            <div className="flex-1 flex h-full overflow-hidden min-w-0" style={{ backgroundColor: '#0f172a' }}>
              {/* Sidebar de Seleção para Edição */}
              <div className="w-[300px] flex flex-col border-r border-white/5 bg-[#1e293b]/30 h-full min-h-0 overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-slate-900/20">
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
                      className="w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border border-white/5 transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/10 placeholder:text-white/20 bg-white/5"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      autoFocus
                      value={searchEditQuery}
                      onChange={(e) => setSearchEditQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-1 overflow-x-auto mt-3 pb-1 no-scrollbar">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedEditCategory(cat)}
                        className={`whitespace-nowrap px-2 py-1 text-[10px] font-bold rounded-lg transition-all flex-shrink-0 border ${selectedEditCategory === cat
                            ? "text-white border-blue-500/30 bg-blue-500/20 shadow-sm"
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
                      .filter(song => {
                        const matchesSearch = song.title.toLowerCase().includes(searchEditQuery.toLowerCase());
                        const matchesCategory = selectedEditCategory === "Todas" || song.collection === selectedEditCategory;
                        return matchesSearch && matchesCategory;
                      })
                      .sort((a, b) => a.title.localeCompare(b.title));

                    if (filtered.length === 0) {
                      return <div className="text-center py-10 opacity-20 text-[10px]">Nenhum louvor encontrado</div>;
                    }

                    return filtered.map((song, idx) => (
                      <button
                        key={`${song.title}-${song.collection}-${idx}`}
                        onClick={() => {
                          setEditingSongTitle(song.title);
                          setEditorTitle(song.title);
                          setEditorContent(song.content);
                          setEditorCollection(song.collection);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex flex-col gap-0.5 border ${editingSongTitle === song.title
                            ? 'bg-blue-500/20 border-blue-500/30 text-white shadow-sm'
                            : 'border-transparent text-white/40 hover:bg-white/5 hover:text-white/60'
                          }`}
                      >
                        <span className="font-semibold truncate">{song.title}</span>
                        <span className="text-[10px] opacity-50">{song.collection}</span>
                      </button>
                    ));
                  })()}
                </div>

                {editingSongTitle && (
                  <div className="p-3 border-t border-white/5 bg-slate-900/40">
                    <button
                      onClick={() => {
                        setEditingSongTitle(null);
                        setEditorTitle('');
                        setEditorContent('');
                      }}
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
                        {editingSongTitle ? 'Editar Louvor' : 'Adicionar Louvor'}
                      </h2>
                      <p className="text-sm text-white/30 mt-1">
                        {editingSongTitle
                          ? `Editando: ${editingSongTitle}`
                          : 'Adicione um novo louvor à sua biblioteca ou importe um arquivo JSON.'}
                      </p>
                    </div>
                    {editingSongTitle && (
                      <button
                        onClick={() => {
                          setEditingSongTitle(null);
                          setEditorTitle('');
                          setEditorContent('');
                        }}
                        className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white/50 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {!editingSongTitle && (
                    <>
                      <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                        <h3 className="text-[14px] font-semibold text-white/80 flex items-center gap-2 mb-2">
                          <Upload className="w-4 h-4 text-slate-400" />
                          Importar Louvores
                        </h3>
                        <p className="text-[12px] text-white/30 mb-4 leading-relaxed">
                          Selecione um arquivo JSON para importar louvores massa para a biblioteca.
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

                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/5"></div>
                        <span className="text-[11px] text-white/20 font-semibold uppercase tracking-widest">Ou Manualmente</span>
                        <div className="flex-1 h-px bg-white/5"></div>
                      </div>
                    </>
                  )}

                  {/* Formulário */}
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 block">Título</label>
                        <input
                          type="text"
                          placeholder="Ex: O Sangue de Jesus Tem Poder"
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 placeholder:text-white/20 bg-white/5 text-white"
                          value={editorTitle}
                          onChange={(e) => setEditorTitle(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 block">Coleção</label>
                        <div className="flex gap-1.5 h-[46px]">
                          {ALLOWED_COLLECTIONS.map(col => (
                            <button
                              key={col}
                              onClick={() => setEditorCollection(col)}
                              className={`flex-1 text-center px-1 py-1 rounded-xl text-[11px] font-medium border transition-all ${editorCollection === col
                                  ? 'text-white border-blue-500/40 shadow-md'
                                  : 'text-white/50 border-white/5 hover:text-white/80 hover:border-white/10 hover:bg-white/[0.03]'
                                }`}
                              style={editorCollection === col ? { background: 'linear-gradient(135deg, rgba(100,116,139,0.3), rgba(71,85,105,0.2))' } : { backgroundColor: 'rgba(255,255,255,0.02)' }}
                            >
                              {col.replace(" 2018", "")}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 block">Letra do Louvor</label>
                      <textarea
                        placeholder={"Cole a letra aqui...\n\nSepare estrofes com uma linha em branco.\nCada bloco separado será uma cena na projeção."}
                        className="w-full px-4 py-4 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 placeholder:text-white/15 resize-none leading-relaxed text-white"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', minHeight: '400px' }}
                        value={editorContent}
                        onChange={(e) => setEditorContent(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-3">
                      {editingSongTitle && (
                        <button
                          onClick={() => {
                            setEditingSongTitle(null);
                            setEditorTitle('');
                            setEditorContent('');
                          }}
                          className="flex-1 py-3.5 rounded-xl text-[14px] font-semibold text-white/60 bg-white/5 hover:bg-white/10 transition-all"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (!editorTitle.trim() || !editorContent.trim()) return;

                          if (editingSongTitle) {
                            const result = updateSong(editingSongTitle, {
                              title: editorTitle,
                              content: editorContent,
                              collection: editorCollection
                            });
                            if (result.duplicate) {
                              setDuplicateTitle(editorTitle);
                              setShowDuplicateModal(true);
                            } else {
                              setEditingSongTitle(null);
                              setEditorTitle('');
                              setEditorContent('');
                              setSuccessMessage(`"${editorTitle.trim()}" atualizado com sucesso!`);
                              setShowSuccessToast(true);
                              setTimeout(() => setShowSuccessToast(false), 3000);
                            }
                          } else {
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
                          }
                        }}
                        disabled={!editorTitle.trim() || !editorContent.trim()}
                        className="flex-[2] py-3.5 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
                        style={{ background: editingSongTitle ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #10b981, #059669)' }}
                      >
                        {editingSongTitle ? <FilePenLine className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                        {editingSongTitle ? 'Salvar Alterações' : 'Adicionar Louvor'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {activeTab === 'settings' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/20">
            <div className="p-8 max-w-4xl mx-auto w-full overflow-y-auto">
              <header className="mb-12 animate-fade-in text-center md:text-left">
                <h2 className="text-4xl font-black text-white tracking-tight">
                  Configurações
                </h2>
                <p className="text-slate-500 mt-2 text-lg font-medium">Personalize os fundos da sua projeção.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-[#1e293b]/40 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl hover:border-blue-500/20 transition-all group">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">
                      Fundo de Título
                    </h3>
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">Resolução: 1080p</p>
                  </div>

                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 mb-6 group relative shadow-2xl">
                    <img
                      src={songBackground.startsWith('/backgrounds/') ? songBackground : convertFileSrc(songBackground)}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      alt="Song Background Preview"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      const path = await open({
                        multiple: false,
                        filters: [{ name: 'Imagens', extensions: ['jpg', 'png', 'jpeg', 'webp'] }],
                      });
                      if (path) {
                        setSongBackground(path as string);
                        setSuccessMessage("Fundo de título atualizado!");
                        setShowSuccessToast(true);
                        setTimeout(() => setShowSuccessToast(false), 3000);
                      }
                    }}
                    className="w-full py-4 rounded-xl bg-white/[0.03] hover:bg-blue-500/10 text-white font-bold text-[13px] tracking-wide transition-all border border-white/5 hover:border-blue-500/20 shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 mb-3"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Alterar Imagem
                  </button>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-xs font-semibold text-white/60">Cor do Título</span>
                    <input
                      type="color"
                      value={songTitleColor}
                      onChange={(e) => setSongTitleColor(e.target.value)}
                      className="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer bg-transparent"
                    />
                  </div>
                </div>

                <div className="bg-[#1e293b]/40 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl hover:border-blue-500/20 transition-all group">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">
                      Fundo de Louvor
                    </h3>
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">Resolução: 1080p</p>
                  </div>

                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 mb-6 group relative shadow-2xl">
                    <img
                      src={songBodyBackground.startsWith('/backgrounds/') ? songBodyBackground : convertFileSrc(songBodyBackground)}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      alt="Song Body Background Preview"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      const path = await open({
                        multiple: false,
                        filters: [{ name: 'Imagens', extensions: ['jpg', 'png', 'jpeg', 'webp'] }],
                      });
                      if (path) {
                        setSongBodyBackground(path as string);
                        setSuccessMessage("Fundo de louvor atualizado!");
                        setShowSuccessToast(true);
                        setTimeout(() => setShowSuccessToast(false), 3000);
                      }
                    }}
                    className="w-full py-4 rounded-xl bg-white/[0.03] hover:bg-blue-500/10 text-white font-bold text-[13px] tracking-wide transition-all border border-white/5 hover:border-blue-500/20 shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 mb-3"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Alterar Imagem
                  </button>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-xs font-semibold text-white/60">Cor da Letra</span>
                    <input
                      type="color"
                      value={songLyricsColor}
                      onChange={(e) => setSongLyricsColor(e.target.value)}
                      className="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer bg-transparent"
                    />
                  </div>
                </div>

                <div className="bg-[#1e293b]/40 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl hover:border-blue-500/20 transition-all group">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">
                      Fundo de Bíblia
                    </h3>
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">Resolução: 1080p</p>
                  </div>

                  <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 mb-6 group relative shadow-2xl">
                    <img
                      src={bibleBackground.startsWith('/backgrounds/') ? bibleBackground : convertFileSrc(bibleBackground)}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      alt="Bible Background Preview"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      const path = await open({
                        multiple: false,
                        filters: [{ name: 'Imagens', extensions: ['jpg', 'png', 'jpeg', 'webp'] }],
                      });
                      if (path) {
                        setBibleBackground(path as string);
                        setSuccessMessage("Fundo de bíblia atualizado!");
                        setShowSuccessToast(true);
                        setTimeout(() => setShowSuccessToast(false), 3000);
                      }
                    }}
                    className="w-full py-4 rounded-xl bg-white/[0.03] hover:bg-blue-500/10 text-white font-bold text-[13px] tracking-wide transition-all border border-white/5 hover:border-blue-500/20 shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 mb-3"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Alterar Imagem
                  </button>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                      <span className="text-xs font-semibold text-white/60">Cor do Título</span>
                      <input
                        type="color"
                        value={bibleTitleColor}
                        onChange={(e) => setBibleTitleColor(e.target.value)}
                        className="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                      <span className="text-xs font-semibold text-white/60">Cor do Versículo</span>
                      <input
                        type="color"
                        value={bibleLyricsColor}
                        onChange={(e) => setBibleLyricsColor(e.target.value)}
                        className="w-8 h-8 rounded-lg overflow-hidden border-none cursor-pointer bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Updater Card */}
                <div className="bg-[#1e293b]/40 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl hover:border-blue-500/20 transition-all group col-span-1 md:col-span-2 lg:col-span-3">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-white mb-1.5 tracking-tight flex items-center gap-2">
                      <DownloadCloud className="w-5 h-5 text-blue-400" /> Atualizações do Sistema
                    </h3>
                    <p className="text-sm text-blue-400 font-medium">Verifique e instale novas versões do Praise automaticamente.</p>
                  </div>

                  <div className="bg-black/20 rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1 w-full">
                      {downloadProgress ? (
                        <div>
                          <div className="flex justify-between text-xs text-white/60 mb-2 font-medium">
                            <span>Baixando atualização...</span>
                            <span>{Math.round((downloadProgress.downloaded / downloadProgress.total) * 100)}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden bg-white/5">
                            <div
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${(downloadProgress.downloaded / downloadProgress.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[13px] text-white/50 leading-relaxed">
                          Mantenha seu aplicativo sempre na versão mais recente para receber novos recursos e correções de estabilidade.
                        </p>
                      )}
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          setIsCheckingUpdate(true);
                          const update = await check();
                          if (update) {
                            let downloaded = 0;
                            let contentLength = 0;
                            await update.downloadAndInstall((event) => {
                              switch (event.event) {
                                case 'Started':
                                  contentLength = event.data.contentLength || 0;
                                  setDownloadProgress({ downloaded: 0, total: contentLength });
                                  break;
                                case 'Progress':
                                  downloaded += event.data.chunkLength;
                                  setDownloadProgress({ downloaded, total: contentLength });
                                  break;
                                case 'Finished':
                                  setDownloadProgress(null);
                                  break;
                              }
                            });
                            setSuccessMessage("Atualização instalada. Reiniciando...");
                            setShowSuccessToast(true);
                            setTimeout(async () => {
                              await relaunch();
                            }, 2000);
                          } else {
                            setSuccessMessage("O Praise já está na versão mais recente!");
                            setShowSuccessToast(true);
                            setTimeout(() => setShowSuccessToast(false), 3000);
                          }
                        } catch (e) {
                          console.error("Erro ao atualizar", e);
                          setSuccessMessage("Erro ao buscar atualizações.");
                          setShowSuccessToast(true);
                          setTimeout(() => setShowSuccessToast(false), 3000);
                        } finally {
                          setIsCheckingUpdate(false);
                        }
                      }}
                      disabled={isCheckingUpdate || downloadProgress !== null}
                      className="w-full md:w-auto px-6 py-3 rounded-xl bg-white/[0.05] hover:bg-blue-500/10 text-white font-bold text-[13px] tracking-wide transition-all border border-white/5 hover:border-blue-500/20 shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {isCheckingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                      {isCheckingUpdate ? 'Verificando...' : downloadProgress ? 'Baixando...' : 'Verificar Atualização'}
                    </button>
                  </div>
                </div>
              </div>


            </div>
          </div>
        )}

        {/* ═══ SIDEBAR ═══ */}
        {activeTab !== 'editor' && activeTab !== 'settings' && (
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
                      className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 placeholder:text-white/25"
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
                        className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all flex-shrink-0 ${selectedCategory === cat
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
                        className="p-1 rounded-md text-white/20 hover:text-blue-300 hover:bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
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
                        className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all flex-shrink-0 ${bibleVersion === version
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
                              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 placeholder:text-white/25"
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
                              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 placeholder:text-white/25"
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
                                  className={`aspect-square flex items-center justify-center rounded-lg text-[13px] font-medium text-white/70 hover:text-white hover:bg-blue-500/20 hover:border-blue-500/30 border border-transparent transition-all ${
                                    selectedChapter === chapNumber ? "bg-blue-500/20 text-blue-400 border-blue-500/30 glow-brand shadow-inner" : ""
                                  }`}
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
                                className={`w-full text-left p-2 rounded-lg flex gap-2 group cursor-pointer transition-all border ${isVerseActive ? "border-blue-500/40 bg-blue-500/20" : "border-transparent hover:bg-white/5"
                                  }`}
                              >
                                <span className="text-blue-400 font-bold text-[10px] pt-[3px] shrink-0 w-4 text-right">{verse.number}</span>
                                <p className="flex-1 text-[13px] text-white/70 group-hover:text-white/90 leading-relaxed">
                                  {verse.text}
                                </p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); addToBiblePlaylist(singleVerseSong); }}
                                  className="p-1.5 h-7 w-7 flex items-center justify-center rounded-md text-white/20 hover:text-blue-300 hover:bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
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
                {activeTab === 'songs' ? <ListMusic className="w-4 h-4 text-blue-400" /> : <BookOpen className="w-4 h-4 text-blue-400" />}
                <span className="text-[13px] font-semibold text-white/70 flex-1">
                  {activeTab === 'songs' ? 'Louvores do Culto' : 'Textos Bíblicos'}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-blue-300" style={{ backgroundColor: 'rgba(59,130,246,0.2)' }}>
                  {activeTab === 'songs' ? playlist.length : biblePlaylist.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {(activeTab === 'songs' ? playlist : biblePlaylist).length === 0 ? (
                  <div className="p-6 text-center text-white/15 text-xs">
                    Duplo-clique ou clique no <Plus className="inline w-3 h-3 text-blue-400" /> para adicionar {activeTab === 'songs' ? 'louvores' : 'versículos'}.
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
                      className={`w-full px-1 py-1.5 mb-0.5 rounded-lg transition-all duration-100 text-[13px] flex items-center group cursor-grab active:cursor-grabbing select-none border ${dragIdx === idx ? "opacity-40 border-blue-500/50 bg-blue-500/10 scale-95" :
                          overIdx === idx && dragIdx !== null && dragIdx !== idx ? "border-blue-400/40 bg-blue-500/10 scale-[1.02]" :
                            selectedSong?.title === item.title ? "border-blue-500/40 bg-blue-500/20" :
                              "border-transparent hover:bg-white/5"
                        }`}
                    >
                      <div className="p-1 text-white/15 group-hover:text-white/30 flex-shrink-0">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-white/25 text-[10px] font-mono w-6 text-right shrink-0">{idx + 1}.</span>
                      <span className={`flex-1 truncate font-medium ml-2 ${selectedSong?.title === item.title ? "text-blue-200" : "text-white/60"
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
        {activeTab !== 'editor' && activeTab !== 'settings' && (
          <div className="flex-1 flex flex-col h-screen" style={{ backgroundColor: '#0f172a' }}>

            {/* Top Bar */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 glass" style={{ backgroundColor: 'rgba(15,23,42,0.8)' }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl px-4 py-1.5 transition-all focus-within:border-slate-400/40 hover:bg-white/[0.06] group/monitor shadow-sm">
                  <div className="flex items-center border-r border-white/10 pr-3 mr-2 text-white/40 group-focus-within/monitor:text-slate-400 group-hover/monitor:text-white/60 transition-colors">
                    <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Exibir em</span>
                  </div>
                  <div className="relative flex items-center pr-1">
                    <select
                      className="appearance-none bg-transparent py-0.5 text-[13px] font-semibold text-white/90 outline-none cursor-pointer w-full min-w-[120px]"
                      value={selectedMonitor}
                      onChange={(e) => setSelectedMonitor(e.target.value)}
                    >
                      {monitors.length > 0 ? (
                        monitors.map((m, i) => (
                          <option key={i} value={m} className="bg-slate-900 text-white">{m}</option>
                        ))
                      ) : (
                        <option value="" className="bg-slate-900 text-white">Carregando...</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isProjecting && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20" style={{ backgroundColor: 'rgba(59,130,246,0.08)' }}>
                    <span className="w-2 h-2 bg-blue-400 rounded-full live-dot"></span>
                    <span className="text-blue-400 text-[11px] font-semibold uppercase tracking-wide">Ao Vivo</span>
                  </div>
                )}

                {isProjecting && (
                  <button
                    className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition-all shadow-md ${isFrozen
                        ? 'bg-sky-500 text-white shadow-sky-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    onClick={() => setIsFrozen(!isFrozen)}
                    title={isFrozen ? "Descongelar projeção" : "Congelar slide atual no telão"}
                  >
                    <Snowflake className={`w-4 h-4 ${isFrozen ? 'animate-pulse' : ''}`} />
                    {isFrozen ? 'Congelado' : 'Congelar'}
                  </button>
                )}

                {!isProjecting ? (
                  <button
                    className="text-white px-5 py-1.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                    onClick={handleStartProjection}
                    disabled={!selectedSong}
                  >
                    <Play className="w-4 h-4" /> Projetar
                  </button>
                ) : (
                  <button
                    className="text-white px-5 py-1.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                    onClick={() => {
                      handleStopProjection();
                      setIsFrozen(false);
                    }}
                  >
                    <Square className="w-3.5 h-3.5" /> Parar
                  </button>
                )}
              </div>
            </div>

            {selectedSong ? (
              <div className="flex-1 flex overflow-hidden">

                {/* Seção de Estrofes */}
                <div className="flex-1 overflow-y-auto p-6 border-r border-white/5 bg-blue-900/50">
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h2 className="text-lg font-bold text-white/90">{selectedSong.title}</h2>
                      <p className="text-[11px] text-white/25 mt-0.5">{slides.length} {activeTab === 'bible' ? 'capítulos' : 'estrofes'}</p>
                    </div>
                    {isProjecting && (
                      <span className="text-[11px] text-white/30 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        Setas <ChevronLeft className="w-3 h-3 text-slate-400" /> <ChevronRight className="w-3 h-3 text-slate-400" /> para navegar
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
                      ${activeSlideIndex === index
                            ? isProjecting
                              ? "border-blue-500/30 bg-blue-500/5 glow-brand"
                              : "border-blue-500/50 bg-blue-500/10 glow-brand"
                            : "border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                          }
                    `}
                        style={activeSlideIndex !== index ? { backgroundColor: 'rgba(255,255,255,0.02)' } : {}}
                      >
                        {/* Indicador de cena ativa */}
                        <div className={`
                      absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center transition-all
                      ${activeSlideIndex === index && isProjecting
                            ? "bg-blue-500 text-white opacity-100 shadow-md"
                            : activeSlideIndex === index
                              ? "bg-blue-500 text-white opacity-100"
                              : "bg-white/5 text-white/20 opacity-0 group-hover:opacity-100"}
                    `}>
                          <Play className="w-3 h-3 ml-0.5" />
                        </div>

                        <div
                          className="text-[14px] text-white/70 leading-relaxed font-medium pr-8 text-left"
                          dangerouslySetInnerHTML={{ __html: slideHTML }}
                        />

                        <div className="mt-3 text-[10px] font-mono text-white/15 uppercase tracking-wider">
                          {activeTab === 'bible' ? 'Capítulo' : 'Estrofe'} {index + 1}
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
                      <span className="text-blue-400">● AO VIVO</span>
                    ) : (
                      <span className="text-white/30">Preview</span>
                    )}
                  </h3>

                  <div className={`w-full aspect-video rounded-xl border relative overflow-hidden flex flex-col shadow-md shadow-black/20 ${isProjecting
                      ? "border-blue-500/30 glow-brand"
                      : "border-white/10"
                    }`} style={{ backgroundColor: '#000' }}>
                    {/* Imagem de Fundo do Preview */}
                    {activeSlideIndex >= 0 && activeSlideIndex < slides.length && (
                      <div
                        className="absolute inset-0 z-0"
                        style={{
                          backgroundImage: `url(${selectedSong?.collection === 'Bíblia'
                              ? (bibleBackground.startsWith('/backgrounds/') ? bibleBackground : convertFileSrc(bibleBackground))
                              : (activeSlideIndex === 0
                                ? (songBackground.startsWith('/backgrounds/') ? songBackground : convertFileSrc(songBackground))
                                : (songBodyBackground.startsWith('/backgrounds/') ? songBodyBackground : convertFileSrc(songBodyBackground))
                              )
                            })`,
                          backgroundSize: '100% 100%',
                          backgroundPosition: 'center center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      />
                    )}

                    {/* Overlay escuro simulando o do projetor */}
                    <div className="absolute inset-0 z-[1] bg-black/40" />

                    {/* Camada de Texto do Preview */}
                    <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-2">
                      {activeSlideIndex >= 0 && activeSlideIndex < slides.length ? (
                        <>
                          {/* Mostrar título simulado */}
                          {((selectedSong?.collection !== 'Bíblia' && activeSlideIndex === 0) || (selectedSong?.collection === 'Bíblia')) && (
                            <div className={`absolute left-0 right-0 w-full flex items-center justify-center ${selectedSong?.collection === 'Bíblia' ? 'top-[21%]' : 'top-[5.5%]'
                              }`}>
                              <h4
                                className={`font-bold uppercase tracking-widest text-center drop-shadow-2xl projection-shadow truncate w-full px-2`}
                                style={{
                                  fontSize: '0.4rem',
                                  color: selectedSong?.collection === 'Bíblia' ? bibleTitleColor : songTitleColor
                                }}
                              >
                                {getSlideTitle(activeSlideIndex)}
                              </h4>
                            </div>
                          )}

                          {/* Letra ou Versículo */}
                          <div className="absolute inset-x-2 bottom-2 top-[35%] flex items-center justify-center">
                            <div
                              className={`font-bold w-full leading-snug tracking-wide projection-shadow ${selectedSong?.collection === 'Bíblia'
                                  ? 'text-[0.6rem] italic font-medium text-center'
                                  : 'text-[0.6rem] uppercase text-left'
                                }`}
                              style={{
                                color: selectedSong?.collection === 'Bíblia' ? bibleLyricsColor : songLyricsColor
                              }}
                              dangerouslySetInnerHTML={{ __html: slides[activeSlideIndex] }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="text-white/30 text-[10px] text-center font-medium">Tela Preta</div>
                      )}
                    </div>
                  </div>

                  {/* Info da cena atual */}
                  {activeSlideIndex >= 0 && activeSlideIndex < slides.length && (
                    <div className="mt-4 flex items-center justify-between text-[11px] text-white/25 px-1">
                      <span>{activeTab === 'bible' ? 'Capítulo' : 'Estrofe'} {activeSlideIndex + 1} de {slides.length}</span>
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
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-500/20 shadow-xl" style={{ backgroundColor: 'rgba(23,37,84,0.9)', backdropFilter: 'blur(12px)' }}>
              <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
              <span className="text-[13px] font-medium text-blue-100">{successMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
