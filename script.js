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

    // Canvas edges
    if (this.x - this.size < 0) { this.x = this.size; this.speedX *= -1; }
    if (this.x + this.size > canvas.width) { this.x = canvas.width - this.size; this.speedX *= -1; }
    if (this.y - this.size < 0) { this.y = this.size; this.speedY *= -1; }
    if (this.y + this.size > canvas.height) { this.y = canvas.height - this.size; this.speedY *= -1; }

    // Prevent shapes from entering panels
    const leftPanel = document.getElementById('leftPanel').getBoundingClientRect();
    const rightPanel = document.getElementById('rightPanel').getBoundingClientRect();

    if (
      this.x + this.size > leftPanel.left &&
      this.x - this.size < leftPanel.right &&
      this.y + this.size > leftPanel.top &&
      this.y - this.size < leftPanel.bottom
    ) { this.speedX *= -1; this.speedY *= -1; }

    if (
      this.x + this.size > rightPanel.left &&
      this.x - this.size < rightPanel.right &&
      this.y + this.size > rightPanel.top &&
      this.y - this.size < rightPanel.bottom
    ) { this.speedX *= -1; this.speedY *= -1; }
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

// Initialize 2:3 circle:triangle ratio
function initShapes() {
  shapes = [];
  let counts = Math.random() < 0.5 ? {circle:3, triangle:2} : {circle:2, triangle:3};
  let attempts = 0;

  function createShape(type){
    const size = Math.random()*30 + 20;
    const x = Math.random()*(canvas.width-2*size)+size;
    const y = Math.random()*(canvas.height-2*size)+size;
    return new Shape(x,y,size,type);
  }

  while((counts.circle>0 || counts.triangle>0) && attempts<500){
    let type = counts.circle>0 ? 'circle':'triangle';
    if(counts.circle>0 && counts.triangle>0){
      type = Math.random()<counts.circle/(counts.circle+counts.triangle)? 'circle':'triangle';
    }
    const newShape = createShape(type);
    let overlapping = shapes.some(s=>{
      let dx = newShape.x-s.x;
      let dy = newShape.y-s.y;
      return Math.hypot(dx,dy)<newShape.size+s.size+10;
    });
    if(!overlapping){
      shapes.push(newShape);
      counts[type]--;
    }
    attempts++;
  }
}

function checkCollision(){
  for(let i=0;i<shapes.length;i++){
    for(let j=i+1;j<shapes.length;j++){
      const s1 = shapes[i];
      const s2 = shapes[j];

      if((s1.type==='circle' && s2.type==='triangle')||(s1.type==='triangle' && s2.type==='circle')){
        let circle = s1.type==='circle'?s1:s2;
        let tri = s1.type==='triangle'?s1:s2;
        let dx = circle.x - tri.x;
        let dy = circle.y - tri.y;
        if(Math.hypot(dx,dy) < circle.size + tri.size){
          gameOver = true;
          handleGameOver();
          return;
        }
      } else if(s1.type===s2.type){
        let dx = s1.x - s2.x;
        let dy = s1.y - s2.y;
        let dist = Math.hypot(dx,dy);
        if(dist<s1.size+s2.size){
          let tempX=s1.speedX,tempY=s1.speedY;
          s1.speedX=s2.speedX;s1.speedY=s2.speedY;
          s2.speedX=tempX;s2.speedY=tempY;
        }
      }
    }
  }
}

function showGameOver(){
  restartBtn.style.display='inline';
  ctx.fillStyle='#03646A';
  ctx.font='48px Schoolbell, cursive';
  ctx.fillText('GAME OVER',canvas.width/2-150,canvas.height/2);
}

function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  shapes.forEach(shape=>{shape.update();shape.draw();});
  checkCollision();
  if(!gameOver) requestAnimationFrame(animate);
}

canvas.addEventListener('mousemove', e=>{
  if(gameOver) return;
  shapes.forEach(shape=>shape.bounceFromMouse(e.clientX,e.clientY));
});

// Buttons
startBtn.addEventListener('click', ()=>{
  score=0;scoreDisplay.textContent=score;
  gameOver=false;
  startBtn.style.display='none';
  restartBtn.style.display='none';
  initShapes();
  animate();
});

restartBtn.addEventListener('click', ()=>{
  score=0;scoreDisplay.textContent=score;
  gameOver=false;
  restartBtn.style.display='none';
  initShapes();
  animate();
});

// Username & leaderboard functions remain unchanged (as
