import React, { useState } from 'react';
import type { EdgeCommand, Unit, RoomShape } from '../core/types';
import { buildRoomPolygon } from '../core/geometry';

interface RoomEditorProps {
  onRoomChange: (room: RoomShape) => void;
}

/**
 * Oda çizim editörü - kullanıcı adım adım duvar kenarları ekleyerek oda oluşturur
 */
export const RoomEditor: React.FC<RoomEditorProps> = ({ onRoomChange }) => {
  const [edges, setEdges] = useState<EdgeCommand[]>([]);
  const [currentTurn, setCurrentTurn] = useState<number>(90);
  const [currentLength, setCurrentLength] = useState<number>(400);
  const [currentUnit, setCurrentUnit] = useState<Unit>('cm');

  const addEdge = () => {
    if (currentLength <= 0) {
      alert('Uzunluk pozitif olmalı!');
      return;
    }

    const newEdge: EdgeCommand = {
      turnDeg: currentTurn,
      length: { value: currentLength, unit: currentUnit },
    };

    const newEdges = [...edges, newEdge];
    setEdges(newEdges);

    // Oda şeklini hesapla ve üst componente bildir
    const room = buildRoomPolygon(newEdges);
    onRoomChange(room);
  };

  const removeLastEdge = () => {
    if (edges.length === 0) return;

    const newEdges = edges.slice(0, -1);
    setEdges(newEdges);

    const room = buildRoomPolygon(newEdges);
    onRoomChange(room);
  };

  const closeRoom = () => {
    const room = buildRoomPolygon(edges);
    if (!room.isClosed) {
      alert('Oda otomatik olarak kapatılamıyor. Son noktanız başlangıca dönmüyor.');
      return;
    }
    alert(`Oda başarıyla kapatıldı! Alan: ${((room.area || 0) / 1000000).toFixed(2)} m²`);
  };

  const resetRoom = () => {
    setEdges([]);
    onRoomChange(buildRoomPolygon([]));
  };

  const units: Unit[] = ['mm', 'cm', 'm', 'in', 'ft'];

  return (
    <div className="room-editor" style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h2 style={{ marginTop: 0 }}>📐 Oda Çizimi</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Başlangıç: (0, 0) - Yön: 0° (Yukarı)<br />
          Her kenar için dönüş açısı ve uzunluk girin.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
        {/* Dönüş Açısı */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Dönüş Açısı (°):
          </label>
          <input
            type="number"
            value={currentTurn}
            onChange={(e) => setCurrentTurn(parseFloat(e.target.value) || 0)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            placeholder="90 = Sağa, -90 = Sola"
          />
          <small style={{ color: '#666' }}>Pozitif = Sağa dönüş, Negatif = Sola dönüş</small>
        </div>

        {/* Uzunluk */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Kenar Uzunluğu:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="number"
              value={currentLength}
              onChange={(e) => setCurrentLength(parseFloat(e.target.value) || 0)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              placeholder="Uzunluk"
            />
            <select
              value={currentUnit}
              onChange={(e) => setCurrentUnit(e.target.value as Unit)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Butonlar */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={addEdge}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ➕ Kenar Ekle
          </button>
          <button
            onClick={removeLastEdge}
            disabled={edges.length === 0}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: edges.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: edges.length === 0 ? 0.5 : 1,
            }}
          >
            ↶ Geri Al
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={closeRoom}
            disabled={edges.length < 3}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: edges.length < 3 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: edges.length < 3 ? 0.5 : 1,
            }}
          >
            ✓ Odayı Kapat
          </button>
          <button
            onClick={resetRoom}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            🗑️ Sıfırla
          </button>
        </div>
      </div>

      {/* Kenar Listesi */}
      {edges.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Eklenen Kenarlar:</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px', backgroundColor: 'white' }}>
            {edges.map((edge, index) => (
              <div key={index} style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
                <strong>Kenar {index + 1}:</strong> {edge.turnDeg}° dönüş, {edge.length.value} {edge.length.unit}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
