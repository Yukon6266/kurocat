interface Point {
  x: number;
  y: number;
}

interface NailongPose {
  head: Point;
  body: Point;
  tilt: number;
  sleep: number;
  eyelid: number;
  gaze: Point;
  joy: number;
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string | CanvasGradient, tilt = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, tilt, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function gold(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): CanvasGradient {
  const gradient = ctx.createRadialGradient(x, y, radius * 0.12, x, y, radius);
  gradient.addColorStop(0, '#fff079');
  gradient.addColorStop(0.57, '#ffd13f');
  gradient.addColorStop(1, '#ee912a');
  return gradient;
}

export function drawNailongTail(ctx: CanvasRenderingContext2D, root: Point, bend: Point, tip: Point): void {
  const gradient = ctx.createLinearGradient(root.x, root.y - 13, root.x, root.y + 15);
  gradient.addColorStop(0, '#ffda4e');
  gradient.addColorStop(1, '#f39b29');
  ctx.beginPath();
  ctx.moveTo(root.x - 11, root.y - 15);
  ctx.quadraticCurveTo(bend.x - 10, bend.y - 15, tip.x, tip.y - 4);
  ctx.quadraticCurveTo(tip.x + 7, tip.y - 5, tip.x + 2, tip.y + 3);
  ctx.quadraticCurveTo(bend.x + 7, bend.y + 17, root.x - 8, root.y + 19);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
}

function drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, eyelid: number, gaze: Point): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(x < 0 ? -0.09 : 0.09);
  if (eyelid >= 0.87) {
    ctx.beginPath();
    ctx.moveTo(-10, -1);
    ctx.quadraticCurveTo(0, 6, 10, -1);
    ctx.strokeStyle = '#865124';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    ctx.scale(1, 1 - eyelid);
    ellipse(ctx, 0, 0.6, 14.6, 16, '#be7c2d');
    ellipse(ctx, 0, 0, 13.6, 15, '#fffdf0');
    ctx.clip();
    const pupilX = gaze.x * 4.1;
    const pupilY = gaze.y * 3.1;
    const iris = ctx.createLinearGradient(0, -12, 0, 13);
    iris.addColorStop(0, '#243f21');
    iris.addColorStop(0.7, '#567633');
    iris.addColorStop(1, '#90ac47');
    ellipse(ctx, pupilX, pupilY, 10, 12.4, iris);
    ellipse(ctx, pupilX, pupilY - 0.4, 7.6, 9.8, '#171e12');
    ellipse(ctx, pupilX - 2.7, pupilY - 5.2, 2.7, 2.5, '#fffdf5');
    ellipse(ctx, pupilX + 4, pupilY + 4, 1.1, 1.3, '#dcf1a4');
  }
  ctx.restore();
}

function drawSmile(ctx: CanvasRenderingContext2D, joy: number): void {
  const smileHeight = 17 + joy * 13;
  const edge = 22 + joy * 4;
  ctx.save();
  ctx.translate(3, 25);
  ctx.beginPath();
  ctx.moveTo(-edge, -2);
  ctx.bezierCurveTo(-7, 2, 11, 3, edge, -3);
  ctx.bezierCurveTo(edge + 2, 10, 14, smileHeight, 2, smileHeight);
  ctx.bezierCurveTo(-11, smileHeight + 1, -edge, 10, -edge, -2);
  ctx.closePath();
  ctx.fillStyle = '#46241d';
  ctx.fill();
  ctx.clip();
  ellipse(ctx, 5, smileHeight, 16, smileHeight * 0.48, '#e87b76');
  ctx.beginPath();
  ctx.moveTo(-edge, -3);
  ctx.quadraticCurveTo(0, 12, edge, -4);
  ctx.lineTo(edge, -7);
  ctx.lineTo(-edge, -7);
  ctx.fillStyle = '#fff7de';
  ctx.fill();
  ctx.restore();
}

export function drawNailongBody(ctx: CanvasRenderingContext2D, pose: NailongPose): void {
  ctx.save();
  ctx.translate(pose.body.x, pose.body.y);
  ctx.scale(1 + pose.sleep * 0.05, 1 - pose.sleep * 0.05);

  const bodyGold = gold(ctx, -18, -24, 103);
  ellipse(ctx, 0, 60, 62, 7, 'rgba(84, 46, 14, 0.15)');
  ellipse(ctx, -35, 42, 26, 20, bodyGold, -0.21);
  ellipse(ctx, 36, 42, 25, 20, bodyGold, 0.21);
  ctx.beginPath();
  ctx.moveTo(-33, -57);
  ctx.bezierCurveTo(-59, -39, -59, 10, -54, 31);
  ctx.bezierCurveTo(-49, 55, -26, 58, 2, 58);
  ctx.bezierCurveTo(31, 58, 54, 52, 57, 27);
  ctx.bezierCurveTo(60, 6, 55, -40, 35, -54);
  ctx.bezierCurveTo(16, -66, -14, -68, -33, -57);
  ctx.fillStyle = bodyGold;
  ctx.fill();

  const belly = ctx.createRadialGradient(-11, -8, 4, 0, 15, 55);
  belly.addColorStop(0, '#fff8ce');
  belly.addColorStop(0.7, '#fff1ae');
  belly.addColorStop(1, '#ffda78');
  ellipse(ctx, 1, 12, 36, 42, belly, -0.055);
  for (const foot of [-37, 38]) {
    for (const toe of [-10, 0, 10]) {
      ellipse(ctx, foot + toe, 58 - Math.abs(toe) * 0.15, 3.8, 3.3, '#81532d', toe * 0.032);
    }
  }
  ctx.restore();

  ctx.save();
  ctx.translate(pose.head.x, pose.head.y);
  ctx.rotate(pose.tilt);
  ctx.scale(1 + pose.sleep * 0.055, 1 - pose.sleep * 0.10);
  ctx.beginPath();
  ctx.moveTo(-63, 7);
  ctx.bezierCurveTo(-65, -31, -46, -62, -12, -66);
  ctx.bezierCurveTo(27, -72, 57, -54, 64, -23);
  ctx.bezierCurveTo(68, -5, 62, 8, 65, 23);
  ctx.bezierCurveTo(65, 51, 36, 67, 1, 64);
  ctx.bezierCurveTo(-34, 64, -59, 52, -63, 30);
  ctx.quadraticCurveTo(-66, 21, -63, 7);
  ctx.fillStyle = gold(ctx, -20, -39, 117);
  ctx.fill();

  ellipse(ctx, -39, 21, 12, 5, 'rgba(248, 111, 87, 0.44)', -0.14);
  ellipse(ctx, 42, 19, 11, 5, 'rgba(248, 111, 87, 0.39)', 0.14);
  drawEye(ctx, -27, -6, pose.eyelid, pose.gaze);
  drawEye(ctx, 29, -6, pose.eyelid, pose.gaze);
  if (pose.sleep > 0.55) {
    ellipse(ctx, 3, 30, 7, 4, '#96542c');
  } else {
    drawSmile(ctx, pose.joy);
  }
  ctx.restore();
}

export function drawNailongArm(ctx: CanvasRenderingContext2D, shoulder: Point, hand: Point, impact: number): void {
  const distance = Math.max(8, Math.hypot(hand.x - shoulder.x, hand.y - shoulder.y));
  ctx.save();
  ctx.translate(shoulder.x, shoulder.y);
  ctx.rotate(Math.atan2(hand.y - shoulder.y, hand.x - shoulder.x));
  const reach = distance + 10;
  const width = 11.5 + impact * 1.8;
  ctx.beginPath();
  ctx.moveTo(-9, -4);
  ctx.bezierCurveTo(0, -16, reach * 0.60, -width, reach - 10, -width);
  ctx.bezierCurveTo(reach + 4, -width, reach + 5, width, reach - 10, width);
  ctx.bezierCurveTo(reach * 0.58, width + 1, 3, 15, -9, 7);
  ctx.quadraticCurveTo(-13, 2, -9, -4);
  const gradient = ctx.createLinearGradient(0, -15, reach, 15);
  gradient.addColorStop(0, '#ffcf3e');
  gradient.addColorStop(0.38, '#ffd344');
  gradient.addColorStop(1, '#efa132');
  ctx.fillStyle = gradient;
  ctx.fill();
  for (const claw of [-6, 0, 6]) {
    ellipse(ctx, reach - Math.abs(claw) * 0.34, claw, 2.6, 2.15, '#8b5b36', claw * 0.043);
  }
  ctx.restore();
}
