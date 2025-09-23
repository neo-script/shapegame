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

// Track mouse to spawn shapes far away from it
let lastMouse = { x: window.innerWidth * 0.7, y: window.innerHeight * 0.5 };

const colors = ['#A7E6A1', '#A1D2E6', '#A1A1E6', '#E6A1BA', '#FFE69A', '#FFC69A'];

// cache sidebar rect each frame
let sidebarRect = null;
function refreshSidebarRect() {
  sidebarRect = leftSidebar.getBoundingClientRect();
}

// ===== Geometry helpers =====
function dist(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

// --- precise geometry helpers for circle-vs-triangle ---
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
function circleTriangleCollide(circle, tri) {
  // Triangle vertices (matching draw): apex up, base wide
  const A = { x: tri.x,            y: tri.y - tri.size }; // top
  const B = { x: tri.x - tri.size, y: tri.y + tri.size }; // bottom-left
  const C = { x: tri.x + tri.size, y: tri.y + tri.size }; // bottom-right

  const P = { x: circle.x, y: circle.y };
  // small epsilon so it doesn't "early trigger" visually
  const r = Math.max(0, circle.size - 1.5);

  // Case 1: center inside triangle
  if (pointInTriangle(P, A, B, C)) return true;

  // Case 2: closest distance to any edge <= radius
  const dAB = distPointToSegment(P.x, P.y, A.x, A.y, B.x, B.y);
  const dBC = distPointToSegment(P.x, P.y, B.x, B.y, C.x, C.y);
  const dCA = distPointToSegment(P.x, P.y, C.x, C.y, A.x, A.y);
  return (dAB <= r || dBC <= r || dCA <= r);
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
    } else { // triangle
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

    // canvas edges
    if (this.x - this.size < 0) { this.x = this.size; this.speedX *= -1; }
    if (this.x + this.size > canvas.width) { this.x = canvas.width - this.size; this.speedX *= -1; }
    if (this.y - this.size < 0) { this.y = this.size; this.speedY *= -1; }
    if (this.y + this.size > canvas.height) { this.y = canvas.height - this.size; this.speedY *= -1; }

    // bounce off sidebar (use cached rect)
    if (sidebarRect) {
      const r = sidebarRect;
      const inX = this.x + this.size > r.left && this.x - this.size < r.right;
      const inY = this.y + this.size > r.top  && this.y - this.size < r.bottom;
      if (inX && inY) {
        if (this.x < r.right + this.size) this.x = r.right + this.size;
        this.speedX = Math.abs(this.speedX); // push to the right
      }
    }
  }

  bounceFromMouse(mx, my) {
    const dx = this.x - mx;
    const dy = this.y - my;
    const distance = Math.hypot(dx, dy);
    if (distance < this.size + 15) { // bigger hitbox
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
  // Fallback: far right center
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
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const s1 = shapes[i];
      const s2 = shapes[j];

      if ((s1.type === 'circle' && s2.type === 'triangle') ||
          (s1.type === 'triangle' && s2.type === 'circle')) {
        const circle = s1.type === 'circle' ? s1 : s2;
        const tri    = s1.type === 'triangle' ? s1 : s2;

        if (circleTriangleCollide(circle, tri)) {
          handleGameOver();
          return;
        }
      } else if (s1.type === s2.type) {
        // simple swap to simulate bounce
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

function handleGameOver() {
  gameOver = true;
  submitScore();
  showGameOver();
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  refreshSidebarRect(); // cache once per frame

  if (!isPaused) {
    shapes.forEach(s => { s.update(); s.draw(); });
    checkCollision();
  } else {
    // draw only + PAUSED overlay
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
let composing = false; // IME composition guard for Enter key
window.addEventListener('mousemove', e => {
  lastMouse = { x: e.clientX, y: e.clientY };
  if (gameOver || isPaused) return;
  shapes.forEach(shape => shape.bounceFromMouse(e.clientX, e.clientY));
});

// ===== Buttons =====
startBtn.addEventListener('click', () => {
  score = 0; scoreDisplay.textContent = score;
  gameOver = false;
  isPaused = false;
  startBtn.style.display = 'none';
  restartBtn.style.display = 'none';
  refreshSidebarRect();
  initShapes();          // spawns far from lastMouse and not under sidebar
  animate();
});

restartBtn.addEventListener('click', () => {
  score = 0; scoreDisplay.textContent = score;
  gameOver = false;
  isPaused = false;
  restartBtn.style.display = 'none';
  refreshSidebarRect();
  initShapes();          // spawns far from lastMouse and not under sidebar
  animate();
});

pauseBtn.addEventListener('click', () => {
  if (gameOver) return;  // ignore when game over
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
});

// ===== Client-side leaderboard (localStorage) with rename support =====
const LB_KEY = 'lbTop50';
const NAME_KEY = 'username';

function loadLB() {
  try { return JSON.parse(localStorage.getItem(LB_KEY)) || []; }
  catch { return []; }
}
function saveLB(arr) {
  localStorage.setItem(LB_KEY, JSON.stringify(arr.slice(0,50)));
}
function renderLB() {
  const lb = loadLB();
  leaderboardList.innerHTML = '';
  lb.forEach(({ username, score }, i) => {
    const li = document.createElement('li');
    li.textContent = `${i + 1}. ${username} — ${score}`;
    leaderboardList.appendChild(li);
  });
}
function findIndexByNameCI(lb, name) {
  const n = name.toLowerCase();
  return lb.findIndex(e => e.username.toLowerCase() === n);
}
function isNameTaken(name, exceptName = '') {
  const lb = loadLB();
  const n = name.toLowerCase();
  const except = exceptName.toLowerCase();
  return lb.some(e => e.username.toLowerCase() === n && n !== except);
}

// Live validation
usernameInput.addEventListener('input', () => {
  const currentSaved = (localStorage.getItem(NAME_KEY) || '').trim();
  const val = usernameInput.value.trim();
  if (!val) { usernameError.style.display = 'none'; return; }
  usernameError.style.display = isNameTaken(val, currentSaved) ? 'block' : 'none';
});

// IME-safe Enter handling
usernameInput.addEventListener('compositionstart', () => composing = true);
usernameInput.addEventListener('compositionend', () => composing = false);
usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !composing) attemptRename();
});

// Save button
saveNameBtn.addEventListener('click', () => attemptRename());

// Also try on change (when input loses focus after edits)
usernameInput.addEventListener('change', () => attemptRename());

function attemptRename() {
  let oldName = (localStorage.getItem(NAME_KEY) || '').trim();
  const newName = (usernameInput.value || '').trim();
  if (!newName) { usernameError.style.display = 'none'; return; }

  const same = oldName.toLowerCase() === newName.toLowerCase();
  if (!same && isNameTaken(newName, oldName)) {
    usernameError.style.display = 'block';
    return;
  }
  usernameError.style.display = 'none';

  const lb = loadLB();
  const oldIdx = findIndexByNameCI(lb, oldName);
  const newIdx = findIndexByNameCI(lb, newName);

  if (!oldName) {
    // No previous name saved, just set it
    localStorage.setItem(NAME_KEY, newName);
    renderLB();
    return;
  }

  if (same) return;

  // Merge or rename
  if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
    // Merge scores: keep max, remove duplicate
    lb[newIdx].score = Math.max(lb[newIdx].score, lb[oldIdx].score);
    lb.splice(oldIdx, 1);
  } else if (oldIdx !== -1 && newIdx === -1) {
    lb[oldIdx].username = newName;
  }
  // if oldIdx === -1 and newIdx exists, nothing to change in lb

  localStorage.setItem(NAME_KEY, newName);
  lb.sort((a,b)=>b.score - a.score);
  saveLB(lb);
  renderLB();
}

function submitScore() {
  let name = (localStorage.getItem(NAME_KEY) || usernameInput.value || '').trim();
  if (!name) name = 'Player' + Math.floor(Math.random() * 1000);
  localStorage.setItem(NAME_KEY, name);

  const lb = loadLB();
  const idx = findIndexByNameCI(lb, name);
  if (idx !== -1) {
    lb[idx].score = Math.max(lb[idx].score, score);
  } else {
    lb.push({ username: name, score });
  }
  lb.sort((a, b) => b.score - a.score);
  saveLB(lb);
  renderLB();
}

// init LB and saved name
renderLB();
const storedName = (localStorage.getItem(NAME_KEY) || '').trim();
if (storedName) usernameInput.value = storedName;
