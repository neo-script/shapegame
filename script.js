// ===== DOM refs =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const usernameInput = document.getElementById('usernameInput');
const usernameError = document.getElementById('usernameError');
const leaderboardList = document.getElementById('leaderboardList');
const leftSidebar = document.getElementById('leftSidebar');
const pauseBtn = document.getElementById('pauseBtn');
const saveNameBtn = document.getElementById('saveNameBtn');

// ===== Canvas sizing =====
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ===== Game state =====
let shapes = [];
let score = 0;
let gameOver = false;
let isPaused = false;

// anti “air collision”
let contactStreak = 0;
const HIT_CONFIRM_FRAMES = 2;   // require overlap for N consecutive frames
const CONTACT_SLACK = 3.0;      // additional gap (px) required before counting as a hit

// Track mouse to spawn shapes far away from it
let lastMouse = { x: window.innerWidth * 0.7, y: window.innerHeight * 0.5 };

const colors = ['#A7E6A1', '#A1D2E6', '#A1A1E6', '#E6A1BA', '#FFE69A', '#FFC69A'];

// cache sidebar rect each frame
let sidebarRect = null;
function refreshSidebarRect() {
  sidebarRect = leftSidebar.getBoundingClientRect();
}

// ======== API helpers (Next.js / same origin) ========
const API = {
  async getLeaderboard() {
    const res = await fetch('/api/leaderboard', { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  },
  async postScore(username, score) {
    await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, score })
    });
  },
  async checkUsername(name) {
    const res = await fetch(`/api/check-username?name=${encodeURIComponent(name)}`);
    if (!res.ok) return { taken: false };
    return res.json(); // { taken: boolean }
  },
  async registerUsername(name) {
    const res = await fetch('/api/register-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return res.json(); // { success: bool, reason?: 'taken' }
  },
  async updateUsername(oldName, newName) {
    const res = await fetch('/api/update-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ old: oldName, new: newName })
    });
    return res.json(); // { success: bool }
  }
};

// ===== Geometry helpers =====
function dist(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

// --- precise geometry helpers for circle–triangle ---
function _sign(p1, p2, p3) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}
function pointInTriangle(p, a, b, c) {
  const d1 = _sign(p, a, b);
  const d2 = _sign(p, b, c);
  const d3 = _sign(p, c, a);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}
function distPointToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1;
  const l2 = vx*vx + vy*vy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * vx + (py - y1) * vy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projx = x1 + t * vx;
  const projy = y1 + t * vy;
  return Math.hypot(px - projx, py - projy);
}
function closestDistanceCenterToTriangle(circle, tri) {
  const A = { x: tri.x,            y: tri.y - tri.size };
  const B = { x: tri.x - tri.size, y: tri.y + tri.size };
  const C = { x: tri.x + tri.size, y: tri.y + tri.size };
  const P = { x: circle.x, y: circle.y };

  if (pointInTriangle(P, A, B, C)) return 0;

  const dAB = distPointToSegment(P.x, P.y, A.x, A.y, B.x, B.y);
  const dBC = distPointToSegment(P.x, P.y, B.x, B.y, C.x, C.y);
  const dCA = distPointToSegment(P.x, P.y, C.x, C.y, A.x, A.y);
  return Math.min(dAB, dBC, dCA);
}
function circleTriangleOverlap(circle, tri) {
  const r = circle.size;
  const d = closestDistanceCenterToTriangle(circle, tri);
  return d <= (r - CONTACT_SLACK);
}

// ===== Shape class =====
class Shape {
  constructor(x, y, size, type) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = type; // 'circle' or 'triangle'
    this.speedX = (Math.random() * 3 + 1) * (Math.random() < 0.5 ? 1 : -1);
    this.speedY = (Math.random() * 3 + 1) * (Math.random() < 0.5 ? 1 : -1);
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.lastBonk = 0;
  }

  draw() {
    ctx.fillStyle = this.color;
    if (this.type === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.size);
      ctx.lineTo(this.x - this.size, this.y + this.size);
      ctx.lineTo(this.x + this.size, this.y + this.size);
      ctx.closePath();
      ctx.fill();
    }
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x - this.size < 0) { this.x = this.size; this.speedX *= -1; }
    if (this.x + this.size > canvas.width) { this.x = canvas.width - this.size; this.speedX *= -1; }
    if (this.y - this.size < 0) { this.y = this.size; this.speedY *= -1; }
    if (this.y + this.size > canvas.height) { this.y = canvas.height - this.size; this.speedY *= -1; }

    if (sidebarRect) {
      const r = sidebarRect;
      const inX = this.x + this.size > r.left && this.x - this.size < r.right;
      const inY = this.y + this.size > r.top  && this.y - this.size < r.bottom;
      if (inX && inY) {
        if (this.x < r.right + this.size) this.x = r.right + this.size;
        this.speedX = Math.abs(this.speedX);
      }
    }
  }

  bounceFromMouse(mx, my) {
    const dx = this.x - mx;
    const dy = this.y - my;
    const distance = Math.hypot(dx, dy);
    if (distance < this.size + 15) {
      const now = Date.now();
      if (now - this.lastBonk > 200) {
        const angle = Math.atan2(dy, dx);
        const speed = 6;
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
        score++;
        scoreDisplay.textContent = score;
        this.lastBonk = now;
      }
    }
  }
}

// ===== Spawning (avoid sidebar + far from mouse) =====
function randomSpawnOutsideSidebar(size, minDistFromMouse = 240) {
  const r = sidebarRect || leftSidebar.getBoundingClientRect();
  const margin = 10;
  const minX = Math.max(r.right + margin + size, size);
  const maxX = Math.max(minX + 1, canvas.width - size);
  const minY = size;
  const maxY = canvas.height - size;

  let tries = 0;
  while (tries < 800) {
    const x = Math.random() * (maxX - minX) + minX;
    const y = Math.random() * (maxY - minY) + minY;
    if (dist(x, y, lastMouse.x, lastMouse.y) >= Math.max(minDistFromMouse, size * 4)) {
      return { x, y };
    }
    tries++;
  }
  return { x: Math.min(canvas.width - size - 10, maxX), y: canvas.height * 0.5 };
}

function initShapes() {
  shapes = [];
  let counts = Math.random() < 0.5 ? { circle: 3, triangle: 2 } : { circle: 2, triangle: 3 };
  let attempts = 0;

  while ((counts.circle > 0 || counts.triangle > 0) && attempts < 1200) {
    const type = (counts.circle > 0 && counts.triangle > 0)
      ? (Math.random() < counts.circle / (counts.circle + counts.triangle) ? 'circle' : 'triangle')
      : (counts.circle > 0 ? 'circle' : 'triangle');

    const size = Math.random() * 30 + 20;
    const { x, y } = randomSpawnOutsideSidebar(size, 260);
    const newShape = new Shape(x, y, size, type);

    const overlapping = shapes.some(s => Math.hypot(newShape.x - s.x, newShape.y - s.y) < newShape.size + s.size + 10);
    if (!overlapping) {
      shapes.push(newShape);
      counts[type]--;
    }
    attempts++;
  }
}

// ===== Collision detection =====
function checkCollision() {
  let anyContact = false;

  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const s1 = shapes[i];
      const s2 = shapes[j];

      if ((s1.type === 'circle' && s2.type === 'triangle') ||
          (s1.type === 'triangle' && s2.type === 'circle')) {

        const circle = s1.type === 'circle' ? s1 : s2;
        const tri    = s1.type === 'triangle' ? s1 : s2;

        if (circleTriangleOverlap(circle, tri)) {
          anyContact = true; // confirm over multiple frames
        }

      } else if (s1.type === s2.type) {
        const dx = s1.x - s2.x;
        const dy = s1.y - s2.y;
        const d  = Math.hypot(dx, dy);
        if (d < s1.size + s2.size) {
          const tmpX = s1.speedX, tmpY = s1.speedY;
          s1.speedX = s2.speedX; s1.speedY = s2.speedY;
          s2.speedX = tmpX;      s2.speedY = tmpY;
        }
      }
    }
  }

  if (anyContact) {
    contactStreak += 1;
    if (contactStreak >= HIT_CONFIRM_FRAMES) {
      handleGameOver();
    }
  } else {
    contactStreak = 0;
  }
}

// ===== Game over & loop =====
function showGameOver() {
  restartBtn.style.display = 'inline';
  ctx.fillStyle = '#03646A';
  ctx.font = '48px Schoolbell, cursive';
  const text = 'GAME OVER';
  const m = ctx.measureText(text);
  ctx.fillText(text, (canvas.width - m.width) / 2, canvas.height / 2);
}

async function handleGameOver() {
  gameOver = true;
  await submitScore(); // send to server first
  showGameOver();
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  refreshSidebarRect();

  if (!isPaused) {
    shapes.forEach(s => { s.update(); s.draw(); });
    if (!gameOver) checkCollision();
  } else {
    shapes.forEach(s => s.draw());
    ctx.fillStyle = '#03646A';
    ctx.font = '42px Schoolbell, cursive';
    const text = 'PAUSED';
    const m = ctx.measureText(text);
    ctx.fillText(text, (canvas.width - m.width) / 2, canvas.height * 0.45);
  }

  if (!gameOver) requestAnimationFrame(animate);
}

// ===== Mouse events (canvas is pointer-events:none) =====
let composing = false;
window.addEventListener('mousemove', e => {
  lastMouse = { x: e.clientX, y: e.clientY };
  if (gameOver || isPaused) return;
  shapes.forEach(shape => shape.bounceFromMouse(e.clientX, e.clientY));
});

// ===== Buttons =====
startBtn.addEventListener('click', async () => {
  score = 0; scoreDisplay.textContent = score;
  gameOver = false;
  isPaused = false;
  contactStreak = 0;
  startBtn.style.display = 'none';
  restartBtn.style.display = 'none';
  refreshSidebarRect();
  await ensureUsernameRegistered();
  await renderLB(); // show latest global board
  initShapes();
  animate();
});

restartBtn.addEventListener('click', async () => {
  score = 0; scoreDisplay.textContent = score;
  gameOver = false;
  isPaused = false;
  contactStreak = 0;
  restartBtn.style.display = 'none';
  refreshSidebarRect();
  await renderLB();
  initShapes();
  animate();
});

pauseBtn.addEventListener('click', () => {
  if (gameOver) return;
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
});

// ===== Username & Leaderboard (server-backed) =====
const NAME_KEY = 'username'; // remember your chosen name locally for convenience

async function renderLB() {
  const lb = await API.getLeaderboard();
  leaderboardList.innerHTML = '';
  lb.forEach(({ username, score }, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${username} — ${score}`;
    leaderboardList.appendChild(li);
  });
}

async function isNameTakenServer(name, exceptName = '') {
  if (!name) return false;
  // If exceptName is same (case-insensitive), allow it
  if (name.toLowerCase() === (exceptName || '').toLowerCase()) return false;
  const { taken } = await API.checkUsername(name);
  return !!taken;
}

// Live validation
usernameInput.addEventListener('input', async () => {
  const currentSaved = (localStorage.getItem(NAME_KEY) || '').trim();
  const val = usernameInput.value.trim();
  if (!val) { usernameError.style.display = 'none'; return; }
  usernameError.style.display = (await isNameTakenServer(val, currentSaved)) ? 'block' : 'none';
});

// IME-safe Enter handling
usernameInput.addEventListener('compositionstart', () => composing = true);
usernameInput.addEventListener('compositionend', () => composing = false);
usernameInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && !composing) await attemptRename();
});

// Save button
saveNameBtn.addEventListener('click', async () => { await attemptRename(); });

// Also try on change (when input loses focus after edits)
usernameInput.addEventListener('change', async () => { await attemptRename(); });

async function ensureUsernameRegistered() {
  // If user already has a saved name locally, try to register it (ignore if taken)
  let name = (localStorage.getItem(NAME_KEY) || usernameInput.value || '').trim();
  if (!name) {
    name = 'Player' + Math.floor(Math.random() * 1000);
    usernameInput.value = name;
  }
  const res = await API.registerUsername(name);
  if (res && res.success) {
    localStorage.setItem(NAME_KEY, name);
  } else if (res && res.reason === 'taken') {
    // If taken, do nothing; user can rename
  }
}

async function attemptRename() {
  let oldName = (localStorage.getItem(NAME_KEY) || '').trim();
  const newName = (usernameInput.value || '').trim();
  if (!newName) { usernameError.style.display = 'none'; return; }

  const same = oldName.toLowerCase() === newName.toLowerCase();
  if (!same && await isNameTakenServer(newName, oldName)) {
    usernameError.style.display = 'block';
    return;
  }
  usernameError.style.display = 'none';

  // If there was no old name stored, just register the new one
  if (!oldName) {
    const r = await API.registerUsername(newName);
    if (r.success) {
      localStorage.setItem(NAME_KEY, newName);
      await renderLB();
    }
    return;
  }

  if (same) return;

  // First make sure the new name is reserved, then update any leaderboard entries
  const r = await API.registerUsername(newName);
  if (r.success || r.reason === undefined) {
    await API.updateUsername(oldName, newName);
    localStorage.setItem(NAME_KEY, newName);
    await renderLB();
  } else if (r.reason === 'taken') {
    // SKIBIDI
    usernameError.style.display = 'block';
  }
}

async function submitScore() {
  let name = (localStorage.getItem(NAME_KEY) || usernameInput.value || '').trim();
  if (!name) {
    name = 'Player' + Math.floor(Math.random() * 1000);
    usernameInput.value = name;
  }
  // do you have rizz?
  await API.registerUsername(name);
  await API.postScore(name, score);
  await renderLB();
}

// pls let me go homeeee
(async function initUI() {
  const storedName = (localStorage.getItem(NAME_KEY) || '').trim();
  if (storedName) usernameInput.value = storedName;
  await renderLB();
})();
