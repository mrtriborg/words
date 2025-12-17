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
- `PUT /api/words/:id` — update a word (send JSON body with fields to update, e.g. `{ "learned": true }`)

The front-end expects the backend at the URL specified in REACT_APP_API_BASE_URL (default `http://localhost:5000`).
