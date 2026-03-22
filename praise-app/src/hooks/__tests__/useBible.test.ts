import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBible } from '../useBible';

// Mock the dynamic Bible imports
vi.mock('../../assets/pt_ara.json', () => ({
  default: [
    {
      name: 'Gênesis',
      abbrev: 'gn',
      chapters: [
        ['No princípio criou Deus os céus e a terra.', 'E a terra era sem forma e vazia.'],
        ['Assim, pois, foram acabados os céus e a terra.'],
      ],
    },
    {
      name: 'Êxodo',
      abbrev: 'ex',
      chapters: [['Estes são os nomes dos filhos de Israel.']],
    },
  ],
}));

vi.mock('../../assets/pt_acf.json', () => ({
  default: [
    {
      name: 'Gênesis',
      abbrev: 'gn',
      chapters: [['No princípio criou Deus os céus e a terra (ACF).']],
    },
  ],
}));

vi.mock('../../assets/pt_nvi.json', () => ({
  default: [
    {
      name: 'Gênesis',
      abbrev: 'gn',
      chapters: [['No princípio Deus criou os céus e a terra (NVI).']],
    },
  ],
}));

describe('useBible', () => {
  it('deve iniciar com versão ARA e carregando', () => {
    const { result } = renderHook(() => useBible());
    expect(result.current.bibleVersion).toBe('ARA');
    expect(result.current.isLoadingBible).toBe(true);
  });

  it('deve carregar livros da Bíblia após inicialização', async () => {
    const { result } = renderHook(() => useBible());
    // Wait for the async load
    await vi.waitFor(() => {
      expect(result.current.isLoadingBible).toBe(false);
    });
    expect(result.current.bibleBooks.length).toBeGreaterThan(0);
  });

  it('deve filtrar livros pela busca', async () => {
    const { result } = renderHook(() => useBible());
    await vi.waitFor(() => {
      expect(result.current.isLoadingBible).toBe(false);
    });

    act(() => {
      result.current.setSearchBibleQuery('Gên');
    });

    expect(result.current.bibleBooks).toHaveLength(1);
    expect(result.current.bibleBooks[0].name).toBe('Gênesis');
  });

  it('deve retornar versículos ao selecionar livro e capítulo', async () => {
    const { result } = renderHook(() => useBible());
    await vi.waitFor(() => {
      expect(result.current.isLoadingBible).toBe(false);
    });

    act(() => {
      result.current.setSelectedBook(result.current.bibleBooks[0]);
      result.current.setSelectedChapter(1);
    });

    expect(result.current.bibleVerses.length).toBeGreaterThan(0);
    expect(result.current.bibleVerses[0].number).toBe(1);
  });

  it('deve recarregar ao mudar versão', async () => {
    const { result } = renderHook(() => useBible());
    await vi.waitFor(() => {
      expect(result.current.isLoadingBible).toBe(false);
    });

    act(() => {
      result.current.setBibleVersion('ACF');
    });

    await vi.waitFor(() => {
      expect(result.current.isLoadingBible).toBe(false);
    });

    expect(result.current.bibleBooks.length).toBeGreaterThan(0);
  });
});
