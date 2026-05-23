import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useProjection } from "../useProjection"

// Mock Tauri APIs
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}))

// Mock store
const mockStore = {
  selectedSong: null as ReturnType<
    typeof import("../../store").useStore.getState
  >["selectedSong"],
  activeSlideIndex: 0,
  setActiveSlideIndex: vi.fn(),
  songBackground: "/backgrounds/bg-song.jpg",
  songBodyBackground: "/backgrounds/bg-song-body.jpg",
  bibleBackground: "/backgrounds/bg-bible.jpg",
  songTitleColor: "#ffffff",
  songLyricsColor: "#ffffff",
  bibleTitleColor: "#ffffff",
  bibleLyricsColor: "#ffffff",
  songTitleFont: "Inter",
  songTitleSize: 32,
  songTitleWeight: "bold",
  songLyricsFont: "Inter",
  songLyricsSize: 72,
  songLyricsWeight: "bold",
  bibleTitleFont: "Inter",
  bibleTitleSize: 40,
  bibleTitleWeight: "bold",
  bibleLyricsFont: "Inter",
  bibleLyricsSize: 64,
  bibleLyricsWeight: "medium",
  projectionMode: "default" as const,
}

vi.mock("../../store", () => ({
  useStore: () => mockStore,
}))

describe("useProjection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.selectedSong = null
    mockStore.activeSlideIndex = 0
  })

  it("deve iniciar com isProjecting false", () => {
    const { result } = renderHook(() => useProjection("monitor-1"))
    expect(result.current.isProjecting).toBe(false)
  })

  it("deve iniciar com isFrozen false", () => {
    const { result } = renderHook(() => useProjection("monitor-1"))
    expect(result.current.isFrozen).toBe(false)
  })

  it("deve retornar slides vazio quando não há música selecionada", () => {
    const { result } = renderHook(() => useProjection("monitor-1"))
    expect(result.current.slides).toEqual([])
  })

  it("deve gerar slides quando há música selecionada", () => {
    mockStore.selectedSong = {
      title: "Teste",
      content: "Verso 1\n\nVerso 2",
      collection: "Avulsos 2018",
    }
    const { result } = renderHook(() => useProjection("monitor-1"))
    expect(result.current.slides).toHaveLength(2)
  })

  it("não deve iniciar projeção sem música selecionada", async () => {
    const { result } = renderHook(() => useProjection("monitor-1"))
    await act(async () => {
      await result.current.handleStartProjection()
    })
    expect(result.current.isProjecting).toBe(false)
  })

  it("deve parar projeção e resetar isFrozen", async () => {
    mockStore.selectedSong = {
      title: "Teste",
      content: "Verso 1\n\nVerso 2",
      collection: "Avulsos 2018",
    }
    const { result } = renderHook(() => useProjection("monitor-1"))

    // Start projection
    await act(async () => {
      await result.current.handleStartProjection()
    })
    expect(result.current.isProjecting).toBe(true)

    // Freeze
    act(() => {
      result.current.setIsFrozen(true)
    })
    expect(result.current.isFrozen).toBe(true)

    // Stop projection
    await act(async () => {
      await result.current.handleStopProjection()
    })
    expect(result.current.isProjecting).toBe(false)
    expect(result.current.isFrozen).toBe(false)
  })

  it("deve chamar setActiveSlideIndex ao selecionar slide", () => {
    mockStore.selectedSong = {
      title: "Teste",
      content: "Verso 1\n\nVerso 2",
      collection: "Avulsos 2018",
    }
    const { result } = renderHook(() => useProjection("monitor-1"))

    act(() => {
      result.current.handleSelectSlide(1)
    })
    expect(mockStore.setActiveSlideIndex).toHaveBeenCalledWith(1)
  })
})
