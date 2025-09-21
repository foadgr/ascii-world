# Repository Guidelines

## Project Structure & Module Organization
- `pages/` Next.js routes and `pages/api/` serverless API (e.g., shader endpoints).
- `components/<feature>/` UI modules (kebab-case folder) with `index.js` and `*.module.scss`.
- `lib/` shared utilities; `hooks/` React hooks; `layouts/` layout wrappers.
- `styles/` global and partial SCSS; `public/` static assets; `assets/` design/source assets.
- `app/` app icons/manifest (PWA assets). `config/` feature configs.
- Use absolute imports from repo root (see `jsconfig.json`).

## Build, Test, and Development Commands
- `pnpm dev` – Run Next.js locally with Turbopack.
- `pnpm build` – Production build (Turbopack).
- `pnpm start` – Serve built app.
- `pnpm lint` – Lint/format via Next + Biome.
- `pnpm run analyze` (and `analyze:*`) – Bundle analysis builds.
- Pre-commit runs Biome via Lefthook; run `pnpm exec biome check --write` to fix.

## Coding Style & Naming Conventions
- Biome enforced: 2-space indent, single quotes, semicolons as needed, trailing commas (ES5), line width 80.
- React: functional components; component identifiers in PascalCase; folders/files in kebab-case.
- SCSS Modules: name `*.module.scss` colocated with component.
- Imports: prefer absolute (`components/...`, `lib/...`) over deep relatives.

## Testing Guidelines
- No formal test suite yet. For new code: add unit tests (Vitest + React Testing Library) and, when applicable, E2E (Playwright).
- Name tests `*.test.js` colocated or in `__tests__/` next to source.
- Target ≥80% coverage for new/changed files; include a brief test plan in PR.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat|fix|chore|docs|refactor(scope): short imperative subject`.
- History shows mixed styles; standardize on the above going forward.
- PRs must include: clear description, linked issues, screenshots/GIFs for UI changes, steps to validate locally, and `pnpm lint` clean.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local` (see `.env.example`). After merges, run `pnpm dlx vercel env pull` if applicable.
- Keep certificates in `certs/` for local dev only; do not add new certs to VCS.
- Place runtime assets in `public/`; design/source assets in `assets/`.

## Agent-Specific Instructions
- Keep changes minimal and scoped; do not reformat unrelated files.
- Respect existing file structure and public APIs/routes; discuss breaking changes first.
- Run `pnpm lint` locally before proposing changes.

