import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Point } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates a point on a bezier curve defined by 4 points.
 * This is a standard cubic bezier interpolation.
 * @param p0 Start point of the curve segment.
 * @param p1 First control point.
 * @param p2 Second control point.
 * @param p3 End point of the curve segment.
 * @param t Progress along the curve (0 to 1).
 * @returns The {x, y} coordinates on the curve.
 */
function getCubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    let p = { x: uuu * p0.x, y: uuu * p0.y }; // u^3 * p0
    p.x += 3 * uu * t * p1.x; // 3u^2t * p1
    p.y += 3 * uu * t * p1.y;
    p.x += 3 * u * tt * p2.x; // 3ut^2 * p2
    p.y += 3 * u * tt * p2.y;
    p.x += ttt * p3.x; // t^3 * p3
    p.y += ttt * p3.y;

    return p;
}


/**
 * Calculates a point on a Catmull-Rom-like spline (used for the curved tracks).
 * This function must match the curve generation logic in `train-map.tsx`.
 * @param points The array of points defining the entire track segment.
 * @param progress The progress (0 to 1) along the entire segment.
 * @param reversed Whether the train is travelling backwards along the points array.
 * @param tension The tension of the curve (should match the map).
 * @returns The {x, y} coordinates of the train on the curve.
 */
export function getPointOnCurve(
    points: Point[], 
    progress: number, 
    reversed: boolean = false,
    tension = 0.5
  ): Point {
  const segmentPoints = reversed ? [...points].reverse() : points;
  const numSegments = segmentPoints.length - 1;
  if (numSegments <= 0) return segmentPoints[0] || { x: 0, y: 0 };
  
  const targetSegment = Math.min(Math.floor(progress * numSegments), numSegments - 1);
  const t = (progress * numSegments) - targetSegment;
  
  const p0 = targetSegment > 0 ? segmentPoints[targetSegment - 1] : segmentPoints[targetSegment];
  const p1 = segmentPoints[targetSegment];
  const p2 = segmentPoints[targetSegment + 1];
  const p3 = targetSegment < segmentPoints.length - 2 ? segmentPoints[targetSegment + 2] : p2;

  const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
  const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;

  const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
  const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

  return getCubicBezierPoint(p1, {x: cp1x, y: cp1y}, {x: cp2x, y: cp2y}, p2, t);
}

export function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
