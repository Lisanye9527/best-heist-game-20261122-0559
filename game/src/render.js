// The renderer: everything the player sees. The floor is painted tile by tile with its
// furniture; vision cones are drawn as fans clipped by walls and cover, so what a guard
// can actually see is what the cone shows; then the actors, the heads-up display with the
// alarm meter, and the title, paused and end screens over the top.

import { ALARM, CONE, INK, SCORE, STAGE, TILE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const FONT_DISPLAY = 'Georgia, "Times New Roman", serif';
const FONT_BODY = 'system-ui, "Segoe UI", sans-serif';

function tileKey(tx, ty) {
  return (tx + ty) % 2 === 0;
}

/** March a ray until it meets a sight-blocking tile; returns how far it got. */
function rayDistance(floor, x, y, angle, maxDist) {
  const stepLen = TILE / 4;
  const steps = Math.ceil(maxDist / stepLen);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let i = 1; i <= steps; i += 1) {
    const d = i * stepLen;
    if (floor.isSolid(Math.floor((x + cos * d) / TILE), Math.floor((y + sin * d) / TILE))) {
      return d - stepLen / 2;
    }
  }
  return maxDist;
}

/** The visible fan of a cone: an arc of rays, each stopped by cover. */
function conePath(ctx, floor, x, y, angle, range, halfAngle) {
  const rays = 16;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= rays; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const d = rayDistance(floor, x, y, a, range);
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawFloor(floor) {
    for (let ty = 0; ty < floor.rows; ty += 1) {
      for (let tx = 0; tx < floor.cols; tx += 1) {
        const ch = floor.tiles[ty][tx];
        const x = tx * TILE;
        const y = ty * TILE;
        if (ch === '#') {
          ctx.fillStyle = INK.wallFace;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = INK.wallTop;
          ctx.fillRect(x, y, TILE, 7);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          if (!floor.isSolid(tx, ty + 1)) ctx.fillRect(x, y + TILE - 6, TILE, 6);
          continue;
        }
        // Open ground first; furniture is furniture, drawn over its own floor.
        if (ch === 'V') {
          ctx.fillStyle = INK.vaultFloor;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        } else if (ch === ',') {
          ctx.fillStyle = INK.carpet;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = INK.carpetEdge;
          ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
        } else {
          ctx.fillStyle = tileKey(tx, ty) ? INK.marbleA : INK.marbleB;
          ctx.fillRect(x, y, TILE, TILE);
        }
        if (ch === 'E') {
          ctx.fillStyle = '#1d2733';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = INK.brass;
          ctx.fillRect(x, y, 4, TILE);
        } else if (ch === 'D') {
          ctx.fillStyle = INK.woodDark;
          ctx.fillRect(x + 3, y + 7, TILE - 6, TILE - 14);
          ctx.fillStyle = INK.wood;
          ctx.fillRect(x + 5, y + 9, TILE - 10, TILE - 18);
          ctx.fillStyle = '#e8e2d2';
          ctx.fillRect(x + 9, y + 13, 10, 7);
          ctx.fillStyle = INK.brassBright;
          ctx.beginPath();
          ctx.arc(x + TILE - 11, y + TILE - 12, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === 'P') {
          const g = ctx.createRadialGradient(x + 16, y + 16, 3, x + 20, y + 20, 17);
          g.addColorStop(0, '#8d97ab');
          g.addColorStop(1, '#4a5468');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x + 20, y + 20, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = INK.brass;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.lineWidth = 1;
        } else if (ch === 'T') {
          ctx.fillStyle = INK.woodDark;
          ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
          ctx.fillStyle = INK.plantDark;
          ctx.beginPath();
          ctx.arc(x + 20, y + 20, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = INK.plant;
          ctx.beginPath();
          ctx.arc(x + 15, y + 16, 8, 0, Math.PI * 2);
          ctx.arc(x + 25, y + 24, 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === 'C') {
          ctx.fillStyle = 'rgba(127, 212, 230, 0.20)';
          ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
          ctx.strokeStyle = INK.glass;
          ctx.strokeRect(x + 5.5, y + 5.5, TILE - 11, TILE - 11);
          ctx.fillStyle = INK.brassBright;
          ctx.beginPath();
          ctx.arc(x + 20, y + 20, 4.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === '=') {
          ctx.fillStyle = INK.woodDark;
          ctx.fillRect(x, y + 8, TILE, TILE - 16);
          ctx.fillStyle = INK.brass;
          ctx.fillRect(x, y + 8, TILE, 4);
        }
      }
    }
    // The getaway van, nosed up to the mat at the bottom doors.
    ctx.fillStyle = '#141a24';
    ctx.fillRect(6.3 * TILE, 18.55 * TILE, 3.4 * TILE, 1.42 * TILE);
    ctx.fillStyle = '#2c3a4e';
    ctx.fillRect(6.5 * TILE, 18.7 * TILE, 3.0 * TILE, 0.5 * TILE);
    ctx.fillStyle = INK.glass;
    ctx.fillRect(8.9 * TILE, 18.78 * TILE, 0.55 * TILE, 0.36 * TILE);
    ctx.fillStyle = '#0a0d12';
    ctx.beginPath();
    ctx.arc(6.9 * TILE, 19.92 * TILE, 7, 0, Math.PI * 2);
    ctx.arc(9.1 * TILE, 19.92 * TILE, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLoot(state, now) {
    for (const loot of state.loots) {
      const { x, y } = loot;
      if (loot.kind === 'diamond') {
        // The pedestal stays when the diamond is gone: an empty plinth tells the story.
        ctx.fillStyle = '#20242e';
        ctx.fillRect(x - 13, y - 10, 26, 22);
        ctx.fillStyle = INK.brass;
        ctx.fillRect(x - 13, y - 10, 26, 4);
        if (!loot.taken) {
          const pulse = 0.75 + 0.25 * Math.sin(now * 3.2);
          ctx.fillStyle = `rgba(127, 230, 246, ${0.16 * pulse})`;
          ctx.beginPath();
          ctx.arc(x, y - 2, 24 * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.save();
          ctx.translate(x, y - 4);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = '#9be9f7';
          ctx.fillRect(-8, -8, 16, 16);
          ctx.fillStyle = '#4fc3dd';
          ctx.fillRect(-8, -8, 16, 7);
          ctx.restore();
          ctx.fillStyle = '#ffffff';
          const tw = (now * 1.7 + loot.id) % 1;
          ctx.fillRect(x - 3 + 14 * Math.sin(now * 2.1), y - 16 + 6 * tw, 2, 2);
        }
        continue;
      }
      if (loot.taken) continue;
      if (loot.kind === 'cash') {
        ctx.fillStyle = '#2e7d46';
        ctx.fillRect(x - 10, y - 6, 20, 13);
        ctx.fillStyle = '#43a55e';
        ctx.fillRect(x - 10, y - 6, 20, 5);
        ctx.fillStyle = '#d9f2df';
        ctx.fillRect(x - 3, y - 4, 6, 8);
      } else if (loot.kind === 'gold') {
        ctx.fillStyle = INK.brass;
        ctx.beginPath();
        ctx.moveTo(x - 12, y + 7);
        ctx.lineTo(x - 8, y - 1);
        ctx.lineTo(x + 1, y - 1);
        ctx.lineTo(x + 5, y + 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = INK.brassBright;
        ctx.beginPath();
        ctx.moveTo(x - 4, y + 7);
        ctx.lineTo(x, y - 8);
        ctx.lineTo(x + 9, y - 8);
        ctx.lineTo(x + 13, y + 7);
        ctx.closePath();
        ctx.fill();
      } else {
        // A framed painting on a stand.
        ctx.fillStyle = INK.woodDark;
        ctx.fillRect(x - 11, y - 12, 22, 24);
        const art = ctx.createLinearGradient(x, y - 9, x, y + 9);
        art.addColorStop(0, '#7fb2d9');
        art.addColorStop(0.6, '#3d6e9e');
        art.addColorStop(1, '#274b73');
        ctx.fillStyle = art;
        ctx.fillRect(x - 8, y - 9, 16, 18);
        ctx.fillStyle = '#f2cd4e';
        ctx.beginPath();
        ctx.arc(x + 3, y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // A soft ring so side loot can be spotted at a glance.
      ctx.strokeStyle = 'rgba(242, 205, 78, 0.5)';
      ctx.beginPath();
      ctx.arc(x, y, 15 + 1.5 * Math.sin(now * 2.4 + loot.id * 1.7), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawDecoys(state) {
    for (const decoy of state.decoys) {
      const ring = (5 - decoy.ttl) / 5;
      ctx.strokeStyle = `rgba(242, 205, 78, ${0.55 * (1 - ring)})`;
      ctx.beginPath();
      ctx.arc(decoy.x, decoy.y, 6 + ring * 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = INK.brassBright;
      ctx.beginPath();
      ctx.arc(decoy.x, decoy.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCones(floor, state) {
    for (const cam of state.cameras) {
      conePath(ctx, floor, cam.x, cam.y, cam.angle, CONE.cameraRange, CONE.cameraHalfAngle);
      ctx.fillStyle = cam.sees > 0 ? INK.cameraConeHot : INK.cameraCone;
      ctx.fill();
    }
    for (const guard of state.guards) {
      conePath(ctx, floor, guard.x, guard.y, guard.angle, CONE.guardRange, CONE.guardHalfAngle);
      ctx.fillStyle = guard.sees > 0 ? INK.guardConeHot : INK.guardCone;
      ctx.fill();
    }
  }

  function drawCameras(state, now) {
    for (const cam of state.cameras) {
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.fillStyle = '#12161f';
      ctx.fillRect(-9, -7, 18, 14);
      ctx.rotate(cam.angle);
      ctx.fillStyle = '#232b3a';
      ctx.fillRect(2, -5, 10, 10);
      ctx.fillStyle = cam.sees > 0 || Math.sin(now * 2.4 + cam.phase) > 0 ? '#ff4545' : '#7a2020';
      ctx.beginPath();
      ctx.arc(13, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(guard.x, guard.y + 11, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b4a7f';
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 13.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d63a5';
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 9.5, 0, Math.PI * 2);
      ctx.fill();
      // The cap brim points the way he faces.
      ctx.strokeStyle = '#d8dee9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.angle) * 15, guard.y + Math.sin(guard.angle) * 15);
      ctx.stroke();
      ctx.lineWidth = 1;
      if (guard.mode === 'hunt') {
        ctx.fillStyle = '#ff5347';
        ctx.font = 'bold 19px ' + FONT_BODY;
        ctx.textAlign = 'center';
        ctx.fillText('!', guard.x, guard.y - 21);
      } else if (guard.mode === 'look' || guard.mode === 'decoy' || guard.staring) {
        ctx.fillStyle = '#ffd94d';
        ctx.font = 'bold 15px ' + FONT_BODY;
        ctx.textAlign = 'center';
        ctx.fillText('?', guard.x, guard.y - 20);
      }
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 10, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (p.sneaking) {
      ctx.strokeStyle = 'rgba(160, 200, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#171a21';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#39404f';
    ctx.stroke();
    // The mask band across the eyes, turned the way he faces.
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#cfd8e3';
    ctx.fillRect(2, -6.5, 8, 4.5);
    ctx.fillRect(2, 2, 8, 4.5);
    ctx.fillStyle = '#0c0e12';
    ctx.fillRect(6, -4.5, 3.4, 2.6);
    ctx.fillRect(6, 3.4, 3.4, 2.6);
    ctx.restore();
    if (state.hasDiamond) {
      ctx.save();
      ctx.translate(p.x - 11, p.y + 8);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#9be9f7';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
    if (state.grabTarget && state.grabProgress > 0) {
      ctx.strokeStyle = INK.brassBright;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, -Math.PI / 2, -Math.PI / 2 + state.grabProgress * Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (state.exposure > 0.25) {
      ctx.fillStyle = `rgba(255, 70, 60, ${0.45 + 0.55 * state.exposure})`;
      ctx.font = 'bold 17px ' + FONT_BODY;
      ctx.textAlign = 'center';
      ctx.fillText('!', p.x, p.y - 22);
    }
  }

  function alarmColour(value) {
    if (value < 45) return '#53c96b';
    if (value < 75) return '#f2b13c';
    return '#f0473c';
  }

  function drawHud(state) {
    ctx.fillStyle = 'rgba(8, 10, 16, 0.82)';
    ctx.fillRect(0, 0, STAGE.width, 40);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 14px ' + FONT_BODY;
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', 16, 26);
    // The meter: a segmented bar that fills green, amber, then red.
    const barX = 78;
    const barW = 380;
    ctx.fillStyle = '#222836';
    ctx.fillRect(barX, 13, barW, 14);
    const fillW = (state.alarm / ALARM.max) * barW;
    ctx.fillStyle = alarmColour(state.alarm);
    if (state.alarm > 70 && Math.sin(state.time * 9) > 0.2) ctx.fillStyle = '#ff6a5e';
    ctx.fillRect(barX, 13, fillW, 14);
    ctx.fillStyle = 'rgba(8,10,16,0.85)';
    for (let s = 1; s < 10; s += 1) ctx.fillRect(barX + (barW / 10) * s - 1, 13, 2, 14);
    ctx.strokeStyle = '#4a5468';
    ctx.strokeRect(barX + 0.5, 13.5, barW - 1, 13);

    ctx.fillStyle = state.hasDiamond ? '#9be9f7' : '#e8e4d8';
    ctx.font = 'bold 15px ' + FONT_BODY;
    ctx.textAlign = 'center';
    ctx.fillText(
      state.hasDiamond ? 'THE DIAMOND IS YOURS — GET TO THE VAN!' : 'Lift the Aurora Diamond from the vault',
      700,
      26,
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = INK.brassBright;
    ctx.font = 'bold 16px ' + FONT_BODY;
    const haul = state.lootValue + (state.hasDiamond ? SCORE.diamond : 0);
    ctx.fillText('$' + haul.toLocaleString('en-US'), 1090, 26);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '13px ' + FONT_BODY;
    const mm = Math.floor(state.time / 60);
    const ss = Math.floor(state.time % 60).toString().padStart(2, '0');
    ctx.fillText(mm + ':' + ss, 1150, 26);
    // Coin decoys left, as little brass discs.
    for (let i = 0; i < state.coinsLeft; i += 1) {
      ctx.fillStyle = INK.brassBright;
      ctx.beginPath();
      ctx.arc(1192 + i * 26, 20, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5c10';
      ctx.font = 'bold 10px ' + FONT_BODY;
      ctx.textAlign = 'center';
      ctx.fillText('$', 1192 + i * 26, 24);
    }
  }

  function centreText(text, y, font, colour) {
    ctx.font = font;
    ctx.fillStyle = colour;
    ctx.textAlign = 'center';
    ctx.fillText(text, STAGE.width / 2, y);
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(5, 7, 12, 0.52)';
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    centreText('THE GILDED VAULT', 268, 'bold 74px ' + FONT_DISPLAY, INK.brassBright);
    centreText('One thief. One diamond. Every eye in the house.', 312, 'italic 21px ' + FONT_DISPLAY, '#d8d2c0');
    ctx.font = '17px ' + FONT_BODY;
    ctx.fillStyle = '#c6cdd8';
    ctx.textAlign = 'center';
    const lines = [
      'Cross the floor unseen. Guards and cameras sweep their cones — cover breaks their gaze.',
      'Hold E beside loot to lift it. The diamond is in the vault; the rest is greed.',
      'Being seen fills the ALARM meter. Full meter, or a guard’s hand on you, ends the night.',
      'Click to toss a coin and pull a guard away — you carry three. Shift tiptoes: slower, quieter.',
      'Take the diamond back to the getaway van at the south doors.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, STAGE.width / 2, 386 + i * 27));
    centreText('Press Enter or click to begin', 566, 'bold 20px ' + FONT_BODY, '#ffffff');
    if (best > 0) centreText('Best haul: $' + best.toLocaleString('en-US'), 606, '15px ' + FONT_BODY, INK.brassBright);
  }

  function drawOver(state, best) {
    ctx.fillStyle = state.won ? 'rgba(6, 14, 8, 0.66)' : 'rgba(16, 5, 5, 0.68)';
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    if (state.won) {
      centreText('CLEAN GETAWAY', 250, 'bold 68px ' + FONT_DISPLAY, '#8fe388');
      centreText('The van is gone before the first siren.', 296, 'italic 20px ' + FONT_DISPLAY, '#d8d2c0');
    } else {
      centreText('BUSTED', 250, 'bold 76px ' + FONT_DISPLAY, '#f0473c');
      centreText(
        state.endReason === 'alarm' ? 'The house alarm tripped. Every door locked at once.' : 'A guard got a hand on you.',
        296,
        'italic 20px ' + FONT_DISPLAY,
        '#d8d2c0',
      );
    }
    ctx.font = '18px ' + FONT_BODY;
    ctx.fillStyle = '#e8e4d8';
    ctx.textAlign = 'center';
    const rows = [];
    rows.push(['The Aurora Diamond', state.hasDiamond ? '$' + SCORE.diamond.toLocaleString('en-US') : '— left in the vault']);
    const sideCount = state.lootCount - (state.hasDiamond ? 1 : 0);
    rows.push(['Side loot (' + sideCount + (sideCount === 1 ? ' piece' : ' pieces') + ')', '$' + state.lootValue.toLocaleString('en-US')]);
    if (state.won && state.maxAlarm === 0) rows.push(['Never seen at all', '+$' + SCORE.unseenBonus]);
    else if (state.won && state.maxAlarm < 50) rows.push(['Ghost bonus — barely a rumour', '+$' + SCORE.ghostBonus]);
    if (state.won) rows.push(['Time bonus', '+$' + (Math.max(0, Math.floor(SCORE.parSeconds - state.time)) * SCORE.timeBonusPerSecond).toLocaleString('en-US')]);
    rows.push(['Peak alarm', Math.round(state.maxAlarm) + '%']);
    rows.forEach(([label, value], i) => {
      ctx.textAlign = 'right';
      ctx.fillText(label, STAGE.width / 2 - 14, 356 + i * 30);
      ctx.textAlign = 'left';
      ctx.fillText(value, STAGE.width / 2 + 14, 356 + i * 30);
    });
    centreText('TOTAL  $' + state.score.toLocaleString('en-US'), 356 + rows.length * 30 + 16, 'bold 26px ' + FONT_BODY, INK.brassBright);
    if (best > 0) centreText('Best haul: $' + best.toLocaleString('en-US'), 356 + rows.length * 30 + 52, '15px ' + FONT_BODY, '#c6cdd8');
    centreText('Press Enter to play again', 356 + rows.length * 30 + 92, 'bold 18px ' + FONT_BODY, '#ffffff');
  }

  function draw(world, screen, best) {
    const { floor, state } = world;
    const now = state.time;
    ctx.fillStyle = INK.backdrop;
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    drawFloor(floor);
    drawLoot(state, now);
    drawDecoys(state);
    drawCones(floor, state);
    drawCameras(state, now);
    drawGuards(state);
    drawPlayer(state);
    // A soft vignette to sit the floor in the dark, centred on the stage.
    const vignette = ctx.createRadialGradient(
      STAGE.width / 2, STAGE.height / 2, 340, STAGE.width / 2, STAGE.height / 2, 780,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.20)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, STAGE.width, STAGE.height);
    if (screen !== SCREEN_TITLE) drawHud(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(5, 7, 12, 0.55)';
      ctx.fillRect(0, 0, STAGE.width, STAGE.height);
      centreText('PAUSED', 420, 'bold 44px ' + FONT_DISPLAY, '#e8e4d8');
    } else if (screen === SCREEN_OVER) drawOver(state, best);
  }

  return { draw };
}
