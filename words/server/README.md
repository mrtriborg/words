Backend instructions

1. Open a terminal and go to the `server` folder:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Start the server (port 5000):

```bash
npm start
```

Endpoints:
- `GET /api/words` — returns all words
- `POST /api/words/import` — merges `{ "words": [...] }` into the saved list by ID
- `PUT /api/words/:id` — update a word (send JSON body with fields to update, e.g. `{ "learned": true }`)

For local development, the front-end proxies `/api` to `http://localhost:5000`.
For a separately deployed front-end (for example, a Render Static Site), set
`REACT_APP_API_BASE_URL` to the backend's public base URL **before building and deploying**
the front-end (without a trailing slash). This is a build-time setting; changing it on an
already-built static site does not update the JavaScript bundle.

On Render, use a persistent database for saved edits and imports: set `STORAGE_MODE=db`
and `DATABASE_URL` on the backend service. The default file storage is suitable for local
development, but files on a Render service's local filesystem may be lost on redeploy.
