const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    // Parse body manually if needed
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch(e) { return res.status(400).json({ error: 'Invalid JSON body' }); }
    }
    if (!payload) return res.status(400).json({ error: 'Empty request body' });

    const { messages, system, max_tokens } = payload;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages array' });

    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 1000,
      system: system || '',
      messages
    });

    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch(e) { reject(new Error('Failed to parse Anthropic response: ' + data.substring(0, 200))); }
        });
      });

      request.on('error', reject);
      request.write(body);
      request.end();
    });

    if (data.error) return res.status(500).json({ error: data.error.message, type: data.error.type });
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
