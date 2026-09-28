# Cloudflare deployment

The frontend is a static Vite build and the hosted tutor is a separate Cloudflare Worker.

## Frontend

```bash
npm install
npm run build
npx wrangler pages project create gurukulam-ai
npx wrangler pages deploy dist --project-name gurukulam-ai
```

The deployed GitHub Pages workflow sets `VITE_AI_API_URL` to the tutor Worker URL during its production build. Other builds may set it explicitly:

```text
https://tutor.gurukulam-ai.workers.dev
```

Rebuild after changing the frontend environment variable.

## Worker

```bash
cd worker
npm install
npx wrangler secret put AI_API_KEY
npx wrangler deploy
```

The secret is entered interactively and is never committed. Configure `ALLOWED_ORIGIN` in `worker/wrangler.toml` to the exact Pages origin before deployment. For local development, copy `.dev.vars.example` to `.dev.vars` and run:

```bash
npx wrangler dev
```

The default provider adapter targets a Gemini-compatible `generateContent` endpoint with Google Search grounding enabled. This lets the tutor search the web for factual, current, or unfamiliar questions before answering. It uses `AI_MODEL` as the model name. Provider quotas and free-tier terms can change; keep the model configurable rather than embedding it in the frontend.

The frontend defaults to the production tutor Worker URL when `VITE_AI_API_URL` is omitted. It intentionally does not fall back to canned tutor replies.

## Google OAuth

Add every frontend origin to both the Google OAuth web client as an authorized JavaScript origin and the comma-separated `ALLOWED_ORIGIN` list in `worker/wrangler.toml`. The Worker currently permits `https://vikram.gurukulam-ai.workers.dev` and `https://vikramiranyan.github.io`. Drive tokens remain in browser memory and are not sent to the AI Worker.
