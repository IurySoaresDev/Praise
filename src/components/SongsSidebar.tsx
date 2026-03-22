import { useStore } from '../store';
import { SONG_CATEGORIES } from '../constants';
import { Search, Plus } from 'lucide-react';

export function SongsSidebar() {
  const {
    songs,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedSong,
    setSelectedSong,
    setActiveSlideIndex,
    addToPlaylist,
  } = useStore();

  const filteredSongs = songs.filter((song) => {
    const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || song.collection === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-4 flex flex-col gap-3 shrink-0 border-b border-white/[0.07]">
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
          {SONG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all flex-shrink-0 ${
                selectedCategory === cat
                  ? 'text-white shadow-md'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
              style={
                selectedCategory === cat
                  ? { background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }
                  : {}
              }
            >
              {cat.replace(' 2018', '')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {filteredSongs.map((song, idx) => (
          <div
            key={idx}
            onClick={() => {
              setSelectedSong(song);
              setActiveSlideIndex(0);
            }}
            onDoubleClick={() => addToPlaylist(song)}
            className={`w-full text-left px-2 py-1.5 mb-0.5 rounded-lg text-[13px] flex items-center group cursor-pointer transition-all hover:bg-white/5 ${selectedSong?.title === song.title ? 'bg-white/10' : ''}`}
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
  );
}
