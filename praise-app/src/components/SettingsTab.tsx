import { useState, useRef, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useStore } from '../store';
import { useUpdater } from '../hooks/useUpdater';
import {
  Settings,
  Music,
  BookOpen,
  Loader2,
  RotateCw,
  Upload,
  Palette,
  Type,
  Maximize2,
  Bold,
  Image as ImageIcon,
} from 'lucide-react';

interface SettingsTabProps {
  showSuccess: (message: string, duration?: number) => void;
}

const FONTS = ['Inter', 'Montserrat', 'Roboto', 'Oswald', 'Open Sans', 'Lato', 'Serif', 'Sans-Serif'];
const FONTS_SHORT = ['Inter', 'Montserrat', 'Roboto', 'Oswald', 'Open Sans', 'Lato'];
const WEIGHTS = ['normal', 'medium', 'semibold', 'bold', 'black'];

export function SettingsTab({ showSuccess }: SettingsTabProps) {
  const {
    songBackground, songBodyBackground, bibleBackground,
    setSongBackground, setSongBodyBackground, setBibleBackground,
    songTitleColor, songLyricsColor, bibleTitleColor, bibleLyricsColor,
    setSongTitleColor, setSongLyricsColor, setBibleTitleColor, setBibleLyricsColor,
    songTitleFont, songTitleSize, songTitleWeight,
    songLyricsFont, songLyricsSize, songLyricsWeight,
    bibleTitleFont, bibleTitleSize, bibleTitleWeight,
    bibleLyricsFont, bibleLyricsSize, bibleLyricsWeight,
    setSongTitleFont, setSongTitleSize, setSongTitleWeight,
    setSongLyricsFont, setSongLyricsSize, setSongLyricsWeight,
    setBibleTitleFont, setBibleTitleSize, setBibleTitleWeight,
    setBibleLyricsFont, setBibleLyricsSize, setBibleLyricsWeight,
    activeTab,
  } = useStore();

  const updater = useUpdater({ showSuccess });
  const { isCheckingUpdate, downloadProgress, checkForUpdate } = updater;

  const [settingsPreviewTab, setSettingsPreviewTab] = useState<'title' | 'lyrics' | 'bible'>('title');
  const [settingsSubTab, setSettingsSubTab] = useState<'titles' | 'lyrics' | 'bible' | 'system'>('titles');
  const [previewWidth, setPreviewWidth] = useState(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!previewContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPreviewWidth(entry.contentRect.width);
      }
    });
    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, [activeTab]);

  const openImageDialog = async (setter: (path: string) => void) => {
    const path = await open({
      multiple: false,
      filters: [{ name: 'Imagens', extensions: ['jpg', 'png', 'jpeg', 'webp'] }],
    });
    if (path) setter(path as string);
  };

  const settingsNavItems = [
    { id: 'titles' as const, label: 'Títulos', icon: ImageIcon, desc: 'Abertura de músicas' },
    { id: 'lyrics' as const, label: 'Louvores', icon: Music, desc: 'Letras e refrãos' },
    { id: 'bible' as const, label: 'Bíblia', icon: BookOpen, desc: 'Escrituras sagradas' },
    { id: 'system' as const, label: 'Sistema', icon: RotateCw, desc: 'Atualizações e core' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a0a]/60 backdrop-blur-3xl">
      <header className="px-8 py-6 border-b border-white/[0.07] bg-[#0f1219]/40 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Settings className="w-5 h-5 text-white" />
            </div>
            Painel de Configurações
          </h2>
          <p className="text-slate-400 text-xs font-medium mt-1">
            Gerencie a identidade visual da sua projeção em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[10px] font-bold text-brand-400 uppercase tracking-widest animate-pulse">
            Modo Edição Ativo
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-20 lg:w-64 border-r border-white/[0.07] bg-[#0f1219]/20 flex flex-col p-4 gap-2 overflow-y-auto">
          {settingsNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSettingsSubTab(item.id);
                if (item.id === 'titles') setSettingsPreviewTab('title');
                if (item.id === 'lyrics') setSettingsPreviewTab('lyrics');
                if (item.id === 'bible') setSettingsPreviewTab('bible');
              }}
              className={`w-full group flex items-center gap-4 p-4 rounded-2xl transition-all border ${
                settingsSubTab === item.id
                  ? 'bg-brand-500 border-brand-400/50 shadow-lg shadow-brand-500/20'
                  : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] hover:border-white/[0.07]'
              }`}
            >
              <item.icon
                className={`w-5 h-5 transition-colors ${settingsSubTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}
              />
              <div className="hidden lg:flex flex-col items-start text-left">
                <span className={`text-[13px] font-bold ${settingsSubTab === item.id ? 'text-white' : 'text-slate-300'}`}>
                  {item.label}
                </span>
                <span className={`text-[10px] ${settingsSubTab === item.id ? 'text-brand-100/60' : 'text-slate-500'}`}>
                  {item.desc}
                </span>
              </div>
            </button>
          ))}
        </aside>

        <div className="flex-1 flex overflow-hidden relative">
          <main className="w-full lg:w-5/12 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
            {settingsSubTab === 'titles' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
                <div className="bg-[#161b26]/40 border border-white/[0.07] rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                  <div className="mb-8 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">Fundo de Título</h3>
                      <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold italic">Configuração do Slide Inicial</p>
                    </div>
                    <button onClick={() => openImageDialog(setSongBackground)} className="p-3 rounded-xl bg-brand-600/10 border border-brand-500/20 text-brand-400 hover:bg-brand-600/20 transition-all group" title="Trocar imagem">
                      <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-black/20 border border-white/[0.07]">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Palette className="w-3 h-3 text-pink-400" /> Cor do Texto
                      </label>
                      <div className="flex items-center gap-4">
                        <input type="color" value={songTitleColor} onChange={(e) => setSongTitleColor(e.target.value)} className="w-14 h-14 rounded-2xl overflow-hidden cursor-pointer ring-4 ring-white/5 border-none" />
                        <span className="text-xs font-mono text-slate-400">{songTitleColor.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-black/10 border border-white/[0.07] space-y-6">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Type className="w-3 h-3 text-brand-400" /> Tipografia do Título
                      </label>
                      <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-white/30 ml-1 flex items-center gap-1.5"><Type className="w-3 h-3" /> Família da Fonte</span>
                          <select value={songTitleFont} onChange={(e) => setSongTitleFont(e.target.value)} className="w-full bg-[#0f1219] border border-white/[0.07] text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50 transition-all">
                            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-white/30 ml-1 flex items-center gap-1.5"><Maximize2 className="w-3 h-3" /> Tamanho (PX)</span>
                            <input type="number" value={songTitleSize} onChange={(e) => setSongTitleSize(Number(e.target.value))} className="w-full bg-[#0f1219] border border-white/[0.07] text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50 text-center" />
                          </div>
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-white/30 ml-1 flex items-center gap-1.5"><Bold className="w-3 h-3" /> Peso Visual</span>
                            <select value={songTitleWeight} onChange={(e) => setSongTitleWeight(e.target.value)} className="w-full bg-[#0f1219] border border-white/[0.07] text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50">
                              {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {settingsSubTab === 'lyrics' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
                <div className="bg-[#161b26]/40 border border-white/[0.07] rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                  <div className="mb-8 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">Fundo de Louvor</h3>
                      <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold italic">Letras e Refrãos das Músicas</p>
                    </div>
                    <button onClick={() => openImageDialog(setSongBodyBackground)} className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500/20 transition-all group">
                      <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-black/20 border border-white/[0.07]">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Cor das Letras</label>
                      <div className="flex items-center gap-4">
                        <input type="color" value={songLyricsColor} onChange={(e) => setSongLyricsColor(e.target.value)} className="w-14 h-14 rounded-2xl overflow-hidden cursor-pointer ring-4 ring-white/5 border-none" />
                        <span className="text-xs font-mono text-slate-400">{songLyricsColor.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-black/10 border border-white/[0.07] space-y-6">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Tipografia do Louvor</label>
                      <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-white/30 ml-1">Família da Fonte</span>
                          <select value={songLyricsFont} onChange={(e) => setSongLyricsFont(e.target.value)} className="w-full bg-[#0f1219] border border-white/[0.07] text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50">
                            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-white/30 ml-1">Tamanho (PX)</span>
                            <input type="number" value={songLyricsSize} onChange={(e) => setSongLyricsSize(Number(e.target.value))} className="w-full bg-[#0f1219] border border-white/[0.07] text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50 text-center" />
                          </div>
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-white/30 ml-1">Peso Visual</span>
                            <select value={songLyricsWeight} onChange={(e) => setSongLyricsWeight(e.target.value)} className="w-full bg-[#0f1219] border border-white/[0.07] text-white text-sm rounded-xl p-3 outline-none focus:border-brand-500/50">
                              {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {settingsSubTab === 'bible' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
                <div className="bg-[#161b26]/40 border border-white/[0.07] rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                  <div className="mb-8 flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white mb-1.5 tracking-tight">Fundo da Bíblia</h3>
                      <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold italic">Escrituras e Versículos</p>
                    </div>
                    <button onClick={() => openImageDialog(setBibleBackground)} className="p-3 rounded-xl bg-brand-600/10 border border-brand-500/20 text-brand-400 hover:bg-brand-600/20 transition-all group">
                      <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="p-6 rounded-2xl bg-black/20 border border-white/[0.07] space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referência (Livro/Capítulo)</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input type="color" value={bibleTitleColor} onChange={(e) => setBibleTitleColor(e.target.value)} className="w-12 h-12 rounded-xl overflow-hidden cursor-pointer ring-2 ring-white/5" />
                        <div className="grid grid-cols-2 gap-3 flex-1">
                          <select value={bibleTitleFont} onChange={(e) => setBibleTitleFont(e.target.value)} className="bg-[#0f1219] border border-white/[0.07] text-white text-[11px] rounded-lg p-2.5 outline-none">
                            {FONTS_SHORT.map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <input type="number" value={bibleTitleSize} onChange={(e) => setBibleTitleSize(Number(e.target.value))} className="bg-[#0f1219] border border-white/[0.07] text-white text-[11px] rounded-lg p-2.5 outline-none text-center" />
                        </div>
                      </div>
                      <select value={bibleTitleWeight} onChange={(e) => setBibleTitleWeight(e.target.value)} className="w-full bg-[#0f1219] border border-white/[0.07] text-white text-[11px] rounded-lg p-2.5 outline-none">
                        {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div className="p-6 rounded-2xl bg-black/20 border border-white/[0.07] space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto do Versículo</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input type="color" value={bibleLyricsColor} onChange={(e) => setBibleLyricsColor(e.target.value)} className="w-12 h-12 rounded-xl overflow-hidden cursor-pointer ring-2 ring-white/5" />
                        <div className="grid grid-cols-2 gap-3 flex-1">
                          <select value={bibleLyricsFont} onChange={(e) => setBibleLyricsFont(e.target.value)} className="bg-[#0f1219] border border-white/[0.07] text-white text-[11px] rounded-lg p-2.5 outline-none">
                            {FONTS_SHORT.map((f) => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <input type="number" value={bibleLyricsSize} onChange={(e) => setBibleLyricsSize(Number(e.target.value))} className="bg-[#0f1219] border border-white/[0.07] text-white text-[11px] rounded-lg p-2.5 outline-none text-center" />
                        </div>
                      </div>
                      <select value={bibleLyricsWeight} onChange={(e) => setBibleLyricsWeight(e.target.value)} className="w-full bg-[#0f1219] border border-white/[0.07] text-white text-[11px] rounded-lg p-2.5 outline-none">
                        {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {settingsSubTab === 'system' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-8">
                <div className="bg-[#161b26]/40 border border-white/[0.07] rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-white mb-1.5 tracking-tight flex items-center gap-2">Atualizações do Praise</h3>
                    <p className="text-sm text-brand-400 font-medium">Mantenha seu sistema na versão mais recente.</p>
                  </div>
                  <div className="bg-black/20 rounded-2xl p-6 border border-white/[0.07] space-y-6">
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
                      <p className="text-[13px] text-white/40 leading-relaxed font-medium">
                        Clique no botão abaixo para verificar se existem novas funcionalidades ou correções de estabilidade disponíveis.
                      </p>
                    )}
                    <button onClick={checkForUpdate} disabled={isCheckingUpdate || downloadProgress !== null} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/[0.03] hover:bg-brand-600/10 border border-white/[0.07] hover:border-brand-500/30 text-white font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50">
                      {isCheckingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                      Verificar Agora
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Preview */}
          <div className="hidden lg:flex flex-1 bg-slate-950/40 border-l border-white/[0.07] p-10 flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-brand-500 rounded-full blur-[150px] animate-pulse" />
              <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-sky-500 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

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
                        ? 'bg-white/10 text-white shadow-xl border border-white/10'
                        : 'text-white/30 hover:text-white/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div ref={previewContainerRef} className="w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border-4 border-slate-800/50 relative transform hover:scale-[1.01] transition-transform duration-700">
              <img
                src={
                  settingsPreviewTab === 'title'
                    ? songBackground.startsWith('/backgrounds/') ? songBackground : convertFileSrc(songBackground)
                    : settingsPreviewTab === 'lyrics'
                      ? songBodyBackground.startsWith('/backgrounds/') ? songBodyBackground : convertFileSrc(songBodyBackground)
                      : bibleBackground.startsWith('/backgrounds/') ? bibleBackground : convertFileSrc(bibleBackground)
                }
                className="w-full h-full absolute inset-0 transition-all duration-1000 z-0"
                style={{ backgroundSize: '100% 100%', objectFit: 'fill' }}
                alt="True Preview"
              />
              <div className="absolute inset-0 z-[1] bg-black/30" />
              <div className="absolute inset-0 z-10 pointer-events-none select-none">
                {settingsPreviewTab === 'title' && (
                  <div className="absolute left-0 right-0 top-[5.5%] flex items-center justify-center px-[5%]">
                    <h1 style={{ color: songTitleColor, fontFamily: songTitleFont ? `'${songTitleFont}', sans-serif` : undefined, fontSize: `${(songTitleSize * previewWidth) / 1920}px`, fontWeight: songTitleWeight, textShadow: '0 4px 12px rgba(0,0,0,0.8)', lineHeight: '1.2', textTransform: 'uppercase' }}>
                      GRANDE É O SENHOR
                    </h1>
                  </div>
                )}
                {settingsPreviewTab === 'bible' && (
                  <div className="absolute left-0 right-0 top-[5.5%] flex items-center justify-center px-[5%]">
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '1% 2.5%', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
                      <h2 style={{ color: bibleTitleColor, fontFamily: bibleTitleFont ? `'${bibleTitleFont}', sans-serif` : undefined, fontSize: `${(bibleTitleSize * previewWidth) / 1920}px`, fontWeight: bibleTitleWeight, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                        JOÃO 8:32
                      </h2>
                    </div>
                  </div>
                )}
                <div className={`absolute inset-0 flex items-center justify-center px-[8%] ${settingsPreviewTab === 'bible' ? 'pt-[12%] pb-[5%]' : 'pt-[12%] pb-[8%]'}`}>
                  {settingsPreviewTab === 'lyrics' && (
                    <div className="w-full">
                      <p style={{ color: songLyricsColor, fontFamily: songLyricsFont ? `'${songLyricsFont}', sans-serif` : undefined, fontSize: `${(songLyricsSize * previewWidth) / 1920}px`, fontWeight: songLyricsWeight, textShadow: '0 4px 12px rgba(0,0,0,0.8)', lineHeight: '1.3', whiteSpace: 'pre-line', textAlign: 'left', textTransform: 'uppercase' }}>
                        {"Vim para adorar-Te\nVim para prostrar-me\nVim para dizer que és\nmeu Deus!"}
                      </p>
                    </div>
                  )}
                  {settingsPreviewTab === 'bible' && (
                    <div className="w-full">
                      <p style={{ color: bibleLyricsColor, fontFamily: bibleLyricsFont ? `'${bibleLyricsFont}', sans-serif` : undefined, fontSize: `${(bibleLyricsSize * previewWidth) / 1920}px`, fontWeight: bibleLyricsWeight, textShadow: '0 4px 12px rgba(0,0,0,0.8)', lineHeight: '1.3', whiteSpace: 'pre-line', textAlign: 'center', fontStyle: 'italic' }}>
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
  );
}
