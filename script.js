const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let shapes = [];
let score = 0;
let gameOver = false;

const colors = ['#A7E6A1', '#A1D2E6', '#A1A1E6', '#E6A1BA', '#FFE69A', '#FFC69A'];

class Shape {
  constructor(x, y, size, type) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.type = type; // 'circle' or 'square'
    this.speedX = Math.random() * 3 + 1;
    this.speedY = Math.random() * 3 + 1;
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  draw() {
    ctx.fillStyle = this.color;
    if(this.type === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
    }
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if(this.x - this.size < 0 || this.x + this.size > canvas.width) this.speedX *= -1;
    if(this.y - this.size < 0 || this.y + this.size > canvas.height) this.speedY *= -1;
  }

  bounceFromMouse(mx, my) {
    const dx = this.x - mx;
    const dy = this.y - my;
    const distance = Math.hypot(dx, dy);
    if(distance < this.size + 10) {
      const angle = Math.atan2(dy, dx);
      const speed = 5;
      this.speedX = Math.cos(angle) * speed;
      this.speedY = Math.sin(angle) * speed;
      score++;
      scoreDisplay.textContent = `Score: ${score}`;
    }
  }
}

function initShapes(num = 5) {
  shapes = [];
  let attempts = 0;
  while(shapes.length < num && attempts < 200) {
    const size = Math.random() * 30 + 20;
    const x = Math.random() * (canvas.width - 2*size) + size;
    const y = Math.random() * (canvas.height - 2*size) + size;
    const type = Math.random() < 0.5 ? 'circle' : 'square';
    const newShape = new Shape(x, y, size, type);

    let overlapping = false;
    for(let s of shapes) {
      let collided = false;
      if(newShape.type === 'circle' && s.type === 'circle') {
        collided = Math.hypot(newShape.x - s.x, newShape.y - s.y) < newShape.size + s.size;
      } else if(newShape.type === 'square' && s.type === 'square') {
        collided = Math.abs(newShape.x - s.x) < newShape.size + s.size &&
                   Math.abs(newShape.y - s.y) < newShape.size + s.size;
      } else {
        // circle-square overlap
        let circle = newShape.type === 'circle' ? newShape : s;
        let square = newShape.type === 'square' ? newShape : s;
        let closestX = Math.max(square.x - square.size, Math.min(circle.x, square.x + square.size));
        let closestY = Math.max(square.y - square.size, Math.min(circle.y, square.y + square.size));
        let dx = circle.x - closestX;
        let dy = circle.y - closestY;
        collided = Math.hypot(dx, dy) < circle.size;
      }
      if(collided) overlapping = true;
    }
    if(!overlapping) shapes.push(newShape);
    attempts++;
  }
}

function checkCollision() {
  for(let i=0; i<shapes.length; i++) {
    for(let j=i+1; j<shapes.length; j++) {
      const s1 = shapes[i];
      const s2 = shapes[j];
      // Only circle-square collisions trigger game over
      if((s1.type === 'circle' && s2.type === 'square') || (s1.type === 'square' && s2.type === 'circle')) {
        let circle = s1.type === 'circle' ? s1 : s2;
        let square = s1.type === 'square' ? s1 : s2;
        let closestX = Math.max(square.x - square.size, Math.min(circle.x, square.x + square.size));
        let closestY = Math.max(square.y - square.size, Math.min(circle.y, square.y + square.size));
        let dx = circle.x - closestX;
        let dy = circle.y - closestY;
        if(Math.hypot(dx, dy) < circle.size) {
          gameOver = true;
          showGameOver();
          return;
        }
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
  shapes.forEach(shape => {
    shape.update();
    shape.draw();
  });
  checkCollision();
  if(!gameOver) requestAnimationFrame(animate);
}

canvas.addEventListener('mousemove', e => {
  if(gameOver) return;
  const mx = e.clientX;
  const my = e.clientY;
  shapes.forEach(shape => shape.bounceFromMouse(mx, my));
});

startBtn.addEventListener('click', () => {
  score = 0;
  scoreDisplay.textContent = `Score: ${score}`;
  gameOver = false;
  restartBtn.style.display = 'none';
  startBtn.style.display = 'none';
  initShapes();
  animate();
});

restartBtn.addEventListener('click', () => {
  score = 0;
  scoreDisplay.textContent = `Score: ${score}`;
  gameOver = false;
  restartBtn.style.display = 'none';
  initShapes();
  animate();
});

