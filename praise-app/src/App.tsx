import { useEffect, useState, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useStore } from "./store";
import { getSlideTitle } from "./utils/slideHelpers";
import { useMonitors } from "./hooks/useMonitors";
import { useProjection } from "./hooks/useProjection";
import { useBible } from "./hooks/useBible";
import { useEditor } from "./hooks/useEditor";
import { TitleBar } from "./components/TitleBar";
import { SystemNav } from "./components/SystemNav";
import { EditorTab } from "./components/EditorTab";
import { SettingsTab } from "./components/SettingsTab";
import { SongsSidebar } from "./components/SongsSidebar";
import { BibleSidebar } from "./components/BibleSidebar";
import { Playlist } from "./components/Playlist";
import { DuplicateModal } from "./components/DuplicateModal";
import { SuccessToast } from "./components/SuccessToast";
import {
	Play,
	Square,
	Monitor,
	MonitorDot,
	Snowflake,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import "./App.css";

function App() {
	const {
		selectedSong,
		activeSlideIndex,
		playlist,
		biblePlaylist,
		activeTab,
		setActiveTab,
		songBackground,
		songBodyBackground,
		bibleBackground,
		songTitleColor,
		songLyricsColor,
		bibleTitleColor,
		bibleLyricsColor,
		projectionMode,
		setProjectionMode,
	} = useStore();

	// Custom hooks
	const { monitors, selectedMonitor, setSelectedMonitor } = useMonitors();
	const { isProjecting, isFrozen, setIsFrozen, slides, handleSelectSlide, handleStartProjection, handleStopProjection } = useProjection(selectedMonitor);
	const bible = useBible();
	const editor = useEditor();

	// Local UI state
	const [isSongsCollapsed, setIsSongsCollapsed] = useState(true);
	const [isBibleCollapsed, setIsBibleCollapsed] = useState(true);

	const isCollapsed = activeTab === 'songs' ? isSongsCollapsed : isBibleCollapsed;
	const setIsCollapsed = activeTab === 'songs' ? setIsSongsCollapsed : setIsBibleCollapsed;
	const prevPlaylistLenRef = useRef(playlist.length);
	const prevBiblePlaylistLenRef = useRef(biblePlaylist.length);

	const { showDuplicateModal, setShowDuplicateModal, duplicateTitle, showSuccessToast, successMessage } = editor;

	// Auto-expand ao adicionar louvores, auto-collapse ao remover todos
	useEffect(() => {
		const prevLen = prevPlaylistLenRef.current;
		if (playlist.length > prevLen && isSongsCollapsed) {
			setIsSongsCollapsed(false);
		} else if (playlist.length === 0 && prevLen > 0) {
			setIsSongsCollapsed(true);
		}
		prevPlaylistLenRef.current = playlist.length;
	}, [playlist.length, isSongsCollapsed]);

	// Auto-expand ao adicionar textos bíblicos, auto-collapse ao remover todos
	useEffect(() => {
		const prevLen = prevBiblePlaylistLenRef.current;
		if (biblePlaylist.length > prevLen && isBibleCollapsed) {
			setIsBibleCollapsed(false);
		} else if (biblePlaylist.length === 0 && prevLen > 0) {
			setIsBibleCollapsed(true);
		}
		prevBiblePlaylistLenRef.current = biblePlaylist.length;
	}, [biblePlaylist.length, isBibleCollapsed]);

	// Auto-resetar modo de projeção ao entrar na aba Bíblia ou selecionar passagem bíblica
	useEffect(() => {
		if (activeTab === "bible" || selectedSong?.collection === "Bíblia") {
			setProjectionMode("default");
		}
	}, [activeTab, selectedSong, setProjectionMode]);

	return (
		<div
			className="flex flex-col h-screen overflow-hidden font-['Inter',system-ui,sans-serif]"
			style={{ backgroundColor: "#060810", color: "rgba(255,255,255,0.9)" }}
		>
			<TitleBar />

			<div className="flex flex-1 overflow-hidden">
				<SystemNav activeTab={activeTab} onTabChange={setActiveTab} />


				{activeTab === "editor" && <EditorTab editor={editor} />}

				{activeTab === "settings" && <SettingsTab showSuccess={editor.showSuccess} />}



				{/* ═══ SIDEBAR ═══ */}
				{activeTab !== "editor" && activeTab !== "settings" && (
					<div
						className="w-[340px] flex flex-col border-r border-white/[0.07]"
						style={{ backgroundColor: "#0f1219" }}
					>
						{/* Header */}
						<div className="flex flex-col shrink-0 gradient-header border-b border-white/[0.07]">
							<div className="p-4 flex items-center gap-2.5">
								<div>
									<h1 className="text-base font-bold tracking-tight text-white leading-none">
										{activeTab === "songs"
											? "Louvores"
											: `Bíblia Sagrada (${bible.bibleVersion})`}
									</h1>
									<p className="text-[10px] text-white/40 font-medium mt-0.5">
										{activeTab === "songs"
											? "Biblioteca e Adoração"
											: "Navegação por Livros"}
									</p>
								</div>
							</div>
						</div>

						{activeTab === "songs" ? (
							<SongsSidebar />
						) : (
							<BibleSidebar bible={bible} />
						)}

						<Playlist
							activeTab={activeTab as "songs" | "bible"}
							isCollapsed={isCollapsed}
							onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
						/>
					</div>
				)}

				{/* ═══ MAIN CONTENT ═══ */}
				{activeTab !== "editor" && activeTab !== "settings" && (
					<div
						className="flex-1 flex flex-col h-screen"
						style={{ backgroundColor: "#060810" }}
					>
						{/* Top Bar */}
						<div
							className="h-14 border-b border-white/[0.07] flex items-center justify-between px-6 shrink-0 glass"
							style={{ backgroundColor: "rgba(21,26,38,0.85)" }}
						>
							<div className="flex items-center gap-3">
								<div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl px-4 py-1.5 transition-all focus-within:border-slate-400/40 hover:bg-white/[0.06] group/monitor shadow-sm">
									<div className="flex items-center border-r border-white/10 pr-3 mr-2 text-white/40 group-focus-within/monitor:text-slate-400 group-hover/monitor:text-white/60 transition-colors">
										<span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
											Exibir em
										</span>
									</div>
									<div className="relative flex items-center pr-1">
										<select
											className="appearance-none bg-transparent py-0.5 text-[13px] font-semibold text-white/90 outline-none cursor-pointer w-full min-w-[120px]"
											value={selectedMonitor || ""}
											onChange={(e) => setSelectedMonitor(e.target.value)}
										>
											{monitors.length > 0 ? (
												monitors.map((m, i) => (
													<option
														key={i}
														value={m.name}
														className="bg-[#0f1219] text-white"
													>
														{m.label}
													</option>
												))
											) : (
												<option value="" className="bg-[#0f1219] text-white">
													Carregando...
												</option>
											)}
										</select>
									</div>
								</div>

								{activeTab !== 'bible' && (
									<div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-1 shadow-sm">
										<button
											onClick={() => setProjectionMode("default")}
											disabled={isProjecting}
											className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${
												isProjecting
													? "opacity-50 cursor-not-allowed"
													: ""
											} ${
												projectionMode === "default"
													? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
													: `text-white/30 ${!isProjecting ? "hover:text-white/60" : ""}`
											}`}
										>
											PADRÃO
										</button>
										<button
											onClick={() => setProjectionMode("subtitle")}
											disabled={isProjecting}
											className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${
												isProjecting
													? "opacity-50 cursor-not-allowed"
													: ""
											} ${
												projectionMode === "subtitle"
													? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
													: `text-white/30 ${!isProjecting ? "hover:text-white/60" : ""}`
											}`}
										>
											LEGENDA
										</button>
									</div>
								)}
							</div>

							<div className="flex items-center gap-3">
								{isProjecting && (
									<button
										className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition-all shadow-md ${
											isFrozen
												? "bg-sky-500 text-white shadow-sky-500/20"
												: "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
										}`}
										onClick={() => setIsFrozen(!isFrozen)}
										title={
											isFrozen
												? "Descongelar projeção"
												: "Congelar slide atual no telão"
										}
									>
										<Snowflake
											className={`w-4 h-4 ${isFrozen ? "animate-pulse" : ""}`}
										/>
										{isFrozen ? "Congelado" : "Congelar"}
									</button>
								)}

								{!isProjecting ? (
									<button
										className="text-white px-5 py-1.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-lg"
										style={{
											background: "linear-gradient(135deg, #3b82f6, #2563eb)",
										}}
										onClick={handleStartProjection}
										disabled={!selectedSong}
									>
										<Play className="w-4 h-4" /> Projetar
									</button>
								) : (
									<button
										className="text-white px-5 py-1.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
										style={{
											background: "linear-gradient(135deg, #ef4444, #dc2626)",
										}}
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
								<div className="flex-1 overflow-y-auto p-6 border-r border-white/[0.07] bg-[#0f1219]/50">
									<div className="flex justify-between items-center mb-5">
										<div>
											<h2 className="text-lg font-bold text-white/90">
												{selectedSong.title}
											</h2>
											<p className="text-[11px] text-white/25 mt-0.5">
												{slides.length}{" "}
												{activeTab === "bible" ? "capítulos" : "estrofes"}
											</p>
										</div>
										{isProjecting && (
											<span
												className="text-[11px] text-white/30 px-3 py-1.5 rounded-xl border border-white/[0.07] flex items-center gap-2"
												style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
											>
												Setas <ChevronLeft className="w-3 h-3 text-slate-400" />{" "}
												<ChevronRight className="w-3 h-3 text-slate-400" /> para
												navegar
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
														? "border-brand-500/30 bg-brand-500/5 glow-brand"
														: "border-brand-500/50 bg-brand-500/10 glow-brand"
													: "border-white/[0.07] hover:border-white/10 hover:bg-white/[0.02]"
											}
                    `}
												style={
													activeSlideIndex !== index
														? { backgroundColor: "rgba(255,255,255,0.02)" }
														: {}
												}
											>
												{/* Indicador de cena ativa */}
												<div
													className={`
                      absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center transition-all
                      ${
												activeSlideIndex === index && isProjecting
													? "bg-brand-500 text-white opacity-100 shadow-md"
													: activeSlideIndex === index
														? "bg-brand-500 text-white opacity-100"
														: "bg-white/5 text-white/20 opacity-0 group-hover:opacity-100"
											}
                    `}
												>
													<Play className="w-3 h-3 ml-0.5" />
												</div>

												<div
													className="text-[14px] text-white/70 leading-relaxed font-medium pr-8 text-left"
													dangerouslySetInnerHTML={{ __html: slideHTML }}
												/>

												<div className="mt-3 text-[10px] font-mono text-white/15 uppercase tracking-wider">
													{activeTab === "bible" ? "Capítulo" : "Estrofe"}{" "}
													{index + 1}
												</div>
											</div>
										))}
									</div>
								</div>

								{/* Preview */}
								<div
									className="w-[340px] flex flex-col p-4 shrink-0"
									style={{ backgroundColor: "#0a0c14" }}
								>
									<h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
										<Monitor className="w-3.5 h-3.5" />
										{isProjecting ? (
											<span className="text-brand-400">● AO VIVO</span>
										) : (
											<span className="text-white/30">Preview</span>
										)}
									</h3>

									<div
										className={`w-full aspect-video rounded-xl border relative overflow-hidden flex flex-col shadow-md shadow-black/20 ${
											isProjecting
												? "border-brand-500/30 glow-brand"
												: "border-white/10"
										}`}
										style={{
											backgroundColor:
												projectionMode === "subtitle" &&
												selectedSong?.collection !== "Bíblia"
													? "#00ff00"
													: "#000",
										}}
									>
										{/* Imagem de Fundo do Preview */}
										{activeSlideIndex >= 0 &&
											activeSlideIndex < slides.length &&
											!(
												projectionMode === "subtitle" &&
												selectedSong?.collection !== "Bíblia"
											) && (
												<div
													className="absolute inset-0 z-0"
													style={{
														backgroundImage: `url(${
															selectedSong?.collection === "Bíblia"
																? bibleBackground.startsWith("/backgrounds/")
																	? bibleBackground
																	: convertFileSrc(bibleBackground)
																: activeSlideIndex === 0
																	? songBackground.startsWith("/backgrounds/")
																		? songBackground
																		: convertFileSrc(songBackground)
																	: songBodyBackground.startsWith(
																				"/backgrounds/",
																			)
																		? songBodyBackground
																		: convertFileSrc(songBodyBackground)
														})`,
														backgroundSize: "100% 100%",
														backgroundPosition: "center center",
														backgroundRepeat: "no-repeat",
													}}
												/>
											)}

										{/* Overlay escuro simulando o do projetor */}
										{!(
											projectionMode === "subtitle" &&
											selectedSong?.collection !== "Bíblia"
										) && <div className="absolute inset-0 z-[1] bg-black/40" />}

										{/* Camada de Texto do Preview */}
										<div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-2">
											{activeSlideIndex >= 0 &&
											activeSlideIndex < slides.length ? (
												<>
													{/* Mostrar título simulado - oculto em legenda */}
													{!(
														projectionMode === "subtitle" &&
														selectedSong?.collection !== "Bíblia"
													) &&
														((selectedSong?.collection !== "Bíblia" &&
															activeSlideIndex === 0) ||
															selectedSong?.collection === "Bíblia") && (
															<div
																className={`absolute left-0 right-0 w-full flex items-center justify-center ${
																	selectedSong?.collection === "Bíblia"
																		? "top-[21%]"
																		: "top-[5.5%]"
																}`}
															>
																<h4
																	className={`font-bold uppercase tracking-widest text-center drop-shadow-2xl projection-shadow truncate w-full px-2`}
																	style={{
																		fontSize: "0.4rem",
																		color:
																			selectedSong?.collection === "Bíblia"
																				? bibleTitleColor
																				: songTitleColor,
																	}}
																>
																	{getSlideTitle(selectedSong, activeSlideIndex)}
																</h4>
															</div>
														)}

													{/* Letra ou Versículo */}
													{projectionMode === "subtitle" &&
													selectedSong?.collection !== "Bíblia" ? (
														/* SIMULAÇÃO MODO LEGENDA */
														<div className="absolute bottom-2 left-0 right-0 flex justify-center px-4">
															<div
																className="text-center font-bold"
																style={{
																	color:
																		selectedSong?.collection === "Bíblia"
																			? bibleLyricsColor || "#ffffff"
																			: songLyricsColor || "#ffffff",
																	fontSize: "0.9rem",
																	lineHeight: "1.2",
																	maxWidth: "90%",
																	display: "-webkit-box",
																	WebkitLineClamp: 2,
																	WebkitBoxOrient: "vertical",
																	overflow: "hidden",
																	textShadow:
																		"1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0px 1px 0 #000, 1px 0px 0 #000, 0px -1px 0 #000, -1px 0px 0 #000, 1px 1px 2px rgba(0,0,0,0.5)",
																}}
																dangerouslySetInnerHTML={{
																	__html: slides[activeSlideIndex],
																}}
															/>
														</div>
													) : (
														/* SIMULAÇÃO MODO PADRÃO */
														<div className="absolute inset-x-2 bottom-2 top-[35%] flex items-center justify-center">
															<div
																className={`font-bold w-full leading-snug tracking-wide projection-shadow ${
																	selectedSong?.collection === "Bíblia"
																		? "text-[0.6rem] italic font-medium text-center"
																		: "text-[0.6rem] uppercase text-left"
																}`}
																style={{
																	color:
																		selectedSong?.collection === "Bíblia"
																			? bibleLyricsColor
																			: songLyricsColor,
																}}
																dangerouslySetInnerHTML={{
																	__html: slides[activeSlideIndex],
																}}
															/>
														</div>
													)}
												</>
											) : (
												<div className="text-white/30 text-[10px] text-center font-medium">
													Tela Preta
												</div>
											)}
										</div>
									</div>

									{/* Info da cena atual */}
									{activeSlideIndex >= 0 &&
										activeSlideIndex < slides.length && (
											<div className="mt-4 flex items-center justify-between text-[11px] text-white/25 px-1">
												<span>
													{activeTab === "bible" ? "Capítulo" : "Estrofe"}{" "}
													{activeSlideIndex + 1} de {slides.length}
												</span>
												<span className="font-mono">
													{Math.round(
														((activeSlideIndex + 1) / slides.length) * 100,
													)}
													%
												</span>
											</div>
										)}

									{/* Progress bar */}
									{slides.length > 0 && (
										<div
											className="mt-2 h-1 rounded-full overflow-hidden"
											style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
										>
											<div
												className="h-full rounded-full transition-all duration-300"
												style={{
													width: `${((activeSlideIndex + 1) / slides.length) * 100}%`,
													background: isProjecting
														? "linear-gradient(90deg, #10b981, #34d399)"
														: "linear-gradient(90deg, #64748b, #94a3b8)",
												}}
											/>
										</div>
									)}
								</div>
							</div>
						) : (
							<div className="flex-1 flex flex-col items-center justify-center">
								<div
									className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
									style={{
										background: "rgba(100,116,139,0.1)",
										border: "1px solid rgba(100,116,139,0.2)",
									}}
								>
									<MonitorDot className="w-10 h-10 text-slate-500/50" />
								</div>
								<p className="text-lg font-semibold text-white/25">
									Selecione um louvor do culto
								</p>
								<p className="text-sm mt-1.5 text-white/15">
									Adicione louvores pela lista à esquerda
								</p>
							</div>
						)}
					</div>
				)}
				<DuplicateModal
					isOpen={showDuplicateModal}
					title={duplicateTitle}
					onClose={() => setShowDuplicateModal(false)}
				/>
				<SuccessToast isVisible={showSuccessToast} message={successMessage} />
			</div>
		</div>
	);
}

export default App;
