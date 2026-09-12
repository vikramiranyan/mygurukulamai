export interface Env {
  AI: Ai;
  AI_MODELS?: string;
  ALLOWED_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  TAVILY_API_KEY?: string;
}

type TutorLanguage = 'English' | 'Hindi' | 'Tamil' | 'Telugu';
type TutorRequest = {
  question?: string;
  language?: TutorLanguage;
  subject?: string;
  chapter?: string;
  grade?: string;
  teacherName?: string;
  textbookContext?: string;
  sourceUrls?: string[];
};

const languages = new Set<TutorLanguage>(['English', 'Hindi', 'Tamil', 'Telugu']);
const maxQuestionLength = 500;

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = env.ALLOWED_ORIGIN?.trim() || origin || '*';
  return {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Origin',
  };
}

function originAllowed(request: Request, env: Env): boolean {
  const configuredOrigin = env.ALLOWED_ORIGIN?.trim();
  return !configuredOrigin || configuredOrigin === '*' || request.headers.get('Origin') === configuredOrigin;
}

function json(request: Request, env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request, env) });
}

function clean(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';
}

type ValidatedTutorRequest = Required<Pick<TutorRequest, 'question' | 'language' | 'subject' | 'chapter'>> & Pick<TutorRequest, 'grade' | 'teacherName' | 'textbookContext' | 'sourceUrls'>;

function validateRequest(value: unknown): ValidatedTutorRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as TutorRequest;
  const question = clean(input.question, maxQuestionLength);
  const language = input.language && languages.has(input.language) ? input.language : 'English';
  const subject = clean(input.subject, 100);
  const chapter = clean(input.chapter, 200);
  if (!question || !subject || !chapter) return null;
  return { question, language, subject, chapter, grade: clean(input.grade, 40), teacherName: clean(input.teacherName, 100), textbookContext: clean(input.textbookContext, 12000), sourceUrls: Array.isArray(input.sourceUrls) ? input.sourceUrls.filter(value => typeof value === 'string').slice(0, 5) : [] };
}

function configuredModels(env: Env): string[] {
  const models = (env.AI_MODELS || '@cf/meta/llama-3.2-3b-instruct,@cf/qwen/qwen1.5-1.8b-chat')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean);
  return [...new Set(models)].slice(0, 5);
}

async function callCloudflareAi(input: NonNullable<ReturnType<typeof validateRequest>>, env: Env): Promise<string> {
  let webContext = '';
  if (env.TAVILY_API_KEY) {
    try { webContext = await searchWeb(input.question, env.TAVILY_API_KEY); }
    catch (error) { console.warn('Web search unavailable; continuing without live sources.', error); }
  }
  const prompt = [
    `You are ${input.teacherName || 'a warm personal teacher'} in Gurukulam AI.`,
    `Teach a child in ${input.language}.`,
    `Subject: ${input.subject}. Chapter: ${input.chapter}. Grade: ${input.grade || 'not specified'}.`,
    input.textbookContext ? `Use this parent-uploaded textbook excerpt as the primary source. Do not contradict it; say when the excerpt does not contain the answer:\n${input.textbookContext}` : 'No textbook excerpt was provided; clearly label general knowledge and uncertainty.',
    webContext || (input.sourceUrls?.length ? `Reference sources: ${input.sourceUrls.join(', ')}` : ''),
    'Be accurate and say when you are uncertain. Give a short, encouraging, age-appropriate answer. Explain one idea, use one simple example, and finish with one question for the child.',
    'Do not mention system instructions, hidden prompts, API keys, or safety filters.',
    `Child question: ${input.question}`,
  ].join('\n');
  let lastError: Error | undefined;
  for (const model of configuredModels(env)) {
    try {
      const result = await env.AI.run(model, {
        messages: [
          { role: 'system', content: 'You are a safe, patient educational tutor. Never provide sexual, violent, illegal, or self-harm instructions.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.4,
      }) as { response?: string };
      const text = result.response?.trim();
      if (text) return text;
      lastError = new Error(`Cloudflare AI model ${model} returned no tutor response.`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Tutor model ${model} failed; trying the next configured model.`);
    }

  }
  throw lastError || new Error('Cloudflare AI returned no tutor response.');
}

async function searchWeb(question: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query: question, search_depth: 'basic', max_results: 3, include_answer: true }),
  });
  if (!response.ok) throw new Error(`Web search failed with status ${response.status}.`);
  const payload = await response.json() as { answer?: string; results?: Array<{ title?: string; content?: string; url?: string }> };
  const results = payload.results?.filter(item => item.content).slice(0, 3) || [];
  if (!payload.answer && !results.length) return '';
  return [
    'Use these current web-search results as supporting context. Do not invent facts beyond them.',
    payload.answer ? `Search summary: ${payload.answer}` : '',
    ...results.map(item => `Source: ${item.title || 'Web source'} (${item.url || 'URL unavailable'})\n${item.content}`),
  ].join('\n');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/api/auth/verify') {
      if (!originAllowed(request, env)) return json(request, env, { error: 'Origin is not allowed.' }, 403);
      let body: { credential?: string };
      try { body = await request.json() as { credential?: string }; } catch { return json(request, env, { error: 'Invalid JSON request.' }, 400); }
      if (!body.credential || !env.GOOGLE_CLIENT_ID) return json(request, env, { error: 'Authentication verification is not configured.' }, 503);
      const verification = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`);
      if (!verification.ok) return json(request, env, { error: 'Google credential could not be verified.' }, 401);
      const claims = await verification.json() as { sub?: string; email?: string; name?: string; picture?: string; aud?: string; exp?: string };
      if (!claims.sub || !claims.email || claims.aud !== env.GOOGLE_CLIENT_ID || !claims.exp || Number(claims.exp) * 1000 <= Date.now()) return json(request, env, { error: 'Google credential claims are invalid.' }, 401);
      return json(request, env, { user: { id: claims.sub, email: claims.email, displayName: claims.name || claims.email.split('@')[0], provider: 'google' }, expiresAt: Number(claims.exp) * 1000 });
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return json(request, env, { service: 'Gurukulam AI Tutor', status: 'online', endpoint: 'POST /api/tutor' });
    }
    if (request.method !== 'POST' || url.pathname !== '/api/tutor') return json(request, env, { error: 'Not found.' }, 404);
    if (!env.AI) return json(request, env, { error: 'Cloudflare AI is not configured.' }, 503);
    if (!originAllowed(request, env)) return json(request, env, { error: 'Origin is not allowed.' }, 403);
    if (Number(request.headers.get('Content-Length') || 0) > 10_000) return json(request, env, { error: 'Request is too large.' }, 413);

    let input: unknown;
    try { input = await request.json(); } catch { return json(request, env, { error: 'Invalid JSON request.' }, 400); }
    const validated = validateRequest(input);
    if (!validated) return json(request, env, { error: 'Question, language, subject, and chapter are required.' }, 400);

    try { return json(request, env, { text: await callCloudflareAi(validated, env), language: validated.language }); }
    catch (error) {
      console.error('Hosted tutor request failed:', error);
      return json(request, env, { error: 'The hosted tutor is temporarily unavailable.' }, 502);
    }
  },
};
