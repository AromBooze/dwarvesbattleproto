export type Point = {
  x: number;
  y: number;
};

export type Cone = {
  origin: Point;
  direction: Point;
  angleRadians: number;
  length: number;
};

export function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function normalize(vector: Point): Point {
  const length = Math.hypot(vector.x, vector.y);

  if (length === 0) {
    return { x: 1, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointInCone(point: Point, cone: Cone) {
  const toPoint = {
    x: point.x - cone.origin.x,
    y: point.y - cone.origin.y,
  };
  const distanceToPoint = Math.hypot(toPoint.x, toPoint.y);

  if (distanceToPoint > cone.length || distanceToPoint === 0) {
    return false;
  }

  const normalizedToPoint = {
    x: toPoint.x / distanceToPoint,
    y: toPoint.y / distanceToPoint,
  };
  const dot = cone.direction.x * normalizedToPoint.x + cone.direction.y * normalizedToPoint.y;
  const clampedDot = Math.min(1, Math.max(-1, dot));
  const angleToPoint = Math.acos(clampedDot);

  return angleToPoint <= cone.angleRadians / 2;
}

export function getConeTriangle(cone: Cone): [Point, Point, Point] {
  const halfAngle = cone.angleRadians / 2;
  const baseAngle = Math.atan2(cone.direction.y, cone.direction.x);
  const leftAngle = baseAngle - halfAngle;
  const rightAngle = baseAngle + halfAngle;

  return [
    cone.origin,
    {
      x: cone.origin.x + Math.cos(leftAngle) * cone.length,
      y: cone.origin.y + Math.sin(leftAngle) * cone.length,
    },
    {
      x: cone.origin.x + Math.cos(rightAngle) * cone.length,
      y: cone.origin.y + Math.sin(rightAngle) * cone.length,
    },
  ];
}
