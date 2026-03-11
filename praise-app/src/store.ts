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
}

const ALLOWED_COLLECTIONS = ["Coletânea 2018", "CIA 2018", "Avulsos 2018"];

// Flatten songs from all collections for easier searching
const collections = (rawData as Collection[]).filter(c => ALLOWED_COLLECTIONS.includes(c.name));
const allSongs: Song[] = collections.flatMap(c => 
  c.songs.map(s => ({ ...s, collection: c.name }))
);

export const useStore = create<AppState>((set) => ({
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
}));
