import { AlertTriangle, X } from 'lucide-react';

interface DuplicateModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
}

export function DuplicateModal({ isOpen, title, onClose }: DuplicateModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={onClose}
    >
      <div
        className="modal-content p-6 rounded-2xl border border-white/10 shadow-2xl max-w-sm w-full mx-4"
        style={{ backgroundColor: '#161b26' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-white">
              Louvor Duplicado
            </h3>
            <p className="text-[11px] text-white/40">
              Este louvor já existe na lista
            </p>
          </div>
        </div>
        <p className="text-[13px] text-white/60 mb-5 leading-relaxed">
          O louvor{' '}
          <span className="font-semibold text-amber-300">
            &quot;{title}&quot;
          </span>{' '}
          já está cadastrado na biblioteca.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, #64748b, #475569)',
          }}
        >
          <X className="w-4 h-4" />
          Entendi
        </button>
      </div>
    </div>
  );
}
