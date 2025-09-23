import { leaderboard } from '../../lib/store';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { username, score } = req.body || {};
    if (!username || typeof score !== 'number') {
      return res.status(400).json({ success: false, error: 'bad input' });
    }

    const name = username.trim();
    let entry = leaderboard.find(p => p.username.toLowerCase() === name.toLowerCase());

    if (entry) {
      entry.score = Math.max(entry.score, score);
    } else {
      leaderboard.push({ username: name, score });
    }

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.splice(50); // keep top 50

    return res.status(200).json({ success: true });
  }

  // GET: return current board
  res.status(200).json(leaderboard);
}
