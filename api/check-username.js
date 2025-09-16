import { usernames } from '../../lib/store';

export default function handler(req, res) {
  const { name } = req.query;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name required' });
  }
  res.status(200).json({ taken: usernames.has(name) });
}
