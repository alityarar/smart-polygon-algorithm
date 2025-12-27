import type {
  RoomShape,
  TileDimensions,
  CalculationSettings,
  TileLayout,
  PlacedTile,
  CalculationResult,
  Point,
  ScrapPoly,
  CutInstruction,
} from './types';
import { convertLengthToMm } from './units';
import { getBoundingBox } from './geometry';
import polygonClipping from 'polygon-clipping';

/**
 * Ana hesaplama fonksiyonu - döşeme layout'unu hesaplar
 */
export function calculateTileLayout(
  room: RoomShape,
  tile: TileDimensions,
  settings: CalculationSettings
): CalculationResult {
  if (!room.isClosed || room.points.length < 3) {
    throw new Error('Oda kapalı bir poligon olmalı');
  }

  // Malzeme ölçülerini mm'ye çevir
  const tileWidthMm = convertLengthToMm(tile.width);
  const tileHeightMm = convertLengthToMm(tile.height);
  const groutMm = convertLengthToMm(tile.grout);

  // Efektif ölçüler (derz dahil) - sadece grid spacing için
  const effectiveWidth = tileWidthMm + groutMm;
  const effectiveHeight = tileHeightMm + groutMm;

  // Pattern'e göre layout hesapla.
  let layout: TileLayout;
  
  switch (settings.pattern) {
    case 'grid':
      layout = calculateGridLayout(
        room,
        effectiveWidth,
        effectiveHeight,
        tileWidthMm,
        tileHeightMm,
        settings.useScrap
      );
      break;
    case 'half-offset':
      layout = calculateHalfOffsetLayout(
        room,
        effectiveWidth,
        effectiveHeight,
        tileWidthMm,
        tileHeightMm,
        settings.useScrap
      );
      break;
    case 'diagonal-grid':
      layout = calculateDiagonalGridLayout(
        room,
        effectiveWidth,
        effectiveHeight,
        tileWidthMm,
        tileHeightMm,
        settings.useScrap,
        {
          kerfMm: 1.5,
          toleranceMm: 1.0,
          minUsableScrapMm: 80,
        }
      );
      break;
    case 'diagonal-offset':
      layout = calculateDiagonalOffsetLayout(
        room,
        effectiveWidth,
        effectiveHeight,
        tileWidthMm,
        tileHeightMm,
        settings.useScrap
      );
      break;
    case 'free':
    default:
      layout = calculateFreeLayout(
        room,
        effectiveWidth,
        effectiveHeight,
        tileWidthMm,
        tileHeightMm
      );
      break;
  }

  const roomArea = room.area || 0;
  const tileArea = tileWidthMm * tileHeightMm;

  return {
    layout,
    roomArea,
    tileArea,
    totalCoveredArea: layout.tiles.length * tileArea,
  };
}

/**
 * Gerekli parça bilgisi
 */
interface RequiredPiece {
  id: string;
  x: number;
  y: number;
  requiredWidth: number;
  requiredHeight: number;
  isFullTile: boolean; // Tam seramik boyutunda mı?
}

/**
 * Bir noktanın poligon içinde olup olmadığını kontrol et (Ray Casting)
 */
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Grid (hizalı) pattern hesaplama - GELIŞMIŞ VERSIYON
 */
function calculateGridLayout(
  room: RoomShape,
  effectiveWidth: number,
  effectiveHeight: number,
  actualWidth: number,
  actualHeight: number,
  useScrap: boolean
): TileLayout {
  const bbox = getBoundingBox(room.points);
  const numCols = Math.ceil(bbox.width / effectiveWidth);
  const numRows = Math.ceil(bbox.height / effectiveHeight);
  
  console.log('═══════════════════════════════════════');
  console.log('🏗️  GRID PATTERN - ADVANCED');
  console.log('═══════════════════════════════════════');
  console.log('Oda boyutu:', bbox.width.toFixed(0), 'x', bbox.height.toFixed(0), 'mm');
  console.log('Seramik boyutu:', actualWidth, 'x', actualHeight, 'mm');
  console.log('Grid pozisyonları:', numCols, 'x', numRows);
  console.log('Artık kullanımı:', useScrap ? 'AÇIK' : 'KAPALI');
  
  const cutSafety = 2.5; // kerf + tolerans
  const minScrapSize = 80;
  
  const requiredPieces: RequiredPiece[] = [];
  let pieceId = 0;
  
  // PHASE 1: Geometri analizi
  for (let row = 0; row < numRows; row++) {
    const y = bbox.minY + row * effectiveHeight;
    
    for (let col = 0; col < numCols; col++) {
      const x = bbox.minX + col * effectiveWidth;
      
      const corners = [
        { x, y },
        { x: x + actualWidth, y },
        { x: x + actualWidth, y: y + actualHeight },
        { x, y: y + actualHeight },
      ];
      
      const center = { x: x + actualWidth / 2, y: y + actualHeight / 2 };
      const cornersInside = corners.filter(c => isPointInPolygon(c, room.points)).length;
      const centerInside = isPointInPolygon(center, room.points);
      
      if (cornersInside > 0 || centerInside) {
        const isFullTile = cornersInside === 4;
        
        let requiredWidth = actualWidth;
        let requiredHeight = actualHeight;
        
        if (!isFullTile) {
          const isLastCol = col === numCols - 1;
          const isLastRow = row === numRows - 1;
          
          if (isLastCol) {
            const remainingWidth = bbox.maxX - x;
            requiredWidth = Math.min(actualWidth, Math.max(10, remainingWidth));
          }
          if (isLastRow) {
            const remainingHeight = bbox.maxY - y;
            requiredHeight = Math.min(actualHeight, Math.max(10, remainingHeight));
          }
        }
        
        requiredPieces.push({
          id: `piece-${pieceId++}`,
          x,
          y,
          requiredWidth,
          requiredHeight,
          isFullTile,
        });
      }
    }
  }
  
  console.log('Gerekli parça:', requiredPieces.length, '(Tam:', requiredPieces.filter(p => p.isFullTile).length, '| Kesilecek:', requiredPieces.filter(p => !p.isFullTile).length + ')');
  
  // PHASE 2: Malzeme tahsisi + artık yönetimi
  const scrapInventory: ScrapPoly[] = [];
  const placedTiles: PlacedTile[] = [];
  const cutList: CutInstruction[] = [];
  
  let fullTilesConsumed = 0;
  let cutTilesConsumed = 0;
  let scrapUsedCount = 0;
  
  for (const piece of requiredPieces) {
    let allocatedFromScrap = false;
    let scrapSource: ScrapPoly | null = null;
    
    if (useScrap && !piece.isFullTile) {
      // Artık envanterinde uygun parça ara
      const usableScraps = scrapInventory
        .filter(s => !s.used && s.bboxLocal.width >= piece.requiredWidth + cutSafety && s.bboxLocal.height >= piece.requiredHeight + cutSafety)
        .sort((a, b) => a.areaMm2 - b.areaMm2);
      
      if (usableScraps.length > 0) {
        scrapSource = usableScraps[0];
        scrapSource.used = true;
        allocatedFromScrap = true;
        scrapUsedCount++;
      }
    }
    
    if (!allocatedFromScrap) {
      if (piece.isFullTile) {
        fullTilesConsumed++;
      } else {
        cutTilesConsumed++;
        
        // Artık oluştur
        if (useScrap) {
          const leftoverWidth = actualWidth - piece.requiredWidth;
          const leftoverHeight = actualHeight - piece.requiredHeight;
          
          // Sağ artık
          if (leftoverWidth >= minScrapSize && piece.requiredHeight >= minScrapSize) {
            scrapInventory.push({
              id: `scrap-R-${scrapInventory.length + 1}`,
              polygonWorld: [],
              polygonLocal: [],
              areaMm2: leftoverWidth * piece.requiredHeight,
              bboxLocal: {
                minX: 0,
                minY: 0,
                maxX: leftoverWidth,
                maxY: piece.requiredHeight,
                width: leftoverWidth,
                height: piece.requiredHeight,
              },
              used: false,
            });
          }
          
          // Üst artık
          if (leftoverHeight >= minScrapSize && piece.requiredWidth >= minScrapSize) {
            scrapInventory.push({
              id: `scrap-T-${scrapInventory.length + 1}`,
              polygonWorld: [],
              polygonLocal: [],
              areaMm2: piece.requiredWidth * leftoverHeight,
              bboxLocal: {
                minX: 0,
                minY: 0,
                maxX: piece.requiredWidth,
                maxY: leftoverHeight,
                width: piece.requiredWidth,
                height: leftoverHeight,
              },
              used: false,
            });
          }
        }
      }
    }
    
    placedTiles.push({
      id: piece.id,
      x: piece.x + actualWidth / 2,
      y: piece.y + actualHeight / 2,
      width: actualWidth,
      height: actualHeight,
      rotation: 0,
      isFullTile: piece.isFullTile,
      isFromScrap: allocatedFromScrap,
      sourceType: allocatedFromScrap ? 'scrap' : (piece.isFullTile ? 'full' : 'cut'),
    });
    
    // Kesim talimatı oluştur (kesilecek parçalar için)
    if (!piece.isFullTile) {
      const usedPieceLocal = [
        { x: 0, y: 0 },
        { x: piece.requiredWidth, y: 0 },
        { x: piece.requiredWidth, y: piece.requiredHeight },
        { x: 0, y: piece.requiredHeight },
      ];
      
      const bboxLocal = {
        minX: 0,
        minY: 0,
        maxX: piece.requiredWidth,
        maxY: piece.requiredHeight,
        width: piece.requiredWidth,
        height: piece.requiredHeight,
      };
      
      const cutLines: Array<{ from: Point; to: Point; lengthMm: number }> = [];
      
      if (piece.requiredWidth < actualWidth) {
        cutLines.push({
          from: { x: piece.requiredWidth, y: 0 },
          to: { x: piece.requiredWidth, y: actualHeight },
          lengthMm: actualHeight,
        });
      }
      
      if (piece.requiredHeight < actualHeight) {
        cutLines.push({
          from: { x: 0, y: piece.requiredHeight },
          to: { x: actualWidth, y: piece.requiredHeight },
          lengthMm: actualWidth,
        });
      }
      
      const scrapsProduced: CutInstruction['scrapsProduced'] = [];
      
      if (!allocatedFromScrap && useScrap) {
        const leftoverWidth = actualWidth - piece.requiredWidth;
        const leftoverHeight = actualHeight - piece.requiredHeight;
        
        if (leftoverWidth >= minScrapSize && piece.requiredHeight >= minScrapSize) {
          scrapsProduced.push({
            scrapId: `scrap-R-${piece.id}`,
            areaMm2: leftoverWidth * piece.requiredHeight,
            verticesLocal: [
              { x: piece.requiredWidth, y: 0 },
              { x: actualWidth, y: 0 },
              { x: actualWidth, y: piece.requiredHeight },
              { x: piece.requiredWidth, y: piece.requiredHeight },
            ],
            bboxLocal: {
              minX: piece.requiredWidth,
              minY: 0,
              maxX: actualWidth,
              maxY: piece.requiredHeight,
              width: leftoverWidth,
              height: piece.requiredHeight,
            },
          });
        }
        
        if (leftoverHeight >= minScrapSize && piece.requiredWidth >= minScrapSize) {
          scrapsProduced.push({
            scrapId: `scrap-T-${piece.id}`,
            areaMm2: piece.requiredWidth * leftoverHeight,
            verticesLocal: [
              { x: 0, y: piece.requiredHeight },
              { x: piece.requiredWidth, y: piece.requiredHeight },
              { x: piece.requiredWidth, y: actualHeight },
              { x: 0, y: actualHeight },
            ],
            bboxLocal: {
              minX: 0,
              minY: piece.requiredHeight,
              maxX: piece.requiredWidth,
              maxY: actualHeight,
              width: piece.requiredWidth,
              height: leftoverHeight,
            },
          });
        }
      }
      
      cutList.push({
        tileIndex: cutList.length + 1,
        tileId: piece.id,
        model: 'B',
        rotationDeg: 0,
        tileCenterWorld: { x: piece.x + actualWidth / 2, y: piece.y + actualHeight / 2 },
        usedPiece: {
          areaMm2: piece.requiredWidth * piece.requiredHeight,
          verticesWorld: usedPieceLocal.map(p => ({ x: piece.x + p.x, y: piece.y + p.y })),
          verticesLocal: usedPieceLocal,
          bboxLocal,
        },
        cutLinesLocal: cutLines,
        scrapsProduced,
        fromScrap: allocatedFromScrap ? { scrapId: scrapSource!.id, consumedAreaMm2: piece.requiredWidth * piece.requiredHeight, remainingScraps: [] } : undefined,
        nominalVsCut: {
          nominalBboxLocal: { w: piece.requiredWidth, h: piece.requiredHeight },
          recommendedCutBboxLocal: {
            w: Math.max(0, piece.requiredWidth - cutSafety),
            h: Math.max(0, piece.requiredHeight - cutSafety),
          },
          cutSafetyMm: cutSafety,
        },
      });
    }
  }
  
  const totalTilesNeeded = fullTilesConsumed + cutTilesConsumed;
  const wastePercentage = calculateWastePercentage(room.area || 0, totalTilesNeeded, actualWidth * actualHeight);
  
  console.log('📊 Sonuç: Tam:', fullTilesConsumed, '| Kesim:', cutTilesConsumed, '| Artık kullanımı:', scrapUsedCount, '| Toplam:', totalTilesNeeded);
  console.log('Fire:', wastePercentage.toFixed(1) + '%', '| Kesim listesi:', cutList.length, 'parça');

  return {
    tiles: placedTiles,
    fullTileCount: fullTilesConsumed,
    cutTileCount: cutTilesConsumed,
    scrapUsedCount,
    totalTilesNeeded,
    wastePercentage,
    scraps: [],
    cutList,
  };
}

/**
 * Half-offset (yarım kaydırmalı / tuğla dizimi) pattern hesaplama
 * 
 * DOĞRU MANTIK:
 * - Çift satırlar: Normal grid gibi
 * - Tek satırlar: %50 kaydırılmış → başta ve sonda yarım parça
 * - 2 yarım parça = 1 tam seramik
 * 
 * Örnek: 4m x 4m oda, 1m seramik
 * - 4 satır x 4 sütun ama kaydırmalı
 * - Satır 0,2: 4 tam parça
 * - Satır 1,3: 1 yarım + 3 tam + 1 yarım = 3 tam + 2 yarım
 * - Toplam tam: 14, Toplam yarım: 4 → 14 + (4/2) = 16 seramik
 */
function calculateHalfOffsetLayout(
  room: RoomShape,
  effectiveWidth: number,
  effectiveHeight: number,
  actualWidth: number,
  actualHeight: number,
  useScrap: boolean
): TileLayout {
  const bbox = getBoundingBox(room.points);
  const cleanWidth = Math.round(bbox.width);
  const cleanHeight = Math.round(bbox.height);
  
  const numRows = Math.ceil(cleanHeight / effectiveHeight);
  
  console.log('═══════════════════════════════════════');
  console.log('🏗️  HALF-OFFSET PATTERN ANALYSIS');
  console.log('═══════════════════════════════════════');
  console.log('Oda boyutu:', cleanWidth, 'x', cleanHeight, 'mm');
  console.log('Seramik boyutu (actual):', actualWidth, 'x', actualHeight, 'mm');
  console.log('Satır sayısı:', numRows);
  console.log('Artık kullanımı:', useScrap ? 'AÇIK' : 'KAPALI');
  
  // ===== PHASE 1: Geometri - Hangi parçalar gerekli? =====
  const requiredPieces: RequiredPiece[] = [];
  let pieceId = 0;
  
  // Half-offset'te yarım parça boyutu
  const halfWidth = actualWidth / 2;
  
  for (let row = 0; row < numRows; row++) {
    const y = bbox.minY + row * effectiveHeight;
    const isShiftedRow = row % 2 === 1; // Tek satırlar kaydırılır
    
    if (isShiftedRow) {
      // Kaydırılmış satır: başta yarım + tam parçalar + sonda yarım
      const offsetX = effectiveWidth / 2;
      const numFullInShiftedRow = Math.floor((cleanWidth - offsetX) / effectiveWidth);
      
      // Satır başında yarım parça
      const startHalfX = bbox.minX;
      requiredPieces.push({
        id: `piece-${pieceId++}`,
        x: startHalfX,
        y,
        requiredWidth: halfWidth,
        requiredHeight: actualHeight,
        isFullTile: false,
      });
      
      // Tam parçalar
      for (let i = 0; i < numFullInShiftedRow; i++) {
        const x = bbox.minX + offsetX + i * effectiveWidth;
        requiredPieces.push({
          id: `piece-${pieceId++}`,
          x,
          y,
          requiredWidth: actualWidth,
          requiredHeight: actualHeight,
          isFullTile: true,
        });
      }
      
      // Satır sonunda yarım parça (eğer yer varsa)
      const endHalfX = bbox.minX + offsetX + numFullInShiftedRow * effectiveWidth;
      if (endHalfX < bbox.maxX - 10) { // 10mm tolerans
        requiredPieces.push({
          id: `piece-${pieceId++}`,
          x: endHalfX,
          y,
          requiredWidth: halfWidth,
          requiredHeight: actualHeight,
          isFullTile: false,
        });
      }
    } else {
      // Normal satır: sadece tam parçalar
      const numFullInRow = Math.ceil(cleanWidth / effectiveWidth);
      
      for (let i = 0; i < numFullInRow; i++) {
        const x = bbox.minX + i * effectiveWidth;
        
        // Son sütun mu kontrol et
        const isLastCol = i === numFullInRow - 1;
        let requiredWidth = actualWidth;
        
        if (isLastCol) {
          const remainingWidth = cleanWidth - (i * effectiveWidth);
          requiredWidth = Math.min(actualWidth, remainingWidth);
        }
        
        const isFullPiece = requiredWidth >= actualWidth - 10; // 10mm tolerans
        
        requiredPieces.push({
          id: `piece-${pieceId++}`,
          x,
          y,
          requiredWidth,
          requiredHeight: actualHeight,
          isFullTile: isFullPiece,
        });
      }
    }
  }
  
  console.log('\nToplam gerekli parça sayısı:', requiredPieces.length);
  console.log('  - Tam boyut:', requiredPieces.filter(p => p.isFullTile).length);
  console.log('  - Kesilmiş (yarım vs):', requiredPieces.filter(p => !p.isFullTile).length);
  
  // ===== PHASE 2: Malzeme Ayırma =====
  console.log('\n═══════════════════════════════════════');
  console.log('🔧 PHASE 2: MATERIAL ALLOCATION');
  console.log('═══════════════════════════════════════');
  
  const placedTiles: PlacedTile[] = [];
  const scrapInventory: Array<{ id: string; width: number; height: number; area: number; used: boolean }> = [];
  
  let fullTilesConsumed = 0;
  let scrapUsedCount = 0;
  
  // Tam parçalar için direkt seramik ayır
  const fullPieces = requiredPieces.filter(p => p.isFullTile);
  fullTilesConsumed = fullPieces.length;
  
  // Kesilmiş parçalar için alan hesapla
  const cutPieces = requiredPieces.filter(p => !p.isFullTile);
  let totalCutArea = 0;
  
  for (const piece of cutPieces) {
    totalCutArea += piece.requiredWidth * piece.requiredHeight;
  }
  
  const tileArea = actualWidth * actualHeight;
  
  // Kesilmiş parçalar için kaç seramik lazım?
  // Alan bazlı hesaplama: toplam kesim alanı / seramik alanı
  const tilesForCuts = Math.ceil(totalCutArea / tileArea);
  
  console.log('\nKesim analizi:');
  console.log('  - Kesilmiş parça sayısı:', cutPieces.length);
  console.log('  - Toplam kesim alanı:', (totalCutArea / 1000000).toFixed(2), 'm²');
  console.log('  - Seramik alanı:', (tileArea / 1000000).toFixed(2), 'm²');
  console.log('  - Kesim için seramik:', tilesForCuts);
  
  // Artık kullanımı simülasyonu (basitleştirilmiş)
  let actualTilesForCuts = tilesForCuts;
  
  if (useScrap) {
    // Artık kullanımıyla: yarım parçalar eşleştirilebilir
    // 2 yarım = 1 tam → daha verimli
    const halfPieces = cutPieces.filter(p => 
      Math.abs(p.requiredWidth - halfWidth) < 10 || 
      Math.abs(p.requiredHeight - halfWidth) < 10
    );
    
    const numHalfPairs = Math.floor(halfPieces.length / 2);
    scrapUsedCount = numHalfPairs;
    
    console.log('  - Yarım parça sayısı:', halfPieces.length);
    console.log('  - Eşleştirilebilen çift:', numHalfPairs);
    console.log('  - Artıktan karşılanan:', scrapUsedCount);
  }
  
  // Tüm parçaları yerleştir
  for (const piece of requiredPieces) {
    const allocatedFromScrap = useScrap && !piece.isFullTile && scrapUsedCount > 0;
    
    if (allocatedFromScrap && !piece.isFullTile) {
      // Artıktan kullanıldı olarak işaretle
      // (Basitleştirilmiş - gerçekte daha karmaşık)
    }
    
    placedTiles.push({
      id: piece.id,
      x: piece.x,
      y: piece.y,
      width: piece.requiredWidth,
      height: piece.requiredHeight,
      rotation: 0,
      isFullTile: piece.isFullTile,
      isFromScrap: allocatedFromScrap,
      sourceType: allocatedFromScrap ? 'scrap' : (piece.isFullTile ? 'full' : 'cut'),
    });
  }
  
  const totalTilesNeeded = fullTilesConsumed + actualTilesForCuts;
  
  console.log('\n📊 ALLOCATION RESULTS:');
  console.log('  Tam seramik (direkt kullanılan):', fullTilesConsumed);
  console.log('  Kesim için seramik:', actualTilesForCuts);
  console.log('  Artıktan karşılanan parça:', scrapUsedCount);
  console.log('\n🎯 TOPLAM SERAMİK İHTİYACI:', totalTilesNeeded);
  console.log('═══════════════════════════════════════\n');
  
  const wastePercentage = calculateWastePercentage(
    room.area || 0,
    totalTilesNeeded,
    actualWidth * actualHeight
  );

  return {
    tiles: placedTiles,
    fullTileCount: fullTilesConsumed,
    cutTileCount: actualTilesForCuts,
    scrapUsedCount,
    totalTilesNeeded,
    wastePercentage,
    scraps: scrapInventory,
  };
}

/**
 * Diagonal-offset (45° + yarım kaydırmalı) pattern hesaplama
 */
function calculateDiagonalOffsetLayout(
  room: RoomShape,
  effectiveWidth: number,
  effectiveHeight: number,
  actualWidth: number,
  actualHeight: number,
  useScrap: boolean
): TileLayout {
  // Diagonal-offset için benzer mantık ama kaydırmalı
  // Şu an basitleştirilmiş olarak diagonal grid'i döndür
  return calculateDiagonalGridLayout(
    room,
    effectiveWidth,
    effectiveHeight,
    actualWidth,
    actualHeight,
    useScrap
  );
}

/**
 * Free (serbest/teorik minimum) pattern hesaplama
 */
function calculateFreeLayout(
  room: RoomShape,
  _effectiveWidth: number,
  _effectiveHeight: number,
  actualWidth: number,
  actualHeight: number
): TileLayout {
  const roomArea = room.area || 0;
  const tileArea = actualWidth * actualHeight;
  const theoreticalCount = Math.ceil(roomArea / tileArea);

  return {
    tiles: [],
    fullTileCount: theoreticalCount,
    cutTileCount: 0,
    scrapUsedCount: 0,
    totalTilesNeeded: theoreticalCount,
    wastePercentage: 0,
    scraps: [],
  };
}

/**
 * Fire yüzdesini hesaplar
 */
function calculateWastePercentage(
  roomArea: number,
  tileCount: number,
  tileArea: number
): number {
  if (roomArea === 0) return 0;
  
  const totalTileArea = tileCount * tileArea;
  const waste = totalTileArea - roomArea;
  return (waste / totalTileArea) * 100;
}

/**
 * 2D nokta rotasyon fonksiyonu
 */
function rotatePoint(x: number, y: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

/**
 * Diagonal kafes merkez noktalarını üretir
 */
function generateDiagonalLatticeCenters(
  roomBBox: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number },
  tileWidth: number,
  tileHeight: number,
  grout: number,
  angleDeg: number
): Array<{ x: number; y: number }> {
  const originX = roomBBox.minX + roomBBox.width / 2;
  const originY = roomBBox.minY + roomBBox.height / 2;
  
  const basisU = rotatePoint(tileWidth + grout, 0, angleDeg);
  const basisV = rotatePoint(0, tileHeight + grout, angleDeg);
  
  const basisULen = Math.sqrt(basisU.x ** 2 + basisU.y ** 2);
  const basisVLen = Math.sqrt(basisV.x ** 2 + basisV.y ** 2);
  const minBasisLen = Math.min(basisULen, basisVLen);
  
  const roomRadius = Math.sqrt(roomBBox.width ** 2 + roomBBox.height ** 2) / 2;
  const tileRadius = Math.sqrt(tileWidth ** 2 + tileHeight ** 2) / 2;
  const scanRadius = roomRadius + tileRadius * 1.5 + minBasisLen;
  
  const K = Math.ceil(scanRadius / minBasisLen) + 3;
  
  console.log('  Basis U:', basisU, '| len:', basisULen.toFixed(1), 'mm');
  console.log('  Basis V:', basisV, '| len:', basisVLen.toFixed(1), 'mm');
  console.log('  Scan radius:', scanRadius.toFixed(0), 'mm');
  console.log('  Grid range: i,j ∈ [-' + K + ', +' + K + ']');
  
  const centers: Array<{ x: number; y: number }> = [];
  
  for (let i = -K; i <= K; i++) {
    for (let j = -K; j <= K; j++) {
      const centerX = originX + i * basisU.x + j * basisV.x;
      const centerY = originY + i * basisU.y + j * basisV.y;
      centers.push({ x: centerX, y: centerY });
    }
  }
  
  return centers;
}

/**
 * Döndürülmüş dikdörtgen poligon oluştur (dünya koordinatlarında)
 */
function createRotatedRectanglePolygon(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  angleDeg: number
): Point[] {
  const halfW = width / 2;
  const halfH = height / 2;
  
  // Yerel koordinatlarda köşeler (saat yönünde)
  const localCorners = [
    { x: -halfW, y: -halfH }, // sol alt
    { x: halfW, y: -halfH },  // sağ alt
    { x: halfW, y: halfH },   // sağ üst
    { x: -halfW, y: halfH },  // sol üst
  ];
  
  // Döndür ve merkeze taşı
  return localCorners.map(corner => {
    const rotated = rotatePoint(corner.x, corner.y, angleDeg);
    return {
      x: centerX + rotated.x,
      y: centerY + rotated.y,
    };
  });
}

/**
 * Dünya koordinatlarından yerel koordinatlara dönüştür
 */
function worldToLocal(
  worldPoint: Point,
  centerX: number,
  centerY: number,
  angleDeg: number
): Point {
  // Merkeze taşı
  const translated = {
    x: worldPoint.x - centerX,
    y: worldPoint.y - centerY,
  };
  
  // Ters rotasyon uygula
  return rotatePoint(translated.x, translated.y, -angleDeg);
}

/**
 * Poligon alanı hesapla (Shoelace formula)
 */
function calculatePolygonArea(vertices: Point[]): number {
  if (vertices.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Poligon bounding box hesapla
 */
function calculateBoundingBox(vertices: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (vertices.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = vertices[0].x;
  let minY = vertices[0].y;
  let maxX = vertices[0].x;
  let maxY = vertices[0].y;
  
  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
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
 * İki poligonun kesişimini hesapla (polygon-clipping kullanarak)
 */
function intersectPolygons(poly1: Point[], poly2: Point[]): Point[][] {
  try {
    // polygon-clipping format: number[][][]
    const p1 = [poly1.map(p => [p.x, p.y])];
    const p2 = [poly2.map(p => [p.x, p.y])];
    
    const result = polygonClipping.intersection(p1 as any, p2 as any);
    
    // Result format: [[[x1, y1], [x2, y2], ...], ...]
    return result.map(multiPoly => 
      multiPoly[0].map(coord => ({ x: coord[0], y: coord[1] }))
    );
  } catch (error) {
    console.warn('Polygon intersection failed:', error);
    return [];
  }
}

/**
 * Diagonal-grid (45° döndürülmüş) pattern hesaplama - POLYGON-BASED WITH CUT INSTRUCTIONS
 */
function calculateDiagonalGridLayout(
  room: RoomShape,
  effectiveWidth: number,
  effectiveHeight: number,
  actualWidth: number,
  actualHeight: number,
  useScrap: boolean,
  cuttingSettings?: { kerfMm?: number; toleranceMm?: number; minUsableScrapMm?: number }
): TileLayout {
  // ✅ Cutting settings with defaults
  const kerf = cuttingSettings?.kerfMm ?? 1.5;
  const tolerance = cuttingSettings?.toleranceMm ?? 1.0;
  const cutSafety = kerf + tolerance;
  const minScrapSize = cuttingSettings?.minUsableScrapMm ?? 80;
  
  const bbox = getBoundingBox(room.points);
  const roomArea = room.area || 0;
  const tileArea = actualWidth * actualHeight;
  
  const axisCols = Math.ceil(bbox.width / effectiveWidth);
  const axisRows = Math.ceil(bbox.height / effectiveHeight);
  const axisGridBenchmark = axisCols * axisRows;
  const theoreticalMin = Math.ceil(roomArea / tileArea);
  
  console.log('═════════════════════════════════════════════');
  console.log('🔷 DIAGONAL GRID (45°) - POLYGON-BASED WITH CUT INSTRUCTIONS');
  console.log('═════════════════════════════════════════════');
  console.log('Room:', bbox.width.toFixed(0), 'x', bbox.height.toFixed(0), 'mm');
  console.log('Tile:', actualWidth, 'x', actualHeight, 'mm');
  console.log('Grout:', (effectiveWidth - actualWidth).toFixed(0), 'mm');
  console.log('Cutting: kerf=' + kerf + 'mm, tol=' + tolerance + 'mm, safety=' + cutSafety + 'mm');
  console.log('Min scrap:', minScrapSize, 'mm | Scrap reuse:', useScrap ? 'ON' : 'OFF');
  
  const ROTATION_ANGLE = 45;
  const CENTER_THRESHOLD = 0.70;
  const MIN_INTERSECTION = 0.03;
  
  const latticeCenters = generateDiagonalLatticeCenters(
    bbox, actualWidth, actualHeight, effectiveWidth - actualWidth, ROTATION_ANGLE
  );
  
  interface PieceGeometry {
    id: string;
    centerX: number;
    centerY: number;
    tilePolygon: Point[];
    intersectionPolygons: Point[][];
    intersectionRatio: number;
    groupType: 'center' | 'edge';
    totalIntersectionArea: number;
  }
  
  const pieceGeometries: PieceGeometry[] = [];
  
  for (const center of latticeCenters) {
    const tilePolygon = createRotatedRectanglePolygon(
      center.x, center.y, actualWidth, actualHeight, ROTATION_ANGLE
    );
    
    const intersectionPolys = intersectPolygons(tilePolygon, room.points);
    if (intersectionPolys.length === 0) continue;
    
    const totalArea = intersectionPolys.reduce(
      (sum, poly) => sum + calculatePolygonArea(poly), 0
    );
    
    const ratio = totalArea / tileArea;
    if (ratio < MIN_INTERSECTION) continue;
    
    pieceGeometries.push({
      id: `tile-${pieceGeometries.length + 1}`,
      centerX: center.x,
      centerY: center.y,
      tilePolygon,
      intersectionPolygons: intersectionPolys,
      intersectionRatio: ratio,
      groupType: ratio >= CENTER_THRESHOLD ? 'center' : 'edge',
      totalIntersectionArea: totalArea,
    });
  }
  
  const centerPieces = pieceGeometries.filter(p => p.groupType === 'center');
  const edgePieces = pieceGeometries.filter(p => p.groupType === 'edge');
  
  console.log('Placed pieces:', pieceGeometries.length, '(Center:', centerPieces.length, '| Edge:', edgePieces.length + ')');
  
  const cutList: CutInstruction[] = [];
  const scrapInventory: ScrapPoly[] = [];
  let purchasedA = 0;
  let purchasedB = 0;
  let scrapUsedCount = 0;
  
  // Process center pieces
  for (const piece of centerPieces) {
    purchasedA++;
    const usedPieceWorld = piece.intersectionPolygons[0] || piece.tilePolygon;
    const usedPieceLocal = usedPieceWorld.map(p =>
      worldToLocal(p, piece.centerX, piece.centerY, ROTATION_ANGLE)
    );
    const bboxLocal = calculateBoundingBox(usedPieceLocal);
    
    cutList.push({
      tileIndex: cutList.length + 1,
      tileId: piece.id,
      model: 'A',
      rotationDeg: ROTATION_ANGLE,
      tileCenterWorld: { x: piece.centerX, y: piece.centerY },
      usedPiece: {
        areaMm2: piece.totalIntersectionArea,
        verticesWorld: usedPieceWorld,
        verticesLocal: usedPieceLocal,
        bboxLocal,
      },
      cutLinesLocal: [],
      scrapsProduced: [],
      nominalVsCut: {
        nominalBboxLocal: { w: bboxLocal.width, h: bboxLocal.height },
        recommendedCutBboxLocal: {
          w: Math.max(0, bboxLocal.width - cutSafety),
          h: Math.max(0, bboxLocal.height - cutSafety),
        },
        cutSafetyMm: cutSafety,
      },
    });
  }
  
  // Process edge pieces
  for (const piece of edgePieces) {
    const usedPieceWorld = piece.intersectionPolygons[0] || [];
    if (usedPieceWorld.length === 0) continue;
    
    const usedPieceLocal = usedPieceWorld.map(p =>
      worldToLocal(p, piece.centerX, piece.centerY, ROTATION_ANGLE)
    );
    const neededBboxLocal = calculateBoundingBox(usedPieceLocal);
    
    let allocatedFromScrap = false;
    let scrapSource: ScrapPoly | null = null;
    
    if (useScrap) {
      const usableScraps = scrapInventory
        .filter(s => !s.used && isScrapUsable(s, neededBboxLocal, cutSafety))
        .sort((a, b) => a.areaMm2 - b.areaMm2);
      
      if (usableScraps.length > 0) {
        scrapSource = usableScraps[0];
        scrapSource.used = true;
        allocatedFromScrap = true;
        scrapUsedCount++;
      }
    }
    
    if (!allocatedFromScrap) {
      purchasedB++;
      
      const fullTilePolygonLocal = createRotatedRectanglePolygon(0, 0, actualWidth, actualHeight, 0);
      const scrapPolygonsLocal = differencePolygons(fullTilePolygonLocal, usedPieceLocal);
      
      const scrapsProduced: CutInstruction['scrapsProduced'] = [];
      
      if (useScrap) {
        for (const scrapPoly of scrapPolygonsLocal) {
          const scrapArea = calculatePolygonArea(scrapPoly);
          const scrapBbox = calculateBoundingBox(scrapPoly);
          
          if (scrapBbox.width >= minScrapSize && scrapBbox.height >= minScrapSize) {
            const scrapId = `scrap-B-${scrapInventory.length + 1}`;
            scrapInventory.push({
              id: scrapId,
              polygonWorld: scrapPoly,  // ✅ SINGULAR
              polygonLocal: scrapPoly,  // ✅ SINGULAR
              areaMm2: scrapArea,
              bboxLocal: scrapBbox,
              used: false,
            });
            scrapsProduced.push({ scrapId, areaMm2: scrapArea, verticesLocal: scrapPoly, bboxLocal: scrapBbox });
          }
        }
      }
      
      const cutLines = identifyCutLines(usedPieceLocal, actualWidth, actualHeight);
      
      cutList.push({
        tileIndex: cutList.length + 1,
        tileId: piece.id,
        model: 'B',
        rotationDeg: ROTATION_ANGLE,
        tileCenterWorld: { x: piece.centerX, y: piece.centerY },
        usedPiece: { areaMm2: piece.totalIntersectionArea, verticesWorld: usedPieceWorld, verticesLocal: usedPieceLocal, bboxLocal: neededBboxLocal },
        cutLinesLocal: cutLines,
        scrapsProduced,
        nominalVsCut: {
          nominalBboxLocal: { w: neededBboxLocal.width, h: neededBboxLocal.height },
          recommendedCutBboxLocal: { w: Math.max(0, neededBboxLocal.width - cutSafety), h: Math.max(0, neededBboxLocal.height - cutSafety) },
          cutSafetyMm: cutSafety,
        },
      });
    } else {
      const cutLines = identifyCutLines(usedPieceLocal, actualWidth, actualHeight);
      cutList.push({
        tileIndex: cutList.length + 1,
        tileId: piece.id,
        model: 'B',
        rotationDeg: ROTATION_ANGLE,
        tileCenterWorld: { x: piece.centerX, y: piece.centerY },
        usedPiece: { areaMm2: piece.totalIntersectionArea, verticesWorld: usedPieceWorld, verticesLocal: usedPieceLocal, bboxLocal: neededBboxLocal },
        cutLinesLocal: cutLines,
        scrapsProduced: [],
        fromScrap: { scrapId: scrapSource!.id, consumedAreaMm2: piece.totalIntersectionArea, remainingScraps: [] },
        nominalVsCut: {
          nominalBboxLocal: { w: neededBboxLocal.width, h: neededBboxLocal.height },
          recommendedCutBboxLocal: { w: Math.max(0, neededBboxLocal.width - cutSafety), h: Math.max(0, neededBboxLocal.height - cutSafety) },
          cutSafetyMm: cutSafety,
        },
      });
    }
  }
  
  const purchasedTotal = purchasedA + purchasedB;
  const wastePercentage = Math.max(0, calculateWastePercentage(roomArea, purchasedTotal, tileArea));
  
  console.log('Purchased: A=' + purchasedA + ' + B=' + purchasedB + ' = ' + purchasedTotal);
  console.log('Scrap reused:', scrapUsedCount, '| Scraps produced:', scrapInventory.length);
  console.log('vs Axis grid:', axisGridBenchmark, '| vs Theoretical:', theoreticalMin);
  console.log('Waste:', wastePercentage.toFixed(1) + '%');
  console.log('Cut list entries:', cutList.length);
  
  // ✅ Print detailed cut list for installer
  printDetailedCutList(cutList);
  
  const materialGroups = [
    { id: 'center', label: 'Model A (Center)', tileCount: purchasedA, suggestedUse: 'Premium' },
    { id: 'edge', label: 'Model B (Edge)', tileCount: purchasedB, suggestedUse: 'Border effect' },
  ];
  
  const placedTiles: PlacedTile[] = pieceGeometries.map(p => ({
    id: p.id,
    x: p.centerX,
    y: p.centerY,
    width: actualWidth,
    height: actualHeight,
    rotation: ROTATION_ANGLE,
    isFullTile: p.groupType === 'center',
    isFromScrap: false,
    sourceType: p.groupType === 'center' ? 'full' : 'cut',
  }));
  
  return {
    tiles: placedTiles,
    fullTileCount: purchasedA,
    cutTileCount: purchasedB,
    scrapUsedCount,
    totalTilesNeeded: purchasedTotal,
    wastePercentage,
    scraps: [],
    materialGroups,
    cutList,
    finalScrapInventory: scrapInventory,
  };
}

/**
 * İki poligonun farkını hesapla (poly1 - poly2)
 */
function differencePolygons(poly1: Point[], poly2: Point[]): Point[][] {
  try {
    const p1 = [poly1.map(p => [p.x, p.y])];
    const p2 = [poly2.map(p => [p.x, p.y])];
    
    const result = polygonClipping.difference(p1 as any, p2 as any);
    
    return result.map(multiPoly => 
      multiPoly[0].map(coord => ({ x: coord[0], y: coord[1] }))
    );
  } catch (error) {
    console.warn('Polygon difference failed:', error);
    return [];
  }
}

/**
 * Kesim çizgilerini belirle (kullanılan parçanın kenarları - seramik kenarları)
 */
function identifyCutLines(
  usedPieceLocal: Point[],
  tileWidth: number,
  tileHeight: number
): Array<{ from: Point; to: Point; lengthMm: number }> {
  const cutLines: Array<{ from: Point; to: Point; lengthMm: number }> = [];
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;
  const tolerance = 0.1; // mm
  
  // Seramik kenar koordinatları (yerel)
  const tileEdges = {
    left: -halfW,
    right: halfW,
    bottom: -halfH,
    top: halfH,
  };
  
  for (let i = 0; i < usedPieceLocal.length; i++) {
    const p1 = usedPieceLocal[i];
    const p2 = usedPieceLocal[(i + 1) % usedPieceLocal.length];
    
    // Bu kenar seramik sınırında mı??
    const isOnTileEdge = 
      (Math.abs(p1.x - tileEdges.left) < tolerance && Math.abs(p2.x - tileEdges.left) < tolerance) ||
      (Math.abs(p1.x - tileEdges.right) < tolerance && Math.abs(p2.x - tileEdges.right) < tolerance) ||
      (Math.abs(p1.y - tileEdges.bottom) < tolerance && Math.abs(p2.y - tileEdges.bottom) < tolerance) ||
      (Math.abs(p1.y - tileEdges.top) < tolerance && Math.abs(p2.y - tileEdges.top) < tolerance);
    
    if (!isOnTileEdge) {
      // Bu bir kesim çizgisi..
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > tolerance) {
        cutLines.push({
          from: { x: p1.x, y: p1.y },
          to: { x: p2.x, y: p2.y },
          lengthMm: length,
        });
      }
    }
  }
  
  return cutLines;
}

/**
 * Artık poligonun kullanılabilir olup olmadığını kontrol et..
 */
function isScrapUsable(
  scrap: ScrapPoly,
  neededBboxLocal: { width: number; height: number },
  cutSafetyMm: number
): boolean {
  if (!scrap.bboxLocal) return false;
  
  // Bbox kontrolü (güvenlik payı ile)
  return (
    scrap.bboxLocal.width >= neededBboxLocal.width + cutSafetyMm &&
    scrap.bboxLocal.height >= neededBboxLocal.height + cutSafetyMm
  );
}

/**
 * Detaylı kesim listesini yazdır (montajcı için)
 */
function printDetailedCutList(cutList: CutInstruction[]): void {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          📋 DETAYLI KESİM LİSTESİ (MONTAJCI İÇİN)         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('ÖNEMLİ: Önce tüm kesimleri yapın, sonra döşemeye başlayın!');
  console.log('─────────────────────────────────────────────────────────────');
  
  // Group by model
  const modelA = cutList.filter(c => c.model === 'A');
  const modelB = cutList.filter(c => c.model === 'B');
  
  // Print Model A pieces
  if (modelA.length > 0) {
    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│  MODEL A - MERKEZ PARÇALAR (Minimal/Hiç Kesim Yok)     │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('Toplam:', modelA.length, 'adet seramik');
    console.log('Bu parçalar tam veya neredeyse tam boyutlarında kullanılacak.');
    console.log('');
    
    modelA.forEach((cut, idx) => {
      console.log('═════════════════════════════════════════════════════════════');
      console.log(`PARÇA #${cut.tileIndex} (Model A-${idx + 1})`);
      console.log('─────────────────────────────────────────────────────────────');
      console.log('  ID:', cut.tileId);
      console.log('  Rotasyon:', cut.rotationDeg + '°');
      console.log('  Alan:', (cut.usedPiece.areaMm2 / 1000000).toFixed(4), 'm²');
      console.log('');
      console.log('  📏 NOMİNAL BOYUTLAR (Geometrik):');
      console.log('     Genişlik:', cut.nominalVsCut.nominalBboxLocal.w.toFixed(1), 'mm');
      console.log('     Yükseklik:', cut.nominalVsCut.nominalBboxLocal.h.toFixed(1), 'mm');
      console.log('');
      console.log('  ✂️  ÖNERİLEN KESİM BOYUTLARI (Kerf+Tolerans dahil):');
      console.log('     Genişlik:', cut.nominalVsCut.recommendedCutBboxLocal.w.toFixed(1), 'mm');
      console.log('     Yükseklik:', cut.nominalVsCut.recommendedCutBboxLocal.h.toFixed(1), 'mm');
      console.log('     (Güvenlik payı:', cut.nominalVsCut.cutSafetyMm.toFixed(1), 'mm düşüldü)');
      console.log('');
      console.log('  📍 YEREL KOORDİNATLAR (Merkez = 0,0):');
      cut.usedPiece.verticesLocal.forEach((v, i) => {
        console.log(`     Köşe ${i + 1}: (${v.x.toFixed(1)}, ${v.y.toFixed(1)}) mm`);
      });
      console.log('');
      if (cut.cutLinesLocal.length === 0) {
        console.log('  ✅ KESİM GEREKMİYOR - Tam seramik kullanın');
      } else {
        console.log('  ⚠️  KESİM ÇIZGILERI:', cut.cutLinesLocal.length, 'adet');
        cut.cutLinesLocal.forEach((line, i) => {
          console.log(`     Çizgi ${i + 1}: (${line.from.x.toFixed(1)}, ${line.from.y.toFixed(1)}) → (${line.to.x.toFixed(1)}, ${line.to.y.toFixed(1)})`);
          console.log(`              Uzunluk: ${line.lengthMm.toFixed(1)} mm`);
        });
      }
      console.log('');
    });
  }
  
  // Print Model B pieces
  if (modelB.length > 0) {
    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│  MODEL B - KENAR PARÇALAR (Kesim Gerekli)              │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('Toplam:', modelB.length, 'adet parça');
    console.log('Bu parçalar kesilecek ve artık üretecek.');
    console.log('');
    
    modelB.forEach((cut, idx) => {
      console.log('═════════════════════════════════════════════════════════════');
      console.log(`PARÇA #${cut.tileIndex} (Model B-${idx + 1})`);
      console.log('─────────────────────────────────────────────────────────────');
      console.log('  ID:', cut.tileId);
      console.log('  Rotasyon:', cut.rotationDeg + '°');
      console.log('  Alan:', (cut.usedPiece.areaMm2 / 1000000).toFixed(4), 'm²');
      console.log('');
      
      // Check if from scrap
      if (cut.fromScrap) {
        console.log('  ♻️  ARTIKTAN KULLANILACAK:');
        console.log('     Artık ID:', cut.fromScrap.scrapId);
        console.log('     Tüketilen alan:', cut.fromScrap.consumedAreaMm2 / 1000000, 'm²');
        console.log('');
      } else {
        console.log('  🆕 YENİ SERAMİKTEN KESİLECEK');
        console.log('');
      }
      
      console.log('  📏 NOMİNAL BOYUTLAR (Geometrik):');
      console.log('     Genişlik:', cut.nominalVsCut.nominalBboxLocal.w.toFixed(1), 'mm');
      console.log('     Yükseklik:', cut.nominalVsCut.nominalBboxLocal.h.toFixed(1), 'mm');
      console.log('');
      console.log('  ✂️  ÖNERİLEN KESİM BOYUTLARI (Kerf+Tolerans dahil):');
      console.log('     Genişlik:', cut.nominalVsCut.recommendedCutBboxLocal.w.toFixed(1), 'mm');
      console.log('     Yükseklik:', cut.nominalVsCut.recommendedCutBboxLocal.h.toFixed(1), 'mm');
      console.log('     (Güvenlik payı:', cut.nominalVsCut.cutSafetyMm.toFixed(1), 'mm düşüldü)');
      console.log('');
      console.log('  📍 KULLANILACAK PARÇA KOORDİNATLARI (Yerel, Merkez = 0,0):');
      cut.usedPiece.verticesLocal.forEach((v, i) => {
        console.log(`     Köşe ${i + 1}: (${v.x.toFixed(1)}, ${v.y.toFixed(1)}) mm`);
      });
      console.log('');
      console.log('  🔪 KESİM ÇIZGILERI:', cut.cutLinesLocal.length, 'adet');
      if (cut.cutLinesLocal.length > 0) {
        cut.cutLinesLocal.forEach((line, i) => {
          console.log(`     Çizgi ${i + 1}: (${line.from.x.toFixed(1)}, ${line.from.y.toFixed(1)}) → (${line.to.x.toFixed(1)}, ${line.to.y.toFixed(1)})`);
          console.log(`              Uzunluk: ${line.lengthMm.toFixed(1)} mm`);
        });
      } else {
        console.log('     (Karmaşık kesim - yukarıdaki köşe koordinatlarını kullanın)');
      }
      console.log('');
      
      // Show scraps produced
      if (cut.scrapsProduced.length > 0) {
        console.log('  📦 OLUŞACAK ARTIKLAR:', cut.scrapsProduced.length, 'adet');
        cut.scrapsProduced.forEach((scrap, i) => {
          console.log(`     Artık ${i + 1}: ${scrap.scrapId}`);
          console.log(`       Alan: ${(scrap.areaMm2 / 1000000).toFixed(4)} m²`);
          console.log(`       Bbox: ${scrap.bboxLocal.width.toFixed(1)} × ${scrap.bboxLocal.height.toFixed(1)} mm`);
          console.log(`       Köşeler:`);
          scrap.verticesLocal.forEach((v) => {
            console.log(`         (${v.x.toFixed(1)}, ${v.y.toFixed(1)})`);
          });
        });
      } else {
        console.log('  ⚠️  Artık çok küçük veya kullanılamaz (atılacak)');
      }
      console.log('');
    });
  }
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    ÖZET                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Toplam parça sayısı:', cutList.length);
  console.log('  - Model A (Merkez, minimal kesim):', modelA.length);
  console.log('  - Model B (Kenar, kesim gerekli):', modelB.length);
  console.log('');
  console.log('Kesim yapılacak parça:', modelB.length);
  console.log('Artık kullanılacak parça:', cutList.filter(c => c.fromScrap).length);
  console.log('Yeni seramikten kesilecek:', modelB.filter(c => !c.fromScrap).length);
  console.log('');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('✅ MONTAJ SIRASI:');
  console.log('   1. Yukarıdaki ölçülere göre TÜM parçaları kesin');
  console.log('   2. Her parçayı ID numarasıyla etiketleyin');
  console.log('   3. Parçaları sırayla döşemeye başlayın');
  console.log('   4. Her parçayı belirtilen rotasyonda (45°) yerleştirin');
  console.log('═════════════════════════════════════════════════════════════');
  console.log('');
}
