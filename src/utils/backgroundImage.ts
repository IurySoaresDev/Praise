import { convertFileSrc } from "@tauri-apps/api/core"

export const DEFAULT_BACKGROUNDS = {
  song: "/backgrounds/bg-song.jpg",
  songBody: "/backgrounds/bg-song-body.jpg",
  bible: "/backgrounds/bg-bible.jpg",
} as const

export type BackgroundKind = keyof typeof DEFAULT_BACKGROUNDS

/** Fundos embutidos no build (pasta public/backgrounds). */
export function isBundledBackground(path: string): boolean {
  return path.startsWith("/backgrounds/")
}

/** Converte caminho de fundo para URL carregável no WebView. */
export function resolveBackgroundSrc(path: string): string {
  if (!path) return ""
  if (isBundledBackground(path)) return path
  return convertFileSrc(path)
}
