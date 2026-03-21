import { Music, BookOpen, FilePenLine, Settings } from 'lucide-react';

type Tab = 'songs' | 'bible' | 'editor' | 'settings';

interface SystemNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: 'songs' as const, icon: Music, label: 'Louvor' },
  { id: 'bible' as const, icon: BookOpen, label: 'Bíblia' },
  { id: 'editor' as const, icon: FilePenLine, label: 'Editar' },
  { id: 'settings' as const, icon: Settings, label: 'Opções' },
];

export function SystemNav({ activeTab, onTabChange }: SystemNavProps) {
  return (
    <div
      className="w-[72px] flex flex-col items-center py-4 border-r border-white/[0.07] z-20 shrink-0"
      style={{ backgroundColor: '#0a0c14' }}
    >
      <div className="flex flex-col gap-2 w-full px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all ${
              activeTab === tab.id
                ? 'bg-brand-500/30 text-white shadow-inner scale-95 glow-brand'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
