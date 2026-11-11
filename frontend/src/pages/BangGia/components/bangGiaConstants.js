import { formatCurrency } from '../../../utils/dinh_dang';

export const DEFAULT_WARRANTY = 'Bảo hành phần cứng 06 tháng';

export const WARRANTY_OPTIONS = [
  'Bảo hành phần cứng 03 tháng',
  'Bảo hành phần cứng 06 tháng',
  'Bảo hành phần cứng 12 tháng',
];

export const POLICY_LINES = [
  '- Vệ sinh bảo dưỡng, cài đặt máy miễn phí.',
  '- 1 đổi 1 trong vòng 07 ngày đầu nếu lỗi do nhà sx.',
  '- QUÀ TẶNG: Balo, chuột không dây, miếng lót chuột và túi chống sốc.',
];

export const PAGE_LAYOUTS = {
  A4: { cols: 3, rows: 3, pageW: 210, pageH: 297, label: 'A4', desc: '9 thẻ/trang' },
  A5: { cols: 2, rows: 2, pageW: 148, pageH: 210, label: 'A5', desc: '4 thẻ/trang' },
};

export const GRID_GAP_MM = 1.3; // ≈ 5px, khớp với bản in

export function getCardSizeMm(layout) {
  const pad = GRID_GAP_MM * 2;
  return {
    w: (layout.pageW - pad - GRID_GAP_MM * (layout.cols - 1)) / layout.cols,
    h: (layout.pageH - pad - GRID_GAP_MM * (layout.rows - 1)) / layout.rows,
  };
}

export function getShortModelName(fullName) {
  if (!fullName) return '';
  const kw = [' CPU', ' /', ' Ram', ' RAM', ' - CPU', ' SSD', ' - '];
  let minIdx = fullName.length;
  for (const k of kw) {
    const idx = fullName.toUpperCase().indexOf(k.toUpperCase());
    if (idx !== -1 && idx < minIdx) minIdx = idx;
  }
  return fullName.substring(0, minIdx).trim();
}

export function getFullModelName(item) {
  if (!item) return '';
  const raw = item.platformName || item.platformCode || item.displayName || item.shortName || '';
  return getShortModelName(raw) || raw;
}

export function normalizePrice(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Math.round(Number(value));
  return Number.isFinite(num) && num > 0 ? String(num) : '';
}

export function getPriceText(item) {
  if (item.editPrice) return formatCurrency(item.editPrice) + 'đ';
  if (item.defaultSalePrice) return formatCurrency(normalizePrice(item.defaultSalePrice)) + 'đ';
  return 'Liên hệ';
}

export function getGpuText(item) {
  const gpu = (item.gpuCode || '').trim();
  return gpu && gpu.toUpperCase() !== 'ONBOARD' ? gpu : '';
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function createEditableItem(cfg) {
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

