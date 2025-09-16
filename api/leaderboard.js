import { leaderboard } from '../../lib/store';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { username, score } = req.body || {};
    if (!username || typeof score !== 'number') {
      return res.status(400).json({ success: false, error: 'bad input' });
    }
    const existing = leaderboard.find(p => p.username === username);
    if (existing) existing.score = Math.max(existing.score, score);
    else leaderboard.push({ username, score });

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.splice(50); // keep top 50
    return res.status(200).json({ success: true });
  }

  // GET returns array
  return res.status(200).json(leaderboard);
}
