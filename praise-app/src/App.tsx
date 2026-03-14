import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useStore, ALLOWED_COLLECTIONS } from "./store";
import { Play, Square, Settings, X, Plus, Trash2, CheckCircle2, FilePenLine, GripVertical, AlertTriangle, ListMusic, BookOpen, Monitor, Send, Search, ArrowLeft, Loader2, MonitorDot, Snowflake, RotateCw, Minus, Music, Upload, ChevronLeft, ChevronRight, Palette, Type, Maximize2, Bold, Image as ImageIcon } from 'lucide-react';
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
    songTitleFont,
    songTitleSize,
    songTitleWeight,
    songLyricsFont,
    songLyricsSize,
    songLyricsWeight,
    bibleTitleFont,
    bibleTitleSize,
    bibleTitleWeight,
    bibleLyricsFont,
    bibleLyricsSize,
    bibleLyricsWeight,
    setSongTitleFont,
    setSongTitleSize,
    setSongTitleWeight,
    setSongLyricsFont,
    setSongLyricsSize,
    setSongLyricsWeight,
    setBibleTitleFont,
    setBibleTitleSize,
    setBibleTitleWeight,
    setBibleLyricsFont,
    setBibleLyricsSize,
    setBibleLyricsWeight,
    projectionMode,
    setProjectionMode,
  } = useStore();

  const [monitors, setMonitors] = useState<string[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<string>("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [isProjecting, setIsProjecting] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ downloaded: number, total: number } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [settingsPreviewTab, setSettingsPreviewTab] = useState<'title' | 'lyrics' | 'bible'>('title');
  const [settingsSubTab, setSettingsSubTab] = useState<'titles' | 'lyrics' | 'bible' | 'system'>('titles');
  const [previewWidth, setPreviewWidth] = useState(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Efeito para observar o redimensionamento do preview e calcular a escala real
  useEffect(() => {
    if (!previewContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setPreviewWidth(entry.contentRect.width);
      }
    });
    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, [activeTab]);

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

  // Formata o conteúdo para o modo legenda: re-divide TODAS as linhas em grupos de 2
  const formatContentSubtitle = (content: string, collection?: string) => {
    const isBible = collection === 'Bíblia';
    const highlightWords = ['CORO', 'REFRÃO', 'BIS', 'INSTRUMENTAL', 'INTRO', 'PONTE', 'FINAL'];

    // 1. Pega TODAS as linhas do louvor (ignorando a separação por estrofes)
    const allLines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0) // Remove linhas vazias
      .map(line => {
        // Remove tags HTML
        let clean = line.replace(/<[^>]+>/g, '');
        let formatted = isBible ? clean : clean.toUpperCase();

        if (isBible) {
          if (/^\[(.*?)\]$/.test(formatted)) return '';
          formatted = formatted.replace(/^(\d+\.)\s/, '');
        }

        // Destaque de palavras-chave
        if (!isBible) {
          highlightWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            if (regex.test(formatted)) {
              formatted = formatted.replace(regex, match => `<span class="text-yellow-400 font-bold italic">${match}</span>`);
            }
          });
        }

        return formatted;
      })
      .filter(line => line.length > 0);

    // 2. Agrupa de 2 em 2 linhas
    const subtitleSlides: string[] = [];
    for (let i = 0; i < allLines.length; i += 2) {
      const pair = allLines.slice(i, i + 2);
      subtitleSlides.push(pair.join('<br />'));
    }

    return subtitleSlides;
  };

  const slides = selectedSong 
    ? (projectionMode === 'subtitle' 
        ? formatContentSubtitle(selectedSong.content, selectedSong.collection)
        : formatContent(selectedSong.content, selectedSong.collection))
    : [];

  const sendSlideToProjection = useCallback(async (
    content: string, 
    background?: string | null, 
    itemType: string = "song", 
    title: string = "", 
    titleColor?: string,
    lyricsColor?: string,
    titleFont?: string,
    titleSize?: number,
    titleWeight?: string,
    lyricsFont?: string,
    lyricsSize?: number,
    lyricsWeight?: string,
    projection_mode?: string
  ) => {
    if (isFrozen) return;
    try {
      await invoke("project_slide", {
        monitor: selectedMonitor,
        title: title,
        content: content,
        background: background || null,
        itemType: itemType,
        titleColor: titleColor,
        lyricsColor: lyricsColor,
        titleFont: titleFont,
        titleSize: titleSize,
        titleWeight: titleWeight,
        lyricsFont: lyricsFont,
        lyricsSize: lyricsSize,
        lyricsWeight: lyricsWeight,
        projectionMode: projection_mode || projectionMode
      });
    } catch (e) {
      console.error("Erro ao projetar:", e);
    }
  }, [selectedMonitor, isFrozen, projectionMode]);

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
        isBible ? bibleLyricsColor : songLyricsColor,
        isBible ? bibleTitleFont : songTitleFont,
        isBible ? bibleTitleSize : songTitleSize,
        isBible ? bibleTitleWeight : songTitleWeight,
        isBible ? bibleLyricsFont : songLyricsFont,
        isBible ? bibleLyricsSize : songLyricsSize,
        isBible ? bibleLyricsWeight : songLyricsWeight,
        projectionMode
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
        isBible ? bibleLyricsColor : songLyricsColor,
        isBible ? bibleTitleFont : songTitleFont,
        isBible ? bibleTitleSize : songTitleSize,
        isBible ? bibleTitleWeight : songTitleWeight,
        isBible ? bibleLyricsFont : songLyricsFont,
        isBible ? bibleLyricsSize : songLyricsSize,
        isBible ? bibleLyricsWeight : songLyricsWeight,
        projectionMode
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
            isBible ? bibleLyricsColor : songLyricsColor,
            isBible ? bibleTitleFont : songTitleFont,
            isBible ? bibleTitleSize : songTitleSize,
            isBible ? bibleTitleWeight : songTitleWeight,
            isBible ? bibleLyricsFont : songLyricsFont,
            isBible ? bibleLyricsSize : songLyricsSize,
            isBible ? bibleLyricsWeight : songLyricsWeight,
            projectionMode
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
            isBible ? bibleLyricsColor : songLyricsColor,
            isBible ? bibleTitleFont : songTitleFont,
            isBible ? bibleTitleSize : songTitleSize,
            isBible ? bibleTitleWeight : songTitleWeight,
            isBible ? bibleLyricsFont : songLyricsFont,
            isBible ? bibleLyricsSize : songLyricsSize,
            isBible ? bibleLyricsWeight : songLyricsWeight,
            projectionMode
          );
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSlideIndex, slides, selectedSong, isProjecting, setActiveSlideIndex, sendSlideToProjection, bibleBackground, songBackground, songBodyBackground, getSlideTitle, songTitleColor, songLyricsColor, bibleTitleColor, bibleLyricsColor, songTitleFont, songTitleSize, songTitleWeight, songLyricsFont, songLyricsSize, songLyricsWeight, bibleTitleFont, bibleTitleSize, bibleTitleWeight, bibleLyricsFont, bibleLyricsSize, bibleLyricsWeight]);

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
        isBible ? bibleLyricsColor : songLyricsColor,
        isBible ? bibleTitleFont : songTitleFont,
        isBible ? bibleTitleSize : songTitleSize,
        isBible ? bibleTitleWeight : songTitleWeight,
        isBible ? bibleLyricsFont : songLyricsFont,
        isBible ? bibleLyricsSize : songLyricsSize,
        isBible ? bibleLyricsWeight : songLyricsWeight,
        projectionMode
      );
    }
  }, [songTitleColor, songLyricsColor, bibleTitleColor, bibleLyricsColor, songTitleFont, songTitleSize, songTitleWeight, songLyricsFont, songLyricsSize, songLyricsWeight, bibleTitleFont, bibleTitleSize, bibleTitleWeight, bibleLyricsFont, bibleLyricsSize, bibleLyricsWeight, isProjecting, activeSlideIndex, slides, selectedSong, sendSlideToProjection, bibleBackground, songBackground, songBodyBackground, getSlideTitle, projectionMode]);

  const appWindow = useMemo(() => getCurrentWindow(), []);

  return (
    <div className="flex flex-col h-screen overflow-hidden font-['Inter',system-ui,sans-serif]" style={{ backgroundColor: '#0a0d14', color: 'rgba(255,255,255,0.9)' }}>

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
        style={{ backgroundColor: '#0f1219', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
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
        <div className="w-[72px] flex flex-col items-center py-4 border-r border-white/5 z-20 shrink-0" style={{ backgroundColor: '#0f1219' }}>


          <div className="flex flex-col gap-2 w-full px-2">
            <button
              onClick={() => setActiveTab('songs')}
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'songs'
                  ? 'bg-brand-500/30 text-white shadow-inner scale-95 border-brand-500/20 glow-brand'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
            >
              <Music className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Louvor</span>
            </button>

            <button
              onClick={() => setActiveTab('bible')}
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'bible'
                  ? 'bg-brand-500/30 text-white shadow-inner scale-95 glow-brand'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Bíblia</span>
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'editor'
                  ? 'bg-brand-500/30 text-white shadow-inner scale-95 glow-brand'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
            >
              <FilePenLine className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Editar</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${activeTab === 'settings'
                  ? 'bg-brand-500/30 text-white shadow-inner scale-95 glow-brand'
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
          <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#0f1219' }}>
            <div className="flex-1 flex h-full overflow-hidden min-w-0" style={{ backgroundColor: '#0f1219' }}>
              {/* Sidebar de Seleção para Edição */}
              <div className="w-[300px] flex flex-col border-r border-white/5 bg-[#1c2333]/40 h-full min-h-0 overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-[#151a26]/20">
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
                      className="w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none border border-white/5 transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/10 placeholder:text-white/20 bg-white/5"
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
                            ? 'bg-brand-500/20 border-brand-500/30 text-white shadow-sm'
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
                  <div className="p-3 border-t border-white/5 bg-[#151a26]/40">
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
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 placeholder:text-white/20 bg-white/5 text-white"
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
                                  ? 'text-white border-brand-500/40 shadow-md'
                                  : 'text-white/50 border-white/5 hover:text-white/80 hover:border-white/10 hover:bg-white/[0.03]'
                                }`}
                              style={editorCollection === col ? { background: 'linear-gradient(135deg, #3b82f6, #2563eb)' } : { backgroundColor: 'rgba(255,255,255,0.02)' }}
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
                        className="w-full px-4 py-4 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 placeholder:text-white/15 resize-none leading-relaxed text-white"
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
                        style={{ background: editingSongTitle ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
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

        {/* ═══ SETTINGS DASHBOARD (Widescreen Redesign) ═══ */}
        {activeTab === 'settings' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0f1219]/60 backdrop-blur-3xl">
            
            {/* ═══ HEADER DO DASHBOARD ═══ */}
            <header className="px-8 py-6 border-b border-white/5 bg-[#151a26]/40 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  Painel de Configurações
                </h2>
                <p className="text-slate-400 text-xs font-medium mt-1">Gerencie a identidade visual da sua projeção em tempo real.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[10px] font-bold text-brand-400 uppercase tracking-widest animate-pulse">
                  Modo Edição Ativo
                </span>
              </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
              
              {/* ═══ 1. SIDEBAR DE NAVEGAÇÃO INTERNA ═══ */}
              <aside className="w-20 lg:w-64 border-r border-white/5 bg-[#151a26]/20 flex flex-col p-4 gap-2 overflow-y-auto">
                {[
                  { id: 'titles', label: 'Títulos', icon: ImageIcon, desc: 'Abertura de músicas' },
                  { id: 'lyrics', label: 'Louvores', icon: Music, desc: 'Letras e refrãos' },
                  { id: 'bible', label: 'Bíblia', icon: BookOpen, desc: 'Escrituras sagradas' },
                  { id: 'system', label: 'Sistema', icon: RotateCw, desc: 'Atualizações e core' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSettingsSubTab(item.id as any);
                      // Sincroniza a aba do preview se for relevante
                      if (item.id === 'titles') setSettingsPreviewTab('title');
                      if (item.id === 'lyrics') setSettingsPreviewTab('lyrics');
                      if (item.id === 'bible') setSettingsPreviewTab('bible');
                    }}
                    className={`w-full group flex items-center gap-4 p-4 rounded-2xl transition-all border ${
                      settingsSubTab === item.id 
                        ? 'bg-brand-500 border-brand-400/50 shadow-lg shadow-brand-500/20' 
                        : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:border-white/5'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-colors ${settingsSubTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                    <div className="hidden lg:flex flex-col items-start text-left">
                      <span className={`text-[13px] font-bold ${settingsSubTab === item.id ? 'text-white' : 'text-slate-300'}`}>{item.label}</span>
                      <span className={`text-[10px] ${settingsSubTab === item.id ? 'text-brand-100/60' : 'text-slate-500'}`}>{item.desc}</span>
                    </div>
                  </button>
                ))}
              </aside>

              <div className="flex-1 flex overflow-hidden relative">
                
                {/* ═══ 2. PAINEL DE CONTROLES (CENTRO) ═══ */}
                <main className="w-full lg:w-5/12 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
                  
                  {/* --- SUBTAB: TÍTULOS --- */}
                  {settingsSubTab === 'titles' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
                      <div className="bg-[#1c2333]/40 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                        <div className="mb-8 flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">Fundo de Título</h3>
                            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold italic">Configuração do Slide Inicial</p>
                          </div>
                          <button
                            onClick={async () => {
                              const path = await open({
                                multiple: false,
                                filters: [{ name: 'Imagens', extensions: ['jpg', 'png', 'jpeg', 'webp'] }],
                              });
                              if (path) setSongBackground(path as string);
                            }}
                            className="p-3 rounded-xl bg-brand-600/10 border border-brand-500/20 text-brand-400 hover:bg-brand-600/20 transition-all group"
                            title="Trocar imagem"
                          >
                            <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
                        </div>

                        {/* Controles de Estilo */}
                        <div className="space-y-6">
                          <div className="p-5 rounded-2xl bg-black/20 border border-white/5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Palette className="w-3 h-3 text-pink-400" />
                              Cor do Texto
                            </label>
                            <div className="flex items-center gap-4">
                              <input type="color" value={songTitleColor} onChange={(e) => setSongTitleColor(e.target.value)} className="w-14 h-14 rounded-2xl overflow-hidden cursor-pointer ring-4 ring-white/5 border-none" />
                              <div className="flex-1">
                                <span className="text-xs font-mono text-slate-400">{songTitleColor.toUpperCase()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-5 rounded-2xl bg-black/10 border border-white/5 space-y-6">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                              <Type className="w-3 h-3 text-brand-400" />
                              Tipografia do Título
                            </label>
                            <div className="grid grid-cols-1 gap-5">
                              <div className="space-y-2">
                                <span className="text-[11px] font-bold text-white/30 ml-1 flex items-center gap-1.5">
                                  <Type className="w-3 h-3" />
                                  Família da Fonte
                                </span>
                                <select value={songTitleFont} onChange={(e) => setSongTitleFont(e.target.value)} className="w-full bg-[#151a26] border border-white/5 text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50 transition-all">
                                  {['Inter', 'Montserrat', 'Roboto', 'Oswald', 'Open Sans', 'Lato', 'Serif', 'Sans-Serif'].map(f => (<option key={f} value={f}>{f}</option>))}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold text-white/30 ml-1 flex items-center gap-1.5">
                                    <Maximize2 className="w-3 h-3" />
                                    Tamanho (PX)
                                  </span>
                                  <input type="number" value={songTitleSize} onChange={(e) => setSongTitleSize(Number(e.target.value))} className="w-full bg-[#151a26] border border-white/5 text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50 text-center" />
                                </div>
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold text-white/30 ml-1 flex items-center gap-1.5">
                                    <Bold className="w-3 h-3" />
                                    Peso Visual
                                  </span>
                                  <select value={songTitleWeight} onChange={(e) => setSongTitleWeight(e.target.value)} className="w-full bg-[#151a26] border border-white/5 text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50">
                                    {['normal', 'medium', 'semibold', 'bold', 'black'].map(w => (<option key={w} value={w}>{w}</option>))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- SUBTAB: LOUVORES --- */}
                  {settingsSubTab === 'lyrics' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
                      <div className="bg-[#1c2333]/40 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                        <div className="mb-8 flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">Fundo de Louvor</h3>
                            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold italic">Letras e Refrãos das Músicas</p>
                          </div>
                          <button
                            onClick={async () => {
                              const path = await open({
                                multiple: false,
                                filters: [{ name: 'Imagens', extensions: ['jpg', 'png', 'jpeg', 'webp'] }],
                              });
                              if (path) setSongBodyBackground(path as string);
                            }}
                             className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500/20 transition-all group"
                           >
                             <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                           </button>
                        </div>

                        <div className="space-y-6">
                          <div className="p-5 rounded-2xl bg-black/20 border border-white/5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Cor das Letras</label>
                            <div className="flex items-center gap-4">
                              <input type="color" value={songLyricsColor} onChange={(e) => setSongLyricsColor(e.target.value)} className="w-14 h-14 rounded-2xl overflow-hidden cursor-pointer ring-4 ring-white/5 border-none" />
                              <div className="flex-1">
                                <span className="text-xs font-mono text-slate-400">{songLyricsColor.toUpperCase()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-5 rounded-2xl bg-black/10 border border-white/5 space-y-6">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Tipografia do Louvor</label>
                            <div className="grid grid-cols-1 gap-5">
                              <div className="space-y-2">
                                <span className="text-[11px] font-bold text-white/30 ml-1">Família da Fonte</span>
                                <select value={songLyricsFont} onChange={(e) => setSongLyricsFont(e.target.value)} className="w-full bg-[#151a26] border border-white/5 text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50">
                                  {['Inter', 'Montserrat', 'Roboto', 'Oswald', 'Open Sans', 'Lato', 'Serif', 'Sans-Serif'].map(f => (<option key={f} value={f}>{f}</option>))}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold text-white/30 ml-1">Tamanho (PX)</span>
                                  <input type="number" value={songLyricsSize} onChange={(e) => setSongLyricsSize(Number(e.target.value))} className="w-full bg-[#151a26] border border-white/5 text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50 text-center" />
                                </div>
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold text-white/30 ml-1">Peso Visual</span>
                                  <select value={songLyricsWeight} onChange={(e) => setSongLyricsWeight(e.target.value)} className="w-full bg-[#151a26] border border-white/5 text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50">
                                    {['normal', 'medium', 'semibold', 'bold', 'black'].map(w => (<option key={w} value={w}>{w}</option>))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- SUBTAB: BÍBLIA --- */}
                  {settingsSubTab === 'bible' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
                      <div className="bg-[#1c2333]/40 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                        <div className="mb-8 flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">Fundo da Bíblia</h3>
                            <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold italic">Escrituras e Versículos</p>
                          </div>
                          <button
                            onClick={async () => {
                              const path = await open({
                                multiple: false,
                                filters: [{ name: 'Imagens', extensions: ['jpg', 'png', 'jpeg', 'webp'] }],
                              });
                              if (path) setBibleBackground(path as string);
                            }}
                            className="p-3 rounded-xl bg-brand-600/10 border border-brand-500/20 text-brand-400 hover:bg-brand-600/20 transition-all group"
                          >
                            <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                           {/* Configurações do Título (Referência) */}
                           <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-6">
                             <div className="flex items-center gap-2 mb-2">
                               <div className="w-2 h-2 rounded-full bg-brand-500" />
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referência (Livro/Capítulo)</span>
                             </div>
                             <div className="flex items-center gap-4">
                               <input type="color" value={bibleTitleColor} onChange={(e) => setBibleTitleColor(e.target.value)} className="w-12 h-12 rounded-xl overflow-hidden cursor-pointer ring-2 ring-white/5" />
                               <div className="grid grid-cols-2 gap-3 flex-1">
                                 <select value={bibleTitleFont} onChange={(e) => setBibleTitleFont(e.target.value)} className="bg-[#151a26] border border-white/5 text-white text-[11px] rounded-lg p-2.5 outline-none">
                                   {['Inter', 'Montserrat', 'Roboto', 'Oswald', 'Open Sans', 'Lato'].map(f => (<option key={f} value={f}>{f}</option>))}
                                 </select>
                                 <input type="number" value={bibleTitleSize} onChange={(e) => setBibleTitleSize(Number(e.target.value))} className="bg-[#151a26] border border-white/5 text-white text-[11px] rounded-lg p-2.5 outline-none text-center" />
                               </div>
                             </div>
                             <select value={bibleTitleWeight} onChange={(e) => setBibleTitleWeight(e.target.value)} className="w-full bg-[#151a26] border border-white/5 text-white text-[11px] rounded-lg p-2.5 outline-none">
                               {['normal', 'medium', 'semibold', 'bold', 'black'].map(w => (<option key={w} value={w}>{w}</option>))}
                             </select>
                           </div>

                           {/* Configurações do Texto (Versículo) */}
                           <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-6">
                             <div className="flex items-center gap-2 mb-2">
                               <div className="w-2 h-2 rounded-full bg-brand-500" />
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto do Versículo</span>
                             </div>
                             <div className="flex items-center gap-4">
                               <input type="color" value={bibleLyricsColor} onChange={(e) => setBibleLyricsColor(e.target.value)} className="w-12 h-12 rounded-xl overflow-hidden cursor-pointer ring-2 ring-white/5" />
                               <div className="grid grid-cols-2 gap-3 flex-1">
                                 <select value={bibleLyricsFont} onChange={(e) => setBibleLyricsFont(e.target.value)} className="bg-[#151a26] border border-white/5 text-white text-[11px] rounded-lg p-2.5 outline-none">
                                   {['Inter', 'Montserrat', 'Roboto', 'Oswald', 'Open Sans', 'Lato'].map(f => (<option key={f} value={f}>{f}</option>))}
                                 </select>
                                 <input type="number" value={bibleLyricsSize} onChange={(e) => setBibleLyricsSize(Number(e.target.value))} className="bg-[#151a26] border border-white/5 text-white text-[11px] rounded-lg p-2.5 outline-none text-center" />
                               </div>
                             </div>
                             <select value={bibleLyricsWeight} onChange={(e) => setBibleLyricsWeight(e.target.value)} className="w-full bg-[#151a26] border border-white/5 text-white text-[11px] rounded-lg p-2.5 outline-none">
                               {['normal', 'medium', 'semibold', 'bold', 'black'].map(w => (<option key={w} value={w}>{w}</option>))}
                             </select>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- SUBTAB: SISTEMA --- */}
                  {settingsSubTab === 'system' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
                       <div className="bg-[#1c2333]/40 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                          <div className="mb-6">
                            <h3 className="text-xl font-black text-white mb-1.5 tracking-tight flex items-center gap-2">
                              Atualizações do Praise
                            </h3>
                            <p className="text-sm text-brand-400 font-medium">Mantenha seu sistema na versão mais recente.</p>
                          </div>

                          <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-6">
                            {downloadProgress ? (
                              <div>
                                <div className="flex justify-between text-[11px] text-white/50 mb-2 font-black uppercase tracking-widest">
                                  <span>Progresso do Download</span>
                                  <span>{Math.round((downloadProgress.downloaded / downloadProgress.total) * 100)}%</span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/5">
                                  <div className="h-full bg-brand-500 shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all duration-300" style={{ width: `${(downloadProgress.downloaded / downloadProgress.total) * 100}%` }} />
                                </div>
                              </div>
                            ) : (
                              <p className="text-[13px] text-white/40 leading-relaxed font-medium">Clique no botão abaixo para verificar se existem novas funcionalidades ou correções de estabilidade disponíveis.</p>
                            )}

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
                                        case 'Started': contentLength = event.data.contentLength || 0; setDownloadProgress({ downloaded: 0, total: contentLength }); break;
                                        case 'Progress': downloaded += event.data.chunkLength; setDownloadProgress({ downloaded, total: contentLength }); break;
                                        case 'Finished': setDownloadProgress(null); break;
                                      }
                                    });
                                    setSuccessMessage("Atualização instalada. Reiniciando...");
                                    setShowSuccessToast(true);
                                    setTimeout(async () => { await relaunch(); }, 2000);
                                  } else {
                                    setSuccessMessage("Versão atualizada!");
                                    setShowSuccessToast(true);
                                    setTimeout(() => setShowSuccessToast(false), 3000);
                                  }
                                } catch (e) {
                                  setSuccessMessage("Erro ao buscar atualizações.");
                                  setShowSuccessToast(true);
                                  setTimeout(() => setShowSuccessToast(false), 3000);
                                } finally {
                                  setIsCheckingUpdate(false);
                                }
                              }}
                              disabled={isCheckingUpdate || downloadProgress !== null}
                              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/[0.03] hover:bg-brand-600/10 border border-white/5 hover:border-brand-500/30 text-white font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                            >
                              {isCheckingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                              Verificar Agora
                            </button>
                          </div>
                       </div>
                    </div>
                  )}
                </main>

                {/* ═══ 3. PREVIEW AMPLIADO (DIREITA) ═══ */}
                <div className="hidden lg:flex flex-1 bg-slate-950/40 border-l border-white/5 p-10 flex-col items-center justify-center relative overflow-hidden group">
                  
                  {/* Backdrop Aesthetic */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-brand-500 rounded-full blur-[150px] animate-pulse" />
                    <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-sky-500 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
                  </div>

                  {/* Header do Preview com Tabs Reais */}
                  <div className="absolute top-8 left-10 right-10 flex items-center justify-center z-20">
                    <div className="flex items-center gap-4 p-1.5 bg-black/40 rounded-2xl border border-white/10 backdrop-blur-md">
                      {[
                        { id: 'title', label: 'TÍTULO' },
                        { id: 'lyrics', label: 'LOUVOR' },
                        { id: 'bible', label: 'BÍBLIA' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setSettingsPreviewTab(tab.id as any)}
                          className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all ${
                            settingsPreviewTab === tab.id 
                              ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20' 
                              : 'text-white/30 hover:text-white/60'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                  </div>

                  {/* Container da TV / Telão em Escala Real */}
                  <div 
                    ref={previewContainerRef}
                    className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border-4 border-slate-800/50 relative transform hover:scale-[1.01] transition-transform duration-700"
                  >
                    
                     {/* Background Dinâmico (Sincronizado com Projection.tsx) */}
                     <img
                       src={
                         settingsPreviewTab === 'title' ? (songBackground.startsWith('/backgrounds/') ? songBackground : convertFileSrc(songBackground)) :
                         settingsPreviewTab === 'lyrics' ? (songBodyBackground.startsWith('/backgrounds/') ? songBodyBackground : convertFileSrc(songBodyBackground)) :
                         (bibleBackground.startsWith('/backgrounds/') ? bibleBackground : convertFileSrc(bibleBackground))
                       }
                       className="w-full h-full absolute inset-0 transition-all duration-1000 z-0"
                       style={{ backgroundSize: '100% 100%', objectFit: 'fill' }}
                       alt="True Preview"
                     />

                     {/* Overlay escuro */}
                     <div className="absolute inset-0 z-[1] bg-black/30" />

                    {/* Texto com Cálculo de Escala Real (FontSize * Width / 1920) */}
                    <div className="absolute inset-0 z-10 pointer-events-none select-none">
                      
                      {/* Títulos Absolutos */}
                      {settingsPreviewTab === 'title' && (
                        <div className="absolute left-0 right-0 top-[5.5%] flex items-center justify-center px-[5%]">
                          <h1 style={{ 
                            color: songTitleColor,
                            fontFamily: songTitleFont ? `'${songTitleFont}', sans-serif` : undefined,
                            fontSize: `${(songTitleSize * previewWidth) / 1920}px`,
                            fontWeight: songTitleWeight,
                            textShadow: '0 4px 12px rgba(0,0,0,0.8)',
                            lineHeight: '1.2',
                            textTransform: 'uppercase'
                          }}>
                            GRANDE É O SENHOR
                          </h1>
                        </div>
                      )}

                      {settingsPreviewTab === 'bible' && (
                        <div className="absolute left-0 right-0 top-[5.5%] flex items-center justify-center px-[5%]">
                          <div style={{
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            padding: '1% 2.5%',
                            borderRadius: '0.6rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                            backdropFilter: 'blur(12px)'
                          }}>
                            <h2 style={{ 
                              color: bibleTitleColor,
                              fontFamily: bibleTitleFont ? `'${bibleTitleFont}', sans-serif` : undefined,
                              fontSize: `${(bibleTitleSize * previewWidth) / 1920}px`,
                              fontWeight: bibleTitleWeight,
                              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                            }}>
                              JOÃO 8:32
                            </h2>
                          </div>
                        </div>
                      )}

                      {/* Conteúdo Central */}
                      <div className={`absolute inset-0 flex items-center justify-center px-[8%] ${
                        settingsPreviewTab === 'bible' ? 'pt-[12%] pb-[5%]' : 'pt-[12%] pb-[8%]'
                      }`}>
                        {settingsPreviewTab === 'lyrics' && (
                          <div className="w-full">
                            <p style={{ 
                              color: songLyricsColor,
                              fontFamily: songLyricsFont ? `'${songLyricsFont}', sans-serif` : undefined,
                              fontSize: `${(songLyricsSize * previewWidth) / 1920}px`,
                              fontWeight: songLyricsWeight,
                              textShadow: '0 4px 12px rgba(0,0,0,0.8)',
                              lineHeight: '1.3',
                              whiteSpace: 'pre-line',
                              textAlign: 'left',
                              textTransform: 'uppercase'
                            }}>
                              {"Vim para adorar-Te\nVim para prostrar-me\nVim para dizer que és\nmeu Deus!"}
                            </p>
                          </div>
                        )}

                        {settingsPreviewTab === 'bible' && (
                          <div className="w-full">
                            <p style={{ 
                              color: bibleLyricsColor,
                              fontFamily: bibleLyricsFont ? `'${bibleLyricsFont}', sans-serif` : undefined,
                              fontSize: `${(bibleLyricsSize * previewWidth) / 1920}px`,
                              fontWeight: bibleLyricsWeight,
                              textShadow: '0 4px 12px rgba(0,0,0,0.8)',
                              lineHeight: '1.3',
                              whiteSpace: 'pre-line',
                              textAlign: 'center',
                              fontStyle: 'italic',
                            }}>
                              {"E conhecereis a verdade,\ne a verdade vos libertará."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        )}

        {/* ═══ SIDEBAR ═══ */}
        {activeTab !== 'editor' && activeTab !== 'settings' && (
          <div className="w-[340px] flex flex-col border-r border-white/5" style={{ backgroundColor: '#151a26' }}>

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
                      className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 placeholder:text-white/25"
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
                        style={selectedCategory === cat ? { background: 'linear-gradient(135deg, #3b82f6, #2563eb)' } : {}}
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
                        className="p-1 rounded-md text-white/20 hover:text-accent-300 hover:bg-accent-500/20 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
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
              <div className="flex flex-col flex-1 min-h-0 bg-[#151a26]/30">
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
                            ? "text-white shadow-md bg-brand-500"
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
                              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 placeholder:text-white/25"
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
                              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 placeholder:text-white/25"
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
                                  className={`aspect-square flex items-center justify-center rounded-lg text-[13px] font-medium text-white/70 hover:text-white hover:bg-brand-500/20 hover:border-brand-500/30 border border-transparent transition-all ${
                                    selectedChapter === chapNumber ? "bg-brand-500/20 text-brand-400 border-brand-500/30 glow-brand shadow-inner" : ""
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
                                className={`w-full text-left p-2 rounded-lg flex gap-2 group cursor-pointer transition-all border ${isVerseActive ? "border-brand-500/40 bg-brand-500/20" : "border-transparent hover:bg-white/5"
                                  }`}
                              >
                                <span className="text-brand-400 font-bold text-[10px] pt-[3px] shrink-0 w-4 text-right">{verse.number}</span>
                                <p className="flex-1 text-[13px] text-white/70 group-hover:text-white/90 leading-relaxed">
                                  {verse.text}
                                </p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); addToBiblePlaylist(singleVerseSong); }}
                                  className="p-1.5 h-7 w-7 flex items-center justify-center rounded-md text-white/20 hover:text-accent-300 hover:bg-accent-500/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
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
            <div className="border-t border-white/5 flex flex-col min-h-0" style={{ height: '45%', backgroundColor: '#0f1219' }}>
              <div className="px-4 py-3 flex items-center gap-2 shrink-0 border-b border-white/5">
                {activeTab === 'songs' ? <ListMusic className="w-4 h-4 text-brand-400" /> : <BookOpen className="w-4 h-4 text-brand-400" />}
                <span className="text-[13px] font-semibold text-white/70 flex-1">
                  {activeTab === 'songs' ? 'Louvores do Culto' : 'Textos Bíblicos'}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-brand-300" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}>
                  {activeTab === 'songs' ? playlist.length : biblePlaylist.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {(activeTab === 'songs' ? playlist : biblePlaylist).length === 0 ? (
                  <div className="p-6 text-center text-white/15 text-xs">
                    Duplo-clique ou clique no <Plus className="inline w-3 h-3 text-brand-400" /> para adicionar {activeTab === 'songs' ? 'louvores' : 'versículos'}.
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
                      className={`w-full px-1 py-1.5 mb-0.5 rounded-lg transition-all duration-100 text-[13px] flex items-center group cursor-grab active:cursor-grabbing select-none border ${dragIdx === idx ? "opacity-40 border-brand-500/50 bg-brand-500/10 scale-95" :
                          overIdx === idx && dragIdx !== null && dragIdx !== idx ? "border-brand-400/40 bg-brand-500/10 scale-[1.02]" :
                            selectedSong?.title === item.title ? "border-brand-500/40 bg-brand-500/20" :
                              "border-transparent hover:bg-white/5"
                        }`}
                    >
                      <div className="p-1 text-white/15 group-hover:text-white/30 flex-shrink-0">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-white/25 text-[10px] font-mono w-6 text-right shrink-0">{idx + 1}.</span>
                      <span className={`flex-1 truncate font-medium ml-2 ${selectedSong?.title === item.title ? "text-brand-200" : "text-white/60"
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
          <div className="flex-1 flex flex-col h-screen" style={{ backgroundColor: '#0a0d14' }}>

            {/* Top Bar */}
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 glass" style={{ backgroundColor: 'rgba(21,26,38,0.85)' }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl px-4 py-1.5 transition-all focus-within:border-slate-400/40 hover:bg-white/[0.06] group/monitor shadow-sm">
                  <div className="flex items-center border-r border-white/10 pr-3 mr-2 text-white/40 group-focus-within/monitor:text-slate-400 group-hover/monitor:text-white/60 transition-colors">
                    <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Exibir em</span>
                  </div>
                  <div className="relative flex items-center pr-1">
                    <select
                      className="appearance-none bg-transparent py-0.5 text-[13px] font-semibold text-white/90 outline-none cursor-pointer w-full min-w-[120px]"
                      value={selectedMonitor || ''}
                      onChange={(e) => setSelectedMonitor(e.target.value)}
                    >
                      {monitors.length > 0 ? (
                        monitors.map((m, i) => (
                          <option key={i} value={m} className="bg-[#151a26] text-white">{m}</option>
                        ))
                      ) : (
                        <option value="" className="bg-[#151a26] text-white">Carregando...</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-1 shadow-sm">
                  <button
                    onClick={() => setProjectionMode('default')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                      projectionMode === 'default'
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    PADRÃO
                  </button>
                  <button
                    onClick={() => setProjectionMode('subtitle')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                      projectionMode === 'subtitle'
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    LEGENDA
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">


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
                <div className="flex-1 overflow-y-auto p-6 border-r border-white/5 bg-[#151a26]/50">
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
                              ? "border-brand-500/30 bg-brand-500/5 glow-brand"
                              : "border-brand-500/50 bg-brand-500/10 glow-brand"
                            : "border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                          }
                    `}
                        style={activeSlideIndex !== index ? { backgroundColor: 'rgba(255,255,255,0.02)' } : {}}
                      >
                        {/* Indicador de cena ativa */}
                        <div className={`
                      absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center transition-all
                      ${activeSlideIndex === index && isProjecting
                            ? "bg-brand-500 text-white opacity-100 shadow-md"
                            : activeSlideIndex === index
                              ? "bg-brand-500 text-white opacity-100"
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
                <div className="w-[340px] flex flex-col p-4 shrink-0" style={{ backgroundColor: '#0f1219' }}>
                  <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Monitor className="w-3.5 h-3.5" />
                    {isProjecting ? (
                      <span className="text-brand-400">● AO VIVO</span>
                    ) : (
                      <span className="text-white/30">Preview</span>
                    )}
                  </h3>

                  <div className={`w-full aspect-video rounded-xl border relative overflow-hidden flex flex-col shadow-md shadow-black/20 ${isProjecting
                      ? "border-brand-500/30 glow-brand"
                      : "border-white/10"
                    }`} style={{ backgroundColor: (projectionMode === 'subtitle' && selectedSong?.collection !== 'Bíblia') ? '#00ff00' : '#000' }}>
                    {/* Imagem de Fundo do Preview */}
                    {activeSlideIndex >= 0 && activeSlideIndex < slides.length && !(projectionMode === 'subtitle' && selectedSong?.collection !== 'Bíblia') && (
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
                    {!(projectionMode === 'subtitle' && selectedSong?.collection !== 'Bíblia') && (
                      <div className="absolute inset-0 z-[1] bg-black/40" />
                    )}

                    {/* Camada de Texto do Preview */}
                    <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-2">
                      {activeSlideIndex >= 0 && activeSlideIndex < slides.length ? (
                        <>
                          {/* Mostrar título simulado - oculto em legenda */}
                          {!(projectionMode === 'subtitle' && selectedSong?.collection !== 'Bíblia') && ((selectedSong?.collection !== 'Bíblia' && activeSlideIndex === 0) || (selectedSong?.collection === 'Bíblia')) && (
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
                          {(projectionMode === 'subtitle' && selectedSong?.collection !== 'Bíblia') ? (
                            /* SIMULAÇÃO MODO LEGENDA */
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center px-4">
                              <div
                                className="text-center font-bold drop-shadow-2xl projection-shadow"
                                style={{
                                  color: selectedSong?.collection === 'Bíblia' ? (bibleLyricsColor || '#ffffff') : (songLyricsColor || '#ffffff'),
                                  fontSize: '0.75rem',
                                  lineHeight: '1.2',
                                  maxWidth: '90%',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textShadow: '1px 1px 2px rgba(0,0,0,1)'
                                }}
                                dangerouslySetInnerHTML={{ __html: slides[activeSlideIndex] }}
                              />
                            </div>
                          ) : (
                            /* SIMULAÇÃO MODO PADRÃO */
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
                          )}
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
            <div className="modal-content p-6 rounded-2xl border border-white/10 shadow-2xl max-w-sm w-full mx-4" style={{ backgroundColor: '#1c2333' }} onClick={e => e.stopPropagation()}>
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
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-500/20 shadow-xl" style={{ backgroundColor: 'rgba(5,11,24,0.95)', backdropFilter: 'blur(12px)' }}>
              <CheckCircle2 className="w-5 h-5 text-brand-400 shrink-0" />
              <span className="text-[13px] font-medium text-brand-100">{successMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
