export interface Point {
  x: number;
  y: number;
}

export interface ArmGeometry {
  shoulder: Point;
  elbow: Point;
  hand: Point;
  imageOrigin: Point;
  bend: 1 | -1;
  upperLength: number;
  forearmLength: number;
}

export const NAIWA_SCALE = 0.49;
export const NAIWA_GROUND = { x: 253, y: 490 };
export const NAIWA_HIP = { x: 253, y: 385 };

function photoArm(shoulder: Point, elbow: Point, hand: Point, imageOrigin: Point, bend: 1 | -1): ArmGeometry {
  return {
    shoulder, elbow, hand, imageOrigin, bend,
    upperLength: Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y) * NAIWA_SCALE,
    forearmLength: Math.hypot(hand.x - elbow.x, hand.y - elbow.y) * NAIWA_SCALE,
  };
}

export const NAIWA_ARMS = [
  photoArm({ x: 150, y: 195 }, { x: 119, y: 276 }, { x: 123, y: 365 }, { x: 94, y: 170 }, 1),
  photoArm({ x: 354, y: 195 }, { x: 388, y: 275 }, { x: 381, y: 365 }, { x: 326, y: 170 }, -1),
] as const;

export function solveNaiwaArm(arm: ArmGeometry, shoulder: Point, target: Point) {
  const dx = target.x - shoulder.x;
  const dy = target.y - shoulder.y;
  const distance = Math.hypot(dx, dy);
  const { upperLength, forearmLength } = arm;
  // Keep a small bend even at full reach. A distant target moves the torso instead.
  const reach = Math.min(upperLength + forearmLength - 2, Math.max(Math.abs(upperLength - forearmLength) + 2, distance));
  const ux = distance > 0.001 ? dx / distance : 0;
  const uy = distance > 0.001 ? dy / distance : 1;
  const along = (upperLength ** 2 - forearmLength ** 2 + reach ** 2) / (2 * reach);
  const out = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2)) * arm.bend;
  return {
    elbow: { x: shoulder.x + ux * along - uy * out, y: shoulder.y + uy * along + ux * out },
    hand: { x: shoulder.x + ux * reach, y: shoulder.y + uy * reach },
  };
}
