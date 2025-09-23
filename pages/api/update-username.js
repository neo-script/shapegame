import { leaderboard, usernames } from '../../lib/store';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { old: oldName, new: newName } = req.body || {};
  if (!oldName || !newName) {
    return res.status(400).json({ success: false, error: 'old and new required' });
  }
  const oldLower = oldName.toLowerCase();
  const newLower = newName.toLowerCase();

  // Merge or rename in leaderboard
  const oldIdx = leaderboard.findIndex(e => e.username.toLowerCase() === oldLower);
  const newIdx = leaderboard.findIndex(e => e.username.toLowerCase() === newLower);

  if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
    // Merge scores: keep max, remove old
    leaderboard[newIdx].score = Math.max(leaderboard[newIdx].score, leaderboard[oldIdx].score);
    leaderboard.splice(oldIdx, 1);
  } else if (oldIdx !== -1 && newIdx === -1) {
    leaderboard[oldIdx].username = newName.trim();
  }
  // usernames set
  if ([...usernames].some(u => u.toLowerCase() === oldLower)) {
    for (const u of [...usernames]) {
      if (u.toLowerCase() === oldLower) usernames.delete(u);
    }
  }
  usernames.add(newName.trim());

  // Re-sort and cap
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.splice(50);

  return res.status(200).json({ success: true });
}
