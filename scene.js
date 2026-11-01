// 场景模块：地图定义 + 城市/竹林/山地数据生成 + 背景绘制（第三刀；game.js 之后加载）
// 共享全局：ctx/W/H/GROUND/rand/TAU/bgScrollPx；数据加载期生成，绘制函数在渲染循环调用。

const MAPS = [
  { id: 'city', name: '城市（夜晚）' },
  { id: 'cityDay', name: '城市（白天）' },
  { id: 'bamboo', name: '竹林' },
  { id: 'mountain', name: '山脚（白天）' },
  { id: 'mountainNight', name: '山脚（夜晚）' }
];

function forEachLooped(worldX, width, drawFn) {
    const offset = bgScrollPx % W;
    for (const shift of [-W, 0, W]) {
        const rx = worldX + shift - offset;
        if (rx + width < 0 || rx > W) continue;
        drawFn(rx);
    }
}

/* ============================================================
 *  场景生成与渲染
 * ============================================================ */
const cityBuildings = [];
let bx = -30;
while (bx < W + 80) {
  const bw = rand(40, 80);
  const bh = rand(70, 240);
  const windows = [];
  for (let wy = GROUND - bh + 20; wy < GROUND - 20; wy += 24) {
    for (let wx = 8; wx < bw - 10; wx += 18) {
      if (Math.random() < 0.6) windows.push({ x: wx, y: wy, w: 6, h: 10, offset: rand(0, 100) });
    }
  }
  cityBuildings.push({ x: bx, w: bw, h: bh, windows });
  bx += bw + rand(10, 30);
}
const cityBackdrop = [];
for (let i = 0; i < 26; i++) cityBackdrop.push({ x: rand(-40, W + 40), w: rand(36, 74), h: rand(90, 210) });
cityBackdrop.sort((a, b) => a.h - b.h);
const cityTrees = [];
for (let i = 0; i < 7; i++) cityTrees.push({ x: 80 + i * 145 + rand(-20, 20), r: rand(13, 18), offset: rand(0, TAU) });

for (const b of cityBuildings) {
  const top = GROUND - b.h;
  const r = Math.random();
  if (r < 0.34 && b.w > 46) b.rooftop = { type: 'tank', x: b.x + rand(0.18, 0.6) * b.w, y: top, w: rand(14, 20), h: rand(10, 16) };
  else if (r < 0.58) b.rooftop = { type: 'antenna', x: b.x + rand(0.25, 0.75) * b.w, y: top, h: rand(16, 34) };
  else if (r < 0.72) b.rooftop = { type: 'ac', x: b.x + rand(0.2, 0.65) * b.w, y: top, w: rand(10, 15), h: rand(7, 10) };
}
for (const b of cityBuildings) {
  for (const w of b.windows) {
    w.lit = Math.random() < 0.62;
    const t = Math.random();
    w.tone = t < 0.55 ? 'warm' : (t < 0.85 ? 'cream' : 'cool');
  }
}

const bambooStalks = [];
{
  const xs = []; let cx2 = -20;
  while (cx2 < W + 30) {
    xs.push(cx2);
    const r = Math.random();
    cx2 += (r < 0.2 ? rand(8, 16) : (r < 0.55 ? rand(30, 55) : rand(65, 130)));
  }
  for (const x of xs) {
    const w = rand(9, 23);
    const shade = Math.random();
    bambooStalks.push({
      x, w, offset: rand(0, TAU), segments: Math.floor(rand(6, 11)),
      swayAmp: rand(10, 26) * (w / 20),
      color: shade < 0.34 ? '#1a2620' : (shade < 0.7 ? '#233029' : '#2c3a30'),
      hi: shade < 0.34 ? 'rgba(120,160,135,0.14)' : 'rgba(150,195,165,0.17)',
      nodeColor: 'rgba(10,22,12,0.55)',
      leafColor: shade < 0.5 ? 'rgba(52,74,58,0.9)' : 'rgba(64,88,70,0.9)'
    });
  }
}
const bambooMid = [];
for (let i = 0; i < 14; i++) bambooMid.push({ x: rand(-20, W + 20), phase: rand(0, TAU) });
const bambooBackground = [];
for (let i = 0; i < 18; i++) bambooBackground.push({ x: (i * 58) % W + rand(-10, 10), phase: rand(0, TAU) });
const bambooLeafClusters = [];
for (let i = 0; i < 26; i++) {
  const clusterX = rand(-80, W + 80);
  const clusterY = rand(-60, 190);
  const leaves = [];
  const n = Math.floor(rand(9, 20));
  for (let k = 0; k < n; k++) leaves.push({ dx: rand(-52, 52), dy: rand(-26, 26), len: rand(9, 20), angle: rand(-0.55, 0.55) });
  const t = Math.random();
  bambooLeafClusters.push({
    x: clusterX, y: clusterY, offset: rand(0, TAU),
    color: t < 0.4 ? 'rgba(22,34,26,0.95)' : (t < 0.75 ? 'rgba(30,44,34,0.95)' : 'rgba(40,58,44,0.95)'),
    leaves
  });
}
const groundLeaves = [];
for (let i = 0; i < 46; i++) {
  groundLeaves.push({
    x: rand(0, W), dy: rand(2, 34), rot: rand(0, TAU),
    rx: rand(4, 9), ry: rand(1.5, 3),
    color: Math.random() < 0.5 ? 'rgba(110,170,110,0.30)' : 'rgba(86,145,90,0.34)'
  });
}
const dayGrassBlades = [];
for (let i = 0; i < 120; i++) dayGrassBlades.push({ x: (i * 23) % W + rand(-10, 10), h: rand(4, 12), offset: rand(0, TAU) });

const MOUNTAIN_RIDGES = [
  [ [0,300],[70,250],[130,232],[205,268],[285,330],[350,382],[430,330],[520,246],
    [600,206],[660,182],[730,222],[810,290],[890,342],[950,310],[W,300],[W,GROUND],[0,GROUND] ],
  [ [0,392],[90,356],[200,322],[300,368],[390,408],[500,422],[610,382],[700,330],
    [800,282],[880,318],[950,350],[W,392],[W,GROUND],[0,GROUND] ],
  [ [0,428],[70,402],[150,382],[250,404],[340,424],[400,432],[500,414],[600,392],
    [700,372],[800,384],[900,412],[950,422],[W,428],[W,GROUND],[0,GROUND] ]
];
const mountainTrees = [];
for (let i = 0; i < 14; i++) mountainTrees.push({ x: rand(20, W - 20), y: rand(GROUND - 26, GROUND - 8), h: rand(10, 20), offset: rand(0, TAU) });

/* ===== 背景地图绘制 ===== */

function drawCityMap(isNight) {
  const C = isNight ? {
    sky: ['#0a0e18', '#141b2a', '#232a3a'], discColor: '#e8e4d4', discGlow: 'rgba(232,228,212,0.10)', discR: 22,
    backTint: '#121926', bodyColor: '#1a2230', roofLine: 'rgba(70,90,120,0.25)', winLit: ['#f0c674', '#ffe9b0', '#8fc4e8'],
    winDark: 'rgba(50,64,88,0.5)', treeColor: '#151e24', walkColor: '#232a34', curbColor: 'rgba(96,120,160,0.5)',
    roadColor: '#0d1119', groundGlow:'rgba(140,175,255,0.05)'
  } : {
    sky: ['#7fb4dc', '#a8cfe6', '#d6e6f0'], discColor: '#fdfcf6', discGlow: 'rgba(255,250,230,0.16)', discR: 24,
    backTint: '#b9cddd', bodyColor: '#8ea3b8', roofLine: 'rgba(255,255,255,0.18)', winLit: null,
    winDark: 'rgba(108,130,152,0.45)', treeColor: '#5f8a6a', walkColor: '#9aa9b4', curbColor: 'rgba(255,255,255,0.4)',
    roadColor: '#4a525c', groundGlow:'rgba(255,255,255,0.05)'
  };
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, C.sky[0]); sky.addColorStop(1, C.sky[2]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);
  if (isNight) for (let i = 0; i < 46; i++) {
    const sx = (i * 157.3) % W; const sy = (i * 97.1) % (GROUND * 0.55);
    const tw = 0.18 + Math.sin(bgTime * 0.018 + i * 2.3) * 0.14;
    ctx.fillStyle = 'rgba(220,232,255,' + Math.max(0.05, tw) + ')';
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  const DX = 812, DY = 150;
  const g = ctx.createRadialGradient(DX, DY, C.discR * 0.5, DX, DY, C.discR * 5);
  g.addColorStop(0, C.discGlow); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(DX - C.discR * 5, DY - C.discR * 5, C.discR * 10, C.discR * 10);
  ctx.fillStyle = C.discColor;
  ctx.beginPath(); ctx.arc(DX, DY, C.discR, 0, TAU); ctx.fill();
  const cloudN = isNight ? 3 : 4;
  for (let i = 0; i < cloudN; i++) {
    const speed = isNight ? 0.06 : 0.10;
    let cx = ((bgTime * speed + i * 320) % (W + 500)) - 250;
    const cy = 96 + (i * 43) % 84; const sc = 0.8 + (i % 2) * 0.5;
    if (Math.abs(cx + 55 * sc - DX) < 175 && Math.abs(cy - DY) < 95) cx = cx < DX ? DX - 240 : DX + 240;
    ctx.fillStyle = isNight ? 'rgba(34,44,62,0.42)' : 'rgba(255,255,255,0.55)';
    const cw = 150 * sc, ch = 12 * sc;
    ctx.beginPath();
    ctx.moveTo(cx - cw * 0.5, cy); ctx.lineTo(cx + cw * 0.5, cy); ctx.lineTo(cx + cw * 0.5, cy - ch * 0.5);
    ctx.quadraticCurveTo(cx + cw * 0.34, cy - ch * 1.7, cx + cw * 0.12, cy - ch * 1.15);
    ctx.quadraticCurveTo(cx - cw * 0.04, cy - ch * 2.1, cx - cw * 0.22, cy - ch * 1.05);
    ctx.quadraticCurveTo(cx - cw * 0.42, cy - ch * 1.1, cx - cw * 0.5, cy - ch * 0.5);
    ctx.closePath(); ctx.fill();
  }
  for (const b of cityBackdrop) {
    forEachLooped(b.x, b.w, (rx) => {
      ctx.fillStyle = C.backTint;
      ctx.fillRect(rx, GROUND - b.h, b.w, b.h);
    });
  }
  for (const b of cityBuildings) {
    forEachLooped(b.x, b.w, (rx) => {
      const top = GROUND - b.h;
      ctx.fillStyle = C.bodyColor; ctx.fillRect(rx, top, b.w, b.h);
      ctx.fillStyle = C.roofLine; ctx.fillRect(rx, top, b.w, 1.5);
      if (b.rooftop) {
        const rt = b.rooftop;
        if (rt.type === 'tank') {
          ctx.fillStyle = C.bodyColor; ctx.fillRect(rx + rt.x, rt.y - rt.h, rt.w, rt.h);
          ctx.fillStyle = C.roofLine; ctx.fillRect(rx + rt.x, rt.y - rt.h, rt.w, 1);
        } else if (rt.type === 'antenna') {
          ctx.strokeStyle = C.roofLine; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(rx + rt.x, rt.y); ctx.lineTo(rx + rt.x, rt.y - rt.h); ctx.stroke();
        } else if (rt.type === 'ac') {
          ctx.fillStyle = C.bodyColor; ctx.fillRect(rx + rt.x, rt.y - rt.h, rt.w, rt.h);
        }
      }
      for (const w of b.windows) {
        const wx = rx + w.x;
        const wy = top + (w.y - (GROUND - b.h + 20));
        if (isNight && w.lit) {
          const idx = w.tone === 'cool' ? 2 : (w.tone === 'cream' ? 1 : 0);
          const breathe = 0.78 + Math.sin(bgTime * 0.015 + w.offset) * 0.08;
          ctx.globalAlpha = breathe;
          ctx.fillStyle = C.winLit[idx]; ctx.fillRect(wx, wy, w.w, w.h);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = C.winDark; ctx.fillRect(wx, wy, w.w, w.h);
        }
      }
    });
  }
  const haze = ctx.createLinearGradient(0, GROUND - 130, 0, GROUND);
  haze.addColorStop(0, isNight ? 'rgba(20,27,42,0)' : 'rgba(214,230,240,0)');
  haze.addColorStop(1, isNight ? 'rgba(20,27,42,0.85)' : 'rgba(214,230,240,0.85)');
  ctx.fillStyle = haze; ctx.fillRect(0, GROUND - 130, W, 130);
  for (const t of cityTrees) {
    forEachLooped(t.x, 40, (rx) => {
      const sway = Math.sin(bgTime * 0.016 + t.offset) * 1.2;
      const r = t.r * 0.9;
      ctx.fillStyle = C.treeColor;
      ctx.fillRect(rx - 1.2, GROUND - 26, 2.4, 26);
      ctx.beginPath();
      ctx.moveTo(rx + sway, GROUND - 26 - r * 2.1);
      ctx.lineTo(rx + sway + r * 0.85, GROUND - 26 - r * 0.9);
      ctx.lineTo(rx + sway + r * 0.7, GROUND - 26 - r * 0.1);
      ctx.lineTo(rx + sway - r * 0.7, GROUND - 26 - r * 0.1);
      ctx.lineTo(rx + sway - r * 0.85, GROUND - 26 - r * 0.9);
      ctx.closePath(); ctx.fill();
    });
  }
  ctx.fillStyle = C.walkColor; ctx.fillRect(0, GROUND, W, 9);
  ctx.fillStyle = C.curbColor; ctx.fillRect(0, GROUND + 9, W, 1.5);
  ctx.fillStyle = C.roadColor; ctx.fillRect(0, GROUND + 10, W, H - GROUND - 10);
  const glow = ctx.createLinearGradient(0, GROUND, 0, GROUND + 18);
  glow.addColorStop(0, C.groundGlow); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, GROUND, W, 18);
}

function drawMountainMap(isNight) {
  const C = isNight ? {
    sky: ['#070b18', '#0f1a2e', '#1c3040'], sunColor: '#f0ead6', sunGlow: ['rgba(200,220,255,0.30)', 'rgba(180,205,255,0.09)', 'rgba(170,200,255,0)'], sunX: 800, sunY: 140, sunR: 20,
    ridge: ['#0d1a24', '#132836', '#0a1015'], ridgeEdge: ['rgba(120,170,220,0.10)', 'rgba(120,170,220,0.07)', 'rgba(120,170,220,0.05)'], grass: ['#0a1418', '#060c10'], treeColor: '#060d10', grassBlade:'rgba(70,120,140,0.20)', dust: 'rgba(170,210,255,0.35)', fog: 'rgba(140,175,205,'
  } : {
    sky: ['#8fc0dd', '#a9cfe3', '#cddfe9'], sunColor: '#fdfcf6', sunGlow: ['rgba(255,252,232,0.5)', 'rgba(255,250,215,0.2)', 'rgba(255,250,215,0)'], sunX: 250, sunY: 120, sunR: 26,
    ridge: ['#9db8a6', '#7fa091', '#637f74'], ridgeEdge: ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.09)', 'rgba(255,255,255,0.06)'], grass: ['#4d6b53', '#33493a'], treeColor: '#3c5742', grassBlade:'rgba(160,200,170,0.22)', dust: 'rgba(255,255,235,0.35)', fog: 'rgba(240,248,250,'
  };
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, C.sky[0]); sky.addColorStop(isNight ? 0.55 : 0.5, C.sky[1]); sky.addColorStop(1, C.sky[2]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);
  if (isNight) for (let i = 0; i < 70; i++) {
    const sx = (i * 233) % W; const sy = (i * 179) % 250;
    const twinkle = 0.3 + Math.sin(bgTime * 0.022 + i * 2.1) * 0.3;
    const depth = 1 - sy / 250;
    ctx.fillStyle = `rgba(235,242,255,${twinkle * (0.3 + depth * 0.7)})`;
    ctx.beginPath(); ctx.arc(sx, sy, (i % 6 === 0) ? 1.5 : ((i % 4) * 0.28 + 0.45), 0, TAU); ctx.fill();
  }
  const SX = C.sunX, SY = C.sunY; const gr = isNight ? 110 : 200;
  const sg = ctx.createRadialGradient(SX, SY, 8, SX, SY, gr);
  sg.addColorStop(0, C.sunGlow[0]); sg.addColorStop(isNight ? 0.4 : 0.2, C.sunGlow[1]); sg.addColorStop(1, C.sunGlow[2]);
  ctx.fillStyle = sg; ctx.fillRect(SX - gr, SY - gr, gr * 2, gr * 2);
  ctx.fillStyle = C.sunColor;
  ctx.beginPath(); ctx.arc(SX, SY, C.sunR, 0, TAU); ctx.fill();
  if (isNight) {
    ctx.fillStyle = 'rgba(200,205,190,0.45)';
    ctx.beginPath(); ctx.arc(SX - 6, SY - 5, 4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(SX + 7, SY + 6, 2.6, 0, TAU); ctx.fill();
  }
  const cloudN = isNight ? 4 : 7;
  for (let i = 0; i < cloudN; i++) {
    const cx = ((bgTime * (isNight ? 0.08 : 0.16) + i * 200) % (W + 460)) - 230;
    const cy = 76 + (i * 41) % 110; const sc = 0.6 + (i % 3) * 0.26;
    const nearSun = Math.abs(cx + 30 - SX) < 140 && Math.abs(cy - SY) < 100;
    const fx = nearSun ? (cx < SX ? SX - 190 : SX + 190) : cx;
    ctx.fillStyle = isNight ? `rgba(70,88,124,${0.20 - (i % 3) * 0.04})` : `rgba(255,255,255,${0.72 - (i % 3) * 0.08})`;
    const cw = 150 * sc, ch = 12 * sc;
    ctx.beginPath();
    ctx.moveTo(fx - cw * 0.5, cy); ctx.lineTo(fx + cw * 0.5, cy); ctx.lineTo(fx + cw * 0.5, cy - ch * 0.5);
    ctx.quadraticCurveTo(fx + cw * 0.34, cy - ch * 1.7, fx + cw * 0.12, cy - ch * 1.15);
    ctx.quadraticCurveTo(fx - cw * 0.04, cy - ch * 2.1, fx - cw * 0.22, cy - ch * 1.05);
    ctx.quadraticCurveTo(fx - cw * 0.42, cy - ch * 1.1, fx - cw * 0.5, cy - ch * 0.5);
    ctx.closePath(); ctx.fill();
  }
  for (let r = 0; r < MOUNTAIN_RIDGES.length; r++) {
    const pts = MOUNTAIN_RIDGES[r];
    forEachLooped(0, W, (rx) => {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = pts[i][0] + rx; const y = pts[i][1];
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = C.ridge[r]; ctx.fill();
      ctx.strokeStyle = C.ridgeEdge[r]; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < pts.length && pts[i][1] < GROUND; i++) {
        const x = pts[i][0] + rx; const y = pts[i][1];
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }
  for (let i = 0; i < 3; i++) {
    const fogY = GROUND - 78 + i * 26;
    const fogX = Math.sin(bgTime * 0.01 + i) * 110;
    const fogGrad = ctx.createLinearGradient(fogX, fogY, fogX + W, fogY);
    const a = (isNight ? 0.14 : 0.10) - i * 0.025;
    fogGrad.addColorStop(0, C.fog + '0)');
    fogGrad.addColorStop(0.5, C.fog + a + ')');
    fogGrad.addColorStop(1, C.fog + '0)');
    ctx.fillStyle = fogGrad; ctx.fillRect(0, fogY, W, 38);
  }
  const grass = ctx.createLinearGradient(0, GROUND, 0, H);
  grass.addColorStop(0, C.grass[0]); grass.addColorStop(1, C.grass[1]);
  ctx.fillStyle = grass; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.strokeStyle = C.grassBlade; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const blade of dayGrassBlades) {
    forEachLooped(blade.x, 10, (rx) => {
      const sway = Math.sin(bgTime * 0.03 + blade.offset) * 3;
      ctx.beginPath();
      ctx.moveTo(rx, GROUND);
      ctx.quadraticCurveTo(rx + sway, GROUND - blade.h * 0.6, rx + sway * 1.5, GROUND - blade.h);
      ctx.stroke();
    });
  }
  for (const t of mountainTrees) {
    forEachLooped(t.x, 30, (rx) => {
      const sway = Math.sin(bgTime * 0.018 + t.offset) * 1.2;
      ctx.strokeStyle = C.treeColor; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(rx, t.y + t.h * 0.5); ctx.lineTo(rx + sway, t.y); ctx.stroke();
      ctx.fillStyle = C.treeColor;
      ctx.beginPath();
      ctx.moveTo(rx + sway, t.y - t.h * 0.9);
      ctx.lineTo(rx + sway - t.h * 0.42, t.y + t.h * 0.3);
      ctx.lineTo(rx + sway + t.h * 0.42, t.y + t.h * 0.3);
      ctx.closePath(); ctx.fill();
    });
  }
  const lineGrad = ctx.createLinearGradient(0, GROUND - 10, 0, GROUND + 10);
  lineGrad.addColorStop(0, 'rgba(255,255,255,0)');
  lineGrad.addColorStop(0.5, isNight ? 'rgba(140,180,255,0.18)' : 'rgba(255,255,255,0.22)');
  lineGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = lineGrad; ctx.fillRect(0, GROUND - 10, W, 20);
  for (let i = 0; i < 40; i++) {
    const px = (i * 133 + bgTime * 0.5 + Math.sin(bgTime * 0.02 + i) * 20) % W;
    const py = (i * 79 + bgTime * 0.2) % GROUND;
    const alpha = isNight ? 0.25 + Math.sin(bgTime * 0.06 + i * 1.9) * 0.25 : 0.45;
    if (isNight && alpha < 0.08) continue;
    ctx.fillStyle = isNight ? `rgba(200,255,170,${alpha})` : C.dust;
    ctx.beginPath(); ctx.arc(px, py, isNight ? 1.6 : 1.5, 0, TAU); ctx.fill();
  }
}

function drawBambooStalk(baseX, b) {
  const swayAmp = Math.sin(bgTime * 0.013 + b.offset) * b.swayAmp;
  const segments = b.segments;
  const halfW = b.w / 2;
  const pts = [];
  for (let j = 0; j <= segments; j++) {
    const t = j / segments;
    const y = GROUND - GROUND * t;
    const bend = swayAmp * Math.pow(t, 2.0);
    pts.push({ x: baseX + bend, y, t });
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x - halfW, pts[0].y);
  for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x - halfW, pts[j].y);
  for (let j = pts.length - 1; j >= 0; j--) ctx.lineTo(pts[j].x + halfW, pts[j].y);
  ctx.closePath();
  ctx.fillStyle = b.color; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(pts[0].x - halfW * 0.5, pts[0].y);
  for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x - halfW * 0.5, pts[j].y);
  ctx.strokeStyle = b.hi; ctx.lineWidth = Math.max(1.2, halfW * 0.3); ctx.stroke();
  ctx.strokeStyle = b.nodeColor; ctx.lineWidth = 1.8;
  for (let j = 1; j < segments; j++) {
    const p = pts[Math.min(j, pts.length - 1)];
    ctx.beginPath(); ctx.moveTo(p.x - halfW, p.y); ctx.lineTo(p.x + halfW, p.y); ctx.stroke();
  }
  const top = pts[pts.length - 1];
  for (let k = 0; k < 3; k++) {
    const side = (k % 2 === 0) ? 1 : -1;
    const branchLen = 16 + k * 5;
    const droop = 8 + k * 3;
    const bx2 = top.x + side * branchLen * 0.8;
    const by2 = top.y + branchLen * 0.5 + droop;
    ctx.strokeStyle = b.color; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y + k * 6);
    ctx.quadraticCurveTo(top.x + side * branchLen * 0.5, top.y + k * 6 + 4, bx2, by2);
    ctx.stroke();
    ctx.fillStyle = b.leafColor;
    for (let m = 0; m < 3; m++) {
      ctx.save();
      ctx.translate(bx2 - m * 5 * side, by2 + m * 4);
      ctx.rotate(side * (0.5 + m * 0.34) + Math.sin(bgTime * 0.02 + b.offset + m) * 0.08);
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 2.4, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
}

function drawBambooMap() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#0c1a10'); sky.addColorStop(0.45, '#122318'); sky.addColorStop(1, '#1b2f1e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);
  for (let i = 0; i < 4; i++) {
    const lx = 180 + i * 240;
    const a = 0.05 + Math.sin(bgTime * 0.012 + i * 1.3) * 0.025;
    const beam = ctx.createLinearGradient(lx, 0, lx + 120, GROUND);
    beam.addColorStop(0, `rgba(180,255,190,${a})`);
    beam.addColorStop(1, 'rgba(200,225,205,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(lx - 34, 0); ctx.lineTo(lx + 34, 0);
    ctx.lineTo(lx + 190, GROUND); ctx.lineTo(lx + 90, GROUND);
    ctx.closePath(); ctx.fill();
  }
  for (const bg of bambooBackground) {
    forEachLooped(bg.x, 20, (rx) => {
      const sway = Math.sin(bgTime * 0.008 + bg.phase) * 7;
      const swayTop = Math.sin(bgTime * 0.008 + bg.phase) * 14;
      ctx.strokeStyle = 'rgba(16,32,20,0.5)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(rx, GROUND);
      ctx.quadraticCurveTo(rx + sway * 0.3, GROUND * 0.5, rx + swayTop, -20);
      ctx.stroke();
    });
  }
  for (let i = 0; i < bambooMid.length; i++) {
    const b = bambooMid[i];
    forEachLooped(b.x, 20, (rx) => {
      const sway = Math.sin(bgTime * 0.012 + b.phase) * 12;
      const swayTop = Math.sin(bgTime * 0.012 + b.phase) * 22;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(26,48,30,0.62)' : 'rgba(21,40,25,0.62)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(rx, GROUND);
      ctx.quadraticCurveTo(rx + sway * 0.3, GROUND * 0.5, rx + swayTop, -20);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(12,26,16,0.5)';
      ctx.lineWidth = 1.6;
      for (let j = 1; j < 7; j++) {
        const t = j / 7;
        const yy = GROUND - GROUND * t;
        const xx = rx + swayTop * Math.pow(t, 1.6);
        ctx.beginPath(); ctx.moveTo(xx - 4.5, yy); ctx.lineTo(xx + 4.5, yy); ctx.stroke();
      }
    });
  }
  for (const b of bambooStalks) {
    forEachLooped(b.x, b.w + 200, (rx) => drawBambooStalk(rx, b));
  }
  for (const cluster of bambooLeafClusters) {
    forEachLooped(cluster.x, 200, (rx) => {
      const windX = Math.sin(bgTime * 0.012 + cluster.offset) * 13;
      const windY = Math.cos(bgTime * 0.009 + cluster.offset) * 4;
      ctx.fillStyle = cluster.color;
      for (const leaf of cluster.leaves) {
        ctx.save();
        ctx.translate(rx + leaf.dx + windX, cluster.y + leaf.dy + windY);
        ctx.rotate(leaf.angle + Math.sin(bgTime * 0.014 + cluster.offset + leaf.dx * 0.05) * 0.09);
        ctx.beginPath(); ctx.ellipse(0, 0, leaf.len, leaf.len * 0.18, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    });
  }
  for (const p of mapParticles) {
    if (p.type === 'bamboo_leaf') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = 'rgba(110,150,118,0.6)';
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 2, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  const soil = ctx.createLinearGradient(0, GROUND, 0, H);
  soil.addColorStop(0, '#1b2b1d'); soil.addColorStop(1, '#0e1710');
  ctx.fillStyle = soil; ctx.fillRect(0, GROUND, W, H - GROUND);
  for (const leaf of groundLeaves) {
    forEachLooped(leaf.x, 20, (rx) => {
      ctx.save();
      ctx.translate(rx, GROUND + leaf.dy);
      ctx.rotate(leaf.rot * 0.35);
      ctx.fillStyle = leaf.color;
      ctx.beginPath(); ctx.ellipse(0, 0, leaf.rx, leaf.ry * 0.5, 0, 0, TAU); ctx.fill();
      ctx.restore();
    });
  }
  const wet = ctx.createLinearGradient(0, GROUND, 0, GROUND + 22);
  wet.addColorStop(0, 'rgba(140,185,152,0.12)');
  wet.addColorStop(1, 'rgba(150,220,160,0)');
  ctx.fillStyle = wet; ctx.fillRect(0, GROUND, W, 22);
  ctx.strokeStyle = 'rgba(105,150,115,0.2)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, GROUND + 0.5); ctx.lineTo(W, GROUND + 0.5); ctx.stroke();
}

function drawMapIndex(idx) {
  const map = MAPS[idx].id;
  if (map === 'city' || map === 'cityDay') drawCityMap(map === 'city');
  else if (map === 'mountain' || map === 'mountainNight') drawMountainMap(map === 'mountainNight');
  else if (map === 'bamboo') drawBambooMap();
}
function drawBackground() {
  if (parkourMapFade > 0) {
    // 新旧场景交叉淡入：旧图打底，新图按进度透明叠加
    // 新旧场景交叉淡入（smoothstep 缓动，两端平缓）：旧图打底，新图按缓动进度叠加
    const raw = Math.min(1, parkourMapFade / MAP_FADE_STEPS);
    const t = raw * raw * (3 - 2 * raw);
    drawMapIndex(parkourMapFrom);
    ctx.save(); ctx.globalAlpha = t; drawMapIndex(parkourMapTo); ctx.restore();
    return;
  }
  drawMapIndex(currentMapIndex);
}
//（注：内容由AI生成）
