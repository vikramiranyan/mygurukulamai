# Cloudflare deployment

The frontend is a static Vite build and the hosted tutor is a separate Cloudflare Worker.

## Frontend

```bash
npm install
npm run build
npx wrangler pages project create gurukulam-ai
npx wrangler pages deploy dist --project-name gurukulam-ai
```

Set `VITE_AI_API_URL` in the frontend environment to the deployed Worker URL, for example:

```text
https://gurukulam-ai-tutor.<account>.workers.dev
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

The frontend intentionally does not fall back to canned tutor replies when `VITE_AI_API_URL` is missing. Configure the Worker URL before testing general questions, otherwise the app reports that hosted AI is not configured.

## Google OAuth

Add the final Cloudflare Pages origin to the Google OAuth web client as an authorized JavaScript origin. Drive tokens remain in browser memory and are not sent to the AI Worker.
