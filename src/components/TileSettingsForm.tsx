import React, { useState } from 'react';
import type { TileDimensions, Unit } from '../core/types';

interface TileSettingsFormProps {
  onTileChange: (tile: TileDimensions) => void;
}

/**
 * Malzeme (Seramik/Parke/Laminat) ayarları formu
 */
export const TileSettingsForm: React.FC<TileSettingsFormProps> = ({ onTileChange }) => {
  const [width, setWidth] = useState<number>(60);
  const [widthUnit, setWidthUnit] = useState<Unit>('cm');
  const [height, setHeight] = useState<number>(60);
  const [heightUnit, setHeightUnit] = useState<Unit>('cm');
  const [grout, setGrout] = useState<number>(2);
  const [groutUnit, setGroutUnit] = useState<Unit>('mm');

  const units: Unit[] = ['mm', 'cm', 'm', 'in', 'ft'];

  const handleUpdate = () => {
    const tileDimensions: TileDimensions = {
      width: { value: width, unit: widthUnit },
      height: { value: height, unit: heightUnit },
      grout: { value: grout, unit: groutUnit },
    };
    onTileChange(tileDimensions);
  };

  React.useEffect(() => {
    handleUpdate();
  }, [width, widthUnit, height, heightUnit, grout, groutUnit]);

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h2 style={{ marginTop: 0 }}>🔲 Malzeme Ölçüleri</h2>

      <div style={{ display: 'grid', gap: '15px' }}>
        {/* Genişlik */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Parça Genişliği:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              placeholder="Genişlik"
              min="0"
            />
            <select
              value={widthUnit}
              onChange={(e) => setWidthUnit(e.target.value as Unit)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Uzunluk */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Parça Uzunluğu:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              placeholder="Uzunluk"
              min="0"
            />
            <select
              value={heightUnit}
              onChange={(e) => setHeightUnit(e.target.value as Unit)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Derz Payı */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Derz Payı:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="number"
              value={grout}
              onChange={(e) => setGrout(parseFloat(e.target.value) || 0)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              placeholder="Derz"
              min="0"
            />
            <select
              value={groutUnit}
              onChange={(e) => setGroutUnit(e.target.value as Unit)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
          <small style={{ color: '#666' }}>Parçalar arası boşluk</small>
        </div>
      </div>

      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <small style={{ color: '#1976d2' }}>
          💡 Tüm değişiklikler otomatik olarak kaydedilir
        </small>
      </div>
    </div>
  );
};
