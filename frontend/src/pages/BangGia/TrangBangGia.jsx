import { useState, useEffect, useMemo } from 'react';
import {
  Tag, Printer, ChevronRight, ChevronLeft, Check, Trash2, Minus, Plus,
  RotateCcw, FileText, Eye, Search, X, ZoomIn, ZoomOut, Lock
} from 'lucide-react';
import { apiCatalog, priceListApi } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { formatCurrency, parseCurrency } from '../../utils/dinh_dang';
import logoQK from '../../assets/qkshop_logo.jpg';

/* ============================================================
   Hằng số & tiện ích dùng chung
   ============================================================ */
const DEFAULT_WARRANTY = 'Bảo hành phần cứng 06 tháng';
const WARRANTY_OPTIONS = [
  'Bảo hành phần cứng 03 tháng',
  'Bảo hành phần cứng 06 tháng',
  'Bảo hành phần cứng 12 tháng',
];
const POLICY_LINES = [
  '- Vệ sinh bảo dưỡng, cài đặt máy miễn phí.',
  '- 1 đổi 1 trong vòng 07 ngày đầu nếu lỗi do nhà sx.',
  '- QUÀ TẶNG: Balo, chuột không dây, miếng lót chuột và túi chống sốc.',
];
const PAGE_LAYOUTS = {
  A4: { cols: 3, rows: 3, pageW: 210, pageH: 297, label: 'A4', desc: '9 thẻ/trang' },
  A5: { cols: 2, rows: 2, pageW: 148, pageH: 210, label: 'A5', desc: '4 thẻ/trang' },
};
const GRID_GAP_MM = 1.3; // ≈ 5px, khớp với bản in

function getCardSizeMm(layout) {
  const pad = GRID_GAP_MM * 2;
  return {
    w: (layout.pageW - pad - GRID_GAP_MM * (layout.cols - 1)) / layout.cols,
    h: (layout.pageH - pad - GRID_GAP_MM * (layout.rows - 1)) / layout.rows,
  };
}

function getShortModelName(fullName) {
  if (!fullName) return '';
  const kw = [' CPU', ' /', ' Ram', ' RAM', ' - CPU', ' SSD', ' - '];
  let minIdx = fullName.length;
  for (const k of kw) {
    const idx = fullName.toUpperCase().indexOf(k.toUpperCase());
    if (idx !== -1 && idx < minIdx) minIdx = idx;
  }
  return fullName.substring(0, minIdx).trim();
}

function getFullModelName(item) {
  if (!item) return '';
  // Ưu tiên platformName (hoặc displayName có đủ Hãng Dòng Model ví dụ: "Dell Latitude 7410")
  const raw = item.platformName || item.platformCode || item.displayName || item.shortName || '';
  return getShortModelName(raw) || raw;
}

function normalizePrice(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Math.round(Number(value));
  return Number.isFinite(num) && num > 0 ? String(num) : '';
}

function getPriceText(item) {
  if (item.editPrice) return formatCurrency(item.editPrice) + 'đ';
  if (item.defaultSalePrice) return formatCurrency(normalizePrice(item.defaultSalePrice)) + 'đ';
  return 'Liên hệ';
}

function getGpuText(item) {
  const gpu = (item.gpuCode || '').trim();
  return gpu && gpu.toUpperCase() !== 'ONBOARD' ? gpu : '';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function createEditableItem(cfg) {
  const originalPrice = normalizePrice(cfg.defaultSalePrice);
  return {
    ...cfg,
    modelTitle: cfg.modelTitle || getFullModelName(cfg),
    cpuCode: cfg.cpuCode || '',
    ramCode: cfg.ramCode || '',
    ssdCode: cfg.ssdCode || '',
    screenSpec: cfg.screenSpec || '',
    gpuCode: cfg.gpuCode || '',
    weightKg: cfg.weightKg ? String(cfg.weightKg) : '',
    warrantyText: cfg.warrantyText || DEFAULT_WARRANTY,
    originalPrice,
    editPrice: originalPrice,
    printQty: 1,
  };
}

/* ============================================================
   Thẻ giá (dùng cho xem trước trên màn hình)
   ============================================================ */
function PriceCard({ item }) {
  const modelTitle = item.modelTitle || getFullModelName(item);

  return (
    <div style={{
      border: '1.5px solid #111',
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, Helvetica, sans-serif',
      background: '#fff',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      margin: 0,
      boxSizing: 'border-box'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <img src={logoQK} alt="QK Shop" style={{ height: '70px', maxWidth: '100%', objectFit: 'contain', marginTop: '-17px' }} />
      </div>

      <div style={{
        background: '#000', color: '#fff', textAlign: 'center',
        fontWeight: 900, fontSize: '15px', lineHeight: 1.3,
        padding: '6px 8px', width: '100%', boxSizing: 'border-box',
        wordWrap: 'break-word', flexShrink: 0, marginTop: '-20px'
      }}>
        {modelTitle}
      </div>

      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '20px', margin: '8px 0 4px', color: '#000', flexShrink: 0 }}>
        Giá: {getPriceText(item)}
      </div>

      <div style={{ borderBottom: '2px solid #000', margin: '0 8px 8px', flexShrink: 0 }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden', fontSize: '12.5px', color: '#000', lineHeight: 1.25 }}>
        <div><b>CPU:</b> {item.cpuCode || ''}</div>
        <div><b>RAM:</b> {item.ramCode || ''}</div>
        <div><b>SSD:</b> {item.ssdCode || ''}</div>
        <div><b>Màn hình:</b> {item.screenSpec || ''}</div>
        <div><b>VGA:</b> {getGpuText(item)}</div>
        <div><b>Trọng lượng:</b> {item.weightKg || ''}{item.weightKg ? <i style={{ fontWeight: 'normal' }}>Kg</i> : ''}</div>
      </div>

      <div style={{ background: '#333', color: '#fff', textAlign: 'center', fontWeight: 700, fontSize: '13px', padding: '8px 4px', margin: '8px 0', flexShrink: 0 }}>
        {item.warrantyText || DEFAULT_WARRANTY}
      </div>

      <div style={{
        fontSize: '9px', fontStyle: 'italic', fontWeight: 700,
        lineHeight: 1.35, color: '#000', flexShrink: 0,
        whiteSpace: 'normal', wordWrap: 'break-word'
      }}>
        {POLICY_LINES.map(line => <div key={line}>{line}</div>)}
      </div>
    </div>
  );
}

/* ============================================================
   Thanh tiến trình các bước (có thể bấm để chuyển bước)
   ============================================================ */
function StepIndicator({ step, canGoTo, onGoTo }) {
  const steps = [
    { n: 1, label: 'Chọn máy' },
    { n: 2, label: 'Chỉnh sửa thông tin' },
    { n: 3, label: 'Xem trước & In' },
  ];
  return (
    <div className="d-flex align-items-center flex-wrap gap-2 mb-4">
      {steps.map(({ n, label }, idx) => {
        const isActive = step === n;
        const isDone = step > n;
        const enabled = canGoTo(n);
        return (
          <div key={n} className="d-flex align-items-center gap-2">
            <button
              type="button"
              className={`btn btn-sm rounded-pill d-flex align-items-center gap-2 px-3 py-2 border-0 ${
                isActive ? 'btn-primary shadow-sm' : isDone ? 'btn-light text-success' : 'btn-light text-secondary'
              }`}
              disabled={!enabled && !isActive}
              onClick={() => enabled && onGoTo(n)}
            >
              <span
                className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${
                  isActive ? 'bg-white text-primary' : isDone ? 'bg-success text-white' : 'bg-secondary text-white'
                }`}
                style={{ width: 22, height: 22, fontSize: 12 }}
              >
                {isDone ? <Check size={13} /> : n}
              </span>
              <span className="fw-semibold">{label}</span>
            </button>
            {idx < steps.length - 1 && <ChevronRight size={16} className="text-secondary opacity-50" />}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Bước 1: Chọn máy & cấu hình
   ============================================================ */
function SearchBox({ value, onChange, placeholder }) {
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

function ColumnEmpty({ children }) {
  return <div className="text-center px-3 py-5 text-secondary small">{children}</div>;
}

function StepChonMay({ selectedConfigs, setSelectedConfigs, onNext }) {
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
            // Model chưa khai báo cấu hình con trong catalog
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

/* ============================================================
   Bước 2: Chỉnh sửa thông tin (chỉ để in, không lưu CSDL)
   ============================================================ */
function FieldLabel({ children }) {
  return <label className="form-label text-secondary fw-semibold mb-1" style={{ fontSize: '11.5px' }}>{children}</label>;
}

function EditItemCard({ item, index, isActive, onActivate, onChange, onRemove }) {
  const key = item.uniqueKey;
  const set = (field) => (e) => onChange(key, field, e.target.value);
  const priceChanged = item.originalPrice && item.editPrice !== item.originalPrice;
  const noPrice = !item.editPrice && !item.originalPrice;

  return (
    <div
      className={`card mb-3 ${isActive ? 'border-primary shadow-sm' : 'border'}`}
      style={{ borderLeftWidth: isActive ? 4 : 1, transition: 'all .15s' }}
      onClick={() => onActivate(key)}
      onFocusCapture={() => onActivate(key)}
    >
      <div className="card-body p-3">
        {/* Hàng đầu: tên máy + SL in + xóa */}
        <div className="d-flex align-items-start gap-2 mb-2">
          <span className={`badge rounded-pill mt-2 ${isActive ? 'bg-primary' : 'bg-secondary-subtle text-secondary-emphasis'}`}>#{index + 1}</span>
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <input
              type="text"
              className="form-control fw-bold"
              placeholder="Tên máy hiển thị, VD: Dell Latitude 7410"
              value={item.modelTitle || ''}
              onChange={set('modelTitle')}
            />
            <div className="text-muted text-truncate mt-1" style={{ fontSize: '11px' }} title={item.configSummary || item.configName}>
              Cấu hình gốc: {item.configSummary || item.configName || item.platformName || '—'}
            </div>
          </div>
          <div className="d-flex flex-column align-items-center flex-shrink-0">
            <div className="input-group input-group-sm" style={{ width: 112 }}>
              <button type="button" className="btn btn-outline-secondary px-2" title="Giảm" onClick={() => onChange(key, 'printQty', Math.max(0, (parseInt(item.printQty) || 0) - 1))}>
                <Minus size={12} />
              </button>
              <input
                type="text"
                inputMode="numeric"
                className="form-control text-center fw-bold px-1"
                value={item.printQty}
                onChange={e => onChange(key, 'printQty', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
              />
              <button type="button" className="btn btn-outline-secondary px-2" title="Tăng" onClick={() => onChange(key, 'printQty', (parseInt(item.printQty) || 0) + 1)}>
                <Plus size={12} />
              </button>
            </div>
            <small className="text-muted" style={{ fontSize: '10.5px' }}>Số thẻ in</small>
          </div>
          <button type="button" className="btn btn-sm btn-outline-danger flex-shrink-0" style={{ marginTop: 2 }} title="Bỏ máy này khỏi bảng giá" onClick={(e) => { e.stopPropagation(); onRemove(key); }}>
            <Trash2 size={15} />
          </button>
        </div>

        {item.printQty === 0 && (
          <div className="alert alert-warning py-1 px-2 small mb-2">Số thẻ in = 0 → máy này sẽ không được in.</div>
        )}

        {/* Thông số */}
        <div className="row g-2">
          <div className="col-6 col-md-4">
            <FieldLabel>Giá bán</FieldLabel>
            <div className="input-group input-group-sm">
              <input
                type="text"
                inputMode="numeric"
                className={`form-control fw-bold text-danger ${noPrice ? 'border-warning' : ''}`}
                placeholder="Nhập giá..."
                value={formatCurrency(item.editPrice)}
                onChange={e => onChange(key, 'editPrice', parseCurrency(e.target.value))}
              />
              <span className="input-group-text">đ</span>
              {priceChanged && (
                <button type="button" className="btn btn-outline-secondary" title={`Khôi phục giá gốc: ${formatCurrency(item.originalPrice)}đ`} onClick={() => onChange(key, 'editPrice', item.originalPrice)}>
                  <RotateCcw size={12} />
                </button>
              )}
            </div>
            {priceChanged && <div className="text-muted" style={{ fontSize: '10.5px' }}>Giá gốc: {formatCurrency(item.originalPrice)}đ</div>}
            {noPrice && <div className="text-warning-emphasis" style={{ fontSize: '10.5px' }}>Chưa có giá → in "Liên hệ"</div>}
          </div>
          <div className="col-6 col-md-4">
            <FieldLabel>CPU</FieldLabel>
            <input type="text" className="form-control form-control-sm" placeholder="VD: Core i5-10310U" value={item.cpuCode || ''} onChange={set('cpuCode')} />
          </div>
          <div className="col-6 col-md-2">
            <FieldLabel>RAM</FieldLabel>
            <input type="text" className="form-control form-control-sm" placeholder="16GB" value={item.ramCode || ''} onChange={set('ramCode')} />
          </div>
          <div className="col-6 col-md-2">
            <FieldLabel>SSD</FieldLabel>
            <input type="text" className="form-control form-control-sm" placeholder="256GB" value={item.ssdCode || ''} onChange={set('ssdCode')} />
          </div>

          <div className="col-6 col-md-3">
            <FieldLabel>Màn hình</FieldLabel>
            <input type="text" className="form-control form-control-sm" placeholder='14" FHD' value={item.screenSpec || ''} onChange={set('screenSpec')} />
          </div>
          <div className="col-6 col-md-3">
            <FieldLabel>VGA</FieldLabel>
            <input type="text" className="form-control form-control-sm" placeholder="Để trống nếu Onboard" value={item.gpuCode || ''} onChange={set('gpuCode')} />
          </div>
          <div className="col-6 col-md-2">
            <FieldLabel>Trọng lượng</FieldLabel>
            <div className="input-group input-group-sm">
              <input type="text" className="form-control" placeholder="1.4" value={item.weightKg || ''} onChange={set('weightKg')} />
              <span className="input-group-text px-1">kg</span>
            </div>
          </div>
          <div className="col-6 col-md-4">
            <FieldLabel>Bảo hành</FieldLabel>
            <input
              type="text"
              className="form-control form-control-sm"
              list="banggia-warranty-options"
              placeholder="Chọn hoặc nhập..."
              value={item.warrantyText || ''}
              onChange={set('warrantyText')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepChinhSua({ items, pageSize, onChangeItem, onBulkUpdate, onRemove, onBack, onNext }) {
  const [activeKey, setActiveKey] = useState(items[0]?.uniqueKey ?? null);
  const [bulkWarranty, setBulkWarranty] = useState(DEFAULT_WARRANTY);
  const [bulkQty, setBulkQty] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    if (!items.some(it => it.uniqueKey === activeKey)) {
      setActiveKey(items[0]?.uniqueKey ?? null);
    }
  }, [items, activeKey]);

  const activeIndex = Math.max(0, items.findIndex(it => it.uniqueKey === activeKey));
  const activeItem = items[activeIndex];
  const totalPrint = items.reduce((sum, it) => sum + (parseInt(it.printQty) || 0), 0);
  const layout = PAGE_LAYOUTS[pageSize];
  const totalPages = Math.ceil(totalPrint / (layout.cols * layout.rows));
  const cardSize = getCardSizeMm(layout);
  const missingPriceCount = items.filter(it => !it.editPrice && !it.originalPrice && (parseInt(it.printQty) || 0) > 0).length;

  const applyWarrantyAll = () => {
    if (!bulkWarranty.trim()) {
      showToast('Vui lòng nhập nội dung bảo hành', 'warning');
      return;
    }
    onBulkUpdate(it => ({ ...it, warrantyText: bulkWarranty.trim() }));
    showToast(`Đã áp dụng bảo hành cho ${items.length} máy`, 'success');
  };
  const applyQtyAll = () => {
    const qty = Math.max(0, parseInt(bulkQty) || 0);
    onBulkUpdate(it => ({ ...it, printQty: qty }));
    showToast(`Đã đặt ${qty} thẻ in cho mỗi máy`, 'success');
  };
  const restoreAllPrices = () => {
    onBulkUpdate(it => ({ ...it, editPrice: it.originalPrice }));
    showToast('Đã khôi phục giá gốc cho tất cả máy', 'success');
  };

  if (items.length === 0) {
    return (
      <div className="card shadow-sm border-0 p-5 text-center">
        <p className="text-secondary mb-3">Chưa có máy nào trong bảng giá.</p>
        <div><button type="button" className="btn btn-primary" onClick={onBack}><ChevronLeft size={16} /> Quay lại chọn máy</button></div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm border-0 mb-4">
      <datalist id="banggia-warranty-options">
        {WARRANTY_OPTIONS.map(o => <option key={o} value={o} />)}
      </datalist>

      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h5 className="fw-bold m-0">Chỉnh sửa thông tin bảng giá</h5>
            <small className="text-secondary fst-italic">Các thông số chỉnh sửa tại đây chỉ dùng để in, không lưu vào CSDL.</small>
          </div>
        </div>

        {/* Thao tác hàng loạt */}
        <div className="bg-light border rounded-3 p-3 mb-3">
          <div className="fw-semibold small text-secondary text-uppercase mb-2">Áp dụng nhanh cho tất cả máy</div>
          <div className="row g-2 align-items-end">
            <div className="col-md-6">
              <FieldLabel>Bảo hành</FieldLabel>
              <div className="input-group input-group-sm">
                <input type="text" className="form-control" list="banggia-warranty-options" value={bulkWarranty} onChange={e => setBulkWarranty(e.target.value)} />
                <button type="button" className="btn btn-outline-primary" onClick={applyWarrantyAll}>Áp dụng</button>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <FieldLabel>Số thẻ in mỗi máy</FieldLabel>
              <div className="input-group input-group-sm">
                <input type="number" min="0" className="form-control text-center" value={bulkQty} onChange={e => setBulkQty(e.target.value)} />
                <button type="button" className="btn btn-outline-primary" onClick={applyQtyAll}>Áp dụng</button>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <button type="button" className="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1" onClick={restoreAllPrices}>
                <RotateCcw size={13} /> Khôi phục giá gốc
              </button>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Danh sách máy */}
          <div className="col-xl-8">
            {items.map((item, idx) => (
              <EditItemCard
                key={item.uniqueKey}
                item={item}
                index={idx}
                isActive={item.uniqueKey === activeItem?.uniqueKey}
                onActivate={setActiveKey}
                onChange={onChangeItem}
                onRemove={onRemove}
              />
            ))}
          </div>

          {/* Xem trước trực tiếp */}
          <div className="col-xl-4">
            <div style={{ position: 'sticky', top: 16 }}>
              <div className="card border">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-bold small d-flex align-items-center gap-1"><Eye size={15} /> Xem trước thẻ #{activeIndex + 1}</span>
                  <div className="btn-group btn-group-sm">
                    <button type="button" className="btn btn-outline-secondary" disabled={activeIndex <= 0} onClick={() => setActiveKey(items[activeIndex - 1].uniqueKey)} title="Máy trước">
                      <ChevronLeft size={14} />
                    </button>
                    <button type="button" className="btn btn-outline-secondary" disabled={activeIndex >= items.length - 1} onClick={() => setActiveKey(items[activeIndex + 1].uniqueKey)} title="Máy sau">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                <div className="card-body d-flex justify-content-center bg-body-tertiary py-3">
                  {activeItem && (
                    <div style={{ width: `${cardSize.w}mm`, height: `${cardSize.h}mm`, boxShadow: '0 2px 10px rgba(0,0,0,.12)' }}>
                      <PriceCard item={activeItem} />
                    </div>
                  )}
                </div>
                <div className="card-footer bg-white small text-secondary text-center">
                  Kích thước thẻ khổ {layout.label} ({layout.desc})
                </div>
              </div>

              <div className="card border mt-3">
                <div className="card-body py-2 small">
                  <div className="d-flex justify-content-between py-1"><span className="text-secondary">Số máy</span><b>{items.length}</b></div>
                  <div className="d-flex justify-content-between py-1"><span className="text-secondary">Tổng thẻ in</span><b className="text-primary">{totalPrint}</b></div>
                  <div className="d-flex justify-content-between py-1"><span className="text-secondary">Số trang {layout.label}</span><b>{totalPages}</b></div>
                  {missingPriceCount > 0 && (
                    <div className="text-warning-emphasis pt-1 border-top mt-1">⚠ {missingPriceCount} máy chưa có giá (sẽ in "Liên hệ")</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-footer bg-white d-flex align-items-center justify-content-between py-3 px-4" style={{ position: 'sticky', bottom: 0, zIndex: 5, boxShadow: '0 -4px 12px rgba(0,0,0,.05)' }}>
        <button type="button" className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={onBack}>
          <ChevronLeft size={16} /> Chọn thêm máy
        </button>
        <span className="text-secondary d-none d-md-inline">Tổng in: <b className="text-primary">{totalPrint}</b> thẻ từ {items.length} máy</span>
        <button type="button" className="btn btn-primary d-flex align-items-center gap-2 px-4" disabled={totalPrint === 0} onClick={onNext}>
          Xem trước & In <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Bước 3: Xem trước & In
   ============================================================ */
function buildPrintHtml(pages, layout) {
  const pgW = `${layout.pageW}mm`;
  const pgH = `${layout.pageH}mm`;

  const pagesHtml = pages.map(pageItems => {
    const cardsHtml = pageItems.map(item => {
      const specs = [
        ['CPU', item.cpuCode],
        ['RAM', item.ramCode],
        ['SSD', item.ssdCode],
        ['Màn hình', item.screenSpec],
        ['VGA', getGpuText(item)],
      ].map(([label, val]) => `<div class="spec"><b>${label}:</b> ${escapeHtml(val)}</div>`).join('')
        + `<div class="spec"><b>Trọng lượng:</b> ${item.weightKg ? `${escapeHtml(item.weightKg)}<i style="font-weight: normal;">Kg</i>` : ''}</div>`;

      return `<div class="card">
        <div class="logo"><img src="${logoQK}" alt="QK"/></div>
        <div class="model">${escapeHtml(item.modelTitle || getFullModelName(item))}</div>
        <div class="price">Giá: ${escapeHtml(getPriceText(item))}</div>
        <div class="divider"></div>
        <div class="specs">${specs}</div>
        <div class="warranty">${escapeHtml(item.warrantyText || DEFAULT_WARRANTY)}</div>
        <div class="policy">${POLICY_LINES.map(l => `<div>${escapeHtml(l)}</div>`).join('')}</div>
      </div>`;
    }).join('');
    return `<div class="page"><div class="grid">${cardsHtml}</div></div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Bảng giá - QK Shop</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; }
@page { size: ${pgW} ${pgH}; margin: 0; }
.page { width: ${pgW}; height: ${pgH}; page-break-after: always; break-after: page; overflow: hidden; }
.page:last-child { page-break-after: auto; break-after: auto; }
.grid { display: grid; grid-template-columns: repeat(${layout.cols}, 1fr); grid-template-rows: repeat(${layout.rows}, 1fr); gap: 5px; padding: 5px; width: 100%; height: 100%; }
.card { border: 1.5px solid #111; padding: 10px 14px; display: flex; flex-direction: column; overflow: hidden; width: 100%; height: 100%; background: #fff; }
.logo { text-align: center; margin-bottom: 6px; flex-shrink: 0; }
.logo img { height: 70px; max-width: 100%; object-fit: contain; margin-top: -17px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.model { background: #000; color: #fff; text-align: center; font-weight: 900; font-size: 15px; line-height: 1.3; padding: 6px 8px; margin-top: -20px; word-wrap: break-word; flex-shrink: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.price { text-align: center; font-weight: 900; font-size: 20px; margin: 8px 0 4px; color: #000; flex-shrink: 0; }
.divider { border-bottom: 2px solid #000; height: 0; margin: 0 8px 8px; flex-shrink: 0; }
.specs { flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 6px; color: #000; }
.spec { font-size: 12.5px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.warranty { background: #333; color: #fff; text-align: center; font-weight: 700; font-size: 13px; line-height: 1.4; padding: 8px 4px; margin: 8px 0; flex-shrink: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.policy { font-size: 9px; font-style: italic; font-weight: 700; color: #000; line-height: 1.35; flex-shrink: 0; }
.policy div { white-space: normal; word-wrap: break-word; }
</style>
</head>
<body>
${pagesHtml}
<script>window.onload = function() { setTimeout(function(){ window.print(); }, 500); };</script>
</body>
</html>`;
}

function StepXemTruoc({ items, pageSize, setPageSize, onBack }) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [zoom, setZoom] = useState(0.8);
  const { showToast } = useToast();

  const layout = PAGE_LAYOUTS[pageSize];
  const perPage = layout.cols * layout.rows;
  const pages = useMemo(() => {
    const result = [];
    for (let i = 0; i < items.length; i += perPage) result.push(items.slice(i, i + perPage));
    return result;
  }, [items, perPage]);
  const emptySlots = pages.length > 0 ? perPage - pages[pages.length - 1].length : 0;

  const handleQuickPrint = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      showToast('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép pop-up.', 'warning');
      return;
    }
    win.document.write(buildPrintHtml(pages, layout));
    win.document.close();
  };

  /* --- Xuất PDF JasperReports (pixel-perfect) --- */
  const handleExportPdf = async () => {
    if (items.length === 0) return;
    setLoadingPdf(true);
    try {
      const payload = {
        pageSize, // 'A4' hoặc 'A5'
        items: items.map(item => ({
          ...item,
          platformCode: item.modelTitle || getFullModelName(item),
          cpuCode: item.cpuCode || '',
          ramCode: item.ramCode || '',
          ssdCode: item.ssdCode || '',
          screenSpec: item.screenSpec || '',
          gpuCode: item.gpuCode || '',
          weightKg: item.weightKg || '',
          defaultSalePrice: item.editPrice !== undefined && item.editPrice !== '' ? item.editPrice : item.defaultSalePrice,
          warrantyText: item.warrantyText || DEFAULT_WARRANTY
        }))
      };

      const blob = await priceListApi.exportPdf(payload);
      const pdfBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch (err) {
      showToast('Lỗi khi tạo PDF: ' + (err.userMessage || err.message || 'Không thể kết xuất file PDF'), 'danger');
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="card shadow-sm border-0">
      {/* Thanh công cụ */}
      <div className="card-header bg-white p-3 d-flex flex-wrap align-items-center justify-content-between gap-3" style={{ position: 'sticky', top: 0, zIndex: 5 }}>
        <div className="d-flex align-items-center gap-3">
          <button type="button" className="btn btn-outline-secondary d-flex align-items-center gap-1" onClick={onBack}>
            <ChevronLeft size={16} /> Sửa thông tin
          </button>
          <div className="small text-secondary">
            <b className="text-dark">{items.length}</b> thẻ · <b className="text-dark">{pages.length}</b> trang {layout.label}
            {emptySlots > 0 && <span className="ms-1">(trang cuối trống {emptySlots} ô)</span>}
          </div>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="btn-group btn-group-sm" role="group" aria-label="Khổ giấy">
            {Object.entries(PAGE_LAYOUTS).map(([key, l]) => (
              <button key={key} type="button" className={`btn ${pageSize === key ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setPageSize(key)}>
                {l.label} <span className="opacity-75">({l.desc})</span>
              </button>
            ))}
          </div>

          <div className="btn-group btn-group-sm" role="group" aria-label="Thu phóng">
            <button type="button" className="btn btn-outline-secondary" disabled={zoom <= 0.5} onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))} title="Thu nhỏ"><ZoomOut size={14} /></button>
            <span className="btn btn-outline-secondary disabled" style={{ minWidth: 54 }}>{Math.round(zoom * 100)}%</span>
            <button type="button" className="btn btn-outline-secondary" disabled={zoom >= 1.2} onClick={() => setZoom(z => Math.min(1.2, +(z + 0.1).toFixed(1)))} title="Phóng to"><ZoomIn size={14} /></button>
          </div>
          <button type="button" className="btn btn-primary d-flex align-items-center gap-1" onClick={handleExportPdf} disabled={loadingPdf} title="Xuất file PDF chuẩn để in">
            {loadingPdf ? <span className="spinner-border spinner-border-sm" /> : <FileText size={16} />}
            {loadingPdf ? 'Đang tạo PDF...' : 'Xuất PDF'}
          </button>
        </div>
      </div>

      {/* Vùng xem trước */}
      <div className="card-body bg-body-tertiary py-4" style={{ overflowX: 'auto' }}>
        <div style={{ zoom, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          {pages.map((pageItems, pageIdx) => (
            <div key={pageIdx}>
              <div className="text-secondary small mb-1 fw-semibold">Trang {pageIdx + 1}/{pages.length}</div>
              <div style={{
                background: '#fff',
                boxShadow: '0 2px 16px rgba(0,0,0,.15)',
                width: `${layout.pageW}mm`,
                height: `${layout.pageH}mm`,
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                  gap: '5px',
                  padding: '5px',
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                }}>
                  {pageItems.map(item => <PriceCard key={item.printKey} item={item} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Trang chính
   ============================================================ */
export default function TrangBangGia() {
  const { showToast } = useToast();
  const { hasPermission, requirePermission } = useAuth();
  const canManagePricing = hasPermission('PRICING_MANAGE');
  const [step, setStep] = useState(1);
  const [selectedConfigs, setSelectedConfigs] = useState(() => new Map());
  const [editItems, setEditItems] = useState([]);
  const [pageSize, setPageSize] = useState('A4');

  // Danh sách thẻ in (nhân bản theo số lượng in của từng máy)
  const printItems = useMemo(() => {
    const result = [];
    editItems.forEach(it => {
      const qty = parseInt(it.printQty) || 0;
      for (let i = 0; i < qty; i++) {
        result.push({ ...it, configId: `${it.configId}_${i}`, printKey: `${it.uniqueKey}__${i}` });
      }
    });
    return result;
  }, [editItems]);

  // Sang bước 2: giữ lại các chỉnh sửa trước đó của máy vẫn còn được chọn
  const goToEdit = () => {
    setEditItems(prev => {
      const prevMap = new Map(prev.map(it => [it.uniqueKey, it]));
      return Array.from(selectedConfigs.values()).map(cfg => prevMap.get(cfg.uniqueKey) || createEditableItem(cfg));
    });
    setStep(2);
  };

  const handleChangeItem = (key, field, value) => {
    if (field !== 'printQty' && !requirePermission('PRICING_MANAGE', showToast, 'Chỉnh sửa giá và cấu hình trên thẻ bảng giá')) {
      return;
    }
    setEditItems(prev => prev.map(it => (it.uniqueKey === key ? { ...it, [field]: value } : it)));
  };

  const handleBulkUpdate = (updater) => {
    if (!requirePermission('PRICING_MANAGE', showToast, 'Áp dụng chỉnh sửa hàng loạt trên bảng giá')) {
      return;
    }
    setEditItems(prev => prev.map(updater));
  };

  const handleRemoveItem = (key) => {
    setEditItems(prev => prev.filter(it => it.uniqueKey !== key));
    setSelectedConfigs(prev => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const canGoTo = (n) => {
    if (n === 1) return true;
    if (n === 2) return selectedConfigs.size > 0;
    if (n === 3) return step >= 2 && editItems.length > 0 && printItems.length > 0;
    return false;
  };

  const handleGoTo = (n) => {
    if (n === step) return;
    if (n === 2) goToEdit();
    else setStep(n);
  };

  return (
    <div className="container-fluid p-0">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <div>
          <h2 className="fw-bold d-flex align-items-center gap-2 mb-1">
            <Tag size={28} className="text-primary" /> Bảng giá
          </h2>
          <p className="text-secondary mb-0">Tạo và in thẻ giá theo cấu hình máy (A4 = 9 thẻ/trang, A5 = 4 thẻ/trang)</p>
        </div>
      </div>

      {!canManagePricing && (
        <div className="alert alert-warning border-warning d-flex align-items-center gap-2 py-2 px-3 mb-3 small">
          <Lock size={16} className="flex-shrink-0" />
          <span>
            Bạn đang xem với quyền <strong>Xem bảng giá niêm yết (PRICING_VIEW)</strong>. Bạn có thể chọn máy, xem trước và xuất bảng giá mặc định, nhưng không thể sửa giá hoặc thông số (Cần quyền <strong>PRICING_MANAGE</strong>).
          </span>
        </div>
      )}

      <StepIndicator step={step} canGoTo={canGoTo} onGoTo={handleGoTo} />

      {/* Giữ bước 1 luôn được mount để không mất trạng thái duyệt Hãng/Dòng máy khi quay lại */}
      <div className={step === 1 ? '' : 'd-none'}>
        <StepChonMay selectedConfigs={selectedConfigs} setSelectedConfigs={setSelectedConfigs} onNext={goToEdit} />
      </div>

      {step === 2 && (
        <StepChinhSua
          items={editItems}
          pageSize={pageSize}
          onChangeItem={handleChangeItem}
          onBulkUpdate={handleBulkUpdate}
          onRemove={handleRemoveItem}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepXemTruoc items={printItems} pageSize={pageSize} setPageSize={setPageSize} onBack={() => setStep(2)} />
      )}
    </div>
  );
}
