import {
  DEFAULT_ROUTER_API_KEY,
  DEFAULT_ROUTER_BASE_URL,
  DEFAULT_ROUTER_MODEL,
} from "../shared/recap";
import { abortError, GeneratorUnavailableError } from "./errors";
import { asRecord, parseJson } from "./json";
import { parseRecapOutput, RECAP_SYSTEM_PROMPT, type ParsedRecap } from "./prompt";

// Direct Anthropic-compatible messages API generator (fork addition): no CLI, no login — used for
// GLM via the local claude-router. Same shape as the CLI paths: prompt in, validated recap out.

/** GLM-5.3 counts thinking and answer tokens against max_tokens together; small caps return no text. */
const MAX_TOKENS = 8192;
const ATTEMPTS = 4;
const RETRY_DELAY_MS = 1_500;

export interface RouterRecapArgs {
  baseUrl?: string;
  apiKey?: string;
  model: string | null;
  prompt: string;
  signal: AbortSignal;
  timeoutMs: number;
  /** Injectable for tests; defaults to global fetch. */
  fetchFn?: typeof fetch;
  /** Injectable for tests; defaults to a real delay that gives up on abort. */
  delayFn?: (ms: number, signal: AbortSignal) => Promise<void>;
}

export async function generateRouterRecap(args: RouterRecapArgs): Promise<ParsedRecap> {
  const baseUrl = (args.baseUrl ?? DEFAULT_ROUTER_BASE_URL).replace(/\/+$/, "");
  const apiKey = args.apiKey ?? DEFAULT_ROUTER_API_KEY;
  const model = args.model ?? DEFAULT_ROUTER_MODEL;
  const fetchFn = args.fetchFn ?? fetch;
  const delayFn = args.delayFn ?? defaultDelay;
  let lastError: Error = new Error("router generation did not run");
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    if (args.signal.aborted) throw abortError();
    try {
      const text = await requestText(fetchFn, baseUrl, apiKey, model, args.prompt, args.signal, args.timeoutMs);
      const recap = parseRecapOutput(text) ?? lenientJsonRecap(text);
      if (recap) return recap;
      lastError = new Error("router returned no valid recap");
    } catch (error) {
      if (args.signal.aborted) throw error;
      if (!(error instanceof Error)) lastError = new Error(String(error));
      else {
        lastError = error;
        // The server is down or the URL is wrong; later attempts would fail the same way.
        if (isUnreachable(error)) throw new GeneratorUnavailableError(`router not reachable at ${baseUrl}`);
        // A hung request is unlikely to recover by retrying within this recap's budget.
        if (isTimeout(error)) throw new Error(`router timed out after ${args.timeoutMs} ms`);
      }
    }
    if (attempt < ATTEMPTS) await delayFn(RETRY_DELAY_MS, args.signal);
  }
  throw lastError;
}

async function requestText(
  fetchFn: typeof fetch,
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<string> {
  const response = await fetchFn(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      // A recap is one-shot JSON; thinking only spends output-rate credits (the CLI paths pin
      // codex effort low and disable Claude thinking for the same reason).
      thinking: { type: "disabled" },
      system: RECAP_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
    // RN's AbortSignal type differs from undici's fetch signal type; the runtime value is the same.
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) as never,
  });
  const payload = asRecord(parseJson(await response.text()));
  if (!payload) throw new Error(`router returned non-JSON output (status ${response.status})`);
  if (!response.ok || payload["type"] === "error") {
    throw new Error(`router error ${response.status}: ${JSON.stringify(payload["error"] ?? payload).slice(0, 300)}`);
  }
  const content = Array.isArray(payload["content"]) ? payload["content"] : [];
  const parts: string[] = [];
  for (const block of content) {
    const record = asRecord(block);
    if (record?.["type"] === "text" && typeof record["text"] === "string") parts.push(record["text"]);
  }
  return parts.join("").trim();
}

/** Recaps are JSON-only, but a chatty model may wrap the object in prose; take the first {...} block. */
function lenientJsonRecap(text: string): ParsedRecap | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return parseRecapOutput(text.slice(start, end + 1));
}

function isUnreachable(error: Error): boolean {
  const code = asRecord(error.cause)?.["code"];
  return (
    (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET") ||
    /fetch failed|network/i.test(error.message)
  );
}

function isTimeout(error: Error): boolean {
  return error.name === "TimeoutError" || /timed? ?out/i.test(error.message);
}

function defaultDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
