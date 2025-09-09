const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restartBtn');

canvas.width = 800;
canvas.height = 600;

let shapes = [];
let score = 0;
let gameOver = false;

class Shape {
  constructor(x, y, radius, type) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = type; // 'circle' or 'square'
    this.speedX = Math.random() * 4 - 2;
    this.speedY = Math.random() * 4 - 2;
    this.color = '#' + Math.floor(Math.random()*16777215).toString(16);
  }

  draw() {
    ctx.fillStyle = this.color;
    if(this.type === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius*2, this.radius*2);
    }
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if(this.x - this.radius < 0 || this.x + this.radius > canvas.width) this.speedX *= -1;
    if(this.y - this.radius < 0 || this.y + this.radius > canvas.height) this.speedY *= -1;
  }
}

// Initialize shapes
function initShapes(num = 10) {
  shapes = [];
  for(let i=0; i<num; i++) {
    const type = Math.random() < 0.5 ? 'circle' : 'square';
    const radius = Math.random() * 20 + 20;
    const x = Math.random() * (canvas.width - 2*radius) + radius;
    const y = Math.random() * (canvas.height - 2*radius) + radius;
    shapes.push(new Shape(x, y, radius, type));
  }
}

// Detect mouse click
canvas.addEventListener('click', e => {
  if(gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  shapes.forEach(shape => {
    if(shape.type === 'circle') {
      const dx = mouseX - shape.x;
      const dy = mouseY - shape.y;
      if(Math.sqrt(dx*dx + dy*dy) < shape.radius) {
        bonk(shape);
      }
    } else { // square
      if(mouseX > shape.x - shape.radius && mouseX < shape.x + shape.radius &&
         mouseY > shape.y - shape.radius && mouseY < shape.y + shape.radius) {
        bonk(shape);
      }
    }
  });
});

function bonk(shape) {
  // send the shape far away
  shape.x = Math.random() * 1000 + canvas.width; // offscreen
  shape.y = Math.random() * 1000 + canvas.height;
  score++;
  scoreEl.textContent = score;
}

// Check collision between shapes
function checkCollision() {
  for(let i=0; i<shapes.length; i++) {
    for(let j=i+1; j<shapes.length; j++) {
      const s1 = shapes[i];
      const s2 = shapes[j];
      const dx = s1.x - s2.x;
      const dy = s1.y - s2.y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      if(distance < s1.radius + s2.radius) {
        gameOver = true;
      }
    }
  }
}

// Animation loop
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  shapes.forEach(shape => {
    shape.update();
    shape.draw();
  });

  checkCollision();

  if(!gameOver) {
    requestAnimationFrame(animate);
  } else {
    ctx.fillStyle = 'red';
    ctx.font = '48px Arial';
    ctx.fillText('GAME OVER', canvas.width/2 - 150, canvas.height/2);
  }
}

// Restart
restartBtn.addEventListener('click', () => {
  score = 0;
  scoreEl.textContent = score;
  gameOver = false;
  initShapes();
  animate();
});

// Start game
initShapes();
animate();
