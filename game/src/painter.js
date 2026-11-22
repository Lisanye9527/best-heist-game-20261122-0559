// painter.js — everything the player sees, drawn on one canvas.
//
// The floor is drawn first (marble checker, a rug down the grand hall, the
// vault room in a colder shade), then cover, then the van, loot and coins,
// then the vision cones (clipped against walls so light never shines through
// cover), then the people and cameras, then the HUD, then the screen
// overlays for title, pause, busted and getaway. The one frame the bounty
// asks for — room, guards with cones, cameras, a loot target and the alarm
// meter together — is the normal play frame; nothing is hidden for it.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, PALETTE, LOOT, ALARM } from './tuning.js';
import { WALLS, COVER, VAULT_ROOM, tileRect } from './bank.js';
import { coneRayLength } from './sight.js';

const TAU = Math.PI * 2;

export function drawWorld(ctx, world) {
  drawFloor(ctx);
  drawCover(ctx);
  drawVan(ctx, world);
  drawLoot(ctx, world);
  drawCoins(ctx, world);
  drawCones(ctx, world);
  drawCameras(ctx, world);
  drawGuards(ctx, world);
  drawThief(ctx, world);
  drawHud(ctx, world);
  if (world.state === 'title') drawTitle(ctx, world);
  if (world.state === 'paused') drawPaused(ctx);
  if (world.state === 'busted') drawBusted(ctx, world);
  if (world.state === 'win') drawWin(ctx, world);
  if (world.messageLeft > 0 && world.state === 'playing') drawMessage(ctx, world);
}

// --- the floor ---------------------------------------------------------------

function drawFloor(ctx) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const inVault = tx >= VAULT_ROOM.tx && tx < VAULT_ROOM.tx + VAULT_ROOM.w && ty >= VAULT_ROOM.ty && ty < VAULT_ROOM.ty + VAULT_ROOM.h;
      ctx.fillStyle = inVault ? PALETTE.vaultFloor : (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  // A runner rug down the grand hall, and brass trim around the vault.
  ctx.fillStyle = PALETTE.rug;
  ctx.fillRect(14 * TILE, 5 * TILE, 3 * TILE, 13 * TILE);
  ctx.strokeStyle = PALETTE.vaultDoor;
  ctx.lineWidth = 3;
  ctx.strokeRect(VAULT_ROOM.tx * TILE, VAULT_ROOM.ty * TILE, VAULT_ROOM.w * TILE, VAULT_ROOM.h * TILE);
  // Wall tiles: dark with a lit top edge so the rooms read as rooms.
  for (const wall of WALLS) {
    const r = tileRect(wall);
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(r.x, r.y + r.h - 4, r.w, 4);
  }
  // Faint grid lines so the floor reads as marble tiles.
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let tx = 1; tx < COLS; tx++) {
    ctx.moveTo(tx * TILE, 0);
    ctx.lineTo(tx * TILE, VIEW_H);
  }
  for (let ty = 1; ty < ROWS; ty++) {
    ctx.moveTo(0, ty * TILE);
    ctx.lineTo(VIEW_W, ty * TILE);
  }
  ctx.stroke();
}

// --- cover -------------------------------------------------------------------

function drawCover(ctx) {
  for (const piece of COVER) {
    const r = tileRect(piece);
    if (piece.kind === 'pillar') {
      ctx.fillStyle = PALETTE.pillar;
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 17, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#6e6c62';
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 10, 0, TAU);
      ctx.fill();
    } else if (piece.kind === 'desk') {
      ctx.fillStyle = PALETTE.desk;
      ctx.fillRect(r.x + 2, r.y + 3, r.w - 4, r.h - 6);
      ctx.fillStyle = PALETTE.deskTop;
      ctx.fillRect(r.x + 2, r.y + 3, r.w - 4, 8);
      ctx.fillStyle = '#c8b890';
      ctx.fillRect(r.x + 10, r.y + 12, 14, 10);
      ctx.fillRect(r.x + r.w - 26, r.y + 12, 14, 10);
    } else if (piece.kind === 'planter') {
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(r.x + 6, r.y + 8, r.w - 12, r.h - 12);
      ctx.fillStyle = PALETTE.planterLeaf;
      ctx.beginPath();
      ctx.arc(r.x + 14, r.y + 12, 9, 0, TAU);
      ctx.arc(r.x + 26, r.y + 12, 9, 0, TAU);
      ctx.arc(r.x + 20, r.y + 6, 9, 0, TAU);
      ctx.fill();
    } else if (piece.kind === 'case') {
      ctx.fillStyle = PALETTE.caseFrame;
      ctx.fillRect(r.x + 1, r.y + 4, r.w - 2, r.h - 8);
      ctx.fillStyle = PALETTE.caseGlass;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(r.x + 6, r.y + 8, r.w - 12, r.h - 16);
      ctx.globalAlpha = 1;
      ctx.fillStyle = PALETTE.lootGold;
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2, 6, 0, TAU);
      ctx.fill();
    }
  }
}

// --- the van -----------------------------------------------------------------

function drawVan(ctx, world) {
  const v = world.van;
  ctx.fillStyle = PALETTE.van;
  ctx.fillRect(v.x + 4, v.y + 4, v.w - 8, v.h - 8);
  ctx.fillStyle = PALETTE.vanTrim;
  ctx.fillRect(v.x + 10, v.y + 8, 30, 20);
  ctx.fillRect(v.x + v.w - 40, v.y + 8, 30, 20);
  ctx.fillStyle = '#20242a';
  ctx.beginPath();
  ctx.arc(v.x + 26, v.y + v.h - 6, 8, 0, TAU);
  ctx.arc(v.x + v.w - 26, v.y + v.h - 6, 8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = world.diamondTaken ? '#ffe9a8' : PALETTE.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(world.diamondTaken ? 'GETAWAY VAN — GO!' : 'GETAWAY VAN', v.x + v.w / 2, v.y - 6);
}

// --- loot and coins ------------------------------------------------------------

function drawLoot(ctx, world) {
  for (const item of world.loot) {
    if (item.taken) continue;
    const x = item.x;
    const y = item.y;
    if (item.kind === 'diamond') {
      const pulse = 1 + Math.sin(world.clock * 3) * 0.12;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = PALETTE.diamond;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 13);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(6, -4);
      ctx.lineTo(0, 0);
      ctx.lineTo(-6, -4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = PALETTE.hudText;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AURORA DIAMOND', x, y - 22);
    } else if (item.kind === 'cash') {
      ctx.fillStyle = PALETTE.lootCash;
      ctx.fillRect(x - 11, y - 7, 22, 14);
      ctx.fillStyle = '#2c5a1e';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', x, y + 4);
    } else if (item.kind === 'gold') {
      ctx.fillStyle = PALETTE.lootGold;
      ctx.beginPath();
      ctx.moveTo(x - 11, y + 6);
      ctx.lineTo(x - 7, y - 6);
      ctx.lineTo(x + 7, y - 6);
      ctx.lineTo(x + 11, y + 6);
      ctx.closePath();
      ctx.fill();
    } else if (item.kind === 'painting') {
      ctx.fillStyle = '#7a5230';
      ctx.fillRect(x - 12, y - 9, 24, 18);
      ctx.fillStyle = PALETTE.lootPainting;
      ctx.fillRect(x - 9, y - 6, 18, 12);
      ctx.fillStyle = '#f2e6c8';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, TAU);
      ctx.fill();
    }
    // Lifting progress ring while E is held.
    if (item.lift > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + item.lift * TAU);
      ctx.stroke();
    }
  }
}

function drawCoins(ctx, world) {
  for (const spot of world.coinSpots) {
    ctx.fillStyle = PALETTE.lootGold;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(242, 201, 76, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 9, 0, TAU);
    ctx.stroke();
  }
}

// --- vision cones --------------------------------------------------------------
// Each cone is a fan of short rays; every ray stops at the first wall, so
// the light hugs the cover instead of shining through it.

function drawConeFan(ctx, ox, oy, angle, range, halfAngle, colour, solids) {
  const rays = 26;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const len = coneRayLength(ox, oy, a, range, solids);
    ctx.lineTo(ox + Math.cos(a) * len, oy + Math.sin(a) * len);
  }
  ctx.closePath();
  ctx.fill();
}

function drawCones(ctx, world) {
  for (const cam of world.cameras) {
    drawConeFan(ctx, cam.x, cam.y, cam.angle, 225, 0.49, cam.seesThief ? PALETTE.coneCameraSeen : PALETTE.coneCamera, world.solids);
  }
  for (const guard of world.guards) {
    drawConeFan(ctx, guard.x, guard.y, guard.facing, 205, 0.56, guard.seesThief ? PALETTE.coneGuardSeen : PALETTE.coneGuard, world.solids);
  }
}

function drawCameras(ctx, world) {
  for (const cam of world.cameras) {
    ctx.fillStyle = PALETTE.camera;
    ctx.fillRect(cam.x - 9, cam.y - 6, 18, 12);
    const lx = cam.x + Math.cos(cam.angle) * 14;
    const ly = cam.y + Math.sin(cam.angle) * 14;
    ctx.fillStyle = cam.seesThief ? '#ff4030' : '#ff5a4a';
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#20242a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cam.x, cam.y);
    ctx.lineTo(lx, ly);
    ctx.stroke();
  }
}

function drawGuards(ctx, world) {
  for (const guard of world.guards) {
    const x = guard.x;
    const y = guard.y;
    ctx.fillStyle = guard.mode === 'hunt' ? '#7a1f1a' : PALETTE.guard;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.guardTrim;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, TAU);
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 1;
    // A nose showing which way the guard faces.
    ctx.fillStyle = '#e8e3d3';
    ctx.beginPath();
    ctx.arc(x + Math.cos(guard.facing) * 15, y + Math.sin(guard.facing) * 15, 4, 0, TAU);
    ctx.fill();
    if (guard.mode === 'investigate') {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', x, y - 22);
    }
    if (guard.mode === 'hunt') {
      ctx.fillStyle = '#ff4030';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', x, y - 22);
    }
  }
}

function drawThief(ctx, world) {
  const t = world.thief;
  // A soft pool of light under the thief: black on dark marble is hard to
  // spot at a glance, and the player must always know where they are.
  const glow = ctx.createRadialGradient(t.x, t.y, 4, t.x, t.y, 30);
  glow.addColorStop(0, 'rgba(216, 180, 90, 0.28)');
  glow.addColorStop(1, 'rgba(216, 180, 90, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 30, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 13, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 13, 0, TAU);
  ctx.stroke();
  // A little gold mask pointing the way the thief faces.
  ctx.fillStyle = PALETTE.thiefTrim;
  ctx.beginPath();
  ctx.arc(t.x + Math.cos(t.facing) * 8, t.y + Math.sin(t.facing) * 8, 4, 0, TAU);
  ctx.fill();
  if (t.tiptoe) {
    ctx.fillStyle = 'rgba(232, 227, 211, 0.8)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('tiptoe', t.x, t.y + 26);
  }
}

// --- HUD -----------------------------------------------------------------------

function drawHud(ctx, world) {
  ctx.fillStyle = PALETTE.hudBack;
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${world.score}`, 14, 23);
  ctx.fillText(`COINS ${world.coins}`, 150, 23);
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60);
  ctx.fillText(`TIME ${mins}:${String(secs).padStart(2, '0')}`, 250, 23);
  if (world.diamondTaken) {
    ctx.fillStyle = PALETTE.diamond;
    ctx.fillText('◆ DIAMOND — GET TO THE VAN', 380, 23);
  }
  // The alarm meter: green, amber, then red as it fills.
  const mx = 760;
  const mw = 300;
  ctx.fillStyle = '#101613';
  ctx.fillRect(mx, 9, mw, 16);
  const frac = world.alarm / ALARM.max;
  ctx.fillStyle = frac < 0.5 ? PALETTE.alarmCalm : frac < 0.8 ? PALETTE.alarmWarm : PALETTE.alarmHot;
  ctx.fillRect(mx, 9, mw * frac, 16);
  ctx.strokeStyle = '#5a6a5e';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, 9, mw, 16);
  ctx.fillStyle = PALETTE.hudText;
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', mx - 62, 23);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(world.alarm)}%`, 1085, 23);
  ctx.textAlign = 'left';
  const lootLeft = world.loot.filter((l) => !l.taken).length;
  ctx.fillText(`LOOT LEFT ${lootLeft}`, 1110, 23);
  // "Hold E" hint above nearby loot.
  if (world.state === 'playing') {
    const near = world.loot.find((l) => !l.taken && Math.hypot(l.x - world.thief.x, l.y - world.thief.y) < 46);
    if (near) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Hold E — ${near.name}`, near.x, near.y - 26);
    }
  }
}

function drawMessage(ctx, world) {
  ctx.fillStyle = 'rgba(8, 12, 10, 0.8)';
  const w = ctx.measureText(world.message).width + 28;
  ctx.fillRect((VIEW_W - w) / 2, VIEW_H - 52, w, 30);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(world.message, VIEW_W / 2, VIEW_H - 32);
}

// --- screens -------------------------------------------------------------------

function shade(ctx, alpha) {
  ctx.fillStyle = `rgba(6, 10, 8, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function centreText(ctx, lines, y0, gap) {
  ctx.textAlign = 'center';
  let y = y0;
  for (const line of lines) {
    ctx.font = line.font;
    ctx.fillStyle = line.colour;
    ctx.fillText(line.text, VIEW_W / 2, y);
    y += gap;
  }
}

function drawTitle(ctx, world) {
  shade(ctx, 0.62);
  centreText(ctx, [
    { font: 'bold 64px sans-serif', colour: PALETTE.lootGold, text: 'THE GILDED VAULT' },
    { font: '22px sans-serif', colour: PALETTE.hudText, text: 'One thief. One diamond. Every eye in the house.' },
  ], 250, 56);
  centreText(ctx, [
    { font: '17px sans-serif', colour: '#c8d8c8', text: 'Cross the bank unseen, lift the Aurora Diamond from the vault, and reach the getaway van.' },
    { font: '17px sans-serif', colour: '#c8d8c8', text: 'Guards and cameras fill the alarm while they see you. Tiptoe with Shift. Toss a coin with a click.' },
    { font: '17px sans-serif', colour: '#c8d8c8', text: 'Hold E beside loot to lift it. Three ways in: the grand hall, the west offices, or the east gallery.' },
  ], 380, 30);
  centreText(ctx, [
    { font: 'bold 24px sans-serif', colour: '#ffe9a8', text: 'Press ENTER to begin the night' },
    { font: '15px sans-serif', colour: '#9fb8a4', text: 'WASD / arrows move · Shift tiptoe · E lift · click toss a coin · P pause' },
  ], 540, 36);
}

function drawPaused(ctx) {
  shade(ctx, 0.6);
  centreText(ctx, [
    { font: 'bold 48px sans-serif', colour: PALETTE.hudText, text: 'PAUSED' },
    { font: '18px sans-serif', colour: '#c8d8c8', text: 'Press P or Esc to carry on.' },
  ], 360, 48);
}

function drawBusted(ctx, world) {
  shade(ctx, 0.66);
  centreText(ctx, [
    { font: 'bold 56px sans-serif', colour: PALETTE.alarmHot, text: 'BUSTED' },
    { font: '20px sans-serif', colour: PALETTE.hudText, text: world.message || 'The night is over.' },
    { font: '20px sans-serif', colour: PALETTE.hudText, text: `Score ${world.score} · loot lifted ${world.stats.lootTaken} · seen ${world.stats.timesSeen} times` },
    { font: 'bold 22px sans-serif', colour: '#ffe9a8', text: 'Press ENTER to try the night again' },
  ], 300, 48);
}

function drawWin(ctx, world) {
  shade(ctx, 0.6);
  const lines = [
    { font: 'bold 56px sans-serif', colour: PALETTE.lootGold, text: 'CLEAN GETAWAY' },
    { font: '20px sans-serif', colour: PALETTE.hudText, text: 'The Aurora Diamond is out of the building and the van is already moving.' },
    { font: '20px sans-serif', colour: PALETTE.hudText, text: `Score ${world.score} · loot lifted ${world.stats.lootTaken} · time ${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')}` },
  ];
  if (world.ghostBonus) {
    lines.push({ font: '20px sans-serif', colour: PALETTE.diamond, text: `Ghost bonus +${world.ghostBonus} — the alarm never passed ${ALARM.ghostCeiling}.` });
  }
  if (world.timeBonus) {
    lines.push({ font: '20px sans-serif', colour: PALETTE.diamond, text: `Time bonus +${world.timeBonus}.` });
  }
  lines.push({ font: 'bold 22px sans-serif', colour: '#ffe9a8', text: 'Press ENTER to run it back' });
  centreText(ctx, lines, 280, 46);
}

