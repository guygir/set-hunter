// GET  /api/aces           → { discovered: { ace_id: { count, firstBy, firstAt } } }
// POST /api/aces           → { ace_id, player_name, player_uuid }
//                          → same shape + { isNew: bool }

const { kv, kvPipeline } = require('./_kv');

const ALL_ACE_IDS = [
  // Home & Farm
  'h_aurochs','h_tarpan','h_dodo','h_mammoth','h_megaloceros',
  // Aquatic
  'w_megalodon','w_livyatan','w_dunkle','w_mosasaurus','w_stellers',
  // Desert
  'd_quagga','d_atlasbear','d_woollyrhino','d_sivatherium','d_caspiantiger',
  // Savanna
  's_smilodon','s_thylacine','s_dinofelis','s_direwolf','s_giganto',
];

function sanitize(str, maxLen = 20) {
  return String(str || '').replace(/[^a-zA-Z0-9_ \-]/g, '').slice(0, maxLen).trim() || 'Anonymous';
}

async function getDiscovered() {
  const result = await kv(['HGETALL', 'aces_global']);
  const raw = result.result || [];
  const discovered = {};
  for (let i = 0; i < raw.length; i += 2) {
    try { discovered[raw[i]] = JSON.parse(raw[i + 1]); }
    catch { /* skip corrupt entries */ }
  }
  return discovered;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    const discovered = await getDiscovered();
    return res.status(200).json({ discovered, total: ALL_ACE_IDS.length });
  }

  if (req.method === 'POST') {
    const { ace_id, player_name, player_uuid } = req.body || {};
    if (!ace_id || !ALL_ACE_IDS.includes(ace_id)) {
      return res.status(400).json({ error: 'Invalid ace_id' });
    }

    const name = sanitize(player_name);
    const discovered = await getDiscovered();
    const existing = discovered[ace_id];
    const isNew = !existing;

    if (isNew) {
      const entry = { count: 1, firstBy: name, firstAt: Date.now() };
      await kv(['HSET', 'aces_global', ace_id, JSON.stringify(entry)]);
      discovered[ace_id] = entry;
    } else {
      existing.count++;
      await kv(['HSET', 'aces_global', ace_id, JSON.stringify(existing)]);
      discovered[ace_id] = existing;
    }

    return res.status(200).json({ discovered, total: ALL_ACE_IDS.length, isNew });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
