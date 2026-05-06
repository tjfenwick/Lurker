# Lurker

A web game where you read a scrubbed Reddit post and guess which subreddit it came from.

## Stack

Vite + React 18 + TypeScript (strict) + Tailwind CSS. Vitest for tests. No backend.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build
npm test         # run scrub-utility tests
npm run lint     # eslint
```

## Data pipeline

```bash
npm run fetch    # pulls + scrubs Reddit posts into public/posts.json (~40 min full run)
```

A pre-built corpus is committed to `public/posts.json`. Re-run `npm run fetch` to refresh it.
