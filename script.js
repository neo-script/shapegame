// ===== Canvas & UI refs =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const usernameInput = document.getElementById('usernameInput');
const usernameError = document.getElementById('usernameError');
const leaderboardList = document.getElementById('leaderboardList');

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

const colors = ['#A7E6A1', '#A1D2E6', '#A1A1E6', '#E6A1BA', '#FFE69A', '#FFC69A'];

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

    // bounce off panels using cached rects
    if (leftRect && this.x + this.size > leftRect.left && this.x - this.size < leftRect.right &&
        this.y + this.size > leftRect.top  && this.y - this.size < leftRect.bottom) {
      this.speedX *= -1; this.speedY *= -1;
    }
    if (rightRect && this.x + this.size > rightRect.left && this.x - this.size < rightRect.right &&
        this.y + this.size > rightRect.top  && this.y - this.size < rightRect.bottom) {
      this.speedX *= -1; this.speedY *= -1;
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

// ===== Shapes =====
function initShapes() {
  shapes = [];
  let counts = Math.random() < 0.5 ? { circle: 3, triangle: 2 } : { circle: 2, triangle: 3 };
  let attempts = 0;

  function createShape(type) {
    const size = Math.random() * 30 + 20;
    const x = Math.random() * (canvas.width - 2 * size) + size;
    const y = Math.random() * (canvas.height - 2 * size) + size;
    return new Shape(x, y, size, type);
  }

  while ((counts.circle > 0 || counts.triangle > 0) && attempts < 500) {
    let type = counts.circle > 0 ? 'circle' : 'triangle';
    if (counts.circle > 0 && counts.triangle > 0) {
      type = Math.random() < counts.circle / (counts.circle + counts.triangle) ? 'circle' : 'triangle';
    }
    const newShape = createShape(type);
    const overlapping = shapes.some(s => Math.hypot(newShape.x - s.x, newShape.y - s.y) < newShape.size + s.size + 10);
    if (!overlapping) {
      shapes.push(newShape);
      counts[type]--;
    }
    attempts++;
  }
}

function checkCollision() {
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const s1 = shapes[i];
      const s2 = shapes[j];

      // circle vs triangle => game over
      if ((s1.type === 'circle' && s2.type === 'triangle') || (s1.type === 'triangle' && s2.type === 'circle')) {
        const circle = s1.type === 'circle' ? s1 : s2;
        const tri = s1.type === 'triangle' ? s1 : s2;
        if (Math.hypot(circle.x - tri.x, circle.y - tri.y) < circle.size + tri.size) {
          handleGameOver();
          return;
        }
      } else if (s1.type === s2.type) {
        // simple elastic-ish swap
        const dx = s1.x - s2.x;
        const dy = s1.y - s2.y;
        const dist = Math.hypot(dx, dy);
        if (dist < s1.size + s2.size) {
          const tmpX = s1.speedX, tmpY = s1.speedY;
          s1.speedX = s2.speedX; s1.speedY = s2.speedY;
          s2.speedX = tmpX; s2.speedY = tmpY;
        }
      }
    }
  }
}

function showGameOver() {
  restartBtn.style.display = 'inline';
  ctx.fillStyle = '#03646A';
  ctx.font = '48px Schoolbell, cursive';
  const text = 'GAME OVER';
  const m = ctx.measureText(text);
  ctx.fillText(text, (canvas.width - m.width) / 2, canvas.height / 2);
}

// handleGameOver is the central end hook (also used to submit score)
function handleGameOver() {
  gameOver = true;
  submitScore();
  showGameOver();
}

// ===== Animation loop with panel-rect caching =====
let leftRect = null;
let rightRect = null;
function refreshPanelRects() {
  leftRect = document.getElementById('leftPanel').getBoundingClientRect();
  rightRect = document.getElementById('rightPanel').getBoundingClientRect();
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  refreshPanelRects();
  shapes.forEach(s => { s.update(); s.draw(); });
  checkCollision();
  if (!gameOver) requestAnimationFrame(animate);
}

// ===== Mouse (canvas has pointer-events:none, so listen on window) =====
window.addEventListener('mousemove', e => {
  if (gameOver) return;
  shapes.forEach(shape => shape.bounceFromMouse(e.clientX, e.clientY));
});

// ===== Buttons =====
startBtn.addEventListener('click', () => {
  score = 0; scoreDisplay.textContent = score;
  gameOver = false;
  startBtn.style.display = 'none';
  restartBtn.style.display = 'none';
  initShapes();
  animate();
});

restartBtn.addEventListener('click', () => {
  score = 0; scoreDisplay.textContent = score;
  gameOver = false;
  restartBtn.style.display = 'none';
  initShapes();
  animate();
});

// ===== Client-side username & leaderboard (localStorage) =====
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
function isNameTaken(name) {
  const lb = loadLB();
  return lb.some(e => e.username.toLowerCase() === name.toLowerCase());
}

// live username validation
usernameInput.addEventListener('input', () => {
  const val = usernameInput.value.trim();
  if (!val) { usernameError.style.display = 'none'; return; }
  usernameError.style.display = isNameTaken(val) ? 'block' : 'none';
});

function submitScore() {
  let name = (localStorage.getItem(NAME_KEY) || usernameInput.value || '').trim();
  if (!name) name = 'Player' + Math.floor(Math.random() * 1000);
  localStorage.setItem(NAME_KEY, name);

  const lb = loadLB();
  const existing = lb.find(e => e.username.toLowerCase() === name.toLowerCase());
  if (existing) existing.score = Math.max(existing.score, score);
  else lb.push({ username: name, score });

  lb.sort((a, b) => b.score - a.score);
  saveLB(lb);
  renderLB();
}

// init LB and load saved name
renderLB();
const storedName = localStorage.getItem(NAME_KEY);
if (storedName) usernameInput.value = storedName;
