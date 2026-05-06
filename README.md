# Lurker

A web game where you read a scrubbed Reddit post and guess which subreddit it came from. Multiple choice, four options, infinite mode with streak tracking.

> **Live demo:** _add your deployed URL here_

## Stack

- **Vite 5** + **React 18** + **TypeScript 5** (strict, `noUncheckedIndexedAccess`)
- **Tailwind CSS 3** for styling — no UI framework
- **Vitest** for unit tests
- **Static site** — no backend, no database, no auth. Posts are pre-fetched into `public/posts.json` by a Node script and served alongside the bundle.

## Project layout

```
public/
  posts.json              ← scrubbed corpus, ~1-5 MB
  manifest.webmanifest    ← PWA manifest (installable on mobile)
  favicon.svg
scripts/
  fetch.ts                ← pulls + scrubs from Reddit (~40 min full run)
  generate-fixture.ts     ← writes a small synthetic posts.json for dev
  scrub.ts                ← all post/comment scrubbing rules
  subreddits.ts           ← source of truth for the 31-sub pool
src/
  App.tsx                 ← orchestrates fetch + reducer + keyboard
  components/             ← StatsBar, PostCard, ChoiceButton, ResultPanel,
                            DifficultyToggle, CommentsList, StatsModal
  game/                   ← reducer, selector, localStorage wrapper
  util/                   ← formatting + share-grid generator
  types.ts                ← shared TS types
tests/
  scrub.test.ts           ← 33 cases covering every Appendix B rule
  state.test.ts           ← 13 reducer cases incl. the 10-round smoke test
  share.test.ts           ← share-grid format pinned
.github/workflows/
  refresh-posts.yml       ← optional weekly cron to refresh posts.json
```

## Local development

```bash
npm install
npm run dev          # vite dev server at http://localhost:5173
npm run build        # production build to dist/
npm run preview      # serves the production build locally
npm test             # vitest, all suites
npm run lint         # eslint with @typescript-eslint
npm run format       # prettier
```

### Data: real corpus vs synthetic fixture

The app expects `public/posts.json` to exist. You have two ways to populate it:

```bash
# Option A — real Reddit data. Sequential, polite, ~40 minutes.
npm run fetch
npm run fetch -- --limit-subs 2 --limit-posts 5    # quick smoke test

# Option B — synthetic fixture. Instant. ~36 hand-crafted posts across all 31 subs.
npm run fixture
```

A small synthetic `posts.json` is committed so the app runs out of the box. Re-run `npm run fetch` to replace it with a real corpus.

### Windows + network shares

If you develop on a Windows network share (e.g. `\\Truenas\share\…`) and find that Vite's HMR is flaky, enable filesystem polling in `vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  server: { watch: { usePolling: true, interval: 500 } },
});
```

A `.gitattributes` is committed that normalizes everything to LF on checkout to avoid CRLF-on-Windows churn.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `1`–`4` | Pick that choice |
| `Enter` / `Space` | Advance to the next round (after answering) |
| `c` / `C` | Toggle the comments section |
| `Esc` | Close the stats modal |

## Deploying

The repo builds to a fully static `dist/` — drop it on any static host. Vercel is the path of least resistance:

1. Push this repo to GitHub (it likely already is if you're reading this).
2. Open <https://vercel.com/new> and import the repo.
3. Vercel auto-detects Vite. Build command `npm run build`, output `dist/`. No environment variables needed.
4. Deploy. The first build serves the same `posts.json` that's committed to the repo.
5. Edit this README and replace the demo placeholder with the production URL.

Other hosts that work with zero config:
- **Netlify** — same flow, build command `npm run build`, publish `dist/`
- **Cloudflare Pages** — same
- **GitHub Pages** — needs `base: '/Lurker/'` in `vite.config.ts` if served from a subpath

### Optional: weekly refresh action

`.github/workflows/refresh-posts.yml` re-runs the fetch every Sunday at 03:00 UTC and opens a pull request if `public/posts.json` changed. Two prerequisites:

1. Edit `scripts/fetch.ts` and update the `USER_AGENT` constant to include a real reddit username (Reddit will rate-limit aggressively without one — `lurker/1.0 (by /u/your-username)` is the format they prefer).
2. The default `GITHUB_TOKEN` is enough for the PR if your repo settings allow Actions to create pull requests. **Repo → Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"** must be checked.

You can also kick off the workflow manually via the **Actions** tab → *Refresh posts.json* → *Run workflow*.

## Testing

```bash
npm test
```

51 cases as of writing:

- **scrub** (33) — every Appendix B rule, plus HTML entity decoding, markdown link stripping, comment-rejection rules, length gating
- **state** (13) — selector invariants (uniqueness, difficulty filter, recently-used skip), full 10-round game flow, streak break/preserve, per-sub accuracy, persistence, no-double-advance guard, recent-results capping
- **share** (5) — share-grid output format pinned

## Architecture notes

- **The browser never talks to Reddit.** Data prep is an offline step.
- **Subreddit ground truth lives in JS state but never reaches the DOM** until the answer is revealed. PostCard renders `r/[hidden]` in the metadata row pre-answer.
- **Stats persist to localStorage** (`lurker:stats:v1`). Comment-hidden flag persists per session in `sessionStorage`.
- **The scrubber uses sentinels** to avoid the `[this sub]` placeholder colliding with the later "this sub → this community" rule. Sub-specific initialisms (TIFU, AITA, MIL) run *before* the bare-name pass to avoid the sub name eating the abbreviation.

## License

ISC.
