# AWC Admin

Internal content admin for the AWC Software website. Deployed separately from
the public site so admin code is never shipped to visitors.

- **Public site:** `AWC-UI/awc-ui` (React 18, Vite 5, Tailwind 3)
- **API:** `awc-backend` (Express + MongoDB)
- **This app:** React 19, Vite 8, Tailwind 4 (CSS-first), TypeScript strict

## Running locally

```bash
npm install
npm run dev      # http://localhost:5180 (strictPort)
```

The backend must be running on `http://localhost:5001` and its `CORS_ORIGIN`
must include `http://localhost:5180`. Auth uses httpOnly cookies, so the port
is not interchangeable — a different origin is rejected by CORS.

Create the first admin account from the backend repo:

```bash
npm run seed:admin
```

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server on 5180 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run lint` | ESLint |

## Deployment

Its own AWS Amplify app on `admin.awcsoftware.com`.

**The SPA rewrite must be configured manually in the Amplify console**
(`/<*>` → `/index.html`, 200). There is no `public/_redirects` convention in
this org, and without the rewrite every deep link 404s on refresh.

## Editor / sanitizer contract

The TipTap extension set in `src/components/editor/RichTextEditor.tsx` must
stay aligned with the server allowlist in
`awc-backend/src/utils/sanitizeHtml.ts`. Anything the editor can produce but
the sanitizer discards disappears silently when an author saves.

After every save the editor is re-seeded from the server's response, so authors
always see the sanitized result rather than what they typed.
