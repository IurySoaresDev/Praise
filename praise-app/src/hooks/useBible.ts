import { useEffect, useState } from 'react';

export type BibleVersion = 'NVI' | 'ACF' | 'ARA';

export function useBible() {
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchBibleQuery, setSearchBibleQuery] = useState('');
  const [searchChapterQuery, setSearchChapterQuery] = useState('');
  const [bibleVersion, setBibleVersion] = useState<BibleVersion>('ARA');
  const [bibleData, setBibleData] = useState<any[]>([]);
  const [isLoadingBible, setIsLoadingBible] = useState(true);

  useEffect(() => {
    setIsLoadingBible(true);
    const loadBible = async () => {
      let mod;
      switch (bibleVersion) {
        case 'ACF':
          mod = await import('../assets/pt_acf.json');
          break;
        case 'ARA':
          mod = await import('../assets/pt_ara.json');
          break;
        case 'NVI':
        default:
          mod = await import('../assets/pt_nvi.json');
          break;
      }

      const newData = (mod.default as any[]) || [];
      setBibleData(newData);

      setSelectedBook((prev: any) => {
        if (!prev) return null;
        return newData.find((b: any) => b.abbrev === prev.abbrev) || null;
      });
      setIsLoadingBible(false);
    };
    loadBible();
  }, [bibleVersion]);

  const bibleBooks =
    searchBibleQuery.trim() === ''
      ? bibleData
      : bibleData.filter(
          (book) =>
            book.name.toLowerCase().includes(searchBibleQuery.toLowerCase()) ||
            book.abbrev.toLowerCase().includes(searchBibleQuery.toLowerCase()),
        );

  const bibleVerses =
    selectedBook && selectedChapter
      ? selectedBook.chapters[selectedChapter - 1].map(
          (text: string, i: number) => ({
            number: i + 1,
            text,
          }),
        )
      : [];

  return {
    selectedBook,
    setSelectedBook,
    selectedChapter,
    setSelectedChapter,
    searchBibleQuery,
    setSearchBibleQuery,
    searchChapterQuery,
    setSearchChapterQuery,
    bibleVersion,
    setBibleVersion,
    bibleData,
    isLoadingBible,
    bibleBooks,
    bibleVerses,
  };
}
