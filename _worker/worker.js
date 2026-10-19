const ALLOWED_ORIGINS = ["https://district-39.github.io", "https://d39aa.org", "https://www.d39aa.org"];
const MAX_PATH_LENGTH = 200;
const MAX_REFERRER_LENGTH = 100;
const DEFAULT_DAYS = 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/hit") return recordHit(request, env);
    if (request.method === "GET" && url.pathname === "/stats") return showStats(url, env);
    return new Response("not found", { status: 404 });
  },
};

async function recordHit(request, env) {
  if (!ALLOWED_ORIGINS.includes(request.headers.get("Origin"))) {
    return new Response(null, { status: 403 });
  }

  const hit = parseHit(await request.text());
  if (!hit) return new Response(null, { status: 400 });

  await env.DB.prepare(
    `INSERT INTO hits (day, path, referrer, count) VALUES (?, ?, ?, 1)
     ON CONFLICT (day, path, referrer) DO UPDATE SET count = count + 1`
  )
    .bind(today(), hit.path, hit.referrer)
    .run();

  return new Response(null, { status: 204 });
}

function parseHit(body) {
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }

  const path = typeof data.path === "string" ? data.path : "";
  const referrer = typeof data.referrer === "string" ? data.referrer : "";
  const pathIsValid = path.startsWith("/") && path.length <= MAX_PATH_LENGTH;
  const referrerIsValid = /^[a-z0-9.-]*$/i.test(referrer) && referrer.length <= MAX_REFERRER_LENGTH;

  return pathIsValid && referrerIsValid ? { path, referrer: referrer.toLowerCase() } : null;
}

async function showStats(url, env) {
  if (!env.STATS_TOKEN || url.searchParams.get("token") !== env.STATS_TOKEN) {
    return new Response("forbidden", { status: 403 });
  }

  const days = clampDays(url.searchParams.get("days"));
  const since = daysAgo(days);

  const [byPath, byReferrer, byDay] = await env.DB.batch([
    env.DB.prepare(
      "SELECT path AS label, SUM(count) AS total FROM hits WHERE day >= ? GROUP BY path ORDER BY total DESC"
    ).bind(since),
    env.DB.prepare(
      "SELECT referrer AS label, SUM(count) AS total FROM hits WHERE day >= ? AND referrer != '' GROUP BY referrer ORDER BY total DESC"
    ).bind(since),
    env.DB.prepare(
      "SELECT day AS label, SUM(count) AS total FROM hits WHERE day >= ? GROUP BY day ORDER BY day DESC"
    ).bind(since),
  ]);

  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>d39 analytics</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 48rem; margin: 2rem auto; padding: 0 1rem; }
table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
td, th { text-align: left; padding: 0.25rem 0.5rem; border-bottom: 1px solid #ddd; }
td:last-child, th:last-child { text-align: right; }
</style>
</head>
<body>
<h1>Last ${days} days</h1>
${table("Pages and files", byPath.results)}
${table("Coming from", byReferrer.results)}
${table("By day", byDay.results)}
</body>
</html>`;

  return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function table(heading, rows) {
  if (rows.length === 0) return `<h2>${heading}</h2><p>Nothing yet.</p>`;
  const body = rows
    .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${row.total}</td></tr>`)
    .join("");
  return `<h2>${heading}</h2><table><tr><th></th><th>Views</th></tr>${body}</table>`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function clampDays(value) {
  const days = Number.parseInt(value, 10);
  return Number.isFinite(days) && days > 0 ? Math.min(days, 366) : DEFAULT_DAYS;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days) {
  return new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
}
