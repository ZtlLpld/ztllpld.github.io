// 服装与饰品系统数据（方案A拆分：纯数据 + 绘制辅助函数，先于 game.js 加载）
// 运行时使用全局 ctx / TAU；本文件仅做声明，不在加载期执行绘制。

/* ============================================================
 *  服装与饰品系统数据
 * ============================================================ */
function poly(pts, fill, stroke, lw) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
}
function circle(x, y, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
}
const lerpPt = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a, s) => ({ x: a.x * s, y: a.y * s });
const unit = a => { const L = Math.hypot(a.x, a.y) || 1; return { x: a.x / L, y: a.y / L }; };
const perp = a => ({ x: -a.y, y: a.x });
const off = (p, n, d) => ({ x: p.x + n.x * d, y: p.y + n.y * d });

const ITEMS = {
  body: [
    { id:'none', name:'无', layer:2, draw(){} },
    { id:'jacket', name:'夹克', layer:2, draw(f, j, t) {
      const sx = j.shoulder.x, sy = j.shoulder.y;
      const hx = j.hip.x, hy = j.hip.y;
      ctx.beginPath();
      ctx.moveTo(sx - 6, sy + 2);
      ctx.quadraticCurveTo(sx - 7, sy + 18, hx - 5, hy + 3);
      ctx.lineTo(hx + 5, hy + 3);
      ctx.quadraticCurveTo(sx + 7, sy + 18, sx + 6, sy + 2);
      ctx.quadraticCurveTo(sx, sy - 4, sx - 6, sy + 2);
      ctx.fillStyle = '#3d4d70'; ctx.fill();
      ctx.strokeStyle = '#1b2337'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy + 3);
      ctx.quadraticCurveTo(sx - 5, sy + 20, hx - 3, hy);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + 4, sy + 3);
      ctx.quadraticCurveTo(sx + 5, sy + 20, hx + 4, hy + 2);
      ctx.strokeStyle = '#252f45'; ctx.lineWidth = 1.5; ctx.stroke();
      poly([
        {x: sx - 5, y: sy + 1}, {x: sx + 5, y: sy + 1},
        {x: sx + 2, y: sy + 8}, {x: sx - 2, y: sy + 8}
      ], '#28324a', '#1b2337', 1.2);
    }},
    { id:'trenchcoat', name:'风衣', layer:2, draw(f, j, t) {
      const sw = Math.sin(t * 0.08) * 4;
      const sx = j.shoulder.x, sy = j.shoulder.y;
      const hx = j.hip.x, hy = j.hip.y;
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy + 2);
      ctx.quadraticCurveTo(sx - 6, sy + 20, hx - 6, hy + 2);
      ctx.bezierCurveTo(hx - 16 - sw, hy + 15, hx - 12 - sw, hy + 28, hx - 14 - sw, hy + 34);
      ctx.lineTo(hx, hy + 22);
      ctx.fillStyle = '#4e3829'; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy + 2);
      ctx.quadraticCurveTo(sx - 6, sy + 15, hx - 6, hy + 2);
      ctx.lineTo(hx - 7, hy + 20);
      ctx.quadraticCurveTo(hx - 2, hy + 35, hx + 7 + sw, hy + 34);
      ctx.lineTo(hx + 8, hy + 2);
      ctx.quadraticCurveTo(sx + 6, sy + 15, sx + 5, sy + 2);
      ctx.quadraticCurveTo(sx, sy - 3, sx - 5, sy + 2);
      ctx.fillStyle = '#6b5040'; ctx.fill();
      ctx.strokeStyle = '#2e1f15'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + 1, sy + 2);
      ctx.lineTo(hx + 1, hy + 2);
      ctx.lineTo(hx + 2, hy + 30);
      ctx.strokeStyle = '#3a2519'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx - 7, hy - 2);
      ctx.lineTo(hx + 9, hy - 2);
      ctx.lineTo(hx + 9, hy + 3);
      ctx.lineTo(hx - 7, hy + 3);
      ctx.fillStyle = '#2e1f15'; ctx.fill();
      poly([
        {x: sx - 5, y: sy + 1}, {x: sx + 5, y: sy + 1},
        {x: sx + 2, y: sy + 14}, {x: sx - 4, y: sy + 8}
      ], '#4a3528', '#2e1f15', 1.2);
    }},
    { id:'gi', name:'道服', layer:2, draw(f, j, t) {
      const sx = j.shoulder.x, sy = j.shoulder.y;
      const hx = j.hip.x, hy = j.hip.y;
      ctx.beginPath();
      ctx.moveTo(sx - 7, sy + 2);
      ctx.quadraticCurveTo(sx - 9, sy + 20, hx - 7, hy + 2);
      ctx.lineTo(hx + 7, hy + 2);
      ctx.quadraticCurveTo(sx + 8, sy + 15, sx + 6, sy + 2);
      ctx.quadraticCurveTo(sx, sy - 3, sx - 7, sy + 2);
      ctx.fillStyle = '#e8e4dc'; ctx.fill();
      ctx.strokeStyle = '#b8b2a6'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy);
      ctx.quadraticCurveTo(sx, sy + 8, sx + 2, sy + 16);
      ctx.quadraticCurveTo(sx + 4, sy + 8, sx + 4, sy);
      ctx.fillStyle = '#d1cbc1'; ctx.fill();
      ctx.strokeStyle = '#b8b2a6'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx - 8, hy - 2);
      ctx.lineTo(hx + 8, hy - 2);
      ctx.lineTo(hx + 8, hy + 3);
      ctx.lineTo(hx - 8, hy + 3);
      ctx.fillStyle = '#22242c'; ctx.fill();
      const sw = Math.sin(t * 0.09) * 4;
      ctx.beginPath();
      ctx.moveTo(hx - 8, hy);
      ctx.quadraticCurveTo(hx - 16 + sw, hy + 10, hx - 14 + sw, hy + 22);
      ctx.lineTo(hx - 8, hy + 20);
      ctx.fillStyle = '#2c2f3a'; ctx.fill();
    }},
    { id:'armor', name:'板甲', layer:2, draw(f, j, t) {
      const sx = j.shoulder.x, sy = j.shoulder.y;
      const hx = j.hip.x, hy = j.hip.y;
      ctx.beginPath();
      ctx.arc(sx, sy + 2, 8, Math.PI, 0);
      ctx.lineTo(sx + 8, sy + 5);
      ctx.lineTo(sx - 8, sy + 5);
      ctx.fillStyle = '#a0aabf'; ctx.fill();
      ctx.strokeStyle = '#3c4452'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx - 2, sy + 1, 4, Math.PI, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      const grad = ctx.createLinearGradient(sx - 6, sy, sx + 6, sy);
      grad.addColorStop(0, '#6b758a');
      grad.addColorStop(0.4, '#9aa3b5');
      grad.addColorStop(1, '#5a6070');
      poly([
        {x: sx - 6, y: sy + 2}, {x: sx + 6, y: sy + 2},
        {x: hx + 6, y: hy - 2}, {x: hx - 6, y: hy - 2}
      ], grad, '#3c4452', 2);
      seg({x: sx, y: sy + 2}, {x: hx, y: hy - 2}, 2, '#3c4452');
    }},
    { id:'cloak', name:'披风', layer:0, draw(f, j, t) {
      const sw = Math.sin(t * 0.05) * 6 + Math.sin(t * 0.11) * 2;
      const sx = j.shoulder.x - 2, sy = j.shoulder.y;
      const hx = j.hip.x - 2, hy = j.hip.y;
      ctx.beginPath();
      ctx.moveTo(sx + 2, sy - 4);
      ctx.bezierCurveTo(sx - 12, sy + 20, hx - 22 - sw, hy + 25, hx - 16 - sw, hy + 50);
      ctx.quadraticCurveTo(hx - 4, hy + 55, hx + 2, hy + 45);
      ctx.bezierCurveTo(hx, hy + 20, sx + 6, sy + 15, sx + 6, sy - 4);
      ctx.fillStyle = '#8c2030'; ctx.fill();
      ctx.strokeStyle = '#4e0d16'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + 2, sy);
      ctx.bezierCurveTo(sx - 6, sy + 25, hx - 12 - sw, hy + 25, hx - 6 - sw, hy + 48);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3; ctx.stroke();
      circle(sx + 4, sy - 2, 3, '#e8c46a', '#a8873a', 1.5);
    }},
    { id:'wings', name:'羽翼', layer:0, draw(f, j, t) {
      const sx = j.shoulder.x - 4, sy = j.shoulder.y + 5;
      const flap = Math.sin(t * 0.08) * 0.25;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(flap - 0.15);
      poly([
        {x:0, y:0}, {x:-25, y:-25}, {x:-45, y:-15}, {x:-40, y:5},
        {x:-55, y:15}, {x:-35, y:30}, {x:-15, y:35}, {x:-10, y:10}
      ], 'rgba(240,245,255,0.95)', '#9aa5b8', 1.5);
      ctx.beginPath();
      ctx.moveTo(-5, 5); ctx.lineTo(-35, -15);
      ctx.moveTo(-8, 15); ctx.lineTo(-45, 5);
      ctx.moveTo(-10, 25); ctx.lineTo(-35, 25);
      ctx.strokeStyle = '#9aa5b8'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, -10); ctx.lineTo(-25, -20);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }},
    { id:'ninjaGi', name:'忍者服', layer:2, draw(f, j, t) {
      const sx = j.shoulder.x, sy = j.shoulder.y, hx = j.hip.x, hy = j.hip.y;
      poly([
        {x:sx-6,y:sy+1},{x:sx-8,y:hy+2},{x:hx+8,y:hy+2},
        {x:sx+6,y:sy+1},{x:sx+3,y:sy-3},{x:sx-3,y:sy-3}
      ], '#3d5188', '#16203a', 2);
      ctx.strokeStyle = '#16203a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx+3, sy+1); ctx.lineTo(hx+2, hy+2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx-8, hy+2); ctx.lineTo(sx-8, hy+9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx+8, hy+2); ctx.lineTo(sx+8, hy+9); ctx.stroke();
      ctx.fillStyle = '#c0392b'; ctx.fillRect(hx-8, hy-3, 16, 5);
      ctx.strokeStyle = '#7a1f16'; ctx.lineWidth = 1; ctx.strokeRect(hx-8, hy-3, 16, 5);
      poly([{x:hx+7,y:hy-3},{x:hx+13,y:hy-1},{x:hx+7,y:hy+2}], '#a02828', '#7a1f16', 1);
    }},
    { id:'samuraiArmor', name:'武士甲', layer:2, draw(f, j, t) {
      const sx = j.shoulder.x, sy = j.shoulder.y, hx = j.hip.x, hy = j.hip.y;
      poly([
        {x:sx-7,y:sy+2},{x:hx-7,y:hy-1},{x:hx+7,y:hy-1},
        {x:sx+7,y:sy+2},{x:sx+2,y:sy-3},{x:sx-2,y:sy-3}
      ], '#933030', '#3d0f0f', 2);
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.3;
      for (let k = 0; k < 3; k++) { const yy = sy + 9 + k * 7; ctx.beginPath(); ctx.moveTo(sx-6, yy); ctx.lineTo(sx+6, yy); ctx.stroke(); }
      circle(sx+8, sy+1, 5, '#5a1818', '#3d0f0f', 1.5);
      circle(sx-8, sy+1, 4, '#4a1414', '#3d0f0f', 1.2);
      for (let k = -1; k <= 1; k++) {
        const cx = hx + k * 6;
        poly([{x:cx-3,y:hy},{x:cx+3,y:hy},{x:cx+2,y:hy+12},{x:cx-2,y:hy+12}], '#7a2020', '#3d0f0f', 1);
      }
      ctx.fillStyle = '#22242c'; ctx.fillRect(hx-8, hy-4, 16, 4);
      circle(hx+2, hy-2, 2.6, '#c9a24a', '#8a6a28', 1);
    }},
    { id:'mageRobe', name:'法师长袍', layer:2, draw(f, j, t) {
      const sx = j.shoulder.x, sy = j.shoulder.y, hx = j.hip.x, hy = j.hip.y;
      const sway = Math.sin(t * 0.06) * 3;
      poly([
        {x:sx-6,y:sy+1},{x:sx-7,y:hy},{x:sx+7,y:hy},
        {x:sx+6,y:sy+1},{x:sx+2,y:sy-3},{x:sx-2,y:sy-3}
      ], '#7d50b8', '#3c2260', 2);
      poly([
        {x:sx-7,y:hy},{x:hx-15+sway,y:hy+28},{x:hx+15+sway,y:hy+28},{x:sx+7,y:hy}
      ], '#6a3fa0', '#3c2260', 2);
      circle(sx+2, sy+8, 2.4, '#ffd700');
      ctx.fillStyle = 'rgba(255,215,0,0.85)';
      circle(hx-3, hy+10, 1.4); circle(hx+5+sway*0.4, hy+16, 1.4); circle(hx, hy+22, 1.4);
    }},
    { id:'mechTorso', name:'机甲胸甲', layer:2, draw(f, j, t) {
      const sx = j.shoulder.x, sy = j.shoulder.y, hx = j.hip.x, hy = j.hip.y;
      poly([
        {x:sx-7,y:sy+2},{x:hx-7,y:hy-1},{x:hx+7,y:hy-1},
        {x:sx+7,y:sy+2},{x:sx+2,y:sy-3},{x:sx-2,y:sy-3}
      ], '#71829c', '#2c3442', 2);
      ctx.strokeStyle = '#2c3442'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(sx, sy+1); ctx.lineTo(hx, hy-1); ctx.stroke();
      const glow = 0.6 + Math.sin(t * 0.12) * 0.4;
      ctx.globalAlpha = glow; circle(sx+3, sy+11, 3.2, '#4fc9ff', '#1d7cb8', 1); ctx.globalAlpha = 1;
      poly([{x:sx+5,y:sy-1},{x:sx+12,y:sy+1},{x:sx+11,y:sy+6},{x:sx+5,y:sy+5}], '#5a6a80', '#2c3442', 1.2);
      ctx.fillStyle = '#333d4c'; ctx.fillRect(hx-7, hy-3, 14, 3);
    }},
    { id:'jersey', name:'棒球球衣', layer:2, draw(f, j, t) {
      const sx = j.shoulder.x, sy = j.shoulder.y, hx = j.hip.x, hy = j.hip.y;
      poly([
        {x:sx-6,y:sy+1},{x:sx-7,y:hy+2},{x:hx+7,y:hy+2},
        {x:sx+6,y:sy+1},{x:sx+2,y:sy-3},{x:sx-2,y:sy-3}
      ], '#f4f4fa', '#9aa0b0', 2);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(sx+1, sy+2, 3.5, hy - sy);
      ctx.beginPath(); ctx.moveTo(sx-2, sy+1); ctx.lineTo(sx+3, sy+8); ctx.lineTo(sx+6, sy+1);
      ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = '#c0392b'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('7', sx+4, sy+22); ctx.textAlign = 'left';
    }},
    { id:'pirateCoat', name:'海盗外套', layer:2, draw(f, j, t) {
      const sx = j.shoulder.x, sy = j.shoulder.y, hx = j.hip.x, hy = j.hip.y;
      const sway = Math.sin(t * 0.05) * 3;
      poly([
        {x:sx-7,y:sy+1},{x:hx-7,y:hy+2},{x:sx+7,y:hy+2},
        {x:sx+6,y:sy+1},{x:sx+2,y:sy-3},{x:sx-2,y:sy-3}
      ], '#4a3726', '#1c120a', 2);
      poly([{x:sx+3,y:sy+2},{x:sx+7,y:sy+2},{x:hx+6,y:hy+2},{x:hx+3,y:hy+2}], '#8c2030');
      poly([{x:sx-7,y:hy+1},{x:hx-13+sway,y:hy+24},{x:hx-4,y:hy+3}], '#332619', '#1c120a', 1.5);
      poly([{x:sx+7,y:hy+1},{x:hx+12+sway,y:hy+20},{x:hx+4,y:hy+3}], '#332619', '#1c120a', 1.5);
      ctx.fillStyle = '#c8a24a';
      circle(sx+4, sy+8, 1.4); circle(sx+4, hy-2, 1.4);
      ctx.fillStyle = '#c8a24a'; ctx.fillRect(hx-3, hy-3, 7, 4);
      ctx.strokeStyle = '#8a6a28'; ctx.lineWidth = 1; ctx.strokeRect(hx-3, hy-3, 7, 4);
    }}
  ],
  head: [
    { id:'none', name:'无', layer:3, draw(){} },
    { id:'headband', name:'头带', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      const y = h.y - 2;
      ctx.strokeStyle = '#d64a4a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(h.x - r, y); ctx.lineTo(h.x + r, y); ctx.stroke();
      const sw = Math.sin(t * 0.1) * 4;
      ctx.beginPath();
      ctx.moveTo(h.x - r + 1, y);
      ctx.quadraticCurveTo(h.x - r - 10, y + 4 + sw, h.x - r - 20, y + 10 + sw * 1.5);
      ctx.strokeStyle = '#d64a4a'; ctx.lineWidth = 3; ctx.stroke();
    }},
    { id:'cap', name:'鸭舌帽', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      ctx.beginPath();
      ctx.arc(h.x - 1, h.y - 1, r + 3, Math.PI, 0);
      ctx.quadraticCurveTo(h.x + r + 4, h.y + 3, h.x - r - 4, h.y + 3);
      ctx.fillStyle = '#2f6fd0'; ctx.fill();
      ctx.strokeStyle = '#17406e'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      ctx.arc(h.x - 2, h.y - 2, r + 1, Math.PI * 1.1, Math.PI * 1.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(h.x + 2, h.y - 2);
      ctx.quadraticCurveTo(h.x + r + 10, h.y - 6, h.x + r + 14, h.y + 2);
      ctx.quadraticCurveTo(h.x + r + 8, h.y + 5, h.x + 2, h.y + 3);
      ctx.fillStyle = '#1f56a8'; ctx.fill();
      ctx.strokeStyle = '#123a70'; ctx.lineWidth = 1.5; ctx.stroke();
      circle(h.x - 2, h.y - r - 3, 2.5, '#17406e');
    }},
    { id:'helmet', name:'头盔', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      ctx.beginPath();
      ctx.arc(h.x, h.y, r + 4, Math.PI * 0.85, Math.PI * 2.15);
      ctx.closePath();
      ctx.fillStyle = '#9aa3b5'; ctx.fill();
      ctx.strokeStyle = '#4a5266'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(h.x + r + 2, h.y - 6);
      ctx.quadraticCurveTo(h.x + r + 9, h.y - 2, h.x + r + 2, h.y + 6);
      ctx.fillStyle = '#6b7488'; ctx.fill();
      ctx.strokeStyle = '#3c4452'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath();
      ctx.arc(h.x - 3, h.y - 3, r + 1.5, Math.PI * 1.15, Math.PI * 1.55);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2.5; ctx.stroke();
    }},
    { id:'horns', name:'恶魔角', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      poly([ { x: h.x - 2, y: h.y - r + 2 }, { x: h.x - 12, y: h.y - r - 8 }, { x: h.x + 2, y: h.y - r - 1 } ], '#8e2a20', '#4a100a', 1.2);
      poly([ { x: h.x + r * 0.5, y: h.y - r * 0.8 }, { x: h.x + r * 1.4, y: h.y - r * 1.5 }, { x: h.x + r * 0.2, y: h.y - r * 0.9 } ], '#c0392b', '#7a1f16', 1.2);
    }},
    { id:'hood', name:'兜帽', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      ctx.beginPath();
      ctx.arc(h.x - 2, h.y, r + 5, Math.PI * 0.4, Math.PI * 1.6);
      ctx.lineWidth = 9; ctx.strokeStyle = '#4a3f5c'; ctx.lineCap = 'round'; ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = '#5f5275'; ctx.stroke();
      poly([ { x: h.x - r - 5, y: h.y - r - 2 }, { x: h.x - r - 15, y: h.y - r - 12 }, { x: h.x - r - 1, y: h.y - r - 8 } ], '#4a3f5c');
    }},
    { id:'halo', name:'光环', layer:3, draw(f, j, t) {
      const h = j.head;
      const y = h.y - HEAD_R - 10 + Math.sin(t * 0.05) * 2;
      ctx.beginPath();
      ctx.ellipse(h.x, y, 12, 4, 0, 0, TAU);
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }},
    { id:'headphones', name:'耳机', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      ctx.beginPath();
      ctx.arc(h.x, h.y, r + 4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.stroke();
      circle(h.x - 2, h.y + 2, 5.5, '#555', '#222', 1.5);
      circle(h.x + r - 1, h.y + 2, 4.5, '#555', '#222', 1.5);
    }},
    { id:'ninjaTurban', name:'忍者头巾', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.arc(h.x, h.y, r + 1, Math.PI * 1.12, Math.PI * 1.9); ctx.stroke();
      circle(h.x - r - 1, h.y - 2, 3, '#a02828', '#7a1f16', 1);
      const sw = Math.sin(t * 0.1) * 4;
      ctx.strokeStyle = '#a02828'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(h.x - r - 2, h.y - 2);
      ctx.quadraticCurveTo(h.x - r - 13, h.y + 1 + sw, h.x - r - 23, h.y + 8 + sw * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(h.x - r - 2, h.y - 3);
      ctx.quadraticCurveTo(h.x - r - 12, h.y - 5 + sw, h.x - r - 20, h.y - 11 + sw); ctx.stroke();
    }},
    { id:'kabuto', name:'武士兜盔', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      ctx.beginPath(); ctx.arc(h.x, h.y - 1, r + 4, Math.PI * 0.85, Math.PI * 2.02);
      ctx.lineTo(h.x + r + 3, h.y + 2); ctx.closePath();
      ctx.fillStyle = '#333844'; ctx.fill(); ctx.strokeStyle = '#15181f'; ctx.lineWidth = 2; ctx.stroke();
      poly([{x:h.x+2,y:h.y-r-3},{x:h.x+12,y:h.y-r-11},{x:h.x+5,y:h.y-r-1}], '#c9a24a', '#8a6a28', 1.2);
      circle(h.x + r - 1, h.y + 4, 3.5, '#22262e', '#15181f', 1);
    }},
    { id:'wizardHat', name:'法师尖帽', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      const wob = Math.sin(t * 0.05) * 1.5, lean = 4 + wob;
      poly([
        {x:h.x-r-5,y:h.y-3},{x:h.x+r+5,y:h.y-3},{x:h.x+lean,y:h.y-r-22}
      ], '#7d50b8', '#3c2260', 2);
      ctx.beginPath(); ctx.ellipse(h.x, h.y - 3, r + 7, 3.5, 0, 0, TAU);
      ctx.fillStyle = '#4e2d78'; ctx.fill(); ctx.strokeStyle = '#3c2260'; ctx.lineWidth = 1.5; ctx.stroke();
      circle(h.x + lean, h.y - r - 14, 1.6, '#ffd700');
    }},
    { id:'mechHelm', name:'机甲头盔', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      ctx.beginPath(); ctx.arc(h.x, h.y, r + 3, Math.PI * 0.82, Math.PI * 2.05);
      ctx.lineTo(h.x + r + 2, h.y + 3); ctx.closePath();
      ctx.fillStyle = '#5a6a80'; ctx.fill(); ctx.strokeStyle = '#2c3442'; ctx.lineWidth = 2; ctx.stroke();
      const glow = 0.6 + Math.sin(t*0.12)*0.4;
      ctx.globalAlpha = glow; circle(h.x + r*0.45, h.y - 1, 3.2, '#4fc9ff'); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#2c3442'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(h.x + 1, h.y - r - 3); ctx.lineTo(h.x + 6, h.y - r - 11); ctx.stroke();
      circle(h.x + 6, h.y - r - 12, 1.8, '#ff5a5a');
    }},
    { id:'capSport', name:'棒球帽', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      ctx.beginPath(); ctx.arc(h.x, h.y - 1, r + 3, Math.PI * 1.02, Math.PI * 2.02);
      ctx.lineTo(h.x + r + 2, h.y + 2); ctx.closePath();
      ctx.fillStyle = '#c0392b'; ctx.fill(); ctx.strokeStyle = '#7a1f16'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(h.x + 3, h.y - 1);
      ctx.quadraticCurveTo(h.x + r + 11, h.y - 5, h.x + r + 15, h.y + 2);
      ctx.quadraticCurveTo(h.x + r + 9, h.y + 5, h.x + 3, h.y + 3);
      ctx.fillStyle = '#8e2a20'; ctx.fill();
      circle(h.x - 1, h.y - r - 3, 2.2, '#7a1f16');
    }},
    { id:'tricorn', name:'海盗三角帽', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      poly([
        {x:h.x-r-7,y:h.y-2},{x:h.x-r-3,y:h.y-r-8},
        {x:h.x+r+2,y:h.y-r-4},{x:h.x+r+7,y:h.y-1},{x:h.x,y:h.y-2}
      ], '#22242c', '#0e0f13', 2);
      ctx.fillStyle = '#8c2030'; ctx.fillRect(h.x - r - 2, h.y - 5, r + 8, 3);
      circle(h.x + r - 1, h.y - 4, 2, '#c8a24a');
    }},
    { id:'crown', name:'皇冠', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      const y0 = h.y - r + 1;
      poly([
        {x:h.x-r*0.55,y:y0},{x:h.x-r*0.55,y:y0-5},
        {x:h.x-r*0.18,y:y0-2},{x:h.x,y:y0-7},
        {x:h.x+r*0.18,y:y0-2},{x:h.x+r*0.55,y:y0-5},{x:h.x+r*0.55,y:y0}
      ], '#ffd700', '#b8860b', 1.5);
      circle(h.x, y0 - 8, 1.3, '#ff5a5a');
    }},
    { id:'catEars', name:'猫耳', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      const wig = Math.sin(t * 0.08) * 1;
      poly([{x:h.x-8,y:h.y-r+1},{x:h.x-12+wig,y:h.y-r-10},{x:h.x-3,y:h.y-r-1}], '#d8dae6', '#8a90a8', 1.5);
      poly([{x:h.x+1,y:h.y-r+1},{x:h.x+5-wig,y:h.y-r-12},{x:h.x+9,y:h.y-r-1}], '#e6e8f0', '#8a90a8', 1.5);
      poly([{x:h.x+3,y:h.y-r-2},{x:h.x+5-wig,y:h.y-r-9},{x:h.x+7,y:h.y-r-2}], '#ff9ec4');
    }}
  ],
  face: [
    { id:'none', name:'无', layer:3, draw(){} },
    { id:'mask', name:'忍者面罩', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      poly([
        { x: h.x + r * 0.9, y: h.y }, { x: h.x + r * 0.6, y: h.y + r * 1.1 },
        { x: h.x - r * 0.5, y: h.y + r }, { x: h.x - r * 0.8, y: h.y }
      ], '#2b2b33');
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(h.x + 1, h.y - 3); ctx.lineTo(h.x + r * 0.8, h.y - 3); ctx.stroke();
    }},
    { id:'goggles', name:'护目镜', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(h.x - r, h.y - 2); ctx.lineTo(h.x + r, h.y - 2); ctx.stroke();
      circle(h.x + r * 0.45, h.y - 2, 5.5, '#7fd4ff', '#2a2a34', 1.5);
      circle(h.x + r * 0.45 - 1.5, h.y - 3.5, 1.5, 'rgba(255,255,255,0.8)');
    }},
    { id:'monocle', name:'单片眼镜', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      circle(h.x + r * 0.45, h.y - 2, 5, 'rgba(200,230,255,0.2)', '#c8a24a', 1.5);
      const sw = Math.sin(t * 0.1) * 2;
      ctx.beginPath();
      ctx.moveTo(h.x + r * 0.45, h.y + 2);
      ctx.quadraticCurveTo(h.x + r + 2, h.y + 8, h.x + r, h.y + 16 + sw);
      ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 1; ctx.stroke();
    }},
    { id:'respirator', name:'呼吸器', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      circle(h.x + r * 0.45, h.y + r * 0.45, 5.5, '#5a6070', '#2c313c', 1.5);
      circle(h.x + r * 0.45, h.y + r * 0.45, 1.5, '#2c313c');
      ctx.strokeStyle = '#3c4250'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(h.x + r * 0.2, h.y + r * 0.45); ctx.lineTo(h.x - r, h.y + r + 2); ctx.stroke();
    }},
    { id:'beard', name:'白胡子', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      poly([
        { x: h.x + r * 0.2, y: h.y + r * 0.2 }, { x: h.x + r * 0.9, y: h.y + r * 0.2 },
        { x: h.x + r * 1.1, y: h.y + r * 1.2 }, { x: h.x + r * 0.1, y: h.y + r * 1.8 },
        { x: h.x - r * 0.6, y: h.y + r * 1.2 }
      ], '#d8d8e2', '#9a9aab', 1.2);
    }},
    { id:'mechGoggles', name:'机甲目镜', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(h.x - r + 2, h.y - 2); ctx.quadraticCurveTo(h.x, h.y - 7, h.x + r - 3, h.y - 2); ctx.stroke();
      circle(h.x + r*0.42, h.y - 2, 4.5, 'rgba(79,201,255,0.55)', '#2a2a34', 1.5);
      circle(h.x + r*0.42 - 1.3, h.y - 3.4, 1.4, 'rgba(255,255,255,0.85)');
    }},
    { id:'eyepatch', name:'海盗眼罩', layer:3, draw(f, j, t) {
      const h = j.head, r = HEAD_R;
      circle(h.x + r*0.45, h.y - 1, 4.5, '#111', '#000', 1.2);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(h.x + r*0.45, h.y - 5);
      ctx.quadraticCurveTo(h.x, h.y - 11, h.x - r + 2, h.y - 3); ctx.stroke();
    }},
    { id:'shades', name:'墨镜', layer:3, draw(f, j, t) {
      const h = j.head;
      ctx.fillStyle = '#0d0d12'; ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 1.5;
      ctx.fillRect(h.x + 1, h.y - 6, 11, 9); ctx.strokeRect(h.x + 1, h.y - 6, 11, 9);
      ctx.strokeStyle = '#0d0d12'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(h.x + 1, h.y - 2); ctx.quadraticCurveTo(h.x - 4, h.y - 5, h.x - 10, h.y - 3); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(h.x + 3, h.y - 5, 3, 2.5);
    }}
  ],
  neck: [
    { id:'none', name:'无', layer:3, draw(){} },
    { id:'scarf', name:'围巾', layer:3, draw(f, j, t) {
      const s = j.shoulder;
      const sw = Math.sin(t * 0.09) * 5;
      ctx.beginPath();
      ctx.ellipse(s.x - 1, s.y - 4, 8, 5, 0, 0, TAU);
      ctx.fillStyle = '#e08535'; ctx.fill();
      ctx.strokeStyle = '#a35a1c'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x - 5, s.y - 2);
      ctx.quadraticCurveTo(s.x - 16, s.y + 2 + sw, s.x - 28, s.y - 6 + sw * 1.5);
      ctx.strokeStyle = '#c9702a'; ctx.lineWidth = 4.5; ctx.stroke();
    }},
    { id:'bowtie', name:'领结', layer:3, draw(f, j, t) {
      const s = j.shoulder;
      const y = s.y - 1;
      poly([{ x: s.x + 2, y }, { x: s.x + 9, y: y - 5 }, { x: s.x + 9, y: y + 5 }], '#c0392b');
      circle(s.x + 2, y, 2.5, '#8e2a20');
    }},
    { id:'amulet', name:'护身符', layer:3, draw(f, j, t) {
      const s = j.shoulder;
      ctx.beginPath();
      ctx.moveTo(s.x - 3, s.y - 2);
      ctx.quadraticCurveTo(s.x + 2, s.y + 6, s.x + 7, s.y - 2);
      ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 1.5; ctx.stroke();
      const glow = 0.6 + Math.sin(t * 0.08) * 0.4;
      ctx.globalAlpha = glow;
      circle(s.x + 5, s.y + 5, 3.5, '#4fc9ff');
      ctx.globalAlpha = 1;
      circle(s.x + 5, s.y + 5, 1.5, '#c8e8ff');
    }},
    { id:'samuraiCollar', name:'武士护颈', layer:3, draw(f, j, t) {
      const s = j.shoulder;
      ctx.beginPath(); ctx.ellipse(s.x, s.y - 5, 8, 4, 0, Math.PI, TAU);
      ctx.fillStyle = '#c9a24a'; ctx.fill(); ctx.strokeStyle = '#8a6a28'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#7a2020'; ctx.fillRect(s.x - 6, s.y - 5, 12, 2.5);
    }},
    { id:'mageScarf', name:'法师围巾', layer:3, draw(f, j, t) {
      const s = j.shoulder;
      const sw = Math.sin(t * 0.09) * 5;
      ctx.beginPath(); ctx.ellipse(s.x, s.y - 5, 7, 4.5, 0, 0, TAU);
      ctx.fillStyle = '#d64a4a'; ctx.fill(); ctx.strokeStyle = '#8e2a20'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x - 5, s.y - 3);
      ctx.quadraticCurveTo(s.x - 16, s.y + 1 + sw, s.x - 28, s.y - 7 + sw * 1.5);
      ctx.strokeStyle = '#b83232'; ctx.lineWidth = 4.5; ctx.stroke();
    }},
    { id:'coreOrb', name:'能量核心', layer:3, draw(f, j, t) {
      const s = j.shoulder;
      const glow = 0.6 + Math.sin(t*0.1) * 0.4;
      ctx.globalAlpha = glow; circle(s.x + 4, s.y + 4, 4.2, '#4fc9ff', '#1d7cb8', 1.2); ctx.globalAlpha = 1;
      circle(s.x + 4, s.y + 4, 1.6, '#e8f6ff');
    }},
    { id:'cravat', name:'海盗领巾', layer:3, draw(f, j, t) {
      const s = j.shoulder;
      poly([{x:s.x+1,y:s.y-3},{x:s.x+8,y:s.y-3},{x:s.x+5,y:s.y+8},{x:s.x+1,y:s.y+7}], '#8c2030', '#4e0d16', 1.2);
      circle(s.x + 3, s.y - 2, 2.5, '#c8a24a');
    }},
    { id:'flowerCrown', name:'花环', layer:3, draw(f, j, t) {
      const h = j.head;
      const cols = ['#ff9ec4', '#5eff8b', '#ffd700'];
      for (let k = 0; k < 5; k++) {
        const ang = Math.PI * (0.18 + k * (0.64 / 4));
        const fx = h.x + Math.cos(ang) * (HEAD_R + 2.5);
        const fy = h.y + Math.sin(ang) * (HEAD_R + 2.5);
        circle(fx, fy, 2.6, cols[k % 3], '#2c7a3f', 0.8);
      }
    }}
  ],
  hands: [
    { id:'none', name:'无', layer:4, draw(){} },
    { id:'gloves', name:'拳套', layer:4, draw(f, j, t, side) {
      const hs = side === 'back' ? [j.handB] : [j.handF];
      for (const h of hs) {
        circle(h.x, h.y, 7.5, side === 'back' ? '#7a1f16' : '#c0392b', '#4a100a', 1.5);
        circle(h.x - 1.5, h.y - 2, 2, 'rgba(255,255,255,0.3)');
      }
    }},
    { id:'bandages', name:'绷带', layer:4, draw(f, j, t, side) {
      const pair = side === 'back' ? [j.elbowB, j.handB] : [j.elbowF, j.handF];
      const p = lerpPt(pair[0], pair[1], 0.6);
      const d = unit(sub(pair[1], pair[0]));
      const n = perp(d);
      const c = side === 'back' ? '#9aa5b8' : '#e6e8f0';
      for (let k = -1; k <= 1; k++) {
        const pt = add(p, mul(d, k * 4));
        const p1 = off(pt, n, 4.5), p2 = off(pt, n, -4.5);
        ctx.strokeStyle = c; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      }
    }},
    { id:'claws', name:'利爪', layer:4, draw(f, j, t, side) {
      const hs = side === 'back' ? [j.handB] : [j.handF];
      for (const h of hs) {
        for (let k = 0; k < 3; k++) {
          const ang = -0.4 + k * 0.4;
          const ex = h.x + Math.cos(ang) * 12;
          const ey = h.y + Math.sin(ang) * 12;
          poly([
            { x: h.x, y: h.y + (k-1)*2.5 }, { x: ex, y: ey }, { x: h.x + 1.5, y: h.y + (k-1)*2.5 + 2 }
          ], side === 'back' ? '#8a8a9a' : '#d8d8e2', '#5a5a6a', 1);
        }
      }
    }},
    { id:'ninjaWraps', name:'忍者护腕', layer:4, draw(f, j, t, side) {
      const [el, hd] = side === 'back' ? [j.elbowB, j.handB] : [j.elbowF, j.handF];
      const p = lerpPt(el, hd, 0.82);
      const n = perp(unit(sub(hd, el)));
      ctx.lineCap = 'round';
      ctx.strokeStyle = side === 'back' ? '#7a1f16' : '#c0392b'; ctx.lineWidth = 4;
      const a0 = add(p, mul(n, -3.5)), a1 = add(p, mul(n, 3.5));
      ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke();
      ctx.globalAlpha = 0.55; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke();
      ctx.globalAlpha = 1;
    }},
    { id:'samuraiGauntlet', name:'武士护手', layer:4, draw(f, j, t, side) {
      const hh = side === 'back' ? j.handB : j.handF;
      circle(hh.x, hh.y, 6.5, side === 'back' ? '#3d0f0f' : '#7a2020', '#3d0f0f', 1.5);
      ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hh.x-5, hh.y); ctx.lineTo(hh.x+5, hh.y); ctx.stroke();
    }},
    { id:'mechFist', name:'机甲拳套', layer:4, draw(f, j, t, side) {
      const hh = side === 'back' ? j.handB : j.handF;
      circle(hh.x, hh.y, 8, side === 'back' ? '#333d4c' : '#5a6a80', '#2c3442', 1.8);
      const glow = 0.5 + Math.sin(t*0.12)*0.5;
      ctx.globalAlpha = glow; circle(hh.x, hh.y, 2.6, '#4fc9ff'); ctx.globalAlpha = 1;
    }},
    { id:'pirateHook', name:'铁钩手', layer:4, draw(f, j, t, side) {
      if (side === 'back') return;
      const hh = j.handF;
      ctx.strokeStyle = '#c0c4cc'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(hh.x+4, hh.y, 5, -Math.PI*0.4, Math.PI*0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hh.x, hh.y); ctx.lineTo(hh.x+3, hh.y); ctx.stroke();
    }},
    { id:'baseballGlove', name:'棒球手套', layer:4, draw(f, j, t, side) {
      if (side === 'back') return;
      const hh = j.handF;
      circle(hh.x+1, hh.y, 7, '#a86a3a', '#5e3818', 1.8);
      ctx.strokeStyle = '#5e3818'; ctx.lineWidth = 1;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(hh.x-2, hh.y+k*2.5); ctx.lineTo(hh.x+6, hh.y+k*2.5); ctx.stroke(); }
    }}
  ],
  feet: [
    { id:'none', name:'无', layer:1, draw(){} },
    { id:'sneakers', name:'跑鞋', layer:1, draw(f, j, t, side) {
      const pairs = side === 'back' ? [[j.kneeB, j.footB, '#4a5266', '#2c313c']] : [[j.kneeF, j.footF, '#6b7488', '#3c4452']];
      for (const [k, ft, c1, c2] of pairs) {
        const a = lerpPt(k, ft, 0.6);
        poly([
          add(a, {x: -5, y: 0}), add(a, {x: 5, y: 0}),
          add(ft, {x: 10, y: 0}), add(ft, {x: -6, y: 0})
        ], c1, c2, 1.5);
        poly([
          add(ft, {x: -6, y: 0}), add(ft, {x: 10, y: 0}),
          add(ft, {x: 10, y: 3}), add(ft, {x: -6, y: 3})
        ], '#e6e8f0', '#9aa5b8', 1.2);
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(a.x - 4, a.y + 3); ctx.lineTo(a.x + 4, a.y + 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.x - 4, a.y + 5); ctx.lineTo(a.x + 4, a.y + 3); ctx.stroke();
      }
    }},
    { id:'sandals', name:'忍者凉鞋', layer:1, draw(f, j, t, side) {
      const pairs = side === 'back' ? [[j.footB, '#2c1f16']] : [[j.footF, '#4a3527']];
      for (const [ft, c] of pairs) {
        poly([
          add(ft, {x: -5, y: 0}), add(ft, {x: 10, y: 0}),
          add(ft, {x: 10, y: 2.5}), add(ft, {x: -5, y: 2.5})
        ], c, '#110a06', 1.2);
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(ft.x, ft.y); ctx.lineTo(ft.x + 2, ft.y - 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ft.x + 2, ft.y - 7); ctx.lineTo(ft.x + 7, ft.y); ctx.stroke();
      }
    }},
    { id:'jetboots', name:'喷气靴', layer:1, draw(f, j, t, side) {
      const pairs = side === 'back' ? [[j.kneeB, j.footB, '#5a6070']] : [[j.kneeF, j.footF, '#8b95a8']];
      for (const [k, ft, c] of pairs) {
        const a = lerpPt(k, ft, 0.5);
        poly([
          add(a, {x: -7, y: 0}), add(a, {x: 7, y: 0}),
          add(ft, {x: 11, y: 0}), add(ft, {x: -8, y: 0})
        ], c, '#3c4452', 1.5);
        poly([
          add(ft, {x: -8, y: 0}), add(ft, {x: 11, y: 0}),
          add(ft, {x: 11, y: 5}), add(ft, {x: -8, y: 5})
        ], '#1a1c22', '#333', 1);
        const flame = Math.sin(t * 0.4) * 4;
        ctx.globalAlpha = 0.8;
        poly([
          add(ft, {x: 0, y: 5}), add(ft, {x: -5, y: 15 + flame}), add(ft, {x: 5, y: 15 + flame}),
        ], '#ff7f00');
        ctx.globalAlpha = 1;
        poly([
          add(ft, {x: 0, y: 5}), add(ft, {x: -2, y: 10 + flame * 0.6}), add(ft, {x: 2, y: 10 + flame * 0.6}),
        ], '#ffdb58');
      }
    }},
    { id:'samuraiGeta', name:'木屐', layer:1, draw(f, j, t, side) {
      const pairs = side === 'back' ? [j.footB] : [j.footF];
      for (const ft of pairs) {
        poly([add(ft,{x:-6,y:0}),add(ft,{x:12,y:0}),add(ft,{x:12,y:3}),add(ft,{x:-6,y:3})], '#8a5a2e', '#4a2e14', 1.4);
        ctx.strokeStyle = '#3a230f'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ft.x - 1, ft.y + 3); ctx.lineTo(ft.x - 1, ft.y + 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ft.x + 7, ft.y + 3); ctx.lineTo(ft.x + 7, ft.y + 7); ctx.stroke();
      }
    }},
    { id:'mageBoot', name:'法师尖靴', layer:1, draw(f, j, t, side) {
      const pairs = side === 'back' ? [[j.kneeB, j.footB, '#3c2260']] : [[j.kneeF, j.footF, '#6a3fa0']];
      for (const [k, ft, c] of pairs) {
        const a = lerpPt(k, ft, 0.42);
        poly([add(a,{x:-5,y:-4}),add(a,{x:5,y:-4}),add(ft,{x:14,y:-1}),add(ft,{x:-7,y:1})], c, '#2a1640', 1.5);
        ctx.fillStyle = '#ffd700'; ctx.fillRect(ft.x - 6, ft.y - 1, 4, 2);
      }
    }},
    { id:'cleats', name:'棒球钉鞋', layer:1, draw(f, j, t, side) {
      const pairs = side === 'back' ? [j.footB] : [j.footF];
      for (const ft of pairs) {
        poly([add(ft,{x:-6,y:-1}),add(ft,{x:12,y:-1}),add(ft,{x:12,y:3}),add(ft,{x:-6,y:3})], '#e8e8f0', '#9aa0b0', 1.4);
        ctx.fillStyle = '#c0392b';
        for (let i = 0; i < 3; i++) ctx.fillRect(ft.x - 4 + i * 5, ft.y + 3, 2, 3);
      }
    }},
    { id:'pirateBoot', name:'海盗长靴', layer:1, draw(f, j, t, side) {
      const pairs = side === 'back' ? [[j.kneeB, j.footB, '#1c120a']] : [[j.kneeF, j.footF, '#3a2a1c']];
      for (const [k, ft, c] of pairs) {
        const a = lerpPt(k, ft, 0.4);
        poly([add(a,{x:-5,y:-5}),add(a,{x:5,y:-5}),add(ft,{x:13,y:-1}),add(ft,{x:-7,y:1})], c, '#0e0805', 1.6);
        ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(a.x - 5, a.y - 4); ctx.lineTo(a.x + 5, a.y - 4); ctx.stroke();
      }
    }},
    { id:'snowBoot', name:'雪地靴', layer:1, draw(f, j, t, side) {
      const pairs = side === 'back' ? [[j.kneeB, j.footB]] : [[j.kneeF, j.footF]];
      for (const [k, ft] of pairs) {
        const a = lerpPt(k, ft, 0.38);
        poly([add(a,{x:-5,y:-6}),add(a,{x:5,y:-6}),add(ft,{x:13,y:-1}),add(ft,{x:-8,y:2})], '#dff4ff', '#1d7cb8', 2);
        ctx.fillStyle = '#1d7cb8'; ctx.fillRect(ft.x - 8, ft.y + 1, 21, 3);
      }
    }}
  ]
};

const SLOT_LIST = [
  { key:'body',  label:'服装' },
  { key:'head',  label:'头部' },
  { key:'face',  label:'面部' },
  { key:'neck',  label:'颈部' },
  { key:'hands', label:'手部' },
  { key:'feet',  label:'足部' }
];
//（注：内容由AI生成）
