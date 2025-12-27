/**
 * Desteklenen ölçü birimleri
 */
export type Unit = 'mm' | 'cm' | 'm' | 'in' | 'ft';

/**
 * Uzunluk girişi - değer ve birim içerir
 */
export type LengthInput = {
  value: number;
  unit: Unit;
};

/**
 * Kenar komutu - adım adım duvar çizimi için
 * turnDeg: Göreceli dönüş açısı (+ sağa, - sola)
 * length: Kenar uzunluğu
 */
export type EdgeCommand = {
  turnDeg: number;
  length: LengthInput;
};

/**
 * 2D nokta koordinatları (mm cinsinden)
 */
export type Point = {
  x: number;
  y: number;
};

/**
 * Oda şekli - kenarlar ve hesaplanmış noktalar
 */
export type RoomShape = {
  edges: EdgeCommand[];
  points: Point[];
  isClosed: boolean;
  area?: number; // mm² cinsinden
};

/**
 * Malzeme (seramik/parke/laminat) ölçüleri
 */
export type TileDimensions = {
  width: LengthInput;
  height: LengthInput;
  grout: LengthInput; // derz payı
};

/**
 * Döşeme pattern türleri
 */
export type PatternType =
  | 'free'
  | 'grid'
  | 'half-offset'
  | 'diagonal-grid'
  | 'diagonal-offset';

/**
 * Kesim ayarları - testere, tolerans, artık yönetimi
 */
export type CuttingSettings = {
  kerfMm?: number;        // Testere ağzı kalınlığı (default 1.5mm)
  toleranceMm?: number;   // Ölçüm/işleme toleransı (default 1.0mm)
  minUsableScrapMm?: number; // Minimum kullanılabilir artık boyutu (default 80mm)
};

/**
 * Hesaplama ayarları
 */
export type CalculationSettings = {
  useScrap: boolean;
  pattern: PatternType;
  cutting?: CuttingSettings; // İsteğe bağlı kesim ayarları
};

/**
 * Yerleştirilmiş bir parça
 */
export type PlacedTile = {
  id: string;
  x: number; // mm
  y: number; // mm
  width: number; // mm
  height: number; // mm
  rotation: number; // derece
  isFullTile: boolean; // tam parça mı, kesilmiş mi
  isFromScrap: boolean; // scrap'ten mi kullanıldı
  sourceType: 'full' | 'cut' | 'scrap';
};

/**
 * Artık parça (scrap)
 */
export type ScrapPiece = {
  id: string;
  width: number; // mm
  height: number; // mm
  area: number; // mm²
  used: boolean;
};

/**
 * Poligon tabanlı artık parça (scrap)
 */
export type ScrapPoly = {
  id: string;
  polygonsWorld: Point[];   // Dünya koordinatlarında poligon köşeleri
  polygonsLocal?: Point[];  // Yerel koordinatlarda (opsiyonel)
  areaMm2: number;
  bboxLocal?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  used: boolean;
};

/**
 * Malzeme grubu - farklı kullanım alanları için
 */
export type MaterialGroup = {
  id: string;
  label: string;
  tileCount: number;
  suggestedUse: string;
};

/**
 * Döşeme layout sonucu
 */
export type TileLayout = {
  tiles: PlacedTile[];
  fullTileCount: number;
  cutTileCount: number;
  scrapUsedCount: number;
  totalTilesNeeded: number;
  wastePercentage: number;
  scraps: ScrapPiece[];
  materialGroups?: MaterialGroup[];
  cutList?: CutInstruction[]; // Detaylı kesim talimatları
  finalScrapInventory?: ScrapPoly[]; // Son artık envanteri
};

/**
 * Kesim talimatı - montajcı için detaylı kesim bilgisi
 */
export type CutInstruction = {
  tileIndex: number;           // Montaj sırası 1..N
  tileId: string;
  model: 'A' | 'B';            // Merkez (A) vs Kenar (B) model
  rotationDeg: number;         // Rotasyon açısı (45° diagonal için)
  tileCenterWorld: Point;      // Dünya koordinatlarında merkez

  // Kullanılan parça bilgisi
  usedPiece: {
    areaMm2: number;
    verticesWorld: Point[];    // Dünya koordinatlarında köşeler
    verticesLocal: Point[];    // Yerel koordinatlarda köşeler (ölçüm için)
    bboxLocal: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      width: number;
      height: number;
    };
  };

  // Kesim çizgileri (yerel koordinatlarda)
  cutLinesLocal: Array<{
    from: Point;
    to: Point;
    lengthMm: number;
  }>;

  // Bu seramikten oluşan artıklar
  scrapsProduced: Array<{
    scrapId: string;
    areaMm2: number;
    verticesLocal: Point[];
    bboxLocal: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      width: number;
      height: number;
    };
  }>;

  // Artıktan kullanıldıysa
  fromScrap?: {
    scrapId: string;
    consumedAreaMm2: number;
    remainingScraps: Array<{
      areaMm2: number;
      verticesLocal: Point[];
      bboxLocal: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
        width: number;
        height: number;
      };
    }>;
  };

  // İmalat ayarları
  nominalVsCut: {
    nominalBboxLocal: { w: number; h: number };     // Geometrik ölçüler
    recommendedCutBboxLocal: { w: number; h: number }; // Kerf+tolerans sonrası
    cutSafetyMm: number; // kerf + tolerance toplamı
  };
};

/**
 * Hesaplama sonucu
 */
export type CalculationResult = {
  layout: TileLayout;
  roomArea: number; // mm²
  tileArea: number; // mm² (tek parça)
  totalCoveredArea: number; // mm²
};
