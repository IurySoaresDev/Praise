import { invoke } from "@tauri-apps/api/core"
import { useEffect, useRef } from "react"

import { useStore } from "../store"
import type { PersistedSettings } from "../types/settings"

function collectSettings(
  state: ReturnType<typeof useStore.getState>,
): PersistedSettings {
  return {
    songBackground: state.songBackground,
    songBodyBackground: state.songBodyBackground,
    bibleBackground: state.bibleBackground,
    songTitleColor: state.songTitleColor,
    songLyricsColor: state.songLyricsColor,
    bibleTitleColor: state.bibleTitleColor,
    bibleLyricsColor: state.bibleLyricsColor,
    songTitleFont: state.songTitleFont,
    songTitleSize: state.songTitleSize,
    songTitleWeight: state.songTitleWeight,
    songLyricsFont: state.songLyricsFont,
    songLyricsSize: state.songLyricsSize,
    songLyricsWeight: state.songLyricsWeight,
    bibleTitleFont: state.bibleTitleFont,
    bibleTitleSize: state.bibleTitleSize,
    bibleTitleWeight: state.bibleTitleWeight,
    bibleLyricsFont: state.bibleLyricsFont,
    bibleLyricsSize: state.bibleLyricsSize,
    bibleLyricsWeight: state.bibleLyricsWeight,
    projectionMode: state.projectionMode,
  }
}

export function useSettingsPersistence() {
  const hydrated = useRef(false)

  useEffect(() => {
    invoke<PersistedSettings>("load_settings")
      .then((settings) => {
        useStore.setState({
          songBackground: settings.songBackground,
          songBodyBackground: settings.songBodyBackground,
          bibleBackground: settings.bibleBackground,
          songTitleColor: settings.songTitleColor,
          songLyricsColor: settings.songLyricsColor,
          bibleTitleColor: settings.bibleTitleColor,
          bibleLyricsColor: settings.bibleLyricsColor,
          songTitleFont: settings.songTitleFont,
          songTitleSize: settings.songTitleSize,
          songTitleWeight: settings.songTitleWeight,
          songLyricsFont: settings.songLyricsFont,
          songLyricsSize: settings.songLyricsSize,
          songLyricsWeight: settings.songLyricsWeight,
          bibleTitleFont: settings.bibleTitleFont,
          bibleTitleSize: settings.bibleTitleSize,
          bibleTitleWeight: settings.bibleTitleWeight,
          bibleLyricsFont: settings.bibleLyricsFont,
          bibleLyricsSize: settings.bibleLyricsSize,
          bibleLyricsWeight: settings.bibleLyricsWeight,
          projectionMode: settings.projectionMode,
        })
      })
      .catch((error) => {
        console.error("Falha ao carregar configurações:", error)
      })
      .finally(() => {
        hydrated.current = true
      })
  }, [])

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined

    const unsubscribe = useStore.subscribe(() => {
      if (!hydrated.current) return
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        const settings = collectSettings(useStore.getState())
        invoke("save_settings", { settings }).catch((error) => {
          console.error("Falha ao salvar configurações:", error)
        })
      }, 400)
    })

    return () => {
      if (timeout) clearTimeout(timeout)
      unsubscribe()
    }
  }, [])
}
