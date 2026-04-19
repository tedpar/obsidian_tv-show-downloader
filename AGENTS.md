# AGENTS.md

## What this is

An Obsidian plugin. Searches TV shows via the TMDB API and saves details as markdown files with YAML frontmatter.

## Build commands

- `npm run dev` — build with inline sourcemaps (watches nothing; single build)
- `npm run build` — production build (no sourcemaps, tree-shaken)

Both run `node esbuild.config.mjs`. Entry: `src/main.ts` → output: `main.js` (gitignored).

## No test/lint/typecheck

No test framework, linter, or typecheck script is configured. TypeScript strict mode is on (`noImplicitAny`, `strictNullChecks`), so `tsc --noEmit` can catch type errors but is not wired as a script.

## Architecture

- `src/main.ts` — Plugin entrypoint, registers ribbon icon + command
- `src/tmdb.ts` — TMDB API calls using Obsidian's `requestUrl` (not fetch/axios)
- `src/modal.ts` — Modal UI: search → results → detail → save flow
- `src/settings.ts` — Plugin settings (API key, save folder, provider region, open after save)
- `src/frontmatter.ts` — YAML frontmatter serialization from TMDB data + providers

## Key conventions

- Obsidian and Electron are external (not bundled); use Obsidian API (`requestUrl`, `Plugin`, `Modal`, etc.)
- Streaming provider defaults to region `SE` (Sweden)
- `homepage` is intentionally excluded from generated frontmatter
- Array values in frontmatter use `- item` YAML syntax; empty/null values are omitted
- Image paths in frontmatter include full `original` resolution URL
- File names are derived from show name: non-alphanumeric → `_`, lowercased
