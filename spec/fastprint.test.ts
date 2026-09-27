import { describe, expect, inject, it } from "vitest";

// Drives the running app over real HTTP to prove the print-job contracts
// hold: submission, persistence, validation, the offline-release guard,
// derived queue depth, ownership, the cross-origin CSRF check, and the live
// broadcast. Fixed printer ids below come from the seed in src/lib/db.ts.
const baseUrl = inject("baseUrl");

const ONLINE_PRINTER = "chifley-l2-01";
const OFFLINE_PRINTER = "hancock-gnd-01";

function uniqueAnuId(): string {
  const digits = (Number(process.hrtime.bigint() % 10_000_000n)).toString().padStart(7, "0");
  return `u${digits}`;
}

// Astro checks form POSTs carry a same-origin Origin header (CSRF
// protection); browsers send it automatically, a bare fetch doesn't.
function post(path: string, cookie: string, body: URLSearchParams, origin = baseUrl) {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin, cookie },
    body,
    redirect: "manual",
  });
}

function get(path: string, cookie?: string) {
  return fetch(new URL(path, baseUrl), { headers: cookie ? { cookie } : {} });
}

async function signIn(anuId: string): Promise<string> {
  const res = await fetch(new URL("/api/identity", baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams({ anu_id: anuId }),
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("no set-cookie from /api/identity");
  return setCookie.split(";")[0];
}

function extractJobId(html: string): number {
  const match = html.match(/\/api\/jobs\/(\d+)\/(?:release|cancel)/);
  if (!match) throw new Error("no job id found on the page");
  return Number(match[1]);
}

async function queueDepth(printerId: string): Promise<number> {
  const html = await (await get("/")).text();
  const match = html.match(
    new RegExp(`data-printer-id="${printerId}"[\\s\\S]*?data-field="queue">(\\d+)<`),
  );
  if (!match) throw new Error(`printer ${printerId} not found on the page`);
  return Number(match[1]);
}

describe("fastprint", () => {
  it("a submitted job appears on a fresh page load", async () => {
    const cookie = await signIn(uniqueAnuId());
    const fileName = `probe-${process.hrtime.bigint()}.pdf`;

    const res = await post("/api/jobs", cookie, new URLSearchParams({ file_name: fileName, page_count: "3" }));
    expect(res.status).toBe(303);

    const page = await get("/", cookie);
    expect(await page.text()).toContain(fileName);
  });

  it("rejects invalid input", async () => {
    const cookie = await signIn(uniqueAnuId());
    const res = await post("/api/jobs", cookie, new URLSearchParams({ file_name: "bad.pdf", page_count: "0" }));
    expect(res.status).toBe(400);
  });

  it("rejects release to an offline printer", async () => {
    const cookie = await signIn(uniqueAnuId());
    const fileName = `offline-probe-${process.hrtime.bigint()}.pdf`;
    await post("/api/jobs", cookie, new URLSearchParams({ file_name: fileName, page_count: "1" }));
    const jobId = extractJobId(await (await get("/", cookie)).text());

    const res = await post(`/api/jobs/${jobId}/release`, cookie, new URLSearchParams({ printer_id: OFFLINE_PRINTER }));
    expect(res.status).toBe(409);
  });

  it("release raises the printer's queue depth; cancel lowers it", async () => {
    const cookie = await signIn(uniqueAnuId());
    const before = await queueDepth(ONLINE_PRINTER);

    // 50 pages keeps this job "printing" for the rest of the test (~105s),
    // so the depth doesn't drop out from under the assertions below.
    const fileName = `queue-probe-${process.hrtime.bigint()}.pdf`;
    await post("/api/jobs", cookie, new URLSearchParams({ file_name: fileName, page_count: "50" }));
    const jobId = extractJobId(await (await get("/", cookie)).text());

    const releaseRes = await post(
      `/api/jobs/${jobId}/release`,
      cookie,
      new URLSearchParams({ printer_id: ONLINE_PRINTER }),
    );
    expect(releaseRes.status).toBe(303);
    expect(await queueDepth(ONLINE_PRINTER)).toBe(before + 1);

    const cancelRes = await post(`/api/jobs/${jobId}/cancel`, cookie, new URLSearchParams());
    expect(cancelRes.status).toBe(303);
    expect(await queueDepth(ONLINE_PRINTER)).toBe(before);
  });

  it("one user can't cancel another's job", async () => {
    const cookieA = await signIn(uniqueAnuId());
    const fileName = `owner-probe-${process.hrtime.bigint()}.pdf`;
    await post("/api/jobs", cookieA, new URLSearchParams({ file_name: fileName, page_count: "1" }));
    const jobId = extractJobId(await (await get("/", cookieA)).text());

    const cookieB = await signIn(uniqueAnuId());
    const res = await post(`/api/jobs/${jobId}/cancel`, cookieB, new URLSearchParams());
    expect(res.status).toBe(403);
  });

  it("refuses a cross-origin POST", async () => {
    const cookie = await signIn(uniqueAnuId());
    const res = await post(
      "/api/jobs",
      cookie,
      new URLSearchParams({ file_name: "x.pdf", page_count: "1" }),
      "https://evil.example.com",
    );
    expect(res.status).toBe(403);
  });

  it("/api/events sends bytes and broadcasts a printer update after a submit", async () => {
    const cookie = await signIn(uniqueAnuId());

    // subscribe first, then post, then read until the printers event arrives
    const stream = await fetch(new URL("/api/events", baseUrl));
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    const reader = stream.body?.getReader();
    if (!reader) throw new Error("no response body");

    await post("/api/jobs", cookie, new URLSearchParams({ file_name: `live-probe-${process.hrtime.bigint()}.pdf`, page_count: "1" }));

    const decoder = new TextDecoder();
    let received = "";
    while (!received.includes("event: printers")) {
      const { value, done } = await reader.read();
      if (done) throw new Error("stream ended before a printers event arrived");
      received += decoder.decode(value, { stream: true });
    }
    await reader.cancel();
    expect(received).toContain("data: ");
  }, 10_000);
});
