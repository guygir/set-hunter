// GET  /api/leaderboard?set=home  → { entries: [{name,days,grade,ts}], total }
// POST /api/leaderboard           → { set_id, player_name, days, grade }
//                                 → { rank, total, entries }

const { kv, kvPipeline } = require('./_kv');

const VALID_SETS = ['home', 'aquatic', 'desert', 'savanna'];
const MAX_ENTRIES = 200;

function sanitize(str, maxLen = 20) {
  return String(str || '').replace(/[^a-zA-Z0-9_ \-]/g, '').slice(0, maxLen).trim() || 'Anonymous';
}

function key(setId) { return `lb:${setId}`; }

async function getEntries(setId) {
  const result = await kv(['LRANGE', key(setId), 0, MAX_ENTRIES - 1]);
  const raw = result.result || [];
  return raw
    .map(s => { try { return JSON.parse(s); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    const setId = req.query?.set;
    if (!VALID_SETS.includes(setId)) {
      return res.status(400).json({ error: 'Invalid set' });
    }
    const entries = await getEntries(setId);
    return res.status(200).json({ entries: entries.slice(0, 50), total: entries.length });
  }

  if (req.method === 'POST') {
    const { set_id, player_name, days, grade } = req.body || {};
    if (!VALID_SETS.includes(set_id)) return res.status(400).json({ error: 'Invalid set' });
    const daysInt = parseInt(days, 10);
    if (isNaN(daysInt) || daysInt < 1) return res.status(400).json({ error: 'Invalid days' });

    const name = sanitize(player_name);
    const entry = JSON.stringify({ name, days: daysInt, grade: grade || '?', ts: Date.now() });

    await kvPipeline([
      ['LPUSH', key(set_id), entry],
      ['LTRIM', key(set_id), 0, MAX_ENTRIES - 1],
    ]);

    const entries = await getEntries(set_id);
    const rank = entries.findIndex(e => e.name === name && e.days === daysInt) + 1;

    return res.status(200).json({
      rank: rank || entries.length,
      total: entries.length,
      entries: entries.slice(0, 50),
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
