# Personal AI Agent — Cloudflare Workers

This app is stored in the `personal-ai-agent` folder of your existing GitHub repository. No local download, Ollama installation, or private server is required.

## Deploy from GitHub to Cloudflare (no Vercel)

1. Sign in to or create a Cloudflare account: https://dash.cloudflare.com/
2. Open **Workers & Pages** → **Create application** → choose **GitHub**.
3. Connect GitHub if prompted, then select `vikramiranyan/mygurukulamai`.
4. Set the project root directory to `personal-ai-agent`.
5. Build command: `npx @opennextjs/cloudflare build`
6. Deploy command: `npx @opennextjs/cloudflare deploy`
7. In Worker settings → **Variables and Secrets**, add secret `OPENROUTER_API_KEY` using your own key from https://openrouter.ai/settings/keys. Add text variable `OPENROUTER_MODEL` with value `openrouter/free`.
8. Deploy and open the `*.workers.dev` URL Cloudflare provides.

Official guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
Git integration guide: https://developers.cloudflare.com/workers/ci-cd/builds/

## Current capabilities

- Cloud-hosted chat interface
- Task planning and downloadable code/text files through model tool calls
- API key read server-side from an environment secret

## Not yet implemented

Arbitrary shell execution, browser/computer control, durable memory, user accounts, and automated deployment of generated applications are not enabled yet. Add these only with isolation, authentication, rate limits, and approval gates.

Workers Free has execution limits; OpenRouter free model availability and rate limits vary. Never commit API keys or other secrets to GitHub.
