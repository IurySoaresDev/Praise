import { useEffect, useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '../store';
import { formatContent, formatContentSubtitle } from '../utils/formatContent';
import { getSlideTitle, getSlideBackground, isBible as isBibleCheck } from '../utils/slideHelpers';

interface ProjectSlideParams {
  content: string;
  background?: string | null;
  itemType?: string;
  title?: string;
  titleColor?: string;
  lyricsColor?: string;
  titleFont?: string;
  titleSize?: number;
  titleWeight?: string;
  lyricsFont?: string;
  lyricsSize?: number;
  lyricsWeight?: string;
  projectionMode?: string;
}

export function useProjection(selectedMonitor: string) {
  const {
    selectedSong,
    activeSlideIndex,
    setActiveSlideIndex,
    songBackground,
    songBodyBackground,
    bibleBackground,
    songTitleColor,
    songLyricsColor,
    bibleTitleColor,
    bibleLyricsColor,
    songTitleFont,
    songTitleSize,
    songTitleWeight,
    songLyricsFont,
    songLyricsSize,
    songLyricsWeight,
    bibleTitleFont,
    bibleTitleSize,
    bibleTitleWeight,
    bibleLyricsFont,
    bibleLyricsSize,
    bibleLyricsWeight,
    projectionMode,
  } = useStore();

  const [isProjecting, setIsProjecting] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);

  const slides = selectedSong
    ? projectionMode === 'subtitle'
      ? formatContentSubtitle(selectedSong.content, selectedSong.collection)
      : formatContent(selectedSong.content, selectedSong.collection)
    : [];

  const sendSlideToProjection = useCallback(
    async (params: ProjectSlideParams) => {
      if (isFrozen) return;
      try {
        await invoke('project_slide', {
          monitor: selectedMonitor,
          title: params.title || '',
          content: params.content,
          background: params.background || null,
          itemType: params.itemType || 'song',
          titleColor: params.titleColor,
          lyricsColor: params.lyricsColor,
          titleFont: params.titleFont,
          titleSize: params.titleSize,
          titleWeight: params.titleWeight,
          lyricsFont: params.lyricsFont,
          lyricsSize: params.lyricsSize,
          lyricsWeight: params.lyricsWeight,
          projectionMode: params.projectionMode || projectionMode,
        });
      } catch (e) {
        console.error('Erro ao projetar:', e);
      }
    },
    [selectedMonitor, isFrozen, projectionMode],
  );

  const getProjectionParams = useCallback(
    (index: number): ProjectSlideParams | null => {
      if (!selectedSong || slides[index] === undefined) return null;
      const bible = isBibleCheck(selectedSong);
      return {
        content: slides[index],
        background: getSlideBackground(selectedSong, index, songBackground, songBodyBackground, bibleBackground),
        itemType: bible ? 'bible' : 'song',
        title: getSlideTitle(selectedSong, index),
        titleColor: bible ? bibleTitleColor : songTitleColor,
        lyricsColor: bible ? bibleLyricsColor : songLyricsColor,
        titleFont: bible ? bibleTitleFont : songTitleFont,
        titleSize: bible ? bibleTitleSize : songTitleSize,
        titleWeight: bible ? bibleTitleWeight : songTitleWeight,
        lyricsFont: bible ? bibleLyricsFont : songLyricsFont,
        lyricsSize: bible ? bibleLyricsSize : songLyricsSize,
        lyricsWeight: bible ? bibleLyricsWeight : songLyricsWeight,
        projectionMode,
      };
    },
    [
      selectedSong,
      slides,
      songBackground,
      songBodyBackground,
      bibleBackground,
      songTitleColor,
      songLyricsColor,
      bibleTitleColor,
      bibleLyricsColor,
      songTitleFont,
      songTitleSize,
      songTitleWeight,
      songLyricsFont,
      songLyricsSize,
      songLyricsWeight,
      bibleTitleFont,
      bibleTitleSize,
      bibleTitleWeight,
      bibleLyricsFont,
      bibleLyricsSize,
      bibleLyricsWeight,
      projectionMode,
    ],
  );

  const handleSelectSlide = useCallback(
    (index: number) => {
      setActiveSlideIndex(index);
      if (isProjecting) {
        const params = getProjectionParams(index);
        if (params) sendSlideToProjection(params);
      }
    },
    [isProjecting, setActiveSlideIndex, getProjectionParams, sendSlideToProjection],
  );

  const handleStartProjection = useCallback(async () => {
    if (!selectedSong || slides.length === 0) return;
    setIsProjecting(true);
    const idx = activeSlideIndex >= 0 ? activeSlideIndex : 0;
    setActiveSlideIndex(idx);
    const params = getProjectionParams(idx);
    if (params) await sendSlideToProjection(params);
  }, [selectedSong, slides, activeSlideIndex, setActiveSlideIndex, getProjectionParams, sendSlideToProjection]);

  const handleStopProjection = useCallback(async () => {
    setIsProjecting(false);
    setIsFrozen(false);
    try {
      await invoke('close_projection');
    } catch (e) {
      console.error('Erro ao fechar projeção:', e);
    }
  }, []);

  // Unified keyboard handler via ref (avoids stale closures)
  const handleKeyDownRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  useEffect(() => {
    handleKeyDownRef.current = (e: KeyboardEvent) => {
      if (!selectedSong || !isProjecting) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (activeSlideIndex < slides.length - 1) {
          const newIdx = activeSlideIndex + 1;
          setActiveSlideIndex(newIdx);
          const params = getProjectionParams(newIdx);
          if (params) sendSlideToProjection(params);
        } else {
          handleStopProjection();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (activeSlideIndex > 0) {
          const newIdx = activeSlideIndex - 1;
          setActiveSlideIndex(newIdx);
          const params = getProjectionParams(newIdx);
          if (params) sendSlideToProjection(params);
        }
      }
    };
  }, [
    activeSlideIndex,
    slides,
    selectedSong,
    isProjecting,
    setActiveSlideIndex,
    sendSlideToProjection,
    getProjectionParams,
    handleStopProjection,
  ]);

  // Window keydown listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (handleKeyDownRef.current) handleKeyDownRef.current(e);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Tauri projection-key-press event listener (once)
  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    import('@tauri-apps/api/event')
      .then(({ listen }) => {
        listen<{ key: string }>('projection-key-press', (event) => {
          if (handleKeyDownRef.current) {
            handleKeyDownRef.current(
              new KeyboardEvent('keydown', { key: event.payload.key }),
            );
          }
        }).then((f) => (unlistenFn = f));
      })
      .catch(console.error);
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  // Sync colors/fonts in real-time while projecting
  useEffect(() => {
    if (isProjecting && activeSlideIndex >= 0 && slides[activeSlideIndex]) {
      const params = getProjectionParams(activeSlideIndex);
      if (params) sendSlideToProjection(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    songTitleColor,
    songLyricsColor,
    bibleTitleColor,
    bibleLyricsColor,
    songTitleFont,
    songTitleSize,
    songTitleWeight,
    songLyricsFont,
    songLyricsSize,
    songLyricsWeight,
    bibleTitleFont,
    bibleTitleSize,
    bibleTitleWeight,
    bibleLyricsFont,
    bibleLyricsSize,
    bibleLyricsWeight,
    songBackground,
    songBodyBackground,
    bibleBackground,
    projectionMode,
  ]);

  return {
    isProjecting,
    isFrozen,
    setIsFrozen,
    slides,
    handleSelectSlide,
    handleStartProjection,
    handleStopProjection,
  };
}
