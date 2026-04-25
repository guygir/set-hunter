// Shared Upstash/Vercel KV helper — uses built-in fetch (Node 18+)
const KV_URL   = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function kv(command) {
  if (!KV_URL || !KV_TOKEN) return { result: null };
  const res = await fetch(KV_URL, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(command),
  });
  return res.json();
}

async function kvPipeline(commands) {
  if (!KV_URL || !KV_TOKEN) return commands.map(() => ({ result: null }));
  const res = await fetch(`${KV_URL}/pipeline`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(commands),
  });
  return res.json();
}

module.exports = { kv, kvPipeline };
