import { usernames } from '../../lib/store';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: 'name required' });
  }
  if (usernames.has(name)) {
    return res.status(200).json({ success: false, reason: 'taken' });
  }
  usernames.add(name);
  return res.status(200).json({ success: true });
}
