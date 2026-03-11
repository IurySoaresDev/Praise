import { create } from 'zustand';
import rawData from './assets/data.json';

export interface Song {
  title: string;
  content: string;
  collection: string;
}

export interface Collection {
  name: string;
  type: string;
  lang: string;
  songs: Omit<Song, 'collection'>[];
}

export interface AppState {
  collections: Collection[];
  songs: Song[];
  searchQuery: string;
  selectedCategory: string;
  selectedSong: Song | null;
  activeSlideIndex: number;
  availableMonitors: string[];
  selectedMonitor: string | null;
  playlist: Song[];
  biblePlaylist: Song[];
  
  // Settings & Backgrounds
  activeTab: 'songs' | 'bible' | 'editor' | 'settings';
  songBackground: string;
  bibleBackground: string;

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedSong: (song: Song | null) => void;
  setActiveSlideIndex: (index: number) => void;
  setAvailableMonitors: (monitors: string[]) => void;
  setSelectedMonitor: (monitor: string | null) => void;
  addToPlaylist: (song: Song) => void;
  removeFromPlaylist: (index: number) => void;
  moveSongInPlaylist: (oldIndex: number, newIndex: number) => void;
  addToBiblePlaylist: (song: Song) => void;
  removeFromBiblePlaylist: (index: number) => void;
  moveSongInBiblePlaylist: (oldIndex: number, newIndex: number) => void;
  addSongToCollection: (title: string, content: string, collectionName: string) => { duplicate: boolean; existingTitle?: string };
  getExportData: () => Collection[];
  importSongsFromJSON: (data: any) => { added: number; duplicates: number };
  updateSong: (oldTitle: string, updatedSong: Song) => { success: boolean; duplicate?: boolean };
  
  setActiveTab: (tab: 'songs' | 'bible' | 'editor' | 'settings') => void;
  setSongBackground: (path: string) => void;
  setBibleBackground: (path: string) => void;
}

export const ALLOWED_COLLECTIONS = ["Coletânea 2018", "CIA 2018", "Avulsos 2018"];

// Flatten songs from all collections and ensure uniqueness
const initialCollections = (rawData as Collection[]).filter(c => ALLOWED_COLLECTIONS.includes(c.name));
const collections: Collection[] = [];
const allSongs: Song[] = [];
const seenTitles = new Set<string>();

initialCollections.forEach(c => {
  const uniqueSongs: Omit<Song, 'collection'>[] = [];
  c.songs.forEach(s => {
    const normalizedTitle = (s.title || "").trim().toUpperCase();
    if (normalizedTitle && !seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      uniqueSongs.push(s);
      allSongs.push({ ...s, collection: c.name });
    }
  });
  collections.push({ ...c, songs: uniqueSongs });
});

export const useStore = create<AppState>((set, get) => ({
  collections,
  songs: allSongs,
  searchQuery: '',
  selectedCategory: 'Todas',
  selectedSong: null,
  activeSlideIndex: -1,
  availableMonitors: [],
  selectedMonitor: null,
  playlist: [],
  biblePlaylist: [],

  // Initial Backgrounds (using relative paths for Vite/Tauri)
  activeTab: 'songs',
  songBackground: '/backgrounds/bg-song.jpg',
  bibleBackground: '/backgrounds/bg-bible.jpg',

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category, selectedSong: null }),
  setSelectedSong: (song) => set({ selectedSong: song, activeSlideIndex: 0 }),
  setActiveSlideIndex: (index) => set({ activeSlideIndex: index }),
  setAvailableMonitors: (monitors) => set({ availableMonitors: monitors }),
  setSelectedMonitor: (monitor) => set({ selectedMonitor: monitor }),
  addToPlaylist: (song) => set((state) => ({ playlist: [...state.playlist, song] })),
  removeFromPlaylist: (index) => set((state) => ({ 
    playlist: state.playlist.filter((_, i) => i !== index) 
  })),
  moveSongInPlaylist: (oldIndex, newIndex) => set((state) => {
    if (newIndex < 0 || newIndex >= state.playlist.length) return state;
    const newPlaylist = [...state.playlist];
    const [moved] = newPlaylist.splice(oldIndex, 1);
    newPlaylist.splice(newIndex, 0, moved);
    return { playlist: newPlaylist };
  }),
  addToBiblePlaylist: (song) => set((state) => ({ biblePlaylist: [...state.biblePlaylist, song] })),
  removeFromBiblePlaylist: (index) => set((state) => ({ 
    biblePlaylist: state.biblePlaylist.filter((_, i) => i !== index) 
  })),
  moveSongInBiblePlaylist: (oldIndex, newIndex) => set((state) => {
    if (newIndex < 0 || newIndex >= state.biblePlaylist.length) return state;
    const newPlaylist = [...state.biblePlaylist];
    const [moved] = newPlaylist.splice(oldIndex, 1);
    newPlaylist.splice(newIndex, 0, moved);
    return { biblePlaylist: newPlaylist };
  }),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSongBackground: (path) => set({ songBackground: path }),
  setBibleBackground: (path) => set({ bibleBackground: path }),

  addSongToCollection: (title, content, collectionName) => {
    const state = get();
    // Verificar duplicata (case-insensitive)
    const normalizedTitle = title.trim().toUpperCase();
    const existing = state.songs.find(
      s => s.title.trim().toUpperCase() === normalizedTitle
    );
    if (existing) {
      return { duplicate: true, existingTitle: existing.title };
    }

    const newSong: Song = { title: title.trim(), content, collection: collectionName };

    set((s) => {
      // Adiciona à lista de collections
      const updatedCollections = s.collections.map(c => {
        if (c.name === collectionName) {
          return { ...c, songs: [...c.songs, { title: newSong.title, content: newSong.content }] };
        }
        return c;
      });

      return {
        collections: updatedCollections,
        songs: [...s.songs, newSong],
      };
    });

    return { duplicate: false };
  },

  getExportData: () => {
    return get().collections;
  },

  importSongsFromJSON: (data: any) => {
    const state = get();
    let added = 0;
    let duplicates = 0;
    const existingTitles = new Set(
      state.songs.map(s => s.title.trim().toUpperCase())
    );
    const newSongs: Song[] = [];
    const updatedCollections = state.collections.map(c => ({ ...c, songs: [...c.songs] }));

    // Se o dado não for array, tenta tratar como objeto único
    const items = Array.isArray(data) ? data : [data];
    
    // Lista para processar
    const songsToProcess: Song[] = [];

    for (const item of items) {
      if (!item) continue;
      
      // Caso 1: Array de Collections (formato exportado pelo app)
      if (item.songs && Array.isArray(item.songs)) {
        for (const s of item.songs) {
          songsToProcess.push({ 
            title: s.title, 
            content: s.content, 
            collection: item.name || ALLOWED_COLLECTIONS[0] 
          });
        }
      } 
      // Caso 2: Objeto Song direto ou Array de Songs
      else if (item.title && item.content) {
        songsToProcess.push({ 
          title: item.title, 
          content: item.content, 
          collection: item.collection || ALLOWED_COLLECTIONS[0] 
        });
      }
    }

    for (const song of songsToProcess) {
      const normalizedTitle = song.title.trim().toUpperCase();
      if (existingTitles.has(normalizedTitle)) {
        duplicates++;
        continue;
      }
      existingTitles.add(normalizedTitle);
      added++;
      
      const targetCol = ALLOWED_COLLECTIONS.includes(song.collection) 
        ? song.collection 
        : ALLOWED_COLLECTIONS[0];
        
      newSongs.push({ ...song, title: song.title.trim(), collection: targetCol });

      const col = updatedCollections.find(c => c.name === targetCol);
      if (col) {
        col.songs.push({ title: song.title.trim(), content: song.content });
      }
    }

    if (added > 0) {
      set({ collections: updatedCollections, songs: [...state.songs, ...newSongs] });
    }

    return { added, duplicates };
  },

  updateSong: (oldTitle, updatedSong) => {
    const state = get();
    const normalizedOldTitle = oldTitle.trim().toUpperCase();
    const normalizedNewTitle = updatedSong.title.trim().toUpperCase();

    // Se o título mudou, verificar se o novo título já existe em OUTRO louvor
    if (normalizedOldTitle !== normalizedNewTitle) {
      const isDuplicate = state.songs.some(
        s => s.title.trim().toUpperCase() === normalizedNewTitle && s.title.trim().toUpperCase() !== normalizedOldTitle
      );
      if (isDuplicate) return { success: false, duplicate: true };
    }

    set((s) => {
      // 1. Atualizar lista global de songs
      const updatedSongs = s.songs.map(song => 
        song.title.trim().toUpperCase() === normalizedOldTitle 
          ? { ...updatedSong, title: updatedSong.title.trim() } 
          : song
      );

      // 2. Atualizar coleções
      const updatedCollections = s.collections.map(col => {
        // Encontra a música na coleção (mesmo que ela esteja mudando de coleção, 
        // removemos da antiga e adicionamos na nova se necessário, 
        // mas aqui vamos apenas atualizar onde ela estiver ou recomeçar)
        
        // Remove a música da coleção onde ela estava (pelo título antigo)
        const songsWithoutOld = col.songs.filter(
          s => s.title.trim().toUpperCase() !== normalizedOldTitle
        );

        // Se esta for a coleção de destino, adicionamos a música atualizada
        if (col.name === updatedSong.collection) {
          return {
            ...col,
            songs: [...songsWithoutOld, { title: updatedSong.title.trim(), content: updatedSong.content }]
          };
        }
        
        // Se não for a coleção de destino, apenas retornamos a lista sem a música antiga
        return { ...col, songs: songsWithoutOld };
      });

      return {
        songs: updatedSongs,
        collections: updatedCollections,
      };
    });

    return { success: true };
  },
}));
