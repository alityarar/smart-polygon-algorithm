import type { EdgeCommand, Point, RoomShape } from './types';
import { convertLengthToMm } from './units';

/**
 * EdgeCommand listesinden oda poligonunu oluşturur
 * Başlangıç noktası (0,0) ve başlangıç yönü 0° (yukarı)
 */
export function buildRoomPolygon(edges: EdgeCommand[]): RoomShape {
  const points: Point[] = [];
  
  if (edges.length === 0) {
    return {
      edges,
      points,
      isClosed: false,
    };
  }

  // Başlangıç noktası ve yönü
  let currentX = 0;
  let currentY = 0;
  let currentAngle = 0; // 0° = yukarı (pozitif Y yönü)

  points.push({ x: currentX, y: currentY });

  // Her kenar için yeni nokta hesapla
  for (const edge of edges) {
    // Göreceli dönüşü uygula
    currentAngle += edge.turnDeg;
    
    // Uzunluğu mm'ye çevir
    const lengthMm = convertLengthToMm(edge.length);
    
    // Radyan'a çevir
    const rad = (currentAngle * Math.PI) / 180;
    
    // Yeni nokta hesapla
    // Not: Math.sin pozitif X yönü, Math.cos pozitif Y yönü
    currentX += lengthMm * Math.sin(rad);
    currentY += lengthMm * Math.cos(rad);
    
    points.push({ x: currentX, y: currentY });
  }

  // Poligon kapalı mı kontrol et
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const tolerance = 1; // 1mm tolerans
  const isClosed = 
    Math.abs(lastPoint.x - firstPoint.x) < tolerance &&
    Math.abs(lastPoint.y - firstPoint.y) < tolerance;

  // Alan hesapla (Shoelace formülü)
  const area = isClosed ? calculatePolygonArea(points) : undefined;

  return {
    edges,
    points,
    isClosed,
    area,
  };
}

/**
 * Poligon alanını hesaplar (Shoelace/Gauss formülü)
 * Sonuç mm² cinsinden
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length - 1; i++) {
    area += points[i].x * points[i + 1].y;
    area -= points[i + 1].x * points[i].y;
  }
  
  return Math.abs(area / 2);
}

/**
 * Bir noktanın poligon içinde olup olmadığını kontrol eder (Ray casting algoritması)
 * Kenar üzerindeki noktalar içeride sayılır
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  
  // Daha büyük tolerans kullan (1mm)
  const tolerance = 1.0;
  
  // Önce kenar üzerinde mi kontrol et
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (isPointOnSegment(point, polygon[i], polygon[j], tolerance)) {
      return true; // Kenar üzerindeki noktalar içeride sayılır
    }
  }
  
  // Ray casting algoritması
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    const intersect = 
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Bir noktanın çizgi parçası üzerinde olup olmadığını kontrol eder
 */
function isPointOnSegment(
  point: Point,
  lineStart: Point,
  lineEnd: Point,
  tolerance: number
): boolean {
  // Nokta ile çizgi parçası arasındaki mesafeyi hesapla
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Başlangıç ve bitiş aynı nokta
    return Math.sqrt(A * A + B * B) <= tolerance;
  }

  const param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance <= tolerance;
}

/**
 * Dikdörtgenin köşelerini hesaplar
 */
export function getRectangleCorners(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number = 0
): Point[] {
  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];

  // Rotasyon uygula
  if (rotation !== 0) {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return corners.map((corner) => ({
      x: x + corner.x * cos - corner.y * sin,
      y: y + corner.x * sin + corner.y * cos,
    }));
  }

  // Pozisyon offset'i uygula
  return corners.map((corner) => ({
    x: x + corner.x,
    y: y + corner.y,
  }));
}

/**
 * Dikdörtgenin merkezini hesaplar
 */
export function getRectangleCenter(
  x: number,
  y: number,
  width: number,
  height: number
): Point {
  return {
    x: x + width / 2,
    y: y + height / 2,
  };
}

/**
 * Poligonun sınır kutusunu (bounding box) hesaplar
 */
export function getBoundingBox(points: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Poligonun kendi kendini kesip kesmediğini kontrol eder (basit kontrol)
 */
export function hasSelfintersection(points: Point[]): boolean {
  if (points.length < 4) return false;

  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 2; j < points.length - 1; j++) {
      // İlk ve son kenarı karşılaştırma
      if (i === 0 && j === points.length - 2) continue;
      
      if (segmentsIntersect(
        points[i],
        points[i + 1],
        points[j],
        points[j + 1]
      )) {
        return true;
      }
    }
  }

  return false;
}

/**
 * İki çizgi parçasının kesişip kesişmediğini kontrol eder
 */
function segmentsIntersect(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): boolean {
  const ccw = (a: Point, b: Point, c: Point) => {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  };

  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}
