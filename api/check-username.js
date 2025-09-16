let usernames = new Set();

export default function handler(req, res) {
  const { name } = req.query;
  if (usernames.has(name)) {
    res.json({ taken: true });
  } else {
    usernames.add(name);
    res.json({ taken: false });
  }
}
