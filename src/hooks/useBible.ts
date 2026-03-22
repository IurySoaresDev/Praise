import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export type BibleVersion = 'NVI' | 'ACF' | 'ARA';

export interface BibleBook {
  name: string;
  abbrev: string;
  chapters: string[][];
}

export interface BibleVerse {
  number: number;
  text: string;
}

export interface UseBibleReturn {
  selectedBook: BibleBook | null;
  setSelectedBook: Dispatch<SetStateAction<BibleBook | null>>;
  selectedChapter: number | null;
  setSelectedChapter: Dispatch<SetStateAction<number | null>>;
  searchBibleQuery: string;
  setSearchBibleQuery: Dispatch<SetStateAction<string>>;
  searchChapterQuery: string;
  setSearchChapterQuery: Dispatch<SetStateAction<string>>;
  bibleVersion: BibleVersion;
  setBibleVersion: Dispatch<SetStateAction<BibleVersion>>;
  bibleData: BibleBook[];
  isLoadingBible: boolean;
  bibleBooks: BibleBook[];
  bibleVerses: BibleVerse[];
}

export function useBible(): UseBibleReturn {
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchBibleQuery, setSearchBibleQuery] = useState('');
  const [searchChapterQuery, setSearchChapterQuery] = useState('');
  const [bibleVersion, setBibleVersion] = useState<BibleVersion>('ARA');
  const [bibleData, setBibleData] = useState<BibleBook[]>([]);
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

      const newData = (mod.default as BibleBook[]) || [];
      setBibleData(newData);

      setSelectedBook((prev: BibleBook | null) => {
        if (!prev) return null;
        return newData.find((b) => b.abbrev === prev.abbrev) || null;
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

  const bibleVerses: BibleVerse[] =
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
