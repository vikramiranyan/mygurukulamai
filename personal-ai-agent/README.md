# Personal AI Agent (cloud prototype)

This app lives in its own subdirectory so it does not overwrite the existing Gurukulam project.

## Deploy
1. In Vercel, import https://github.com/vikramiranyan/mygurukulamai
2. Set the project Root Directory to `personal-ai-agent`.
3. Add environment variables:
   - `OPENROUTER_API_KEY`: your secret API key from https://openrouter.ai/settings/keys
   - `OPENROUTER_MODEL`: `openrouter/free`
4. Deploy. After adding/changing environment variables, redeploy.
5. Open the Vercel URL.

No local download or Ollama installation is required for this cloud version.

## Current capabilities
- Web chat interface
- Task planning and generated downloadable text/code files via model tool calls
- API key stays server-side

## Not yet enabled
No arbitrary shell execution, browser control, persistent memory, accounts, or auto-deploying generated code. Add these only with isolation, authentication, rate limits, and approval gates.

Free model routing is rate-limited and model availability can vary. Do not commit API keys or other secrets to GitHub.
