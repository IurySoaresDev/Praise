import { describe, expect, it, vi } from "vitest"

import {
  DEFAULT_BACKGROUNDS,
  isBundledBackground,
  resolveBackgroundSrc,
} from "../backgroundImage"

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://${path}`,
}))

describe("backgroundImage", () => {
  it("identifica fundos embutidos", () => {
    expect(isBundledBackground(DEFAULT_BACKGROUNDS.song)).toBe(true)
    expect(isBundledBackground("/home/user/bg.jpg")).toBe(false)
  })

  it("retorna caminho público para fundos embutidos", () => {
    expect(resolveBackgroundSrc(DEFAULT_BACKGROUNDS.bible)).toBe(
      DEFAULT_BACKGROUNDS.bible,
    )
  })

  it("usa convertFileSrc para fundos personalizados", () => {
    expect(resolveBackgroundSrc("/data/bg.png")).toBe("asset:///data/bg.png")
  })
})
