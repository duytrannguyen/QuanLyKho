import React, { useState, useMemo } from 'react';
import {
  ChevronLeft, FileText, ZoomIn, ZoomOut
} from 'lucide-react';
import { priceListApi } from '../../../api';
import { useToast } from '../../../contexts/notification/NguCanhThongBao';
import logoQK from '../../../assets/qkshop_logo.jpg';
import { PriceCard } from './PriceCard';
import {
  DEFAULT_WARRANTY,
  POLICY_LINES,
  PAGE_LAYOUTS,
  getFullModelName,
  getPriceText,
  getGpuText,
  escapeHtml
} from './bangGiaConstants';

export function buildPrintHtml(pages, layout) {
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

export default function StepXemTruocVaIn({ items, pageSize, setPageSize, onBack }) {
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

