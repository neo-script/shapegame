import { usernames, leaderboard } from '../../lib/store';

export default function handler(req, res) {
  const { name } = req.query;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name required' });
  }
  const n = name.toLowerCase();
  const inUsers = [...usernames].some(u => u.toLowerCase() === n);
  const inBoard = leaderboard.some(e => e.username.toLowerCase() === n);
  res.status(200).json({ taken: inUsers || inBoard });
}
