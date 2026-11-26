import torsoUrl from './assets/naiwa/torso.png';
import legsUrl from './assets/naiwa/legs.png';
import leftArmUrl from './assets/naiwa/arm-left.png';
import rightArmUrl from './assets/naiwa/arm-right.png';
import smileUrl from './assets/naiwa/smile.png';
import { NAIWA_ARMS, NAIWA_GROUND, NAIWA_HIP, NAIWA_SCALE, solveNaiwaArm, type ArmGeometry, type Point } from './naiwaRig';

interface ArmPose {
  hand: Point;
  reach: Point | null;
  activity: number;
}

interface NaiwaPose {
  base: Point;
  width: number;
  tilt: number;
  breath: number;
  sleep: number;
  dt: number;
  gaze: Point;
  eyelid: number;
  joy: number;
  leftArm: ArmPose;
  rightArm: ArmPose;
}

function loadImage(url: string): HTMLImageElement {
  const image = new Image();
  image.src = url;
  return image;
}

function loadSprites() {
  return {
    torso: loadImage(torsoUrl),
    legs: loadImage(legsUrl),
    arms: [loadImage(leftArmUrl), loadImage(rightArmUrl)],
    smile: loadImage(smileUrl),
  };
}

let sprites: ReturnType<typeof loadSprites> | undefined;

function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: CanvasGradient | string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawEye(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, turn: number, pose: NaiwaPose): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  if (pose.eyelid > 0.84) {
    ctx.beginPath();
    ctx.moveTo(-width, 0);
    ctx.quadraticCurveTo(0, 9, width, 0);
    ctx.lineCap = 'round';
    ctx.lineWidth = 3.8;
    ctx.strokeStyle = '#706137';
    ctx.stroke();
  } else {
    ctx.scale(1, 1 - pose.eyelid);
    const iris = ctx.createLinearGradient(-width, -height, width, height);
    iris.addColorStop(0, '#c4dc8d');
    iris.addColorStop(0.52, '#9fbe72');
    iris.addColorStop(1, '#66874b');
    oval(ctx, 0, 0.8, width + 0.8, height + 0.7, '#7e9155');
    oval(ctx, 0, 0, width, height, iris);
    ctx.clip();
    const px = width * pose.gaze.x * 0.37;
    const py = 3.8 * pose.gaze.y;
    oval(ctx, px, py, width * 0.60, height * 0.64, '#152416');
    oval(ctx, px - width * 0.17, py - height * 0.25, width * 0.13, height * 0.11, '#e1e7ba');
  }
  ctx.restore();
}

function drawMouth(ctx: CanvasRenderingContext2D, smile: HTMLImageElement, joy: number): void {
  ctx.save();
  ctx.translate(301, 106);
  ctx.rotate(0.24);
  const smileWeight = Math.max(0, (joy - 0.12) / 0.88);
  if (smileWeight > 0 && smile.naturalWidth > 0) {
    const rise = 7 + smileWeight * 21;
    ctx.drawImage(smile, -23 - smileWeight * 7, -4, 46 + smileWeight * 14, rise);
  } else {
    ctx.beginPath();
    ctx.moveTo(-21, 0.4);
    ctx.quadraticCurveTo(2, -4, 21, 1.2);
    ctx.quadraticCurveTo(0, 3, -21, 0.4);
    ctx.fillStyle = '#74603a';
    ctx.fill();
  }
  ctx.restore();
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  source: [Point, Point, Point],
  destination: [Point, Point, Point],
): void {
  const [a, b, c] = source;
  const [p, q, r] = destination;
  // The source triangle always has a horizontal edge, so the affine map stays simple.
  const ax = (q.x - p.x) / (b.x - a.x);
  const ay = (q.y - p.y) / (b.x - a.x);
  const bx = (r.x - p.x - ax * (c.x - a.x)) / (c.y - a.y);
  const by = (r.y - p.y - ay * (c.x - a.x)) / (c.y - a.y);
  const center = { x: (p.x + q.x + r.x) / 3, y: (p.y + q.y + r.y) / 3 };
  const clip = ({ x, y }: Point) => {
    const padding = 0.55 / Math.max(1, Math.hypot(x - center.x, y - center.y));
    return { x: x + (x - center.x) * padding, y: y + (y - center.y) * padding };
  };
  ctx.save();
  ctx.beginPath();
  const first = clip(p);
  ctx.moveTo(first.x, first.y);
  for (const vertex of [q, r]) {
    const expanded = clip(vertex);
    ctx.lineTo(expanded.x, expanded.y);
  }
  ctx.closePath();
  ctx.clip();
  ctx.transform(ax, ay, bx, by, p.x - ax * a.x - bx * a.y, p.y - ay * a.x - by * a.y);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

function interpolate(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function drawArm(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  arm: ArmGeometry,
  pose: ArmPose,
  position: (point: Point) => Point,
  tilt: number,
): void {
  if (image.naturalWidth === 0) return;
  const shoulder = position(arm.shoulder);
  const restX = (arm.hand.x - arm.shoulder.x) * NAIWA_SCALE;
  const restY = (arm.hand.y - arm.shoulder.y) * NAIWA_SCALE;
  const rest = {
    x: shoulder.x + restX * Math.cos(tilt) - restY * Math.sin(tilt),
    y: shoulder.y + restX * Math.sin(tilt) + restY * Math.cos(tilt),
  };
  const target = {
    x: rest.x + (pose.hand.x - rest.x) * pose.activity,
    y: rest.y + (pose.hand.y - rest.y) * pose.activity,
  };
  const { elbow, hand } = solveNaiwaArm(arm, shoulder, target);
  const upper = Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x);
  const lower = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
  const turn = Math.atan2(Math.sin(lower - upper), Math.cos(lower - upper));
  const sourceUpper = Math.atan2(arm.elbow.y - arm.shoulder.y, arm.elbow.x - arm.shoulder.x);
  const sourceLower = Math.atan2(arm.hand.y - arm.elbow.y, arm.hand.x - arm.elbow.x);
  const firstRow = arm.imageOrigin.y;
  const lastRow = firstRow + image.naturalHeight;
  const elbowBlend = 22;
  const elbowStart = arm.elbow.y - elbowBlend;
  const elbowEnd = arm.elbow.y + elbowBlend;
  const curveStart = interpolate(shoulder, elbow, (elbowStart - arm.shoulder.y) / (arm.elbow.y - arm.shoulder.y));
  const curveEnd = interpolate(elbow, hand, (elbowEnd - arm.elbow.y) / (arm.hand.y - arm.elbow.y));

  const row = (y: number) => {
    const upperHalf = y <= arm.elbow.y;
    const sourceFrom = upperHalf ? arm.shoulder : arm.elbow;
    const sourceTo = upperHalf ? arm.elbow : arm.hand;
    const fraction = (y - sourceFrom.y) / (sourceTo.y - sourceFrom.y);
    const sourceCenter = interpolate(sourceFrom, sourceTo, fraction);
    let center = upperHalf ? interpolate(shoulder, elbow, fraction) : interpolate(elbow, hand, fraction);
    const mix = clamp((y - elbowStart) / (elbowEnd - elbowStart), 0, 1);
    if (mix > 0 && mix < 1) {
      center = interpolate(interpolate(curveStart, elbow, mix), interpolate(elbow, curveEnd, mix), mix);
    }
    const photoAngle = sourceUpper + (sourceLower - sourceUpper) * mix;
    const angle = upper + turn * mix - photoAngle;
    const edge = (x: number) => {
      const offset = (x - sourceCenter.x) * NAIWA_SCALE;
      return { x: center.x + Math.cos(angle) * offset, y: center.y + Math.sin(angle) * offset };
    };
    return { y: y - firstRow, left: edge(arm.imageOrigin.x), right: edge(arm.imageOrigin.x + image.naturalWidth) };
  };

  let previous = row(firstRow);
  const rows = [arm.shoulder.y, elbowStart, arm.elbow.y - 11, arm.elbow.y, arm.elbow.y + 11, elbowEnd, arm.hand.y, lastRow];
  for (const y of rows) {
    const next = row(y);
    const width = image.naturalWidth;
    drawTriangle(ctx, image, [{ x: 0, y: previous.y }, { x: width, y: previous.y }, { x: 0, y: next.y }],
      [previous.left, previous.right, next.left]);
    drawTriangle(ctx, image, [{ x: width, y: next.y }, { x: 0, y: next.y }, { x: width, y: previous.y }],
      [next.right, next.left, previous.right]);
    previous = next;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class NaiwaRenderer {
  private side = 0;
  private feet = 0;
  private crouch = 0;

  public reset(): void {
    this.side = this.feet = this.crouch = 0;
  }

  public draw(ctx: CanvasRenderingContext2D, pose: NaiwaPose, drawDesk: () => void): void {
    const images = sprites ??= loadSprites();
    if (images.torso.naturalWidth === 0 || images.legs.naturalWidth === 0) {
      drawDesk();
      return;
    }

    const arms = [pose.leftArm, pose.rightArm];
    const shoulders = NAIWA_ARMS.map(({ shoulder }) => ({
      x: pose.base.x + (shoulder.x - NAIWA_GROUND.x) * NAIWA_SCALE,
      y: pose.base.y + (shoulder.y - NAIWA_GROUND.y) * NAIWA_SCALE,
    }));
    let sideGoal = 0;
    let active = 0;
    arms.forEach(({ reach, activity }, i) => {
      if (!reach) return;
      sideGoal += (reach.x - shoulders[i].x) * activity;
      active += activity;
    });
    const lateralLimit = pose.width < 500 ? 63 : 105;
    sideGoal = clamp((sideGoal * 0.76) / Math.max(1, active), -lateralLimit, lateralLimit);
    let crouchGoal = 0;
    arms.forEach(({ reach, activity }, i) => {
      if (!reach) return;
      const remainingX = reach.x - shoulders[i].x - sideGoal * 1.22;
      const armRoom = Math.sqrt(Math.max(1050, 78 ** 2 - remainingX ** 2));
      crouchGoal = Math.max(crouchGoal, (reach.y - shoulders[i].y - armRoom) * activity);
    });
    crouchGoal = clamp(crouchGoal, 0, 75);
    this.side += (sideGoal - this.side) * (1 - Math.exp(-13 * pose.dt));
    this.feet += (this.side - this.feet) * (1 - Math.exp(-9 * pose.dt));
    this.crouch += (crouchGoal - this.crouch) * (1 - Math.exp(-17 * pose.dt));

    const drop = this.crouch * 0.73 + pose.sleep * 10;
    const torsoScale = NAIWA_SCALE * (1 - this.crouch * 0.0031 - pose.sleep * 0.082);
    const tilt = clamp(this.side * 0.00255 + pose.tilt * 0.18, -0.27, 0.27);
    const hip = {
      x: pose.base.x + this.side,
      y: pose.base.y + (NAIWA_HIP.y - NAIWA_GROUND.y) * NAIWA_SCALE + drop + pose.breath * 0.45,
    };
    const sin = Math.sin(tilt);
    const cos = Math.cos(tilt);
    const position = ({ x, y }: Point) => {
      const localX = (x - NAIWA_HIP.x) * NAIWA_SCALE;
      const localY = (y - NAIWA_HIP.y) * torsoScale;
      return { x: hip.x + localX * cos - localY * sin, y: hip.y + localX * sin + localY * cos };
    };

    const feetX = pose.base.x + this.feet;
    oval(ctx, feetX, pose.base.y + 1, 58, 3.8, 'rgba(67, 50, 24, 0.15)');
    ctx.save();
    ctx.translate(feetX, pose.base.y);
    ctx.scale(NAIWA_SCALE, Math.max(0.17, NAIWA_SCALE - drop / (NAIWA_GROUND.y - NAIWA_HIP.y)));
    ctx.drawImage(images.legs, -NAIWA_GROUND.x, -NAIWA_GROUND.y);
    ctx.restore();

    ctx.save();
    ctx.translate(hip.x, hip.y);
    ctx.rotate(tilt);
    ctx.scale(NAIWA_SCALE, torsoScale);
    ctx.translate(-NAIWA_HIP.x, -NAIWA_HIP.y);
    ctx.drawImage(images.torso, 0, 0);
    drawEye(ctx, 274, 66, 15.7, 15.4, 0.15, pose);
    drawEye(ctx, 336, 81, 8.7, 14.5, 0.22, pose);
    drawMouth(ctx, images.smile, pose.joy);
    ctx.restore();

    drawDesk();
    arms.forEach((arm, i) => drawArm(ctx, images.arms[i], NAIWA_ARMS[i], arm, position, tilt));
  }
}
