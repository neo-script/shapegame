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
    this.type = type;
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
      ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
    }
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x - this.size < 0) { this.x = this.size; this.speedX *= -1; }
    if (this.x + this.size > canvas.width) { this.x = canvas.width - this.size; this.speedX *= -1; }
    if (this.y - this.size < 0) { this.y = this.size; this.speedY *= -1; }
    if (this.y + this.size > canvas.height) { this.y = canvas.height - this.size; this.speedY *= -1; }
  }

  bounceFromMouse(mx, my) {
    const dx = this.x - mx;
    const dy = this.y - my;
    const distance = Math.hypot(dx, dy);
    if (distance < this.size + 10) {
      const now = Date.now();
      if (now - this.lastBonk > 300) {
        const angle = Math.atan2(dy, dx);
        const speed = 5;
        this.speedX = Math.cos(angle) * speed;
        this.speedY = Math.sin(angle) * speed;
        score++;
        scoreDisplay.textContent = score;
        this.lastBonk = now;
      }
    }
  }
}

// --- Init shapes 2:3 ratio ---
function initShapes() {
  shapes = [];
  let counts = Math.random() < 0.5 ? {circle:3, square:2} : {circle:2, square:3};
  let attempts = 0;

  function createShape(type){
    const size = Math.random()*30 + 20;
    const x = Math.random()*(canvas.width-2*size)+size;
    const y = Math.random()*(canvas.height-2*size)+size;
    return new Shape(x,y,size,type);
  }

  while((counts.circle>0 || counts.square>0) && attempts<500){
    let type = counts.circle>0 ? 'circle':'square';
    if(counts.circle>0 && counts.square>0){
      type = Math.random()<counts.circle/(counts.circle+counts.square)? 'circle':'square';
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

// --- Collision ---
function checkCollision(){
  for(let i=0;i<shapes.length;i++){
    for(let j=i+1;j<shapes.length;j++){
      const s1 = shapes[i];
      const s2 = shapes[j];

      if((s1.type==='circle' && s2.type==='square')||(s1.type==='square' && s2.type==='circle')){
        let circle = s1.type==='circle'?s1:s2;
        let square = s1.type==='square'?s1:s2;
        let closestX = Math.max(square.x-square.size, Math.min(circle.x,square.x+square.size));
        let closestY = Math.max(square.y-square.size, Math.min(circle.y,square.y+square.size));
        let dx = circle.x-closestX;
        let dy = circle.y-closestY;
        if(Math.hypot(dx,dy)<circle.size){
          gameOver=true;
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

// --- Buttons ---
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

// --- Username + leaderboard ---
function initUsername(){
  let storedUsername=localStorage.getItem('username');
  if(!storedUsername){
    storedUsername='User'+Math.floor(Math.random()*10000);
    localStorage.setItem('username',storedUsername);
  }
  document.getElementById('usernameInput').value=storedUsername;
}

document.getElementById('usernameInput').addEventListener('change', async e=>{
  const newName=e.target.value.trim();
  if(!newName) return;

  const res = await fetch('/api/check-username?name='+encodeURIComponent(newName));
  const data = await res.json();
  if(data.taken){
    document.getElementById('usernameError').style.display='block';
  }else{
    document.getElementById('usernameError').style.display='none';
    const oldName = localStorage.getItem('username');
    localStorage.setItem('username', newName);

    await fetch('/api/update-username',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({old:oldName,new:newName})
    });
    loadLeaderboard();
  }
});

function saveBestScore(score){
  let best = localStorage.getItem('bestScore')||0;
  if(score>best) localStorage.setItem('bestScore',score);
}

async function updateLeaderboard(score){
  const username=localStorage.getItem('username');
  await fetch('/api/leaderboard',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username,score})
  });
  loadLeaderboard();
}

async function loadLeaderboard(){
  const res = await fetch('/api/leaderboard');
  const leaderboard = await res.json();
  const list = document.getElementById('leaderboardList');
  list.innerHTML='';
  leaderboard.forEach((entry,i)=>{
    const li=document.createElement('li');
    li.textContent=`${i+1}. ${entry.username} - ${entry.score}`;
    list.appendChild(li);
  });
}

function handleGameOver(){
  saveBestScore(score);
  updateLeaderboard(score);
  showGameOver();
}

initUsername();
loadLeaderboard();

