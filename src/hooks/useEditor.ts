import { useState, type Dispatch, type SetStateAction } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { useStore, EDITABLE_COLLECTIONS, type Song } from '../store';

export interface UseEditorReturn {
  editorTitle: string;
  setEditorTitle: Dispatch<SetStateAction<string>>;
  editorContent: string;
  setEditorContent: Dispatch<SetStateAction<string>>;
  editorCollection: string;
  setEditorCollection: Dispatch<SetStateAction<string>>;
  editingSongTitle: string | null;
  setEditingSongTitle: Dispatch<SetStateAction<string | null>>;
  searchEditQuery: string;
  setSearchEditQuery: Dispatch<SetStateAction<string>>;
  selectedEditCategory: string;
  setSelectedEditCategory: Dispatch<SetStateAction<string>>;
  showDuplicateModal: boolean;
  setShowDuplicateModal: Dispatch<SetStateAction<boolean>>;
  duplicateTitle: string;
  showSuccessToast: boolean;
  successMessage: string;
  resetForm: () => void;
  handleSave: () => void;
  handleImportJSON: () => Promise<void>;
  selectSongForEditing: (song: Song) => void;
  showSuccess: (message: string, duration?: number) => void;
}

export function useEditor(): UseEditorReturn {
  const { addSongToCollection, importSongsFromJSON, updateSong } = useStore();

  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorCollection, setEditorCollection] = useState(EDITABLE_COLLECTIONS[0]);
  const [editingSongTitle, setEditingSongTitle] = useState<string | null>(null);
  const [searchEditQuery, setSearchEditQuery] = useState('');
  const [selectedEditCategory, setSelectedEditCategory] = useState('Todas');

  // Feedback state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const resetForm = () => {
    setEditingSongTitle(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorCollection(EDITABLE_COLLECTIONS[0]);
  };

  const showSuccess = (message: string, duration = 3000) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), duration);
  };

  const handleSave = () => {
    if (!editorTitle.trim() || !editorContent.trim()) return;

    if (editingSongTitle) {
      const result = updateSong(editingSongTitle, {
        title: editorTitle,
        content: editorContent,
        collection: editorCollection,
      });
      if (result.duplicate) {
        setDuplicateTitle(editorTitle);
        setShowDuplicateModal(true);
      } else {
        setEditingSongTitle(null);
        setEditorTitle('');
        setEditorContent('');
        showSuccess(`"${editorTitle.trim()}" atualizado com sucesso!`);
      }
    } else {
      const result = addSongToCollection(editorTitle, editorContent, editorCollection);
      if (result.duplicate) {
        setDuplicateTitle(result.existingTitle || editorTitle);
        setShowDuplicateModal(true);
      } else {
        setEditorTitle('');
        setEditorContent('');
        showSuccess(`"${editorTitle.trim()}" adicionado com sucesso!`);
      }
    }
  };

  const handleImportJSON = async () => {
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
          showSuccess(
            `${result.added} louvor(es) importado(s)!${result.duplicates > 0 ? ` (${result.duplicates} duplicata(s) ignorada(s))` : ''}`,
            4000,
          );
        } else {
          showSuccess(
            `Nenhum louvor novo encontrado. ${result.duplicates} já existiam.`,
            4000,
          );
        }
      }
    } catch (e) {
      console.error('Erro ao importar:', e);
      alert('Erro ao abrir seletor de arquivos: ' + JSON.stringify(e));
    }
  };

  const selectSongForEditing = (song: { title: string; content: string; collection: string }) => {
    setEditingSongTitle(song.title);
    setEditorTitle(song.title);
    setEditorContent(song.content);
    setEditorCollection(song.collection);
  };

  return {
    editorTitle,
    setEditorTitle,
    editorContent,
    setEditorContent,
    editorCollection,
    setEditorCollection,
    editingSongTitle,
    setEditingSongTitle,
    searchEditQuery,
    setSearchEditQuery,
    selectedEditCategory,
    setSelectedEditCategory,
    showDuplicateModal,
    setShowDuplicateModal,
    duplicateTitle,
    showSuccessToast,
    successMessage,
    resetForm,
    handleSave,
    handleImportJSON,
    selectSongForEditing,
    showSuccess,
  };
}
