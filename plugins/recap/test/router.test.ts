import { describe, expect, it } from "vitest";
import { GeneratorUnavailableError } from "../server/errors";
import { generateRouterRecap } from "../server/router";

const okBody = (text: string) =>
  new Response(JSON.stringify({ id: "m", type: "message", role: "assistant", content: [
    { type: "thinking", thinking: "hidden reasoning" },
    { type: "text", text },
  ] }), { status: 200 });

const chat = (overrides: Partial<Parameters<typeof generateRouterRecap>[0]> = {}) => ({
  model: null,
  prompt: "p",
  signal: new AbortController().signal,
  timeoutMs: 5_000,
  delayFn: async () => undefined,
  ...overrides,
});

describe("generateRouterRecap", () => {
  it("posts the recap prompt and joins only text blocks, ignoring thinking", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchFn = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return okBody('{"summary":"S","next_action":"N"}');
    }) as typeof fetch;
    const recap = await generateRouterRecap(chat({ baseUrl: "http://127.0.0.1:8787/", apiKey: "k", fetchFn }));
    expect(recap).toEqual({ summary: "S", nextAction: "N" });
    expect(calls).toEqual([{
      url: "http://127.0.0.1:8787/v1/messages",
      init: expect.objectContaining({ method: "POST" }),
    }]);
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body).toMatchObject({
      model: "glm-5.3-flash",
      max_tokens: 8192,
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: "p" }],
    });
    expect(calls[0]?.init.headers).toMatchObject({ "x-api-key": "k" });
  });

  it("uses the explicit model and retries until a valid recap arrives", async () => {
    let attempts = 0;
    const fetchFn = (async () => {
      attempts += 1;
      return okBody(attempts === 1 ? "" : '```json\n{"summary":"Later","next_action":null}\n```');
    }) as typeof fetch;
    const recap = await generateRouterRecap(chat({ model: "glm-5.3", fetchFn }));
    expect(recap).toEqual({ summary: "Later", nextAction: null });
    expect(attempts).toBe(2);
  });

  it("rescues a JSON object wrapped in prose", async () => {
    const fetchFn = (async () => okBody('Here is your recap: {"summary":"Wrapped","next_action":null} — enjoy.')) as typeof fetch;
    await expect(generateRouterRecap(chat({ fetchFn }))).resolves.toEqual({ summary: "Wrapped", nextAction: null });
  });

  it("does not retry when the server is unreachable", async () => {
    let attempts = 0;
    const fetchFn = (async () => {
      attempts += 1;
      throw new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } });
    }) as typeof fetch;
    await expect(generateRouterRecap(chat({ fetchFn }))).rejects.toBeInstanceOf(GeneratorUnavailableError);
    expect(attempts).toBe(1);
  });

  it("does not retry a timed-out request", async () => {
    let attempts = 0;
    const fetchFn = (async () => {
      attempts += 1;
      const error = new Error("The operation was aborted due to timeout");
      error.name = "TimeoutError";
      throw error;
    }) as typeof fetch;
    await expect(generateRouterRecap(chat({ fetchFn }))).rejects.toThrow(/timed out/);
    expect(attempts).toBe(1);
  });

  it("surfaces API errors after the retry budget is spent", async () => {
    let attempts = 0;
    const fetchFn = (async () => {
      attempts += 1;
      return new Response(JSON.stringify({ type: "error", error: { message: "overloaded" } }), { status: 529 });
    }) as typeof fetch;
    await expect(generateRouterRecap(chat({ fetchFn }))).rejects.toThrow(/529/);
    expect(attempts).toBe(4);
  });
});
