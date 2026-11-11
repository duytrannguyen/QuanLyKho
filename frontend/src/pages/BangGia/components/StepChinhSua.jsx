import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Minus, Plus, Trash2, RotateCcw, Eye
} from 'lucide-react';
import { formatCurrency, parseCurrency } from '../../../utils/dinh_dang';
import { useToast } from '../../../contexts/notification/NguCanhThongBao';
import { PriceCard } from './PriceCard';
import {
  DEFAULT_WARRANTY,
  PAGE_LAYOUTS,
  getCardSizeMm
} from './bangGiaConstants';

export function FieldLabel({ children }) {
  return <label className="form-label text-secondary fw-semibold mb-1" style={{ fontSize: '11.5px' }}>{children}</label>;
}

export function EditItemCard({ item, index, isActive, onActivate, onChange, onRemove }) {
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

export default function StepChinhSua({ items, pageSize, onChangeItem, onBulkUpdate, onRemove, onBack, onNext }) {
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
    showToast('Đã khôi phục giá gốc cho toàn bộ máy', 'info');
  };

  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-body p-4">
        {/* Thanh công cụ hàng loạt */}
        <div className="bg-light border rounded p-3 mb-4">
          <div className="fw-bold small text-uppercase text-secondary mb-2">Thao tác nhanh cho toàn bộ danh sách:</div>
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

