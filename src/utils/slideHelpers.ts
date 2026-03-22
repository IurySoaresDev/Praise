import type { Song } from "../store"

/**
 * Returns whether a song is a Bible passage.
 */
export function isBible(song: Song | null): boolean {
  return song?.collection === "Bíblia"
}

/**
 * Gets the slide title for a given index.
 * - For Bible: extracts the verse reference (e.g. "[Genesis 1:1]") from raw content
 * - For songs: title on slide 0, empty on the rest
 */
export function getSlideTitle(song: Song | null, index: number): string {
  if (!song) return ""
  if (isBible(song)) {
    const rawSlide = song.content.split("\n\n")[index] || ""
    const match = rawSlide.match(/^\[(.*?)\]/)
    return match ? match[1] : song.title
  }
  return index === 0 ? song.title : ""
}

/**
 * Selects the appropriate background for a slide.
 */
export function getSlideBackground(
  song: Song | null,
  slideIndex: number,
  songBackground: string,
  songBodyBackground: string,
  bibleBackground: string,
): string {
  if (isBible(song)) return bibleBackground
  return slideIndex === 0 ? songBackground : songBodyBackground
}
