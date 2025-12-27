import React from 'react';
import type { PatternType, CalculationSettings } from '../core/types';

interface PatternSelectorProps {
  settings: CalculationSettings;
  onSettingsChange: (settings: CalculationSettings) => void;
}

/**
 * Döşeme pattern seçici ve ayarları
 */
export const PatternSelector: React.FC<PatternSelectorProps> = ({ settings, onSettingsChange }) => {
  const patterns: { value: PatternType; label: string; description: string }[] = [
    { value: 'free', label: '🎯 Serbest', description: 'Teorik minimum hesaplama' },
    { value: 'grid', label: '📐 Grid (Hizalı)', description: 'Düz satır ve sütunlar' },
    { value: 'half-offset', label: '🧱 Yarım Kaydırmalı', description: 'Her satır yarım parça kaymış' },
    { value: 'diagonal-grid', label: '◆ Çapraz Grid', description: '45° döndürülmüş' },
    { value: 'diagonal-offset', label: '◇ Çapraz Kaydırmalı', description: '45° + yarım offset' },
  ];

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h2 style={{ marginTop: 0 }}>🎨 Döşeme Pattern</h2>

      {/* Pattern Seçimi */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Döşeme Şekli:
        </label>
        <div style={{ display: 'grid', gap: '10px' }}>
          {patterns.map((pattern) => (
            <label
              key={pattern.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: settings.pattern === pattern.value ? '2px solid #2196F3' : '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: settings.pattern === pattern.value ? '#e3f2fd' : 'white',
                transition: 'all 0.2s',
              }}
            >
              <input
                type="radio"
                name="pattern"
                value={pattern.value}
                checked={settings.pattern === pattern.value}
                onChange={(e) => onSettingsChange({ ...settings, pattern: e.target.value as PatternType })}
                style={{ marginRight: '10px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{pattern.label}</div>
                <small style={{ color: '#666' }}>{pattern.description}</small>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Kalanı Kullan Seçeneği */}
      <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '6px', border: '1px solid #ffb74d' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.useScrap}
            onChange={(e) => onSettingsChange({ ...settings, useScrap: e.target.checked })}
            style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>♻️ Artık Parçaları Kullan</div>
            <small style={{ color: '#e65100' }}>
              Kesim artıklarını stokla ve tekrar kullan (daha az fire)
            </small>
          </div>
        </label>
      </div>
    </div>
  );
};
