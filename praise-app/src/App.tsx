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
import { DuplicateModal } from "./components/DuplicateModal";
import { SuccessToast } from "./components/SuccessToast";
import {
	Play,
	Square,
	Plus,
	Trash2,
	GripVertical,
	ListMusic,
	BookOpen,
	Monitor,
	Search,
	ArrowLeft,
	Loader2,
	MonitorDot,
	Snowflake,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
} from "lucide-react";
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
	const [dragIdx, setDragIdx] = useState<number | null>(null);
	const [overIdx, setOverIdx] = useState<number | null>(null);
	const [isSongsCollapsed, setIsSongsCollapsed] = useState(true);
	const [isBibleCollapsed, setIsBibleCollapsed] = useState(true);

	const isCollapsed = activeTab === 'songs' ? isSongsCollapsed : isBibleCollapsed;
	const setIsCollapsed = activeTab === 'songs' ? setIsSongsCollapsed : setIsBibleCollapsed;
	const prevPlaylistLenRef = useRef(playlist.length);
	const prevBiblePlaylistLenRef = useRef(biblePlaylist.length);

	// Destructure bible for template compatibility
	const { selectedBook, setSelectedBook, selectedChapter, setSelectedChapter, searchBibleQuery, setSearchBibleQuery, searchChapterQuery, setSearchChapterQuery, bibleVersion, setBibleVersion, isLoadingBible, bibleBooks, bibleVerses } = bible;
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

	const categories = ["Todas", "Coletânea 2018", "Avulsos 2018", "CIA 2018"];

	const filteredSongs = songs.filter((song) => {
		const matchesSearch = song.title
			.toLowerCase()
			.includes(searchQuery.toLowerCase());
		const matchesCategory =
			selectedCategory === "Todas" || song.collection === selectedCategory;
		return matchesSearch && matchesCategory;
	});

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
											: `Bíblia Sagrada (${bibleVersion})`}
									</h1>
									<p className="text-[10px] text-white/40 font-medium mt-0.5">
										{activeTab === "songs"
											? "Biblioteca e Adoração"
											: "Navegação por Livros"}
									</p>
								</div>
							</div>
						</div>

						{/* Conteúdo Dinâmico */}
						{activeTab === "songs" ? (
							<div className="flex flex-col flex-1 min-h-0">
								{/* Search + Categories */}
								<div className="p-4 flex flex-col gap-3 shrink-0 border-b border-white/[0.07]">
									<div className="relative">
										<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
										<input
											type="text"
											placeholder="Buscar louvor..."
											className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border border-white/10 transition-all focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 placeholder:text-white/25"
											style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
									</div>

									<div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
										{categories.map((cat) => (
											<button
												key={cat}
												onClick={() => setSelectedCategory(cat)}
												className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all flex-shrink-0 ${
													selectedCategory === cat
														? "text-white shadow-md"
														: "text-white/40 hover:text-white/70 hover:bg-white/5"
												}`}
												style={
													selectedCategory === cat
														? {
																background:
																	"linear-gradient(135deg, #3b82f6, #2563eb)",
															}
														: {}
												}
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
											onClick={() => {
												setSelectedSong(song);
												setActiveSlideIndex(0);
											}}
											onDoubleClick={() => addToPlaylist(song)}
											className={`w-full text-left px-2 py-1.5 mb-0.5 rounded-lg text-[13px] flex items-center group cursor-pointer transition-all hover:bg-white/5 ${selectedSong?.title === song.title ? "bg-white/10" : ""}`}
										>
											<span className="text-white/15 text-[10px] font-mono w-6 text-right shrink-0">
												{idx + 1}.
											</span>
											<span className="flex-1 truncate text-white/60 group-hover:text-white/90 font-medium ml-2">
												{song.title}
											</span>
											<button
												onClick={(e) => {
													e.stopPropagation();
													addToPlaylist(song);
												}}
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
							<div className="flex flex-col flex-1 min-h-0 bg-[#0f1219]/30">
								{/* Nav Header Bible */}
								<div className="p-3 flex items-center justify-between gap-2 border-b border-white/[0.07] shrink-0 min-h-[53px]">
									<div className="flex items-center gap-2 flex-1 min-w-0">
										{selectedBook && (
											<button
												onClick={() => {
													if (selectedChapter) {
														setSelectedChapter(null);
													} else {
														setSelectedBook(null);
														setSearchChapterQuery("");
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
												key={version}
												onClick={() => setBibleVersion(version)}
												className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all flex-shrink-0 ${
													bibleVersion === version
														? "text-white shadow-md bg-brand-500"
														: "text-white/40 hover:text-white/70 hover:bg-white/5"
												}`}
												style={
													bibleVersion === version
														? {
																background:
																	"linear-gradient(135deg, #64748b, #475569)",
															}
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
															style={{
																backgroundColor: "rgba(255,255,255,0.05)",
															}}
															value={searchBibleQuery}
															onChange={(e) =>
																setSearchBibleQuery(e.target.value)
															}
														/>
													</div>

													<div className="grid grid-cols-1 gap-1">
														{bibleBooks.length > 0 ? (
															bibleBooks.map((book) => (
																<button
																	key={book.abbrev}
																	onClick={() => {
																		setSelectedBook(book);
																		setSearchBibleQuery("");
																	}}
																	className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition-all flex justify-between items-center group"
																>
																	<span className="font-medium">
																		{book.name}
																	</span>
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
															style={{
																backgroundColor: "rgba(255,255,255,0.05)",
															}}
															value={searchChapterQuery}
															onChange={(e) =>
																setSearchChapterQuery(e.target.value)
															}
														/>
													</div>

													<div className="grid grid-cols-5 gap-1 p-1">
														{Array.from({
															length: selectedBook.chapters.length,
														})
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
																	key={chapNumber}
																	onClick={() => {
																		setSelectedChapter(chapNumber);
																		setSearchChapterQuery("");

																		// Carrega o capítulo inteiro no Lobby
																		const chapterVerses =
																			selectedBook.chapters[chapNumber - 1];
																		const chapterSongTitle = `${selectedBook.name} ${chapNumber}`;
																		const chapterContent = chapterVerses
																			.map(
																				(text: string, vIdx: number) =>
																					`[${selectedBook.name} ${chapNumber}:${vIdx + 1}]\n${vIdx + 1}. ${text}`,
																			)
																			.join("\n\n");

																		setSelectedSong({
																			title: chapterSongTitle,
																			content: chapterContent,
																			collection: "Bíblia",
																		});
																		setActiveSlideIndex(0);
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
													{Array.from({
														length: selectedBook.chapters.length,
													}).filter((c: any) =>
														(c + 1)
															.toString()
															.includes(searchChapterQuery.trim()),
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
													{bibleVerses.map((verse: any, index: number) => {
														const chapterSongTitle = `${selectedBook.name} ${selectedChapter}`;
														const isVerseActive =
															selectedSong?.title === chapterSongTitle &&
															activeSlideIndex === index;

														const singleVerseSong = {
															title: `${selectedBook.name} ${selectedChapter}:${verse.number}`,
															content: `[${selectedBook.name} ${selectedChapter}:${verse.number}]\n${verse.number}. ${verse.text}`,
															collection: "Bíblia",
														};

														return (
															<div
																key={verse.number}
																onDoubleClick={() =>
																	addToBiblePlaylist(singleVerseSong)
																}
																onClick={() => {
																	// Se o capítulo inteiro não for mais a "música" atual, a recria
																	if (
																		selectedSong?.title !== chapterSongTitle
																	) {
																		const chapterContent = bibleVerses
																			.map(
																				(v: any) =>
																					`[${selectedBook.name} ${selectedChapter}:${v.number}]\n${v.number}. ${v.text}`,
																			)
																			.join("\n\n");
																		setSelectedSong({
																			title: chapterSongTitle,
																			content: chapterContent,
																			collection: "Bíblia",
																		});
																	}
																	setActiveSlideIndex(index);
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
																	onClick={(e) => {
																		e.stopPropagation();
																		addToBiblePlaylist(singleVerseSong);
																	}}
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
						<div
							className="border-t border-white/[0.07] flex flex-col min-h-0"
							style={{ height: isCollapsed ? "auto" : "45%", backgroundColor: "#0a0c14" }}
						>
							<div
								className="px-4 py-3 flex items-center gap-2 shrink-0 border-b border-white/[0.07] cursor-pointer select-none hover:bg-white/[0.03] transition-colors"
								onClick={() => setIsCollapsed(!isCollapsed)}
								title={isCollapsed ? 'Expandir' : 'Recolher'}
							>
								{activeTab === "songs" ? (
									<ListMusic className="w-4 h-4 text-brand-400" />
								) : (
									<BookOpen className="w-4 h-4 text-brand-400" />
								)}
								<span className="text-[13px] font-semibold text-white/70 flex-1">
									{activeTab === "songs"
										? "Louvores do Culto"
										: "Textos Bíblicos"}
								</span>
								<span
									className="text-[11px] font-bold px-2 py-0.5 rounded-md text-brand-300"
									style={{ backgroundColor: "rgba(99,102,241,0.15)" }}
								>
									{activeTab === "songs"
										? playlist.length
										: biblePlaylist.length}
								</span>
								<span className="p-1 rounded-md text-white/40 transition-all">
									{isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
								</span>
							</div>

							{!isCollapsed && (
								<div className="flex-1 overflow-y-auto p-2">
									{(activeTab === "songs" ? playlist : biblePlaylist).length ===
									0 ? (
										<div className="p-6 text-center text-white/15 text-xs">
											Duplo-clique ou clique no{" "}
											<Plus className="inline w-3 h-3 text-brand-400" /> para
											adicionar{" "}
											{activeTab === "songs" ? "louvores" : "versículos"}.
										</div>
									) : (
										(activeTab === "songs" ? playlist : biblePlaylist).map(
											(item, idx) => (
												<div
													key={item.title + "-" + idx}
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
														if (
															dragIdx !== null &&
															overIdx !== null &&
															dragIdx !== overIdx
														) {
															if (activeTab === "songs") {
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
														dragIdx === idx
															? "opacity-40 border-brand-500/50 bg-brand-500/10 scale-95"
															: overIdx === idx &&
																	dragIdx !== null &&
																	dragIdx !== idx
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
														onClick={(e) => {
															e.stopPropagation();
															if (activeTab === "songs") removeFromPlaylist(idx);
															else removeFromBiblePlaylist(idx);
														}}
														className="p-1 rounded-md text-white/15 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												</div>
											),
										)
									)}
								</div>
							)}
						</div>
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
