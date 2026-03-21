import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor } from '../useEditor';

// Mock Tauri plugins
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
}));

const mockAddSong = vi.fn().mockReturnValue({ duplicate: false });
const mockImportSongs = vi.fn().mockReturnValue({ added: 0, duplicates: 0 });
const mockUpdateSong = vi.fn().mockReturnValue({ success: true });

vi.mock('../../store', () => ({
  useStore: () => ({
    addSongToCollection: mockAddSong,
    importSongsFromJSON: mockImportSongs,
    updateSong: mockUpdateSong,
  }),
  EDITABLE_COLLECTIONS: ['CIA 2018', 'Avulsos 2018'],
}));

describe('useEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve iniciar com formulário vazio', () => {
    const { result } = renderHook(() => useEditor());
    expect(result.current.editorTitle).toBe('');
    expect(result.current.editorContent).toBe('');
    expect(result.current.editingSongTitle).toBeNull();
  });

  it('deve atualizar campos do formulário', () => {
    const { result } = renderHook(() => useEditor());

    act(() => {
      result.current.setEditorTitle('Novo Louvor');
      result.current.setEditorContent('Letra do louvor');
    });

    expect(result.current.editorTitle).toBe('Novo Louvor');
    expect(result.current.editorContent).toBe('Letra do louvor');
  });

  it('deve selecionar música para edição', () => {
    const { result } = renderHook(() => useEditor());
    const song = { title: 'Existente', content: 'Conteúdo', collection: 'CIA 2018' };

    act(() => {
      result.current.selectSongForEditing(song);
    });

    expect(result.current.editingSongTitle).toBe('Existente');
    expect(result.current.editorTitle).toBe('Existente');
    expect(result.current.editorContent).toBe('Conteúdo');
    expect(result.current.editorCollection).toBe('CIA 2018');
  });

  it('deve resetar formulário', () => {
    const { result } = renderHook(() => useEditor());

    act(() => {
      result.current.selectSongForEditing({ title: 'Test', content: 'C', collection: 'CIA 2018' });
    });
    expect(result.current.editingSongTitle).toBe('Test');

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.editingSongTitle).toBeNull();
    expect(result.current.editorTitle).toBe('');
    expect(result.current.editorContent).toBe('');
  });

  it('deve detectar duplicata ao salvar novo louvor', () => {
    mockAddSong.mockReturnValueOnce({ duplicate: true, existingTitle: 'Existente' });
    const { result } = renderHook(() => useEditor());

    act(() => {
      result.current.setEditorTitle('Existente');
      result.current.setEditorContent('Conteúdo');
    });

    act(() => {
      result.current.handleSave();
    });

    expect(result.current.showDuplicateModal).toBe(true);
    expect(result.current.duplicateTitle).toBe('Existente');
  });

  it('não deve salvar com campos vazios', () => {
    const { result } = renderHook(() => useEditor());

    act(() => {
      result.current.handleSave();
    });

    expect(mockAddSong).not.toHaveBeenCalled();
    expect(mockUpdateSong).not.toHaveBeenCalled();
  });

  it('deve mostrar toast de sucesso ao salvar', () => {
    const { result } = renderHook(() => useEditor());

    act(() => {
      result.current.setEditorTitle('Novo');
      result.current.setEditorContent('Conteúdo do louvor');
    });

    act(() => {
      result.current.handleSave();
    });

    expect(result.current.showSuccessToast).toBe(true);
    expect(result.current.successMessage).toContain('Novo');
  });
});
