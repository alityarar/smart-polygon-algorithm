import React, { useState } from 'react';
import type { CalculationResult as CalcResult } from '../core/types';

interface CalculationResultProps {
  result: CalcResult | null;
}

/**
 * Hesaplama sonuçlarını gösterir
 */
export const CalculationResult: React.FC<CalculationResultProps> = ({ result }) => {
  const [showCutList, setShowCutList] = useState(false);
  const [expandedPiece, setExpandedPiece] = useState<number | null>(null);

  if (!result) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9', textAlign: 'center' }}>
        <p style={{ color: '#999', margin: 0 }}>Henüz hesaplama yapılmadı</p>
      </div>
    );
  }

  const { layout, roomArea, tileArea } = result;
  const hasCutList = layout.cutList && layout.cutList.length > 0;

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h2 style={{ marginTop: 0, marginBottom: '20px' }}>📊 Hesaplama Sonuçları</h2>

      {/* Ana Metrikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
        <div style={{ padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '6px', border: '1px solid #4caf50' }}>
          <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '5px' }}>TAM PARÇA</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1b5e20' }}>{layout.fullTileCount}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '6px', border: '1px solid #ff9800' }}>
          <div style={{ fontSize: '12px', color: '#e65100', marginBottom: '5px' }}>KESİLMİŞ PARÇA</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#bf360c' }}>{layout.cutTileCount}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '6px', border: '1px solid #2196f3' }}>
          <div style={{ fontSize: '12px', color: '#1565c0', marginBottom: '5px' }}>TOPLAM GEREKLİ</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0d47a1' }}>{layout.totalTilesNeeded}</div>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#fce4ec', borderRadius: '6px', border: '1px solid #e91e63' }}>
          <div style={{ fontSize: '12px', color: '#c2185b', marginBottom: '5px' }}>FİRE ORANI</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#880e4f' }}>
            {layout.wastePercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Artık Parça Kullanımı */}
      {layout.scrapUsedCount > 0 && (
        <div style={{ padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '6px', marginBottom: '15px', border: '1px solid #4caf50' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>♻️</span>
            <div>
              <div style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                {layout.scrapUsedCount} Artık Parça Kullanıldı
              </div>
              <small style={{ color: '#558b2f' }}>Tasarruf edildi!</small>
            </div>
          </div>
        </div>
      )}

      {/* Malzeme Grupları (Diagonal için) */}
      {layout.materialGroups && layout.materialGroups.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '10px' }}>🎨 Malzeme Grupları</h3>
          {layout.materialGroups.map((group) => (
            <div key={group.id} style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{group.label}</div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                Adet: <strong>{group.tileCount}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#888' }}>💡 {group.suggestedUse}</div>
            </div>
          ))}
        </div>
      )}

      {/* KESİM LİSTESİ - YENİ! */}
      {hasCutList && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '6px', border: '2px solid #ff9800' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✂️</span> Kesim Listesi ({layout.cutList?.length || 0} parça)
            </h3>
            <button
              onClick={() => setShowCutList(!showCutList)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {showCutList ? '▼ Gizle' : '▶ Göster'}
            </button>
          </div>
          
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px', padding: '8px', backgroundColor: '#fff9c4', borderRadius: '4px' }}>
            <strong>ÖNEMLİ:</strong> Önce tüm kesimleri yapın, sonra döşemeye başlayın!
          </div>

          {showCutList && (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {/* Model A Parçalar */}
              {layout.cutList && layout.cutList.filter(c => c.model === 'A').length > 0 && (
                <>
                  <div style={{ marginTop: '15px', marginBottom: '10px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px', fontWeight: 'bold' }}>
                    💎 MODEL A - MERKEZ PARÇALAR ({layout.cutList.filter(c => c.model === 'A').length} adet)
                  </div>
                  {layout.cutList.filter(c => c.model === 'A').map((cut) => (
                    <div key={cut.tileId} style={{ marginBottom: '10px', border: '1px solid #4caf50', borderRadius: '6px', overflow: 'hidden' }}>
                      <div
                        onClick={() => setExpandedPiece(expandedPiece === cut.tileIndex ? null : cut.tileIndex)}
                        style={{
                          padding: '12px',
                          backgroundColor: '#f1f8e9',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong>Parça #{cut.tileIndex}</strong> - {cut.tileId}
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {cut.nominalVsCut.recommendedCutBboxLocal.w.toFixed(0)} × {cut.nominalVsCut.recommendedCutBboxLocal.h.toFixed(0)} mm
                          </div>
                        </div>
                        <span style={{ fontSize: '20px' }}>{expandedPiece === cut.tileIndex ? '▼' : '▶'}</span>
                      </div>
                      {expandedPiece === cut.tileIndex && (
                        <div style={{ padding: '15px', backgroundColor: 'white' }}>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '5px' }}>
                              ✅ KESİM GEREKMİYOR - Tam seramik kullanın
                            </div>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Rotasyon:</div>
                            <div style={{ fontWeight: 'bold' }}>{cut.rotationDeg}°</div>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Nominal Boyutlar:</div>
                            <div>{cut.nominalVsCut.nominalBboxLocal.w.toFixed(1)} × {cut.nominalVsCut.nominalBboxLocal.h.toFixed(1)} mm</div>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Önerilen Kesim (Güvenlik payı: {cut.nominalVsCut.cutSafetyMm}mm):</div>
                            <div style={{ fontWeight: 'bold', color: '#ff9800' }}>
                              {cut.nominalVsCut.recommendedCutBboxLocal.w.toFixed(1)} × {cut.nominalVsCut.recommendedCutBboxLocal.h.toFixed(1)} mm
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Model B Parçalar */}
              {layout.cutList && layout.cutList.filter(c => c.model === 'B').length > 0 && (
                <>
                  <div style={{ marginTop: '15px', marginBottom: '10px', padding: '10px', backgroundColor: '#fff3e0', borderRadius: '4px', fontWeight: 'bold' }}>
                    ✂️ MODEL B - KENAR PARÇALAR ({layout.cutList.filter(c => c.model === 'B').length} adet)
                  </div>
                  {layout.cutList.filter(c => c.model === 'B').map((cut) => (
                    <div key={cut.tileId} style={{ marginBottom: '10px', border: '1px solid #ff9800', borderRadius: '6px', overflow: 'hidden' }}>
                      <div
                        onClick={() => setExpandedPiece(expandedPiece === cut.tileIndex ? null : cut.tileIndex)}
                        style={{
                          padding: '12px',
                          backgroundColor: '#fff8e1',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong>Parça #{cut.tileIndex}</strong> - {cut.tileId}
                          {cut.fromScrap && <span style={{ marginLeft: '8px', fontSize: '16px' }}>♻️</span>}
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {cut.nominalVsCut.recommendedCutBboxLocal.w.toFixed(0)} × {cut.nominalVsCut.recommendedCutBboxLocal.h.toFixed(0)} mm
                          </div>
                        </div>
                        <span style={{ fontSize: '20px' }}>{expandedPiece === cut.tileIndex ? '▼' : '▶'}</span>
                      </div>
                      {expandedPiece === cut.tileIndex && (
                        <div style={{ padding: '15px', backgroundColor: 'white' }}>
                          {cut.fromScrap ? (
                            <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2e7d32' }}>
                                ♻️ ARTIKTAN KULLANILACAK
                              </div>
                              <div style={{ fontSize: '12px', color: '#558b2f' }}>Artık ID: {cut.fromScrap.scrapId}</div>
                            </div>
                          ) : (
                            <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1565c0' }}>
                                🆕 YENİ SERAMİKTEN KESİLECEK
                              </div>
                            </div>
                          )}
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Rotasyon:</div>
                            <div style={{ fontWeight: 'bold' }}>{cut.rotationDeg}°</div>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Nominal Boyutlar:</div>
                            <div>{cut.nominalVsCut.nominalBboxLocal.w.toFixed(1)} × {cut.nominalVsCut.nominalBboxLocal.h.toFixed(1)} mm</div>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>
                              ✂️ Önerilen Kesim (Kerf+Tolerans: {cut.nominalVsCut.cutSafetyMm}mm):
                            </div>
                            <div style={{ fontWeight: 'bold', color: '#ff9800', fontSize: '16px' }}>
                              {cut.nominalVsCut.recommendedCutBboxLocal.w.toFixed(1)} × {cut.nominalVsCut.recommendedCutBboxLocal.h.toFixed(1)} mm
                            </div>
                          </div>
                          {cut.cutLinesLocal.length > 0 && (
                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>🔪 Kesim Çizgileri:</div>
                              {cut.cutLinesLocal.map((line, idx) => (
                                <div key={idx} style={{ fontSize: '11px', padding: '4px', backgroundColor: '#f5f5f5', borderRadius: '3px', marginBottom: '3px' }}>
                                  Çizgi {idx + 1}: ({line.from.x.toFixed(1)}, {line.from.y.toFixed(1)}) → ({line.to.x.toFixed(1)}, {line.to.y.toFixed(1)})
                                  <span style={{ marginLeft: '8px', color: '#ff9800' }}>[{line.lengthMm.toFixed(1)} mm]</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {cut.usedPiece.verticesLocal.length > 0 && (
                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>📍 Parça Köşeleri (Yerel):</div>
                              <div style={{ fontSize: '11px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                                {cut.usedPiece.verticesLocal.map((v, idx) => (
                                  <div key={idx} style={{ padding: '4px', backgroundColor: '#f5f5f5', borderRadius: '3px' }}>
                                    Köşe {idx + 1}: ({v.x.toFixed(1)}, {v.y.toFixed(1)})
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {cut.scrapsProduced.length > 0 && (
                            <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f1f8e9', borderRadius: '4px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '5px' }}>
                                📦 Oluşacak Artıklar: {cut.scrapsProduced.length} adet
                              </div>
                              {cut.scrapsProduced.map((scrap, idx) => (
                                <div key={idx} style={{ fontSize: '11px', marginBottom: '3px' }}>
                                  {scrap.scrapId}: {scrap.bboxLocal.width.toFixed(0)} × {scrap.bboxLocal.height.toFixed(0)} mm
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detaylı Bilgiler */}
      <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
        <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '10px' }}>📏 Detaylı Bilgiler</h3>
        <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <span>Oda Alanı:</span>
            <strong>{(roomArea / 1000000).toFixed(2)} m²</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <span>Tek Parça Alanı:</span>
            <strong>{(tileArea / 1000000).toFixed(4)} m²</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <span>Toplam Kaplanan Alan:</span>
            <strong>{(result.totalCoveredArea / 1000000).toFixed(2)} m²</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <span>Yerleştirilen Parça:</span>
            <strong>{layout.tiles.length} adet</strong>
          </div>
        </div>
      </div>

      {/* Tavsiyeler */}
      <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fff9c4', borderRadius: '6px', border: '1px solid #fbc02d' }}>
        <div style={{ fontSize: '14px', color: '#f57f17' }}>
          <strong>💡 Tavsiye:</strong> Fire payı için %5-10 ekstra malzeme almanız önerilir.
        </div>
      </div>
    </div>
  );
};
