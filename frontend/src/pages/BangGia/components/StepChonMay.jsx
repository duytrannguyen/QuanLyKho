import React, { useState, useEffect } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { apiCatalog, priceListApi } from '../../../api';
import { formatCurrency } from '../../../utils/dinh_dang';
import { getFullModelName, normalizePrice } from './bangGiaConstants';

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="p-2 border-bottom bg-white">
      <div className="position-relative">
        <Search size={14} className="position-absolute text-muted" style={{ left: 9, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          className="form-control form-control-sm"
          style={{ paddingLeft: 28, paddingRight: value ? 26 : undefined }}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        {value && (
          <X
            size={14}
            className="position-absolute text-muted"
            style={{ right: 8, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
            onClick={() => onChange('')}
          />
        )}
      </div>
    </div>
  );
}

export function ColumnEmpty({ children }) {
  return <div className="text-center px-3 py-5 text-secondary small">{children}</div>;
}

export default function StepChonMay({ selectedConfigs, setSelectedConfigs, onNext }) {
  const [brands, setBrands] = useState([]);
  const [modelLines, setModelLines] = useState([]);
  const [availableConfigs, setAvailableConfigs] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedModelLine, setSelectedModelLine] = useState(null);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingML, setLoadingML] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [error, setError] = useState('');

  const [brandSearch, setBrandSearch] = useState('');
  const [mlSearch, setMlSearch] = useState('');
  const [cfgSearch, setCfgSearch] = useState('');

  useEffect(() => {
    apiCatalog.getBrands()
      .then(res => setBrands(res.data || []))
      .catch(err => setError(err.userMessage || 'Không tải được danh sách hãng'))
      .finally(() => setLoadingBrands(false));
  }, []);

  const handleSelectBrand = (brand) => {
    setSelectedBrand(brand);
    setSelectedModelLine(null);
    setAvailableConfigs([]);
    setLoadingML(true);
    setMlSearch('');
    setCfgSearch('');
    setError('');
    apiCatalog.getModelLines(brand.brandId)
      .then(res => setModelLines(res.data || []))
      .catch(err => setError(err.userMessage || 'Không tải được danh sách dòng máy'))
      .finally(() => setLoadingML(false));
  };

  const handleSelectModelLine = (ml) => {
    setSelectedModelLine(ml);
    setLoadingConfigs(true);
    setCfgSearch('');
    setError('');
    priceListApi.getPlatformsByModelLine(ml.modelLineId)
      .then(res => {
        const platformsData = res.data || [];
        const flatConfigs = [];
        const seenKeys = new Set();

        platformsData.forEach(p => {
          let modelName = getFullModelName(p);
          const brandPrefix = [selectedBrand?.brandName, ml.modelLineName].filter(Boolean).join(' ');
          if (brandPrefix && !modelName.toLowerCase().includes((ml.modelLineName || '').toLowerCase())) {
            modelName = `${brandPrefix} ${modelName}`.trim();
          }

          if (p.configItems && p.configItems.length > 0) {
            p.configItems.forEach(ci => {
              const uniqueKey = ci.configId || `${p.platformId}_${ci.cpuCode}_${ci.ramCode}_${ci.ssdCode}_${ci.screenSpec}_${ci.gpuCode}`;
              if (!seenKeys.has(uniqueKey)) {
                seenKeys.add(uniqueKey);
                const summary = ci.configName || [ci.cpuCode, ci.ramCode, ci.ssdCode, ci.screenSpec, ci.gpuCode].filter(Boolean).join(' / ');
                flatConfigs.push({
                  ...ci,
                  uniqueKey,
                  platformId: p.platformId,
                  platformName: p.displayName || modelName,
                  modelTitle: modelName,
                  configSummary: summary,
                });
              }
            });
          } else {
            const uniqueKey = p.platformId;
            if (!seenKeys.has(uniqueKey)) {
              seenKeys.add(uniqueKey);
              flatConfigs.push({
                uniqueKey,
                configId: p.platformId,
                platformId: p.platformId,
                platformName: p.displayName || modelName,
                modelTitle: modelName,
                configSummary: 'Chưa có cấu hình chi tiết',
                defaultSalePrice: 0,
              });
            }
          }
        });

        setAvailableConfigs(flatConfigs);
      })
      .catch(err => setError(err.userMessage || 'Không tải được danh sách cấu hình'))
      .finally(() => setLoadingConfigs(false));
  };

  const toggleConfig = (cfg) => {
    setSelectedConfigs(prev => {
      const next = new Map(prev);
      if (next.has(cfg.uniqueKey)) next.delete(cfg.uniqueKey);
      else next.set(cfg.uniqueKey, cfg);
      return next;
    });
  };

  const keyword = (s) => (s || '').toLowerCase();
  const filteredBrands = brands.filter(b => keyword(b.brandName).includes(keyword(brandSearch)));
  const filteredML = modelLines.filter(ml => keyword(ml.modelLineName).includes(keyword(mlSearch)));
  const filteredConfigs = availableConfigs.filter(cfg => {
    const searchStr = `${cfg.modelTitle} ${cfg.configSummary || ''} ${cfg.cpuCode || ''} ${cfg.ramCode || ''} ${cfg.ssdCode || ''}`.toLowerCase();
    return searchStr.includes(keyword(cfgSearch));
  });
  const allFilteredSelected = filteredConfigs.length > 0 && filteredConfigs.every(c => selectedConfigs.has(c.uniqueKey));

  const toggleSelectAll = () => {
    setSelectedConfigs(prev => {
      const next = new Map(prev);
      if (allFilteredSelected) filteredConfigs.forEach(c => next.delete(c.uniqueKey));
      else filteredConfigs.forEach(c => next.set(c.uniqueKey, c));
      return next;
    });
  };

  const LIST_HEIGHT = 440;

  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h5 className="fw-bold m-0">Chọn máy muốn in bảng giá</h5>
            <small className="text-secondary">Chọn Hãng → Dòng máy → tick các cấu hình. Có thể chọn từ nhiều hãng/dòng khác nhau.</small>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 small d-flex justify-content-between align-items-center">
            <span>{error}</span>
            <button type="button" className="btn-close btn-sm" onClick={() => setError('')} />
          </div>
        )}

        <div className="row g-3">
          {/* HÃNG */}
          <div className="col-6 col-lg-2">
            <div className="card border h-100">
              <div className="card-header bg-light fw-bold text-uppercase small text-secondary">1. Hãng</div>
              <SearchBox value={brandSearch} onChange={setBrandSearch} placeholder="Tìm hãng..." />
              <div className="list-group list-group-flush" style={{ height: LIST_HEIGHT, overflowY: 'auto' }}>
                {loadingBrands && <ColumnEmpty><span className="spinner-border spinner-border-sm me-2" />Đang tải...</ColumnEmpty>}
                {!loadingBrands && filteredBrands.length === 0 && <ColumnEmpty>Không có hãng phù hợp</ColumnEmpty>}
                {filteredBrands.map(b => {
                  const active = selectedBrand?.brandId === b.brandId;
                  return (
                    <button
                      type="button"
                      key={b.brandId}
                      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${active ? 'active fw-bold' : ''}`}
                      onClick={() => handleSelectBrand(b)}
                    >
                      <span className="text-truncate">{b.brandName}</span>
                      {active && <ChevronRight size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DÒNG MÁY */}
          <div className="col-6 col-lg-3">
            <div className="card border h-100">
              <div className="card-header bg-light fw-bold text-uppercase small text-secondary">2. Dòng máy</div>
              <SearchBox value={mlSearch} onChange={setMlSearch} placeholder="Tìm dòng máy..." />
              <div className="list-group list-group-flush" style={{ height: LIST_HEIGHT, overflowY: 'auto' }}>
                {loadingML && <ColumnEmpty><span className="spinner-border spinner-border-sm me-2" />Đang tải...</ColumnEmpty>}
                {!selectedBrand && !loadingML && <ColumnEmpty>← Chọn hãng trước</ColumnEmpty>}
                {selectedBrand && !loadingML && filteredML.length === 0 && <ColumnEmpty>Không có dòng máy</ColumnEmpty>}
                {filteredML.map(ml => {
                  const active = selectedModelLine?.modelLineId === ml.modelLineId;
                  return (
                    <button
                      type="button"
                      key={ml.modelLineId}
                      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${active ? 'active fw-bold' : ''}`}
                      onClick={() => handleSelectModelLine(ml)}
                    >
                      <span className="text-truncate">{ml.modelLineName}</span>
                      {active && <ChevronRight size={14} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CẤU HÌNH */}
          <div className="col-12 col-lg-4">
            <div className="card border h-100">
              <div className="card-header bg-light fw-bold text-uppercase small text-secondary d-flex justify-content-between align-items-center">
                <span>3. Model & cấu hình {availableConfigs.length > 0 && <span className="fw-normal">({filteredConfigs.length})</span>}</span>
                {filteredConfigs.length > 0 && (
                  <button type="button" className="btn btn-sm btn-link text-decoration-none p-0 text-none" onClick={toggleSelectAll}>
                    {allFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                )}
              </div>
              <SearchBox value={cfgSearch} onChange={setCfgSearch} placeholder="Tìm model, CPU, RAM, SSD..." />
              <div className="list-group list-group-flush" style={{ height: LIST_HEIGHT, overflowY: 'auto' }}>
                {loadingConfigs && <ColumnEmpty><span className="spinner-border spinner-border-sm me-2" />Đang tải...</ColumnEmpty>}
                {!selectedModelLine && !loadingConfigs && <ColumnEmpty>← Chọn dòng máy trước</ColumnEmpty>}
                {selectedModelLine && !loadingConfigs && filteredConfigs.length === 0 && <ColumnEmpty>Không có cấu hình nào</ColumnEmpty>}
                {filteredConfigs.map(cfg => {
                  const isSelected = selectedConfigs.has(cfg.uniqueKey);
                  return (
                    <label
                      key={cfg.uniqueKey}
                      className={`list-group-item list-group-item-action d-flex align-items-start gap-2 py-2 px-3 ${isSelected ? 'bg-primary bg-opacity-10' : ''}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input mt-1 flex-shrink-0"
                        checked={isSelected}
                        onChange={() => toggleConfig(cfg)}
                      />
                      <div className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <span className={`fw-bold text-truncate ${isSelected ? 'text-primary' : 'text-dark'}`}>{cfg.modelTitle}</span>
                          {cfg.defaultSalePrice > 0 ? (
                            <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle flex-shrink-0">
                              {formatCurrency(normalizePrice(cfg.defaultSalePrice))}đ
                            </span>
                          ) : (
                            <span className="badge bg-light text-secondary border flex-shrink-0">Chưa có giá</span>
                          )}
                        </div>
                        <span className="text-secondary" style={{ fontSize: '11.5px', lineHeight: 1.35 }} title={cfg.configSummary}>
                          {cfg.configSummary}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ĐÃ CHỌN */}
          <div className="col-12 col-lg-3">
            <div className="card border border-primary h-100">
              <div className="card-header bg-primary text-white fw-bold text-uppercase small d-flex justify-content-between align-items-center">
                <span>Đã chọn ({selectedConfigs.size})</span>
                {selectedConfigs.size > 0 && (
                  <button type="button" className="btn btn-sm btn-link text-white p-0 text-decoration-none" onClick={() => setSelectedConfigs(new Map())}>
                    Xóa hết
                  </button>
                )}
              </div>
              <div className="list-group list-group-flush" style={{ height: LIST_HEIGHT + 49, overflowY: 'auto' }}>
                {selectedConfigs.size === 0 && <ColumnEmpty>Chưa chọn cấu hình nào.<br />Tick vào cấu hình ở cột bên trái.</ColumnEmpty>}
                {Array.from(selectedConfigs.values()).map((cfg, idx) => (
                  <div key={cfg.uniqueKey} className="list-group-item d-flex justify-content-between align-items-start py-2 px-3">
                    <span className="badge bg-primary-subtle text-primary me-2 mt-1">{idx + 1}</span>
                    <div className="d-flex flex-column flex-grow-1 me-2" style={{ minWidth: 0 }}>
                      <span className="small fw-bold text-dark text-truncate">{cfg.modelTitle}</span>
                      <span className="text-secondary text-truncate" style={{ fontSize: '11px' }} title={cfg.configSummary}>{cfg.configSummary}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0 flex-shrink-0"
                      onClick={() => toggleConfig(cfg)}
                      title="Bỏ chọn"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-footer bg-white d-flex align-items-center justify-content-between py-3 px-4" style={{ position: 'sticky', bottom: 0, zIndex: 5, boxShadow: '0 -4px 12px rgba(0,0,0,.05)' }}>
        <span className="text-secondary">Đã chọn: <b className="text-primary">{selectedConfigs.size}</b> cấu hình</span>
        <button
          type="button"
          className="btn btn-primary d-flex align-items-center gap-2 px-4"
          disabled={selectedConfigs.size === 0}
          onClick={onNext}
        >
          Tiếp tục chỉnh sửa <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

