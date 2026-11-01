// 跑酷模块：状态/难度/成就数据 + 生成/开局/结算 + 跑酷绘制（第四刀；game.js 之后加载）
// 共享全局：clamp/localStorage/p1/keys/ctx/W/H/GROUND 等；update/render/输入中的跑酷分支仍在 game.js。

var parkourLives = 2;
var parkourCoins = 0;
var parkourHasRevived = false;
var parkourSpeed = 6;
var parkourEffSpeed = 6;   // 实际滚动位移速度：空中跳跃时缓动降低，落地恢复，提升落点可控感
const PARKOUR_SCALE = 0.82; // 跑酷模式角色本体与判定箱统一缩放（小于对战模型）
var parkourScrollX = 0;
var parkourNextSpawnX = 0;
var parkourPlatforms = [];
var parkourObstacles = [];
var parkourCoinsList = [];
var parkourCountdown = 3;
var parkourDeadTimer = 0;
var parkourPaused = false;
// 跑酷：距离/最高分、跳跃缓冲与土狼时间、地图轮换
const PX_PER_METER = 45;          // 距离换算：多少像素算 1 米
const COIN_SPACING = 5 * PX_PER_METER; // 地面引导币固定间距：每 5 米一枚
var parkourCoinCursor = 300;      // 地面币放置游标（按固定间距推进）
const COYOTE_FRAMES = 6;          // 离地后仍可起跳的宽限帧数
var parkourBest = (function(){ try { return parseInt(localStorage.getItem('stickFightParkourBest')) || 0; } catch(e) { return 0; } })(); // 历史最远距离（米）
var parkourCoyote = 0;
var parkourJumpBuf = 0;
var parkourSDownFrames = 0;       // S 键按住帧数：短按穿一层，长按快速落地
const SDOWN_HOLD = 12;            // 按住达到该帧数视为长按（快速落地到底）
var parkourNewBest = false;       // 本局是否刷新了最远距离
var parkourMapFrom = 0, parkourMapTo = 0, parkourMapFade = 0; // 背景淡入淡出过渡
const MAP_FADE_STEPS = 52; // 背景交叉淡入淡出总帧数（约0.87s，更柔和）
var parkourPrevMap = 0;           // 进入跑酷前的地图索引，退出恢复
function parkourDistance() { return Math.floor(parkourScrollX / PX_PER_METER); }
function parkourTier() { const d = parkourScrollX; const sh = (parkourDiffShift() || 0); if (d < 3000 + sh) return 0; if (d < 9000 + sh) return 1; return 2; }

// ===== 跑酷增强：难度 / 微调 / 姿态 / 提示 / 数据持久化 =====
var parkourDifficulty = (function(){ try { return clamp((parseInt(localStorage.getItem('stickFightParkourDiff')) || 1) | 0, 0, 2); } catch(e) { return 1; } })(); // 0轻松 1普通 2困难（越界值强制收敛，防止非法存档导致查表崩溃）
const PARKOUR_DIFFS = [
  { name: '轻松', base: 5.0, grow: 1 / 5200, gapMul: 1.18, shift: 1500 },
  { name: '普通', base: 6.0, grow: 1 / 4000, gapMul: 1.00, shift: 0 },
  { name: '困难', base: 6.8, grow: 1 / 3000, gapMul: 0.88, shift: -1600 }
];
function parkourDiffShift() { return PARKOUR_DIFFS[parkourDifficulty].shift; }
var parkourXOffset = 0;            // A/D 左右微调（相对基准 250 的偏移，平滑趋近）
var parkourTimeFrames = 0;         // 本局用时（帧）
var parkourPrevTier = 0;
var parkourBannerText = ''; let parkourBannerTimer = 0;   // 难度阶段提示横幅
var parkourTotalCoins = (function(){ try { return parseInt(localStorage.getItem('stickFightParkourTotalCoins')) || 0; } catch(e) { return 0; } })(); // 累计跑酷金币（解锁尾迹）
var parkourUnlocked = (function(){ try { return JSON.parse(localStorage.getItem('stickFightParkourAch')) || []; } catch(e) { return []; } })(); // 已解锁成就 id
var parkourNewAch = [];            // 本局新解锁成就
// 尾迹配色（按累计金币解锁）
const TRAIL_TIERS = [
  { need: 0,    name: '原色', rgb: '255,255,255' },
  { need: 300,  name: '青色', rgb: '80,220,255' },
  { need: 800,  name: '紫色', rgb: '190,130,255' },
  { need: 1500, name: '金色', rgb: '255,215,80' }
];
function currentTrailRgb() { let t = TRAIL_TIERS[0].rgb; for (const c of TRAIL_TIERS) if (parkourTotalCoins >= c.need) t = c.rgb; return t; }
// 成就定义
const PARKOUR_ACH = [
  { id: 'd500',  name: '崭露头角', desc: '单局达到 500 米', check: s => s.dist >= 500 },
  { id: 'd1000', name: '千米行者', desc: '单局达到 1000 米', check: s => s.dist >= 1000 },
  { id: 'd2000', name: '疾风狂奔', desc: '单局达到 2000 米', check: s => s.dist >= 2000 },
  { id: 'c200',  name: '小富翁',   desc: '累计获得 200 枚跑酷金币', check: s => s.total >= 200 },
  { id: 'c1000', name: '金币大亨', desc: '累计获得 1000 枚跑酷金币', check: s => s.total >= 1000 },
  { id: 'first', name: '初次登场', desc: '完成第一局跑酷', check: s => s.dist > 0 }
];
var parkourBgmStep = 0;            // 程序化 BGM 节拍计数
var parkourBgmFrame = 0;

// 跳跃可达包络（世界像素）：柱高/间距必须落在可通关区间，否则会出现物理上跳不过的地形
const P_SINGLE_H = 150;   // 单跳最大上升（留余量）
const P_DOUBLE_H = 272;   // 单跳+二段跳累计最大上升
function coinArc(cx, cy, n, span){ for(let i=0;i<n;i++){ const t=n===1?0.5:i/(n-1); parkourCoinsList.push({ x: cx+(t-0.5)*span, y: cy - Math.sin(t*Math.PI)*40, type:'coin' }); } }
// 地面引导币：按固定 5 米间距补放（游标推进，均匀稀疏）
function scatterCoinsUpTo(x){
  while(parkourCoinCursor < x){
    parkourCoinsList.push({ x: parkourCoinCursor, y: GROUND - rand(40,90), type:'coin' });
    parkourCoinCursor += COIN_SPACING;
  }
}

// 乐高式积木单元：每个单元是一段保证可通关的随机地形片段，类型与参数在可达区间内随机
function emitParkourUnit(x, tier){
  // 可用单元池随 tier 解锁
  const pool = [];
  pool.push(['low', tier===0?30:18]);   // 地面短柱（单跳过）
  pool.push(['mid', tier===0?16:14]);   // 地面中柱（单跳极限）
  pool.push(['plat', 20]);              // 中层平台
  pool.push(['hop', 14]);               // 节奏跳串
  if(tier>=1){ pool.push(['tall',16]); pool.push(['move',9]); pool.push(['upper',9]); }
  if(tier>=2){ pool.push(['hang',9]); }
  let total=0; for(const q of pool) total+=q[1];
  let r=Math.random()*total, pick=pool[0][0];
  for(const q of pool){ r-=q[1]; if(r<=0){ pick=q[0]; break; } }

  if(pick==='low'){
    const cx=x+rand(180,280);
    if(Math.random()<0.5){ parkourObstacles.push({ x:cx, y:GROUND-42, w:40, h:42, type:'spike' }); }
    else { const h=rand(52,88); parkourObstacles.push({ x:cx, y:GROUND-h, w:rand(32,44), h:h, type:'lowwall' }); }
    coinArc(cx, GROUND-72, 3, 90);
    return cx + rand(60,110);
  }
  if(pick==='mid'){
    const cx=x+rand(200,300);
    const h=rand(110,138);
    parkourObstacles.push({ x:cx, y:GROUND-h, w:rand(36,50), h:h, type:'groundwall' });
    coinArc(cx, GROUND-125, 3, 110);
    return cx + rand(70,120);
  }
  if(pick==='tall'){
    // 地面高柱：单跳跳不过，必须二段跳
    const cx=x+rand(200,300);
    const h=rand(185,220);
    parkourObstacles.push({ x:cx, y:GROUND-h, w:rand(34,46), h:h, type:'groundwall' });
    coinArc(cx, GROUND-200, 4, 140);
    return cx + rand(90,140);
  }
  if(pick==='plat'){
    const pw=rand(320,480), px=x+rand(140,220), py=GROUND-rand(110,150);
    parkourPlatforms.push({ x:px, y:py, w:pw, h:15, type:'plat2' });
    parkourCoinsList.push({ x:px+pw/2, y:py-42, type:'coin' });
    if(tier>=1 && Math.random()<0.45){ // 平台上再立一根凸短柱
      const cx2=px+rand(80,Math.max(81,pw-80));
      const ch=rand(34,52);
      parkourObstacles.push({ x:cx2, y:py-ch, w:34, h:ch, type:'lowwall' });
    }
    return px+pw;
  }
  if(pick==='hop'){
    let px=x+rand(140,220), py=GROUND-rand(120,150);
    const n=3+Math.floor(rand(0,tier+2));
    let end=px;
    for(let k=0;k<n;k++){
      const pw=rand(120,165);
      py=clamp(py+rand(-46,46), GROUND-184, GROUND-96);
      parkourPlatforms.push({ x:px, baseX:px, y:py, w:pw, h:15, type:'platJump', moveAmp:0, phase:0 });
      parkourCoinsList.push({ x:px+pw/2, y:py-42, type:'coin' });
      end=px+pw; px+=pw+rand(96,132);
    }
    return end;
  }
  if(pick==='move'){
    const pw=rand(300,420), px=x+rand(160,240), py=GROUND-rand(110,150);
    parkourPlatforms.push({ x:px, baseX:px, y:py, w:pw, h:15, type:'platMove', moveAmp:rand(26,46), phase:rand(0,TAU) });
    parkourCoinsList.push({ x:px+pw/2, y:py-42, type:'coin' });
    return px+pw;
  }
  if(pick==='upper'){
    const pw=rand(420,560), px=x+rand(150,220);
    const yLow=GROUND-rand(112,132), yTop=GROUND-rand(228,252);
    parkourPlatforms.push({ x:px, y:yLow, w:pw, h:15, type:'plat2' });
    parkourPlatforms.push({ x:px, y:yTop, w:pw, h:15, type:'plat3' });
    parkourCoinsList.push({ x:px+pw/2, y:yTop-42, type:'coin' });
    return px+pw;
  }
  if(pick==='hang'){
    // 上层平台底面垂下吊柱：中层通道被堵，需走上层或精准跳过
    const pw=rand(420,560), px=x+rand(160,240);
    const yLow=GROUND-rand(118,138), yTop=GROUND-rand(235,260);
    parkourPlatforms.push({ x:px, y:yLow, w:pw, h:15, type:'plat2' });
    parkourPlatforms.push({ x:px, y:yTop, w:pw, h:15, type:'plat3' });
    const hx=px+rand(pw*0.3, pw*0.7);
    const drop=rand(90,140);
    parkourObstacles.push({ x:hx, y:yTop+15, w:rand(28,38), h:drop, type:'hang' });
    coinArc(hx, yTop-40, 3, 110);
    return px+pw;
  }
  return x+300;
}

function generateParkourChunk(startX, forceSafe=false){
  let x=startX;
  const tier=parkourTier();
  const diff=PARKOUR_DIFFS[parkourDifficulty];
  const gap=Math.round((200+(parkourSpeed-6)*14)*diff.gapMul);
  if(forceSafe){
    let len=rand(360,520);
    scatterCoinsUpTo(x+len);
    return x+len+gap;
  }
  // 乐高式：一段内随机放 1~3 个积木单元，类型与参数全随机（受可达包络约束）
  const units = tier===0 ? (Math.random()<0.5?1:2)
              : tier===1 ? 2
              : (2 + (Math.random()<0.5?1:0));
  for(let i=0;i<units;i++) x = emitParkourUnit(x, tier);
  scatterCoinsUpTo(x);
  return x + gap;
}

function startParkour() {
    const diff = PARKOUR_DIFFS[parkourDifficulty];
    parkourLives = 2; parkourCoins = 0; parkourHasRevived = false; parkourSpeed = diff.base; parkourScrollX = 0;
    parkourNextSpawnX = W; parkourPlatforms = []; parkourObstacles = []; parkourCoinsList = [];
    parkourCountdown = 3; parkourDeadTimer = 0; parkourPaused = false; bgScrollPx = 0;
    parkourCoyote = 0; parkourJumpBuf = 0; parkourSDownFrames = 0; parkourNewBest = false; parkourMapFade = 0; parkourPrevMap = currentMapIndex;
    parkourXOffset = 0; parkourTimeFrames = 0; parkourPrevTier = 0; parkourBannerText = ''; parkourBannerTimer = 0;
    parkourNewAch = []; parkourBgmStep = 0; parkourBgmFrame = 0;
    // 起步热身段：只铺引导金币（固定每5米一枚），不生成任何陷阱与高墙
    const SAFE_START_X = 1700;
    let maxX = SAFE_START_X;
    parkourCoinCursor = 300;
    scatterCoinsUpTo(SAFE_START_X);
    // 首个正式 chunk 强制无障碍空地，衔接热身段后再进入随机生成
    maxX = generateParkourChunk(maxX, true);
    while(maxX < W + 1500) maxX = generateParkourChunk(maxX);
    parkourNextSpawnX = maxX;
    const t1 = getColorSet(p1ColorData.baseHex, p1ColorData.brightness);
    p1.color = t1.color; p1.dark = t1.dark; p1.rgb = t1.rgb;
    p1.x = 250; p1.y = GROUND; p1.vx = 0; p1.vy = 0; p1.onGround = true;
    p1.facing = 1; p1.dropThroughCount = 0; p1.invincibleTimer = 0;
    p1.animTime = 0; p1.stateTime = 0;
    p1.setState('idle');
    gameState = 'parkour_countdown';
}

function finalizeParkourRun(dist) {
    parkourTotalCoins += parkourCoins;
    try { localStorage.setItem('stickFightParkourTotalCoins', String(parkourTotalCoins)); } catch (e) {}
    const stats = { dist, total: parkourTotalCoins };
    parkourNewAch = [];
    for (const a of PARKOUR_ACH) {
        if (parkourUnlocked.indexOf(a.id) === -1 && a.check(stats)) {
            parkourUnlocked.push(a.id); parkourNewAch.push(a);
        }
    }
    try { localStorage.setItem('stickFightParkourAch', JSON.stringify(parkourUnlocked)); } catch (e) {}
}

function drawParkourTrail() {
  if (p1.trail.length < 2) return;
  const rgb = currentTrailRgb();
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 1; i < p1.trail.length; i++) {
    const a = p1.trail[i - 1], b = p1.trail[i];
    const alpha = (1 - b.age / 14) * 0.38; if (alpha <= 0) continue;
    ctx.strokeStyle = `rgba(${rgb},${alpha})`;
    ctx.lineWidth = 9 * (1 - b.age / 14);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}

function drawSpeedLines() {
  if (parkourSpeed < 8.5) return;
  const inten = Math.min(1, (parkourSpeed - 8.5) / 6.5);
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const seed = i * 137.3;
    const y = 44 + ((seed * 7.13) % (H - 140));
    const off = (mapTime * parkourSpeed * 1.7 + seed) % (W + 280);
    const x = W + 130 - off;
    const len = (44 + (seed % 52)) * inten;
    ctx.strokeStyle = `rgba(220,230,255,${0.10 * inten + 0.04})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len, y); ctx.stroke();
  }
  ctx.restore();
}

function drawParallaxFar() {
  if (!gameState.startsWith('parkour')) return;
  ctx.save();
  const off = parkourScrollX * 0.25;
  ctx.fillStyle = 'rgba(22,28,48,0.5)';
  const baseY = GROUND - 18;
  for (let i = -1; i < 12; i++) {
    const bx = i * 180 - (off % 180);
    ctx.beginPath();
    ctx.moveTo(bx, baseY);
    ctx.lineTo(bx + 90, baseY - 72 - (i % 3) * 18);
    ctx.lineTo(bx + 180, baseY);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawDayNightTint() {
  if (gameState !== 'parkour') return;
  const cyc = (Math.sin(parkourScrollX / 40000 * TAU) + 1) / 2;
  const dark = (1 - cyc) * 0.15;
  if (dark > 0.015) { ctx.fillStyle = `rgba(8,12,34,${dark})`; ctx.fillRect(0, 0, W, H); }
}

function drawParkourUI() {
    ctx.textBaseline = 'alphabetic';
    // 左上：生命 + 金币（含复活所需 50 进度）
    ctx.textAlign = 'left';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillStyle = '#ff4b4b';
    let hearts = ''; for (let i = 0; i < 2; i++) hearts += i < parkourLives ? '♥ ' : '♡ ';
    ctx.fillText(hearts, 40, 60);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`🪙 ${parkourCoins}${parkourHasRevived ? '' : ' / 50'}`, 40, 100);
    if (!parkourHasRevived) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(40, 112, 90, 5);
      ctx.fillStyle = '#ffd700'; ctx.fillRect(40, 112, 90 * Math.min(1, parkourCoins / 50), 5);
    }
    // 右上：距离 / 最佳 / 用时 / 速度
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`${parkourDistance()} m`, W - 40, 58);
    const ps = Math.floor(parkourTimeFrames / 60);
    const pm = Math.floor(ps / 60), pss = String(ps % 60).padStart(2, '0');
    ctx.fillStyle = '#a0a0c8'; ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`最佳 ${parkourBest} m · ${pm}:${pss} · 速度 ${Math.round(parkourSpeed)}`, W - 40, 84);
    // 左下：难度名称
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(160,160,200,0.8)'; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`难度 · ${PARKOUR_DIFFS[parkourDifficulty].name}`, 40, 150);
    // 顶部中央：难度阶段切换横幅（渐隐）
    if (parkourBannerTimer > 0) {
        const ba = Math.min(1, parkourBannerTimer / 30);
        ctx.textAlign = 'center'; ctx.globalAlpha = ba;
        ctx.font = 'bold 26px system-ui, sans-serif'; ctx.fillStyle = '#ffd43b';
        ctx.shadowColor = '#ffd43b'; ctx.shadowBlur = 14;
        ctx.fillText(parkourBannerText, W / 2, 124);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
}

function drawParkourWorld() {
    for (let p of parkourPlatforms) {
        let sx = p.x - parkourScrollX; if (sx > W + 100 || sx + p.w < -100) continue;
        if (p.type === 'platMove') ctx.fillStyle = '#6a5590';
        else if (p.type === 'platJump') ctx.fillStyle = '#3f8f6e';
        else ctx.fillStyle = p.type === 'plat2' ? '#4a6a7a' : '#3a4a5a';
        ctx.fillRect(sx, p.y, p.w, p.h);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(sx, p.y, p.w, 2);
        if (p.type === 'platMove') { ctx.fillStyle = 'rgba(200,170,255,0.6)'; ctx.fillRect(sx, p.y + 4, p.w, 3); }
        if (p.type === 'platJump') { ctx.fillStyle = 'rgba(160,255,215,0.55)'; ctx.fillRect(sx, p.y + 4, p.w, 3); }
    }
    // 障碍预告：即将进入右侧屏幕的危险目标，在边缘闪烁红色警示箭头
    for (let o of parkourObstacles) {
        let sx = o.x - parkourScrollX;
        if (sx > W && sx < W + 130) {
            const blink = Math.floor(mapTime / 6) % 2 === 0;
            if (blink) {
                ctx.fillStyle = 'rgba(255,90,90,0.85)';
                ctx.beginPath();
                ctx.moveTo(W - 12, o.y + o.h / 2);
                ctx.lineTo(W - 34, o.y + o.h / 2 - 9);
                ctx.lineTo(W - 34, o.y + o.h / 2 + 9);
                ctx.closePath(); ctx.fill();
            }
        }
    }
    for (let o of parkourObstacles) {
        let sx = o.x - parkourScrollX; if (sx > W + 100 || sx + o.w < -100) continue;
        if (o.type === 'spike') {
            // 统一警戒红：尖刺
            ctx.fillStyle = '#d92b2b';
            ctx.beginPath();
            ctx.moveTo(sx, o.y + o.h);
            ctx.lineTo(sx + o.w/2, o.y);
            ctx.lineTo(sx + o.w, o.y + o.h);
            ctx.fill();
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.moveTo(sx + o.w*0.28, o.y + o.h);
            ctx.lineTo(sx + o.w/2, o.y);
            ctx.lineTo(sx + o.w*0.55, o.y + o.h);
            ctx.fill();
        } else if (o.type === 'wall' || o.type === 'groundwall') {
            // 统一警戒红：高架高墙 / 地面墙（带黄色警示横条；地面墙不画底部尖齿）
            ctx.fillStyle = '#c22727';
            ctx.fillRect(sx, o.y, o.w, o.h);
            ctx.fillStyle = '#ffd43b';
            for (let i = 6; i < o.h - 6; i += 18) {
                ctx.fillRect(sx + 4, o.y + i, o.w - 8, 6);
            }
            if (o.type === 'wall') {
                ctx.fillStyle = '#d92b2b';
                for (let i = 0; i < o.w; i += 10) {
                    ctx.beginPath();
                    ctx.moveTo(sx + i, o.y + o.h);
                    ctx.lineTo(sx + i + 5, o.y + o.h + 10);
                    ctx.lineTo(sx + i + 10, o.y + o.h);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(sx, o.y, o.w, 4);
            ctx.fillRect(sx, o.y + o.h - 4, o.w, 4);
        } else if (o.type === 'lowwall') {
            // 统一警戒红：低矮护栏（可直接跳过，形状区分而非颜色）
            ctx.fillStyle = '#d92b2b';
            ctx.fillRect(sx, o.y, o.w, o.h);
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(sx, o.y, o.w, 8);
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.fillRect(sx, o.y + o.h - 6, o.w, 6);
        } else if (o.type === 'hang') {
            // 吊柱：从上层平台底面垂下的红色立柱（路线博弈）
            ctx.fillStyle = '#c22727';
            ctx.fillRect(sx, o.y, o.w, o.h);
            ctx.fillStyle = '#ffd43b';
            for (let i = o.y + 10; i < o.y + o.h - 6; i += 18) ctx.fillRect(sx + 4, i, o.w - 8, 5);
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(sx, o.y, o.w, 4);
        }
    }
    for (let c of parkourCoinsList) {
        let sx = c.x - parkourScrollX; if (sx > W + 100 || sx < -100) continue;
        // 纯图形金币：外圈 + 高光芯，避免每枚设字体/描边造成的绘制开销（高速段卡顿优化）
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(sx, c.y, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffed4a';
        ctx.beginPath(); ctx.arc(sx - 2, c.y - 2, 4, 0, TAU); ctx.fill();
    }
    ctx.textBaseline = 'alphabetic';
}

function drawParkourDead() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 56px system-ui, sans-serif'; ctx.fillText('GAME OVER', W / 2, H / 2 - 100);
    const dist = parkourDistance();
    const isNewBest = parkourNewBest;
    const ps = Math.floor(parkourTimeFrames / 60);
    const pm = Math.floor(ps / 60), pss = String(ps % 60).padStart(2, '0');
    ctx.font = 'bold 26px system-ui, sans-serif'; ctx.fillStyle = '#4fc9ff';
    ctx.fillText(`距离 ${dist} m`, W / 2, H / 2 - 56);
    ctx.font = 'bold 20px system-ui, sans-serif'; ctx.fillStyle = '#ffd700';
    ctx.fillText(`用时 ${pm}:${pss} · 本局金币 ${parkourCoins} · 累计 ${parkourTotalCoins}`, W / 2, H / 2 - 22);
    let rowY = H / 2 + 12;
    if (isNewBest) {
        ctx.font = 'bold 18px system-ui, sans-serif'; ctx.fillStyle = '#7CFC8A';
        ctx.fillText('★ 新纪录！', W / 2, rowY); rowY += 28;
    }
    for (const a of parkourNewAch) {
        ctx.font = 'bold 17px system-ui, sans-serif'; ctx.fillStyle = '#ffd43b';
        ctx.fillText(`★ 解锁成就「${a.name}」 ${a.desc}`, W / 2, rowY); rowY += 26;
    }
    const tipY = H / 2 + 92;
    const bw = 150, bh = 40, gap = 22;
    const drawPBtn = (bx, label, fg, bg, bd) => {
      ctx.beginPath(); roundRect(bx, tipY, bw, bh, 8);
      ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = bd; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = 'bold 16px system-ui, sans-serif'; ctx.fillStyle = fg;
      ctx.fillText(label, bx + bw / 2, tipY + bh / 2 + 1);
    };
    const canRevive = parkourCoins >= 50 && !parkourHasRevived;
    if (canRevive) {
      const blink = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
      ctx.globalAlpha = blink;
      drawPBtn(W / 2 - bw - gap / 2, '复活(50金币)', '#b6f2cf', 'rgba(90,160,110,.28)', '#6fd39a');
      ctx.globalAlpha = 1;
      drawPBtn(W / 2 + gap / 2, '返回菜单', '#d5dcf2', 'rgba(120,130,170,.22)', '#9aa6cc');
    } else {
      drawPBtn(W / 2 - bw / 2, '返回菜单', '#d5dcf2', 'rgba(120,130,170,.22)', '#9aa6cc');
    }
    ctx.textBaseline = 'alphabetic';
}

function drawParkourPaused() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 64px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
    ctx.shadowColor = settings.themeColor; ctx.shadowBlur = 25;
    ctx.fillText('已暂停', W / 2, H / 2 - 30);
    ctx.shadowBlur = 0;
    const bw = 150, bh = 40, gap = 22, by = H / 2 + 34;
    const drawPBtn = (bx, label, fg, bg, bd) => {
      ctx.beginPath(); roundRect(bx, by, bw, bh, 8);
      ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = bd; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = 'bold 16px system-ui, sans-serif'; ctx.fillStyle = fg;
      ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
    };
    drawPBtn(W / 2 - bw - gap / 2, '继续', '#b6f2cf', 'rgba(90,160,110,.28)', '#6fd39a');
    drawPBtn(W / 2 + gap / 2, '返回菜单', '#d5dcf2', 'rgba(120,130,170,.22)', '#9aa6cc');
    ctx.textBaseline = 'alphabetic';
}
//（注：内容由AI生成）

