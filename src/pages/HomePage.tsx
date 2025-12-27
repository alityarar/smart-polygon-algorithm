import React, { useState } from 'react';
import type { RoomShape, TileDimensions, CalculationSettings, CalculationResult as CalculationResultType } from '../core/types';
import { buildRoomPolygon } from '../core/geometry';
import { calculateTileLayout } from '../core/tiling';
import { RoomEditor } from '../components/RoomEditor';
import { TileSettingsForm } from '../components/TileSettingsForm';
import { PatternSelector } from '../components/PatternSelector';
import { CalculationResult } from '../components/CalculationResult';
import { CanvasPreview } from '../components/CanvasPreview';
import { ResultSummary } from '../components/ResultSummary';

/**
 * Ana sayfa - tüm componentleri bir araya getirir
 */
export const HomePage: React.FC = () => {
  const [room, setRoom] = useState<RoomShape>(buildRoomPolygon([]));
  const [tile, setTile] = useState<TileDimensions>({
    width: { value: 60, unit: 'cm' },
    height: { value: 60, unit: 'cm' },
    grout: { value: 2, unit: 'mm' },
  });
  const [settings, setSettings] = useState<CalculationSettings>({
    useScrap: false,
    pattern: 'grid',
  });
  const [result, setResult] = useState<CalculationResultType | null>(null);

  const handleCalculate = () => {
    if (!room.isClosed) {
      alert('⚠️ Lütfen önce odayı kapatın!');
      return;
    }

    if (room.points.length < 3) {
      alert('⚠️ Oda en az 3 kenara sahip olmalı!');
      return;
    }

    try {
      const calculationResult = calculateTileLayout(room, tile, settings);
      setResult(calculationResult);
      
      // Başarı mesajı
      alert(`✅ Hesaplama tamamlandı!\n\nToplam: ${calculationResult.layout.totalTilesNeeded} parça\nTam: ${calculationResult.layout.fullTileCount}\nKesilmiş: ${calculationResult.layout.cutTileCount}`);
    } catch (error) {
      alert(`❌ Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  };

  console.log('🔍 HomePage render - room:', room.points.length, 'points, result:', result ? 'YES' : 'NO');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
      {/* Başlık */}
      <div style={{ maxWidth: '1600px', margin: '0 auto', marginBottom: '30px' }}>
        <h1 style={{ textAlign: 'center', color: '#1976d2', fontSize: '36px', marginBottom: '10px' }}>
          🏠 Malzeme Hesaplama Makinesi
        </h1>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '16px', margin: 0 }}>
          Seramik, Parke ve Laminat için akıllı döşeme hesaplayıcı
        </p>
      </div>

      {/* Ana İçerik - İki Sütun Layout */}
      <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* Sol Sütun - Formlar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <RoomEditor onRoomChange={setRoom} />
          <TileSettingsForm onTileChange={setTile} />
          <PatternSelector settings={settings} onSettingsChange={setSettings} />
          
          {/* Hesapla Butonu */}
          <button
            onClick={handleCalculate}
            disabled={!room.isClosed}
            style={{
              padding: '18px',
              backgroundColor: room.isClosed ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: room.isClosed ? 'pointer' : 'not-allowed',
              fontSize: '18px',
              fontWeight: 'bold',
              boxShadow: room.isClosed ? '0 4px 8px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              if (room.isClosed) {
                e.currentTarget.style.backgroundColor = '#45a049';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (room.isClosed) {
                e.currentTarget.style.backgroundColor = '#4CAF50';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }
            }}
          >
            {room.isClosed ? '🧮 Hesapla' : '⚠️ Önce odayı kapatın'}
          </button>
        </div>

        {/* Sağ Sütun - Önizleme ve Sonuçlar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 🎨 Canvas Önizleme */}
          <div style={{ border: '3px solid red', padding: '10px' }}>
            <h2>🎨 CANVAS ÖNİZLEME (TEST)</h2>
            <CanvasPreview room={room} result={result} />
          </div>

          {/* 📊 Hesaplama Sonuçları */}
          <CalculationResult result={result} />

          {/* ✂️ Kesim Listesi */}
          {result && (
            <div style={{ border: '3px solid blue', padding: '10px' }}>
              <h2>✂️ KESİM LİSTESİ (TEST)</h2>
              <ResultSummary result={result} />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ maxWidth: '1600px', margin: '30px auto 0', textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
        <p>💡 İpucu: Dikdörtgen bir oda için: 0° ileri, 90° sağa dön, 0° ileri, 90° sağa dön... şeklinde ilerleyin</p>
        <p style={{ marginTop: '10px' }}>Tüm hesaplamalar mm (milimetre) hassasiyetinde yapılır</p>
      </div>
    </div>
  );
};
