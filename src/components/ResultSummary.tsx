import React from 'react';
import type { CalculationResult } from '../core/types';

interface ResultSummaryProps {
  result: CalculationResult;
}

export function ResultSummary({ result }: ResultSummaryProps) {
  const { layout, roomArea, tileArea } = result;
  
  return (
    <div className="result-summary">
      <h2>📊 Hesaplama Sonuçları</h2>
      
      {/* Genel Bilgiler */}
      <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <strong>Oda Alanı:</strong>
            <div style={{ fontSize: '18px', color: '#2196F3' }}>{(roomArea / 1000000).toFixed(2)} m²</div>
          </div>
          <div>
            <strong>Toplam Seramik:</strong>
            <div style={{ fontSize: '18px', color: '#4CAF50' }}>{layout.totalTilesNeeded} adet</div>
          </div>
          <div>
            <strong>Fire Oranı:</strong>
            <div style={{ fontSize: '18px', color: '#FF9800' }}>{layout.wastePercentage.toFixed(1)}%</div>
          </div>
          {layout.scrapUsedCount > 0 && (
            <div>
              <strong>♻️ Artık Kullanımı:</strong>
              <div style={{ fontSize: '18px', color: '#8BC34A' }}>{layout.scrapUsedCount} parça</div>
            </div>
          )}
        </div>
      </div>

      {/* Detaylı Dağılım */}
      <div style={{ padding: '15px', background: 'white', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>📦 Malzeme Dağılımı</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <div>
            <strong>Tam Seramik:</strong>
            <div>{layout.fullTileCount} adet</div>
          </div>
          <div>
            <strong>Kesilecek:</strong>
            <div>{layout.cutTileCount} adet</div>
          </div>
          <div>
            <strong>Seramik Alanı:</strong>
            <div>{(tileArea / 1000000).toFixed(4)} m²</div>
          </div>
        </div>
      </div>

      {/* ✅ Kesim Listesi - SADECE DIAGONAL PATTERN'DE */}
      {layout.cutList && layout.cutList.length > 0 ? (
        <div className="cut-list-section">
          <h3>✂️ Kesim Listesi ({layout.cutList.length} Parça)</h3>
          <p className="cut-list-description">
            Her bir kesilecek seramik için detaylı kesim talimatları ve görselleri
          </p>
          
          <div className="cut-items">
            {layout.cutList.map((cut) => (
              <CutItem key={cut.tileId} cut={cut} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
          <p style={{ margin: 0 }}>
            ℹ️ Kesim listesi sadece <strong>Çapraz Grid (Diagonal)</strong> pattern'de görüntülenir.
            Detaylı kesim talimatları için lütfen Çapraz Grid seçeneğini kullanın.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * ✅ Tek Kesim Parçası Komponenti
 */
interface CutItemProps {
  cut: any;
}

function CutItem({ cut }: CutItemProps) {
  return (
    <div className="cut-item">
      <div className="cut-item-header">
        <h4>
          <span className="cut-number">#{cut.tileIndex}</span>
          {cut.model === 'A' ? ' Merkez Parça' : ' Kenar Parça'}
          {cut.fromScrap && ' ♻️ (Artıktan)'}
        </h4>
        <span className="cut-id">{cut.tileId}</span>
      </div>
      
      {/* ✅ KESİM GÖRSELİ - HER PARÇA İÇİN */}
      <div style={{ 
        width: '100%', 
        background: '#fafafa',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '15px',
        border: '2px solid #e0e0e0'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#F44336', fontSize: '16px' }}>
          🖼️ Kesim Görseli
        </h4>
        <CutVisualization cut={cut} />
      </div>
      
      {/* Ölçüler ve Detaylar */}
      <div className="cut-details">
        <div className="cut-measurements">
          <div className="measurement">
            <strong>📏 Nominal Boyut:</strong>
            <span>
              {cut.nominalVsCut.nominalBboxLocal.w.toFixed(0)} × {cut.nominalVsCut.nominalBboxLocal.h.toFixed(0)} mm
            </span>
          </div>
          <div className="measurement">
            <strong>✂️ Kesim Boyutu:</strong>
            <div>
              <span>
                {cut.nominalVsCut.recommendedCutBboxLocal.w.toFixed(0)} × {cut.nominalVsCut.recommendedCutBboxLocal.h.toFixed(0)} mm
              </span>
              <small>(Güvenlik payı: {cut.nominalVsCut.cutSafetyMm.toFixed(1)}mm)</small>
            </div>
          </div>
          <div className="measurement">
            <strong>🔄 Rotasyon:</strong>
            <span>{cut.rotationDeg}°</span>
          </div>
        </div>
        
        {cut.cutLinesLocal && cut.cutLinesLocal.length > 0 && (
          <div className="cut-lines">
            <strong>🔪 Kesim Çizgileri:</strong>
            <ul>
              {cut.cutLinesLocal.map((line: any, i: number) => (
                <li key={i}>
                  Çizgi {i + 1}: {line.lengthMm.toFixed(0)} mm
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {cut.scrapsProduced && cut.scrapsProduced.length > 0 && (
          <div className="scraps-produced">
            <strong>📦 Oluşacak Artıklar:</strong>
            <ul>
              {cut.scrapsProduced.map((scrap: any, i: number) => (
                <li key={i}>
                  {scrap.scrapId}: {scrap.bboxLocal.width.toFixed(0)} × {scrap.bboxLocal.height.toFixed(0)} mm
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ✅ KESİM GÖRSELLEŞTİRMESİ - Geliştirilmiş Versiyon
 */
interface CutVisualizationProps {
  cut: any;
}

function CutVisualization({ cut }: CutVisualizationProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawn, setIsDrawn] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  
  const drawCanvas = (canvas: HTMLCanvasElement, size: number = 400) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const W = size;
    const H = size;
    canvas.width = W;
    canvas.height = H;
    
    // Arka plan
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    
    const bbox = cut.usedPiece?.bboxLocal;
    const vertices = cut.usedPiece?.verticesLocal;
    
    if (!bbox || !vertices || vertices.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Parça #${cut.tileIndex}`, W/2, H/2 - 20);
      ctx.fillText('(Veri yükleniyor...)', W/2, H/2 + 20);
      return;
    }
    
    // ✅ TAM SERAMİK BOYUTU - Pattern'e göre
    // Grid/Half-offset: 600×600 (veya kullanıcının seçtiği)
    // Diagonal: 600×600 (45° döndürülmüş)
    const fullTileWidth = 600; // mm
    const fullTileHeight = 600; // mm
    
    // ✅ PATTERN TESPİTİ: Eğer rotasyon 45° ise diagonal, değilse grid/half-offset
    const isDiagonal = cut.rotationDeg === 45;
    
    // Ölçekleme
    const maxDim = Math.max(fullTileWidth, fullTileHeight);
    const padding = size * 0.12;
    const scale = (Math.min(W, H) - padding * 2) / maxDim;
    
    const cx = W / 2;
    const cy = H / 2;
    
    const toX = (x: number) => cx + x * scale;
    const toY = (y: number) => cy - y * scale;
    
    // 1. TAM SERAMİK ARKA PLAN
    ctx.save();
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = '#999';
    ctx.lineWidth = Math.max(2, size / 200);
    
    const tileW = fullTileWidth * scale;
    const tileH = fullTileHeight * scale;
    
    // ✅ Grid/Half-offset için dikdörtgen çiz
    if (!isDiagonal) {
      ctx.fillRect(cx - tileW/2, cy - tileH/2, tileW, tileH);
      ctx.strokeRect(cx - tileW/2, cy - tileH/2, tileW, tileH);
    } else {
      // Diagonal için 45° döndürülmüş kare
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-tileW/2, -tileH/2, tileW, tileH);
      ctx.strokeRect(-tileW/2, -tileH/2, tileW, tileH);
      ctx.rotate(-Math.PI / 4);
      ctx.translate(-cx, -cy);
    }
    ctx.restore();
    
    // 2. KULLANILACAK PARÇA (Mavi - vertices'e göre)
    ctx.save();
    ctx.fillStyle = 'rgba(33, 150, 243, 0.5)';
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = Math.max(2, size / 133);
    
    ctx.beginPath();
    ctx.moveTo(toX(vertices[0].x), toY(vertices[0].y));
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(toX(vertices[i].x), toY(vertices[i].y));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    
    // 3. KÖŞE NOKTALARI ve ÖLÇÜLER (Her kenar için)
    ctx.save();
    ctx.fillStyle = '#1976D2';
    
    // Her kenarın ölçüsünü hesapla ve yaz
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      
      // Köşe noktası çiz
      ctx.beginPath();
      ctx.arc(toX(v1.x), toY(v1.y), Math.max(4, size / 80), 0, Math.PI * 2);
      ctx.fill();
      
      // Kenar uzunluğunu hesapla (mm cinsinden)
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const edgeLength = Math.sqrt(dx * dx + dy * dy);
      
      // Kenar ortası
      const midX = toX((v1.x + v2.x) / 2);
      const midY = toY((v1.y + v2.y) / 2);
      
      // Kenar açısı
      const angle = Math.atan2(-(v2.y - v1.y), v2.x - v1.x);
      
      // Ölçü metnini yaz
      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(angle);
      
      // Metin arka planı
      const text = `${edgeLength.toFixed(1)} mm`;
      ctx.font = `bold ${Math.max(10, size / 35)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const metrics = ctx.measureText(text);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(-metrics.width/2 - 4, -10, metrics.width + 8, 20);
      
      ctx.fillStyle = '#1976D2';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
    
    // 4. KESİM ÇİZGİLERİ (Kırmızı kesikli)
    if (cut.cutLinesLocal && cut.cutLinesLocal.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#F44336';
      ctx.lineWidth = Math.max(2, size / 180);
      ctx.setLineDash([size / 50, size / 100]);
      
      cut.cutLinesLocal.forEach((line: any) => {
        ctx.beginPath();
        ctx.moveTo(toX(line.from.x), toY(line.from.y));
        ctx.lineTo(toX(line.to.x), toY(line.to.y));
        ctx.stroke();
        
        // Kesim çizgisi uzunluğu
        const midX = toX((line.from.x + line.to.x) / 2);
        const midY = toY((line.from.y + line.to.y) / 2);
        
        ctx.save();
        ctx.fillStyle = '#F44336';
        ctx.font = `bold ${Math.max(9, size / 40)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`✂️ ${line.lengthMm.toFixed(1)}mm`, midX, midY - 10);
        ctx.restore();
      });
      
      ctx.setLineDash([]);
      ctx.restore();
    }
    
    // 5. TAM SERAMİK ÖLÇÜ OKLARI (Dış tarafta)
    ctx.save();
    ctx.fillStyle = '#666';
    ctx.font = `bold ${Math.max(12, size / 30)}px Arial`;
    ctx.textAlign = 'center';
    
    // Genişlik oku (alt)
    const arrowY = cy + tileH/2 + size / 12;
    ctx.fillText(`← ${fullTileWidth} mm →`, cx, arrowY);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - tileW/2, arrowY - 15);
    ctx.lineTo(cx + tileW/2, arrowY - 15);
    ctx.stroke();
    
    // Yükseklik oku (sağ)
    ctx.save();
    ctx.translate(cx + tileW/2 + size / 12, cy);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`← ${fullTileHeight} mm →`, 0, 0);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-tileH/2, -15);
    ctx.lineTo(tileH/2, -15);
    ctx.stroke();
    ctx.restore();
    
    ctx.restore();
    
    // 6. BAŞLIK
    ctx.save();
    ctx.fillStyle = '#F44336';
    ctx.font = `bold ${Math.max(16, size / 22)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`Parça #${cut.tileIndex} - ${cut.model === 'A' ? 'Merkez' : 'Kenar'}`, cx, size / 16);
    ctx.restore();
    
    // 7. LEGEND
    ctx.save();
    ctx.font = `${Math.max(10, size / 36)}px Arial`;
    ctx.textAlign = 'left';
    
    const legendX = size / 50;
    const legendY = size / 7;
    const legendSpacing = size / 22;
    const legendSize = Math.max(12, size / 30);
    
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(legendX, legendY, legendSize, legendSize);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, legendSize, legendSize);
    ctx.fillStyle = '#333';
    ctx.fillText('Tam Seramik', legendX + legendSize + 5, legendY + legendSize - 2);
    
    ctx.fillStyle = 'rgba(33, 150, 243, 0.5)';
    ctx.fillRect(legendX, legendY + legendSpacing, legendSize, legendSize);
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.strokeRect(legendX, legendY + legendSpacing, legendSize, legendSize);
    ctx.fillStyle = '#333';
    ctx.fillText('Kullanılacak', legendX + legendSize + 5, legendY + legendSpacing + legendSize - 2);
    
    if (cut.cutLinesLocal && cut.cutLinesLocal.length > 0) {
      ctx.strokeStyle = '#F44336';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(legendX, legendY + legendSpacing * 2 + legendSize/2);
      ctx.lineTo(legendX + legendSize, legendY + legendSpacing * 2 + legendSize/2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#333';
      ctx.fillText('Kesim', legendX + legendSize + 5, legendY + legendSpacing * 2 + legendSize - 2);
    }
    
    ctx.restore();
  };
  
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      drawCanvas(canvas, 400);
      setIsDrawn(true);
      console.log('✅ Canvas tamamlandı:', cut.tileId);
    } catch (error) {
      console.error('❌ Canvas çizim hatası:', error);
      setIsDrawn(false);
    }
  }, [cut]);
  
  return (
    <>
      <div style={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '8px' 
      }}>
        <canvas 
          ref={canvasRef}
          onClick={() => setIsModalOpen(true)}
          style={{ 
            border: '2px solid #2196F3',
            borderRadius: '8px',
            backgroundColor: 'white',
            maxWidth: '100%',
            height: 'auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          }}
        />
        {isDrawn ? (
          <div style={{ color: '#4CAF50', fontSize: '12px', fontWeight: 'bold' }}>
            ✓ Görsel hazır • 🔍 Tıkla büyüt
          </div>
        ) : (
          <div style={{ color: '#FF9800', fontSize: '12px' }}>
            ⏳ Çiziliyor...
          </div>
        )}
      </div>
      
      {/* ✅ MODAL - BÜYÜK GÖRSEL */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
        >
          <div style={{ 
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}>
            <CutVisualizationLarge cut={cut} onClose={() => setIsModalOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * ✅ BÜYÜK CANVAS MODAL
 */
interface CutVisualizationLargeProps {
  cut: any;
  onClose: () => void;
}

function CutVisualizationLarge({ cut, onClose }: CutVisualizationLargeProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Büyük boyut
    const W = 800;
    const H = 800;
    canvas.width = W;
    canvas.height = H;
    
    // Arka plan
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    
    const bbox = cut.usedPiece?.bboxLocal;
    const vertices = cut.usedPiece?.verticesLocal;
    
    if (!bbox || !vertices) return;
    
    // TAM SERAMİK BOYUTU
    const fullTileWidth = 600;
    const fullTileHeight = 600;
    
    const maxDim = Math.max(fullTileWidth, fullTileHeight);
    const padding = 120;
    const scale = (Math.min(W, H) - padding * 2) / maxDim;
    
    const cx = W / 2;
    const cy = H / 2;
    
    const toX = (x: number) => cx + x * scale;
    const toY = (y: number) => cy - y * scale;
    
    // 1. TAM SERAMİK ARKA PLAN
    ctx.save();
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 4;
    
    const tileW = fullTileWidth * scale;
    const tileH = fullTileHeight * scale;
    ctx.fillRect(cx - tileW/2, cy - tileH/2, tileW, tileH);
    ctx.strokeRect(cx - tileW/2, cy - tileH/2, tileW, tileH);
    ctx.restore();
    
    // 2. KULLANILACAK PARÇA
    ctx.save();
    ctx.fillStyle = 'rgba(33, 150, 243, 0.5)';
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 5;
    
    ctx.beginPath();
    ctx.moveTo(toX(vertices[0].x), toY(vertices[0].y));
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(toX(vertices[i].x), toY(vertices[i].y));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    
    // 3. KÖŞE NOKTALARI ve HER KENAR ÖLÇÜLERİ
    ctx.save();
    ctx.fillStyle = '#1976D2';
    
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      
      // Köşe
      ctx.beginPath();
      ctx.arc(toX(v1.x), toY(v1.y), 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Kenar uzunluğu
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const edgeLength = Math.sqrt(dx * dx + dy * dy);
      
      const midX = toX((v1.x + v2.x) / 2);
      const midY = toY((v1.y + v2.y) / 2);
      const angle = Math.atan2(-(v2.y - v1.y), v2.x - v1.x);
      
      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(angle);
      
      const text = `${edgeLength.toFixed(1)} mm`;
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const metrics = ctx.measureText(text);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(-metrics.width/2 - 6, -12, metrics.width + 12, 24);
      ctx.strokeStyle = '#1976D2';
      ctx.lineWidth = 2;
      ctx.strokeRect(-metrics.width/2 - 6, -12, metrics.width + 12, 24);
      
      ctx.fillStyle = '#1976D2';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
    
    // 4. KESİM ÇİZGİLERİ
    if (cut.cutLinesLocal && cut.cutLinesLocal.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#F44336';
      ctx.lineWidth = 4;
      ctx.setLineDash([16, 8]);
      
      cut.cutLinesLocal.forEach((line: any) => {
        ctx.beginPath();
        ctx.moveTo(toX(line.from.x), toY(line.from.y));
        ctx.lineTo(toX(line.to.x), toY(line.to.y));
        ctx.stroke();
        
        // Kesim uzunluğu
        const midX = toX((line.from.x + line.to.x) / 2);
        const midY = toY((line.from.y + line.to.y) / 2);
        
        ctx.save();
        ctx.setLineDash([]);
        ctx.fillStyle = '#F44336';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        
        const cutText = `✂️ ${line.lengthMm.toFixed(1)}mm`;
        const cutMetrics = ctx.measureText(cutText);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(midX - cutMetrics.width/2 - 4, midY - 20, cutMetrics.width + 8, 22);
        
        ctx.fillStyle = '#F44336';
        ctx.fillText(cutText, midX, midY - 10);
        ctx.restore();
      });
      
      ctx.setLineDash([]);
      ctx.restore();
    }
    
    // 5. TAM SERAMİK ÖLÇÜ OKLARI
    ctx.save();
    ctx.fillStyle = '#666';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    
    // Genişlik
    const arrowY = cy + tileH/2 + 60;
    ctx.fillText(`← ${fullTileWidth} mm →`, cx, arrowY);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - tileW/2, arrowY - 20);
    ctx.lineTo(cx + tileW/2, arrowY - 20);
    ctx.stroke();
    // Oklar
    ctx.beginPath();
    ctx.moveTo(cx - tileW/2, arrowY - 20);
    ctx.lineTo(cx - tileW/2 + 10, arrowY - 25);
    ctx.moveTo(cx - tileW/2, arrowY - 20);
    ctx.lineTo(cx - tileW/2 + 10, arrowY - 15);
    ctx.moveTo(cx + tileW/2, arrowY - 20);
    ctx.lineTo(cx + tileW/2 - 10, arrowY - 25);
    ctx.moveTo(cx + tileW/2, arrowY - 20);
    ctx.lineTo(cx + tileW/2 - 10, arrowY - 15);
    ctx.stroke();
    
    // Yükseklik
    ctx.save();
    ctx.translate(cx + tileW/2 + 60, cy);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`← ${fullTileHeight} mm →`, 0, 0);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-tileH/2, -20);
    ctx.lineTo(tileH/2, -20);
    ctx.stroke();
    // Oklar
    ctx.beginPath();
    ctx.moveTo(-tileH/2, -20);
    ctx.lineTo(-tileH/2 + 10, -25);
    ctx.moveTo(-tileH/2, -20);
    ctx.lineTo(-tileH/2 + 10, -15);
    ctx.moveTo(tileH/2, -20);
    ctx.lineTo(tileH/2 - 10, -25);
    ctx.moveTo(tileH/2, -20);
    ctx.lineTo(tileH/2 - 10, -15);
    ctx.stroke();
    ctx.restore();
    
    ctx.restore();
    
    // 6. BAŞLIK
    ctx.save();
    ctx.fillStyle = '#F44336';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Parça #${cut.tileIndex} - ${cut.model === 'A' ? 'Merkez' : 'Kenar'}`, cx, 50);
    ctx.restore();
    
    // 7. LEGEND (Sol üst)
    ctx.save();
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    
    const legendX = 20;
    const legendY = 90;
    const legendSpacing = 35;
    const legendSize = 20;
    
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(legendX, legendY, legendSize, legendSize);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.strokeRect(legendX, legendY, legendSize, legendSize);
    ctx.fillStyle = '#333';
    ctx.fillText('Tam Seramik (600×600mm)', legendX + legendSize + 8, legendY + legendSize - 4);
    
    ctx.fillStyle = 'rgba(33, 150, 243, 0.5)';
    ctx.fillRect(legendX, legendY + legendSpacing, legendSize, legendSize);
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 3;
    ctx.strokeRect(legendX, legendY + legendSpacing, legendSize, legendSize);
    ctx.fillStyle = '#333';
    ctx.fillText('Kullanılacak Parça', legendX + legendSize + 8, legendY + legendSpacing + legendSize - 4);
    
    if (cut.cutLinesLocal && cut.cutLinesLocal.length > 0) {
      ctx.strokeStyle = '#F44336';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 6]);
      ctx.beginPath();
      ctx.moveTo(legendX, legendY + legendSpacing * 2 + legendSize/2);
      ctx.lineTo(legendX + legendSize, legendY + legendSpacing * 2 + legendSize/2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#333';
      ctx.fillText('Kesim Çizgisi', legendX + legendSize + 8, legendY + legendSpacing * 2 + legendSize - 4);
    }
    
    ctx.restore();
    
  }, [cut]);
  
  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: '#F44336',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 10
        }}
      >
        ×
      </button>
      <canvas 
        ref={canvasRef}
        style={{ 
          display: 'block',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
      <div style={{ 
        marginTop: '15px', 
        textAlign: 'center',
        color: '#666',
        fontSize: '14px'
      }}>
        🔍 Büyütülmüş görsel • Kapatmak için tıklayın veya X butonuna basın
      </div>
    </div>
  );
}