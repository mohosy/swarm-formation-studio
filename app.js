const canvas = document.getElementById("sim");
const ctx = canvas.getContext("2d");

const formationMode = document.getElementById("formationMode");
const countInput = document.getElementById("countInput");
const alignInput = document.getElementById("alignInput");
const cohesionInput = document.getElementById("cohesionInput");
const separationInput = document.getElementById("separationInput");

const countValue = document.getElementById("countValue");
const alignValue = document.getElementById("alignValue");
const cohesionValue = document.getElementById("cohesionValue");
const separationValue = document.getElementById("separationValue");

const speedText = document.getElementById("speedText");
const formationScore = document.getElementById("formationScore");
const pressureText = document.getElementById("pressureText");

const resetBtn = document.getElementById("resetBtn");
const pauseBtn = document.getElementById("pauseBtn");

const W = canvas.width;
const H = canvas.height;

let boids = [];
let paused = false;
let pointer = { x: W * 0.5, y: H * 0.5, active: false };

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function createBoid() {
  return {
    x: rand(30, W - 30),
    y: rand(30, H - 30),
    vx: rand(-1, 1),
    vy: rand(-1, 1),
    hue: rand(170, 215),
  };
}

function initBoids(count = Number(countInput.value)) {
  boids = Array.from({ length: count }, createBoid);
}

function normalize(x, y) {
  const mag = Math.hypot(x, y) || 1;
  return { x: x / mag, y: y / mag };
}

function targetFor(i) {
  const mode = formationMode.value;
  const cx = W * 0.5;
  const cy = H * 0.5;

  if (mode === "free") return null;

  if (mode === "circle") {
    const angle = (i / boids.length) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * 190, y: cy + Math.sin(angle) * 150 };
  }

  if (mode === "line") {
    const t = i / Math.max(1, boids.length - 1);
    return { x: 100 + t * (W - 200), y: cy + Math.sin(i * 0.2) * 12 };
  }

  if (mode === "v") {
    const centerIndex = boids.length / 2;
    const offset = i - centerIndex;
    return { x: cx + Math.abs(offset) * 5, y: cy + offset * 6 };
  }

  return null;
}

function update() {
  const alignW = Number(alignInput.value);
  const cohesionW = Number(cohesionInput.value);
  const separationW = Number(separationInput.value);

  let avgSpeed = 0;
  let pressure = 0;
  let formationError = 0;

  for (let i = 0; i < boids.length; i += 1) {
    const b = boids[i];

    let count = 0;
    let alignX = 0;
    let alignY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let separateX = 0;
    let separateY = 0;

    for (let j = 0; j < boids.length; j += 1) {
      if (i === j) continue;
      const o = boids[j];
      const dx = o.x - b.x;
      const dy = o.y - b.y;
      const d = Math.hypot(dx, dy);

      if (d < 90) {
        count += 1;
        alignX += o.vx;
        alignY += o.vy;
        cohesionX += o.x;
        cohesionY += o.y;
      }

      if (d < 28) {
        separateX -= dx / (d + 0.01);
        separateY -= dy / (d + 0.01);
      }
    }

    if (count > 0) {
      alignX /= count;
      alignY /= count;
      cohesionX = cohesionX / count - b.x;
      cohesionY = cohesionY / count - b.y;

      b.vx += alignX * 0.015 * alignW + cohesionX * 0.0009 * cohesionW + separateX * 0.05 * separationW;
      b.vy += alignY * 0.015 * alignW + cohesionY * 0.0009 * cohesionW + separateY * 0.05 * separationW;
    }

    if (pointer.active) {
      const dx = b.x - pointer.x;
      const dy = b.y - pointer.y;
      const d = Math.hypot(dx, dy);
      if (d < 130) {
        b.vx += (dx / (d + 1)) * 0.26;
        b.vy += (dy / (d + 1)) * 0.26;
        pressure += 1;
      }
    }

    const target = targetFor(i);
    if (target) {
      const tx = target.x - b.x;
      const ty = target.y - b.y;
      b.vx += tx * 0.0022;
      b.vy += ty * 0.0022;
      formationError += Math.hypot(tx, ty);
    }

    if (b.x < 15) b.vx += 0.2;
    if (b.x > W - 15) b.vx -= 0.2;
    if (b.y < 15) b.vy += 0.2;
    if (b.y > H - 15) b.vy -= 0.2;

    const n = normalize(b.vx, b.vy);
    const speed = Math.min(2.8, Math.max(0.8, Math.hypot(b.vx, b.vy)));
    b.vx = n.x * speed;
    b.vy = n.y * speed;

    b.x += b.vx;
    b.y += b.vy;

    avgSpeed += speed;
  }

  avgSpeed /= Math.max(1, boids.length);
  const mode = formationMode.value;
  const score = mode === "free" ? 100 : Math.max(0, 100 - formationError / boids.length / 2.2);

  speedText.textContent = avgSpeed.toFixed(2);
  formationScore.textContent = `${score.toFixed(1)}%`;
  pressureText.textContent = pressure.toFixed(0);
}

function drawBoid(b) {
  const a = Math.atan2(b.vy, b.vx);
  const size = 8;

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(a);

  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.65, size * 0.58);
  ctx.lineTo(-size * 0.45, 0);
  ctx.lineTo(-size * 0.65, -size * 0.58);
  ctx.closePath();

  ctx.fillStyle = `hsl(${b.hue}, 92%, 68%)`;
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.fillStyle = "rgba(4,12,16,0.34)";
  ctx.fillRect(0, 0, W, H);

  if (pointer.active) {
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 65, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,110,150,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  boids.forEach(drawBoid);
}

function loop() {
  if (!paused) {
    update();
    draw();
  }
  requestAnimationFrame(loop);
}

function syncLabels() {
  countValue.textContent = countInput.value;
  alignValue.textContent = Number(alignInput.value).toFixed(2);
  cohesionValue.textContent = Number(cohesionInput.value).toFixed(2);
  separationValue.textContent = Number(separationInput.value).toFixed(2);
}

[countInput, alignInput, cohesionInput, separationInput].forEach((el) => {
  el.addEventListener("input", () => {
    syncLabels();
    if (el === countInput) initBoids();
  });
});

resetBtn.addEventListener("click", () => initBoids());
pauseBtn.addEventListener("click", () => {
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * W;
  pointer.y = ((event.clientY - rect.top) / rect.height) * H;
});
canvas.addEventListener("mouseenter", () => (pointer.active = true));
canvas.addEventListener("mouseleave", () => (pointer.active = false));

syncLabels();
initBoids();
loop();
