import React, { useRef, useEffect } from 'react';
import type { RoomShape, CalculationResult } from '../core/types';
import { getBoundingBox } from '../core/geometry';

interface CanvasPreviewProps {
  room: RoomShape;
  result: CalculationResult | null;
}

/**
 * 2D Canvas önizleme - oda ve döşeme simülasyonu
 */
export const CanvasPreview: React.FC<CanvasPreviewProps> = ({ room, result }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas'ı temizle
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (room.points.length < 2) {
      // Boş durum mesajı
      ctx.fillStyle = '#999';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Oda çizimi için kenar ekleyin', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Bounding box hesapla
    const bbox = getBoundingBox(room.points);
    
    // ✅ FIX #2: Invalid bbox kontrolü
    if (bbox.width <= 0 || bbox.height <= 0) {
      console.warn('⚠️ Invalid bounding box:', bbox);
      ctx.fillStyle = '#f44336';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Geçersiz oda boyutu', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    const margin = 50;

    // Ölçekleme faktörü hesapla
    const scaleX = (canvas.width - margin * 2) / bbox.width;
    const scaleY = (canvas.height - margin * 2) / bbox.height;
    const scale = Math.min(scaleX, scaleY, 0.5);
    
    // ✅ FIX #2: Scale validation
    if (!isFinite(scale) || scale <= 0) {
      console.error('❌ Invalid scale:', scale);
      return;
    }

    // Merkez offset hesapla
    const offsetX = margin - bbox.minX * scale + (canvas.width - bbox.width * scale - margin * 2) / 2;
    const offsetY = margin - bbox.minY * scale + (canvas.height - bbox.height * scale - margin * 2) / 2;

    // Koordinat dönüştürme fonksiyonu
    const transformX = (x: number) => x * scale + offsetX;
    const transformY = (y: number) => canvas.height - (y * scale + offsetY); // Y ekseni ters

    // Döşeme parçalarını çiz (eğer varsa)
    if (result && result.layout.tiles.length > 0) {
      result.layout.tiles.forEach((tile, index) => {
        ctx.save();

        // ✅ FIXED: TÜM PATTERN'LER CENTER-BASED KULLANIR
        const centerX = transformX(tile.x);
        const centerY = transformY(tile.y);
        
        const w = tile.width * scale;
        const h = tile.height * scale;

        // Merkez noktasına translate, rotate, sonra çiz
        ctx.translate(centerX, centerY);
        ctx.rotate((tile.rotation * Math.PI) / 180);
        
        // Parça rengini belirle
        if (tile.sourceType === 'cut') {
          ctx.fillStyle = '#ffccbc'; // Kesilmiş parça - açık turuncu
        } else if (tile.isFromScrap) {
          ctx.fillStyle = '#c8e6c9'; // Scrap'ten - açık yeşil
        } else {
          ctx.fillStyle = '#e3f2fd'; // Normal parça - açık mavi
        }

        // Merkez etrafında dikdörtgen çiz (top-left = -w/2, -h/2)
        ctx.fillRect(-w / 2, -h / 2, w, h);

        // Kenar çizgisi
        ctx.strokeStyle = '#90a4ae';
        ctx.lineWidth = 1;
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // ✅ YENİ: Parça numarasını yaz
        ctx.save();
        ctx.rotate(-(tile.rotation * Math.PI) / 180); // Numarayı düz yaz
        ctx.fillStyle = '#000';
        ctx.font = `${Math.max(10, Math.min(16, w / 5))}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`#${index + 1}`, 0, 0);
        ctx.restore();

        ctx.restore();
      });
      
      // ✅ YENİ: Kesim listesi varsa, kesilecek parçaları vurgula
      if (result.layout.cutList && result.layout.cutList.length > 0) {
        result.layout.cutList.forEach((cut) => {
          const tile = result.layout.tiles.find(t => t.id === cut.tileId);
          if (!tile) return;
          
          const centerX = transformX(tile.x);
          const centerY = transformY(tile.y);
          const w = tile.width * scale;
          const h = tile.height * scale;
          
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate((tile.rotation * Math.PI) / 180);
          
          // Kesim vurgulu kenarlık
          ctx.strokeStyle = '#F44336';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.strokeRect(-w / 2, -h / 2, w, h);
          
          // Kesim numarasını vurgulu göster
          ctx.save();
          ctx.rotate(-(tile.rotation * Math.PI) / 180);
          ctx.fillStyle = '#F44336';
          ctx.font = `bold ${Math.max(12, Math.min(18, w / 4))}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Arka plan
          const text = `✂️${cut.tileIndex}`;
          const metrics = ctx.measureText(text);
          const textWidth = metrics.width;
          const textHeight = 18;
          
          ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
          ctx.fillRect(-textWidth / 2 - 4, -textHeight / 2 - 2, textWidth + 8, textHeight + 4);
          
          ctx.fillStyle = '#FFF';
          ctx.fillText(text, 0, 0);
          ctx.restore();
          
          ctx.restore();
        });
      }
    }

    // Oda poligonunu çiz
    if (room.points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(transformX(room.points[0].x), transformY(room.points[0].y));

      for (let i = 1; i < room.points.length; i++) {
        ctx.lineTo(transformX(room.points[i].x), transformY(room.points[i].y));
      }

      // Oda kapalıysa son noktayı ilk noktaya bağla
      if (room.isClosed) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(33, 150, 243, 0.05)';
        ctx.fill();
      }

      // Kenar çizgileri
      ctx.strokeStyle = room.isClosed ? '#2196F3' : '#ff9800';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Noktaları çiz
      room.points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(transformX(point.x), transformY(point.y), 5, 0, Math.PI * 2);
        ctx.fillStyle = index === 0 ? '#4CAF50' : '#2196F3'; // İlk nokta yeşil
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Başlangıç noktası etiketi
    if (room.points.length > 0) {
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('START', transformX(room.points[0].x), transformY(room.points[0].y) - 10);
    }

    // Oda bilgisi
    if (room.isClosed && room.area) {
      ctx.fillStyle = '#333';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Alan: ${(room.area / 1000000).toFixed(2)} m²`, 10, 20);
    }

    // Ölçek bilgisi
    ctx.fillStyle = '#666';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Ölçek: 1mm = ${scale.toFixed(3)}px`, canvas.width - 10, canvas.height - 10);

  }, [room, result]);

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h2 style={{ marginTop: 0, marginBottom: '15px' }}>🎨 2D Önizleme</h2>
      
      <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '8px', border: '2px solid #ddd', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </div>

      {/* Renk Açıklaması */}
      <div style={{ marginTop: '15px', padding: '12px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Renk Göstergeleri:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#e3f2fd', border: '1px solid #90a4ae', borderRadius: '3px' }}></div>
            <span>Tam Parça</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#ffccbc', border: '1px solid #90a4ae', borderRadius: '3px' }}></div>
            <span>Kesilmiş</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#c8e6c9', border: '1px solid #90a4ae', borderRadius: '3px' }}></div>
            <span>Artık Parça</span>
          </div>
        </div>
      </div>
    </div>
  );
};
