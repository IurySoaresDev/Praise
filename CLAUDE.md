# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Praise App — church projection system for worship lyrics and Bible passages. Built with Tauri v2 (Rust) + React 19 + TypeScript + Vite 7. Targets Windows and Linux.

## Commands

All commands run from the project root:

```bash
pnpm install             # Install dependencies
pnpm dev                 # Start Vite dev server (port 1420)
pnpm build               # TypeScript check + Vite production build
pnpm lint                # Run ESLint on src/
pnpm test                # Run Vitest in watch mode
pnpm vitest run          # Run tests once (CI mode)
pnpm tauri dev           # Run full Tauri app in dev mode
pnpm tauri build         # Build native installer (.msi/.exe/AppImage)
```

## Architecture

### Multi-Window Tauri App

- **Main window** (1200x800): Control UI — song/Bible library, playlist editor, settings
- **Projection window**: Full-screen output on secondary monitor, receives slides via Tauri events

### Data Flow

```
React UI → Zustand store → Tauri invoke() → Rust backend → Disk (JSON)
                ↓
        Projection window (via Tauri events)
```

### Key Files

- `src/App.tsx` — Main UI component (~2100 lines, monolithic)
- `src/Projection.tsx` — Projection window renderer
- `src/store.ts` — Zustand global state (songs, playlists, settings, colors, fonts)
- `src/main.tsx` — React Router setup (routes `/` and `/projection`)
- `src/App.css` — Tailwind v4 + custom theme utilities
- `src-tauri/src/lib.rs` — Rust backend: monitor detection, slide projection, file I/O
- `src-tauri/tauri.conf.json` — Window config, plugins, updater settings

### Data

- `src/assets/data.json` — Song/collection database (~1.2MB JSON)
- `src/assets/pt_*.json` — Bible versions (ACF, ARA, NVI)
- Songs are loaded into Zustand at startup, persisted via `save_songs()` Rust command

### Projection Modes

- **Default**: Full lyrics per slide (split on double newlines)
- **Subtitle (legenda)**: 2 lines per slide for church displays
- Highlight keywords (CORO, REFRÃO, BIS) rendered in yellow

### Tech Stack Details

- **Styling**: Tailwind CSS v4 (vite plugin, no config file — uses CSS `@theme`)
- **State**: Zustand 5 (no middleware/persist — persistence via Tauri backend)
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Updates**: Tauri updater plugin with GitHub Releases endpoint

## Language

UI text is hardcoded in Portuguese (pt-BR). Commit messages are also in Portuguese.

## CI/CD

- **ci.yml**: Runs lint and tests on every PR to `main` (pnpm with cache)
- **release.yml**: Builds Tauri app on push to `main` for Windows and Linux, creates GitHub Release draft
