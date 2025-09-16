import { leaderboard, usernames } from '../../lib/store';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { old: oldName, new: newName } = req.body || {};
  if (!oldName || !newName) {
    return res.status(400).json({ success: false, error: 'old and new required' });
  }
  // update leaderboard entry
  const entry = leaderboard.find(e => e.username === oldName);
  if (entry) entry.username = newName;

  // update usernames set
  if (usernames.has(oldName)) {
    usernames.delete(oldName);
    usernames.add(newName);
  }

  return res.status(200).json({ success: true });
}
