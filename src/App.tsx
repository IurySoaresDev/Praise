import { useEffect, useState, useRef } from "react";
import { useStore } from "./store";
import { useBible } from "./hooks/useBible";
import { useEditor } from "./hooks/useEditor";
import { TitleBar } from "./components/TitleBar";
import { SystemNav } from "./components/SystemNav";
import { EditorTab } from "./components/EditorTab";
import { SettingsTab } from "./components/SettingsTab";
import { SongsSidebar } from "./components/SongsSidebar";
import { BibleSidebar } from "./components/BibleSidebar";
import { Playlist } from "./components/Playlist";
import { MainContent } from "./components/MainContent";
import { DuplicateModal } from "./components/DuplicateModal";
import { SuccessToast } from "./components/SuccessToast";
import "./App.css";

function App() {
	const {
		selectedSong,
		playlist,
		biblePlaylist,
		activeTab,
		setActiveTab,
		setProjectionMode,
	} = useStore();

	// Domain hooks
	const bible = useBible();
	const editor = useEditor();

	// Collapse state for playlists
	const [isSongsCollapsed, setIsSongsCollapsed] = useState(true);
	const [isBibleCollapsed, setIsBibleCollapsed] = useState(true);

	const isCollapsed = activeTab === "songs" ? isSongsCollapsed : isBibleCollapsed;
	const setIsCollapsed = activeTab === "songs" ? setIsSongsCollapsed : setIsBibleCollapsed;
	const prevPlaylistLenRef = useRef(playlist.length);
	const prevBiblePlaylistLenRef = useRef(biblePlaylist.length);

	// Auto-expand on add, auto-collapse on empty
	useEffect(() => {
		const prevLen = prevPlaylistLenRef.current;
		if (playlist.length > prevLen && isSongsCollapsed) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setIsSongsCollapsed(false);
		} else if (playlist.length === 0 && prevLen > 0) {
			setIsSongsCollapsed(true);
		}
		prevPlaylistLenRef.current = playlist.length;
	}, [playlist.length, isSongsCollapsed]);

	useEffect(() => {
		const prevLen = prevBiblePlaylistLenRef.current;
		if (biblePlaylist.length > prevLen && isBibleCollapsed) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setIsBibleCollapsed(false);
		} else if (biblePlaylist.length === 0 && prevLen > 0) {
			setIsBibleCollapsed(true);
		}
		prevBiblePlaylistLenRef.current = biblePlaylist.length;
	}, [biblePlaylist.length, isBibleCollapsed]);

	// Reset projection mode when entering Bible tab
	useEffect(() => {
		if (activeTab === "bible" || selectedSong?.collection === "Bíblia") {
			setProjectionMode("default");
		}
	}, [activeTab, selectedSong, setProjectionMode]);

	const { showDuplicateModal, setShowDuplicateModal, duplicateTitle, showSuccessToast, successMessage } = editor;

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

				{/* Sidebar (songs/bible tabs only) */}
				{activeTab !== "editor" && activeTab !== "settings" && (
					<div
						className="w-[340px] flex flex-col border-r border-white/[0.07]"
						style={{ backgroundColor: "#0f1219" }}
					>
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

				{/* Main content area (songs/bible tabs only) */}
				{activeTab !== "editor" && activeTab !== "settings" && (
					<MainContent />
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
