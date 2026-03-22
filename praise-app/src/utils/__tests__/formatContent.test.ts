import { describe, it, expect } from 'vitest';
import { formatContent, formatContentSubtitle } from '../formatContent';

describe('formatContent', () => {
  it('deve separar estrofes por \\n\\n em slides distintos', () => {
    const content = 'Linha 1\nLinha 2\n\nLinha 3\nLinha 4';
    const slides = formatContent(content);
    expect(slides).toHaveLength(2);
  });

  it('deve converter texto para maiúsculo em louvores', () => {
    const slides = formatContent('santo é o senhor');
    expect(slides[0]).toBe('SANTO É O SENHOR');
  });

  it('não deve converter para maiúsculo em conteúdo de Bíblia', () => {
    const slides = formatContent('E conhecereis a verdade', 'Bíblia');
    expect(slides[0]).toBe('E conhecereis a verdade');
  });

  it('deve destacar palavras-chave (CORO, REFRÃO, BIS) em amarelo', () => {
    const slides = formatContent('Coro\nRefrão\nBis');
    expect(slides[0]).toContain('text-yellow-400');
    expect(slides[0]).toContain('CORO');
    expect(slides[0]).toContain('REFRÃO');
    expect(slides[0]).toContain('BIS');
  });

  it('deve destacar INSTRUMENTAL, INTRO, PONTE e FINAL', () => {
    const slides = formatContent('Instrumental\n\nIntro\n\nPonte\n\nFinal');
    for (const slide of slides) {
      expect(slide).toContain('text-yellow-400');
    }
  });

  it('não deve destacar palavras-chave em conteúdo de Bíblia', () => {
    const slides = formatContent('Coro de louvores', 'Bíblia');
    expect(slides[0]).not.toContain('text-yellow-400');
  });

  it('deve remover tags HTML do conteúdo', () => {
    const slides = formatContent('<b>Santo</b> é o <i>Senhor</i>');
    expect(slides[0]).not.toContain('<b>');
    expect(slides[0]).not.toContain('<i>');
    expect(slides[0]).toContain('SANTO');
  });

  it('deve remover referências entre colchetes em Bíblia', () => {
    const slides = formatContent('[Gênesis 1:1]\n1. No princípio criou Deus', 'Bíblia');
    // A referência sozinha na linha vira string vazia, ficando apenas o texto
    expect(slides[0]).not.toContain('Gênesis 1:1');
    expect(slides[0]).toContain('No princípio criou Deus');
  });

  it('deve remover número do versículo em Bíblia (ex: "1. ")', () => {
    const slides = formatContent('1. No princípio criou Deus', 'Bíblia');
    expect(slides[0]).toBe('No princípio criou Deus');
  });

  it('deve juntar linhas dentro de uma estrofe com <br />', () => {
    const slides = formatContent('Linha 1\nLinha 2');
    expect(slides[0]).toBe('LINHA 1<br />LINHA 2');
  });
});

describe('formatContentSubtitle', () => {
  it('deve agrupar linhas de 2 em 2', () => {
    const content = 'Linha 1\nLinha 2\nLinha 3\nLinha 4';
    const slides = formatContentSubtitle(content);
    expect(slides).toHaveLength(2);
    expect(slides[0]).toContain('LINHA 1');
    expect(slides[0]).toContain('LINHA 2');
  });

  it('deve lidar com número ímpar de linhas', () => {
    const content = 'Linha 1\nLinha 2\nLinha 3';
    const slides = formatContentSubtitle(content);
    expect(slides).toHaveLength(2);
    expect(slides[1]).toBe('LINHA 3');
  });

  it('deve ignorar separação de estrofes (\\n\\n)', () => {
    const content = 'Linha 1\n\nLinha 2\n\nLinha 3\n\nLinha 4';
    const slides = formatContentSubtitle(content);
    expect(slides).toHaveLength(2);
  });

  it('deve remover pontuação final (vírgula, ponto, ponto-e-vírgula)', () => {
    const slides = formatContentSubtitle('Primeira linha\nSegunda linha,');
    expect(slides[0]).not.toMatch(/,$/);

    const slides2 = formatContentSubtitle('Primeira linha\nSegunda linha.');
    expect(slides2[0]).not.toMatch(/\.$/);

    const slides3 = formatContentSubtitle('Primeira linha\nSegunda linha;');
    expect(slides3[0]).not.toMatch(/;$/);
  });

  it('deve destacar palavras-chave em louvores', () => {
    const slides = formatContentSubtitle('Coro\nGlória a Deus');
    expect(slides[0]).toContain('text-yellow-400');
  });

  it('não deve destacar palavras-chave em Bíblia', () => {
    const slides = formatContentSubtitle('Coro celestial\nDe anjos', 'Bíblia');
    expect(slides[0]).not.toContain('text-yellow-400');
  });

  it('deve remover linhas vazias antes de agrupar', () => {
    const content = 'Linha 1\n\n\n\nLinha 2';
    const slides = formatContentSubtitle(content);
    expect(slides).toHaveLength(1);
    expect(slides[0]).toContain('LINHA 1');
    expect(slides[0]).toContain('LINHA 2');
  });
});
