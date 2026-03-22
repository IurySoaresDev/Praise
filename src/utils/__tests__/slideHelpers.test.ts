import { describe, expect, it } from "vitest"

import type { Song } from "../../store"
import { getSlideBackground, getSlideTitle, isBible } from "../slideHelpers"

const mockSong: Song = {
  title: "Grande é o Senhor",
  content: "Estrofe 1\n\nEstrofe 2\n\nEstrofe 3",
  collection: "Coletânea 2018",
}

const mockBibleSong: Song = {
  title: "Gênesis 1",
  content:
    "[Gênesis 1:1]\n1. No princípio criou Deus\n\n[Gênesis 1:2]\n2. E a terra era sem forma",
  collection: "Bíblia",
}

describe("isBible", () => {
  it("deve retornar true para coleção Bíblia", () => {
    expect(isBible(mockBibleSong)).toBe(true)
  })

  it("deve retornar false para louvores", () => {
    expect(isBible(mockSong)).toBe(false)
  })

  it("deve retornar false para null", () => {
    expect(isBible(null)).toBe(false)
  })
})

describe("getSlideTitle", () => {
  it("deve retornar título do louvor no slide 0", () => {
    expect(getSlideTitle(mockSong, 0)).toBe("Grande é o Senhor")
  })

  it("deve retornar string vazia para slides > 0 em louvores", () => {
    expect(getSlideTitle(mockSong, 1)).toBe("")
    expect(getSlideTitle(mockSong, 2)).toBe("")
  })

  it("deve extrair referência do versículo para Bíblia", () => {
    expect(getSlideTitle(mockBibleSong, 0)).toBe("Gênesis 1:1")
    expect(getSlideTitle(mockBibleSong, 1)).toBe("Gênesis 1:2")
  })

  it("deve retornar título padrão se referência não for encontrada", () => {
    const bibleSong: Song = {
      title: "Salmos 23",
      content: "O Senhor é meu pastor",
      collection: "Bíblia",
    }
    expect(getSlideTitle(bibleSong, 0)).toBe("Salmos 23")
  })

  it("deve retornar string vazia para song null", () => {
    expect(getSlideTitle(null, 0)).toBe("")
  })
})

describe("getSlideBackground", () => {
  const songBg = "/backgrounds/bg-song.jpg"
  const songBodyBg = "/backgrounds/bg-song-body.jpg"
  const bibleBg = "/backgrounds/bg-bible.jpg"

  it("deve retornar fundo de Bíblia para passagens bíblicas", () => {
    expect(
      getSlideBackground(mockBibleSong, 0, songBg, songBodyBg, bibleBg),
    ).toBe(bibleBg)
    expect(
      getSlideBackground(mockBibleSong, 1, songBg, songBodyBg, bibleBg),
    ).toBe(bibleBg)
  })

  it("deve retornar fundo de título para slide 0 de louvores", () => {
    expect(getSlideBackground(mockSong, 0, songBg, songBodyBg, bibleBg)).toBe(
      songBg,
    )
  })

  it("deve retornar fundo de corpo para slides > 0 de louvores", () => {
    expect(getSlideBackground(mockSong, 1, songBg, songBodyBg, bibleBg)).toBe(
      songBodyBg,
    )
    expect(getSlideBackground(mockSong, 2, songBg, songBodyBg, bibleBg)).toBe(
      songBodyBg,
    )
  })
})
