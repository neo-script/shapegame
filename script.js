const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let circles = [];
let score = 0;
let gameOver = false;

const colors = ['#A7E6A1', '#A1D2E6', '#A1A1E6', '#E6A1BA', '#FFE69A', '#FFC69A'];

class Circle {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speedX = Math.random() * 3 + 1;
    this.speedY = Math.random() * 3 + 1;
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) this.speedX *= -1;
    if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) this.speedY *= -1;
  }

  bounceFromMouse(mx, my) {
    const dx = this.x - mx;
    const dy = this.y - my;
    const distance = Math.sqrt(dx*dx + dy*dy);
    if(distance < this.radius + 10) { // +10 for cursor proximity
      const angle = Math.atan2(dy, dx);
      const speed = 5;
      this.speedX = Math.cos(angle) * speed;
      this.speedY = Math.sin(angle) * speed;
      score++;
      scoreDisplay.textContent = `Score: ${score}`;
    }
  }
}

function initCircles(num = 5) {
  circles = [];
  let attempts = 0;
  while(circles.length < num && attempts < 100) {
    const radius = Math.random() * 30 + 20;
    const x = Math.random() * (canvas.width - 2*radius) + radius;
    const y = Math.random() * (canvas.height - 2*radius) + radius;

    const newCircle = new Circle(x, y, radius);
    let overlapping = false;

    for(let c of circles) {
      const dx = newCircle.x - c.x;
      const dy = newCircle.y - c.y;
      if(Math.sqrt(dx*dx + dy*dy) < newCircle.radius + c.radius) {
        overlapping = true;
        break;
      }
    }

    if(!overlapping) circles.push(newCircle);
    attempts++;
  }
}

function checkCollision() {
  for(let i=0; i<circles.length; i++) {
    for(let j=i+1; j<circles.length; j++) {
      const c1 = circles[i];
      const c2 = circles[j];
      const dx = c1.x - c2.x;
      const dy = c1.y - c2.y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      if(distance < c1.radius + c2.radius) {
        gameOver = true;
        showGameOver();
      }
    }
  }
}

function showGameOver() {
  restartBtn.style.display = 'inline';
  ctx.fillStyle = 'red';
  ctx.font = '48px Arial';
  ctx.fillText('GAME OVER', canvas.width/2 - 150, canvas.height/2);
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  circles.forEach(circle => {
    circle.update();
    circle.draw();
  });
  checkCollision();
  if(!gameOver) requestAnimationFrame(animate);
}

// Mouse tracking
canvas.addEventListener('mousemove', e => {
  if(gameOver) return;
  const mx = e.clientX;
  const my = e.clientY;
  circles.forEach(circle => circle.bounceFromMouse(mx, my));
});

// Start & Restart
startBtn.addEventListener('click', () => {
  score = 0;
  scoreDisplay.textContent = `Score: ${score}`;
  gameOver = false;
  restartBtn.style.display = 'none';
  initCircles();
  animate();
  startBtn.style.display = 'none';
});

restartBtn.addEventListener('click', () => {
  score = 0;
  scoreDisplay.textContent = `Score: ${score}`;
  gameOver = false;
  restartBtn.style.display = 'none';
  initCircles();
  animate();
});
