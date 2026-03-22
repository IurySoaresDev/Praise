const HIGHLIGHT_WORDS = [
  "CORO",
  "REFRÃO",
  "BIS",
  "INSTRUMENTAL",
  "INTRO",
  "PONTE",
  "FINAL",
]

function highlightKeywords(text: string): string {
  let result = text
  HIGHLIGHT_WORDS.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi")
    if (regex.test(result)) {
      result = result.replace(
        regex,
        (match) =>
          `<span class="text-yellow-400 font-bold italic">${match}</span>`,
      )
    }
  })
  return result
}

function processLine(line: string, isBible: boolean): string {
  const trimmed = line.trim()
  if (!trimmed) return ""

  // Remove HTML tags
  const clean = trimmed.replace(/<[^>]+>/g, "")
  let formatted = isBible ? clean : clean.toUpperCase()

  if (isBible) {
    // Remove bracket references (they go to title)
    if (/^\[(.*?)\]$/.test(formatted)) {
      return ""
    }
    // Remove leading verse numbers (e.g. "1. ")
    formatted = formatted.replace(/^(\d+\.)\s/, "")
  }

  // Highlight keywords for songs only
  if (!isBible) {
    formatted = highlightKeywords(formatted)
  }

  return formatted
}

/**
 * Formats content for default projection mode.
 * Splits on double newlines to create slides, each line uppercase (except Bible).
 */
export function formatContent(content: string, collection?: string): string[] {
  const isBible = collection === "Bíblia"

  return content.split("\n\n").map((slide) => {
    const formattedLines = slide
      .split("\n")
      .map((line) => processLine(line, isBible))
    return formattedLines.join("<br />")
  })
}

/**
 * Formats content for subtitle (legenda) mode.
 * All lines are regrouped in pairs of 2, trailing punctuation removed.
 */
export function formatContentSubtitle(
  content: string,
  collection?: string,
): string[] {
  const isBible = collection === "Bíblia"

  const allLines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => processLine(line, isBible))
    .filter((line) => line.length > 0)

  const subtitleSlides: string[] = []
  for (let i = 0; i < allLines.length; i += 2) {
    const pair = allLines.slice(i, i + 2)
    // Remove trailing punctuation from last line of pair
    if (pair.length > 0) {
      const lastIdx = pair.length - 1
      const stripped = pair[lastIdx].replace(/<[^>]+>/g, "")
      const lastChar = stripped.trimEnd().slice(-1)
      if ([",", ".", ";"].includes(lastChar)) {
        const lastPunctuationIdx = pair[lastIdx].lastIndexOf(lastChar)
        pair[lastIdx] =
          pair[lastIdx].substring(0, lastPunctuationIdx) +
          pair[lastIdx].substring(lastPunctuationIdx + 1)
      }
    }
    subtitleSlides.push(pair.join("<br />"))
  }

  return subtitleSlides
}
