import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Printer, CheckCircle2, Laptop, User, Phone, ShieldCheck,
  Truck, MapPin, Gift, Copy, Check, PlusCircle, Store, Receipt
} from 'lucide-react';

import { dinhDangTien, formatDate } from '../../../utils/dinh_dang';
import logoQK from '../../../assets/qkshop_logo.png';

// ======================================================
// 1. HÀM HỖ TRỢ & CHUẨN HÓA DỮ LIỆU HÓA ĐƠN
// ======================================================

const toAmount = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined || value === '') return 0;
  const str = String(value).trim();
  if (/^-?\d+(\.\d+)?$/.test(str)) return Math.round(Number(str));
  const digits = str.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

const money = (value) => `${dinhDangTien(toAmount(value)) || '0'}đ`;

const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

function parseUpgradeNote(note) {
  if (!note || typeof note !== 'string') {
    return { items: [], warrantyText: '' };
  }

  let text = note.trim();
  let warrantyText = '';

  const warrantyMatch = text.match(/\[BH theo máy:\s*([^\]]+)\]/i);
  if (warrantyMatch) {
    warrantyText = warrantyMatch[1].trim();
    text = text.replace(warrantyMatch[0], '').trim();
  }

  const items = text
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/\(\+?([0-9.,]+)\s*([đdvnVNĐ]*)\)/);
      if (!match) {
        return { label: item, amount: 0, priceText: null };
      }
      const amount = toAmount(match[1]);
      return {
        label: item.replace(match[0], '').trim(),
        amount,
        priceText: amount > 0 ? `+${money(amount)}` : null
      };
    });

  return { items, warrantyText };
}

function buildInvoiceData(order) {
  const accessories = Array.isArray(order.accessories) ? order.accessories : [];
  const gifts = accessories
    .filter((a) => a.isGift && !a.isUpgrade)
    .map((g) => ({
      ...g,
      quantity: Math.max(1, Number(g.quantity) || 1)
    }));

  const paid = accessories
    .filter((a) => !a.isGift && !a.isUpgrade)
    .map((p) => {
      const quantity = Math.max(1, Number(p.quantity) || 1);
      const unitPrice = toAmount(p.price);
      return {
        ...p,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity
      };
    });

  const parsedUpgrade = parseUpgradeNote(order.upgradeNote);
  const fallbackUpgrades = accessories
    .filter((a) => a.isUpgrade)
    .map((u) => {
      const amount = toAmount(u.price);
      return {
        label: u.name,
        amount,
        priceText: amount > 0 ? `+${money(amount)}` : null
      };
    });

  const upgrades = parsedUpgrade.items.length > 0 ? parsedUpgrade.items : fallbackUpgrades;

  const hasGross =
    order.grossRevenue !== undefined &&
    order.grossRevenue !== null &&
    order.grossRevenue !== '';
  const machineBasePrice = hasGross
    ? toAmount(order.grossRevenue)
    : (toAmount(order.defaultSalePrice) || toAmount(order.finalPrice));

  const specs = String(order.productSummary || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  const isShipping = Boolean(order.isShipping);
  const isDelivered = Boolean(order.isDelivered);
  const warrantyPeriod = order.warrantyPeriod || 'Theo quy định';
  const hasWarranty = !/không\s*bh|không\s*bảo\s*hành|từ chối/i.test(warrantyPeriod);

  return {
    orderCode: order.orderCode || order.serialKey || '—',
    cycleId: order.cycleId || '',
    saleDate: order.saleDate,
    machineName: order.productFullName || 'Laptop',
    brandName: order.brandName || '',
    serial: order.serialKey || '',
    specs,
    machineBasePrice,
    discount: toAmount(order.discount),
    finalPrice: toAmount(order.finalPrice),
    upgrades,
    upgradeWarrantyText: parsedUpgrade.warrantyText,
    chargerName: order.chargerName || '',
    chargerSku: order.chargerSku || '',
    gifts,
    paid,
    warrantyPeriod,
    hasWarranty,
    warrantyExpiry: order.warrantyExpiry,
    customerName: order.customerName || 'Khách vãng lai',
    customerPhone: order.customerPhone || '',
    salesperson: order.salesperson || '',
    isShipping,
    isDelivered,
    deliveryDate: order.deliveryDate,
    shippingCarrier: order.shippingCarrier || '',
    trackingCode: order.trackingCode || '',
    shippingAddress: order.shippingAddress || ''
  };
}

// ======================================================
// 2. HTML PHIẾU IN A4
// ======================================================

function createPrintHTML(invoice) {
  const e = escapeHTML;
  const serial = e(invoice.serial);

  const shippingInfo = invoice.isShipping
    ? `Đơn ship xa ${invoice.isDelivered
      ? `(Đã giao: ${formatDate(invoice.deliveryDate)})`
      : '(Chờ khách nhận hàng)'}`
    : 'Mua và nhận máy trực tiếp tại quầy';

  let rowNumber = 1;

  const chargerRowHTML = invoice.chargerName ? (() => {
    rowNumber += 1;
    return `
      <tr>
        <td class="center">${rowNumber}</td>
        <td>
          <strong class="green">Sạc kèm theo máy: ${e(invoice.chargerName)}</strong>
          ${invoice.chargerSku ? `<div class="sub">SKU: ${e(invoice.chargerSku)}</div>` : ''}
        </td>
        <td>
          Bảo hành đồng bộ theo máy${invoice.hasWarranty ? ` (${e(invoice.warrantyPeriod)})` : ''}
        </td>
        <td class="center">1</td>
        <td class="right green">Kèm máy (0đ)</td>
      </tr>
    `;
  })() : '';

  const upgradeRowsHTML = invoice.upgrades.map((u) => {
    rowNumber += 1;
    return `
      <tr>
        <td class="center">${rowNumber}</td>
        <td>
          <strong>Nâng cấp: ${e(u.label)}</strong>
        </td>
        <td>
          Bảo hành theo máy${invoice.upgradeWarrantyText ? ` (${e(invoice.upgradeWarrantyText)})` : ''}
        </td>
        <td class="center">1</td>
        <td class="right amber">${u.amount > 0 ? `+${money(u.amount)}` : 'Theo máy'}</td>
      </tr>
    `;
  }).join('');

  const paidRowsHTML = invoice.paid.map((p) => {
    rowNumber += 1;
    return `
      <tr>
        <td class="center">${rowNumber}</td>
        <td>
          <strong class="blue">Phụ kiện: ${e(p.name)}</strong>
          ${p.quantity > 1 ? `<div class="sub">Đơn giá: ${money(p.unitPrice)}</div>` : ''}
        </td>
        <td>Phụ kiện bán kèm</td>
        <td class="center">${p.quantity}</td>
        <td class="right">${money(p.totalPrice)}</td>
      </tr>
    `;
  }).join('');

  const giftRowHTML = invoice.gifts.length ? `
    <tr>
      <td class="center">${rowNumber + 1}</td>
      <td colspan="2">
        <strong class="green">Quà tặng kèm theo máy:</strong>
        <div class="gift-list">
          ${invoice.gifts.map((g) => `• ${e(g.name)}${g.quantity > 1 ? ` (x${g.quantity})` : ''}`).join('<br>')}
        </div>
      </td>
      <td class="center">${invoice.gifts.reduce((sum, g) => sum + g.quantity, 0)}</td>
      <td class="right green">Miễn phí</td>
    </tr>
  ` : '';

  const warrantyDurationText = invoice.warrantyExpiry
    ? `đến ngày <strong>${formatDate(invoice.warrantyExpiry)}</strong>`
    : (invoice.isShipping && !invoice.isDelivered ? '— <em>Kích hoạt từ ngày khách nhận hàng</em>' : '');

  return `
  <!DOCTYPE html>
  <html lang="vi">
  <head>
    <meta charset="UTF-8">
    <title>Phiếu xuất kho - ${serial}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        color: #0f172a;
        font-size: 12.5px;
        line-height: 1.45;
        padding: 18px 22px;
        margin: 0;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #0284c7;
        padding-bottom: 12px;
      }
      .logo {
        font-size: 22px;
        font-weight: 800;
        color: #0284c7;
        letter-spacing: -0.3px;
      }
      .subtitle { color: #475569; font-size: 11.5px; }
      .invoice { text-align: right; font-size: 12px; line-height: 1.5; }
      .title {
        text-align: center;
        margin: 16px 0 14px;
      }
      .title h2 {
        font-size: 18px;
        margin: 0 0 3px;
        letter-spacing: 0.4px;
      }
      .title-sub { color: #475569; font-size: 12px; }
      .section { margin-bottom: 14px; }
      .section-title {
        font-weight: 700;
        font-size: 12px;
        color: #0369a1;
        border-bottom: 1px solid #cbd5e1;
        padding-bottom: 4px;
        margin-bottom: 8px;
        text-transform: uppercase;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 18px;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        padding: 10px 12px;
        border-radius: 6px;
      }
      .info-row { display: flex; gap: 6px; }
      .info-label { width: 122px; flex-shrink: 0; color: #475569; }
      .info-value { font-weight: 600; color: #0f172a; }
      .full { grid-column: 1 / -1; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6px;
      }
      th, td {
        border: 1px solid #94a3b8;
        padding: 7px 8px;
        vertical-align: top;
      }
      th {
        background: #f1f5f9;
        font-size: 11px;
        text-transform: uppercase;
        color: #334155;
      }
      .sub { font-size: 11px; color: #475569; margin-top: 2px; }
      .gift-list { margin-top: 3px; line-height: 1.45; }
      .center { text-align: center; }
      .right { text-align: right; font-weight: 700; white-space: nowrap; }
      .green { color: #15803d; }
      .blue { color: #0369a1; }
      .amber { color: #b45309; }
      .total {
        text-align: right;
        background: #f0f9ff;
        border: 1.5px solid #0284c7;
        padding: 10px 14px;
        margin-top: 10px;
        border-radius: 6px;
      }
      .total-price {
        color: #0369a1;
        font-size: 19px;
        font-weight: 800;
        margin-left: 6px;
      }
      .terms {
        border: 1px dashed #94a3b8;
        background: #fafafa;
        border-radius: 6px;
        padding: 10px 12px;
        margin-top: 14px;
        font-size: 11px;
      }
      .terms p { margin: 3px 0; }
      .signatures {
        display: flex;
        justify-content: space-around;
        text-align: center;
        margin-top: 26px;
      }
      .sign-col { width: 220px; }
      .sign-title { font-weight: 700; font-size: 12px; }
      .sign-note { font-size: 11px; color: #64748b; margin-top: 2px; }
      .sign-name { margin-top: 46px; font-weight: 600; font-size: 12px; }
      @media print {
        body { padding: 8px; }
        .info-grid, .total, .terms, th {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
      @page { size: A4; margin: 10mm; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="logo"><img src="${logoQK.startsWith('data:') || logoQK.startsWith('http') ? logoQK : `${window.location.origin}${logoQK}`}" alt="QKSHOP.VN" style="height: 32px; width: auto; object-fit: contain; display: block; margin-bottom: 4px;" /></div>
        <div class="subtitle">Chuyên Laptop Doanh Nhân &amp; Máy Trạm Cao Cấp</div>
        <div class="subtitle">Hotline: 0939.xxx.xxx | Website: qkshop.vn</div>
      </div>
      <div class="invoice">
        <div>Mã hóa đơn: <strong>#${e(invoice.orderCode)}</strong></div>
        ${invoice.cycleId ? `<div>Mã chu kỳ: <strong>${e(invoice.cycleId)}</strong></div>` : ''}
        <div>Ngày in: <strong>${new Date().toLocaleDateString('vi-VN')}</strong></div>
      </div>
    </div>

    <div class="title">
      <h2>PHIẾU XUẤT KHO KIÊM BẢO HÀNH</h2>
      <div class="title-sub">Ngày lập phiếu / bán hàng: <strong>${formatDate(invoice.saleDate)}</strong></div>
    </div>

    <div class="section">
      <div class="section-title">I. Thông tin khách hàng &amp; giao nhận</div>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Khách hàng:</span>
          <span class="info-value">${e(invoice.customerName)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Số điện thoại:</span>
          <span class="info-value">${e(invoice.customerPhone || 'Không có')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nhân viên bán:</span>
          <span class="info-value">${e(invoice.salesperson || 'Nhân viên QKShop')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Gói bảo hành:</span>
          <span class="info-value">${e(invoice.warrantyPeriod)}</span>
        </div>
        <div class="info-row full">
          <span class="info-label">Hình thức giao nhận:</span>
          <span class="info-value">${shippingInfo}</span>
        </div>
        ${invoice.isShipping && invoice.shippingCarrier ? `
          <div class="info-row full">
            <span class="info-label">Đơn vị vận chuyển:</span>
            <span class="info-value">${e(invoice.shippingCarrier)}${invoice.trackingCode ? ` (Mã vận đơn: ${e(invoice.trackingCode)})` : ''}</span>
          </div>
        ` : ''}
        ${invoice.isShipping && invoice.shippingAddress ? `
          <div class="info-row full">
            <span class="info-label">Địa chỉ nhận hàng:</span>
            <span class="info-value">${e(invoice.shippingAddress)}</span>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">II. Chi tiết sản phẩm &amp; dịch vụ xuất kho</div>
      <table>
        <thead>
          <tr>
            <th style="width: 38px;">STT</th>
            <th>Sản phẩm / Hạng mục</th>
            <th>Thông số cấu hình / Serial</th>
            <th style="width: 44px;">SL</th>
            <th style="width: 118px;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="center">1</td>
            <td>
              <strong>${e(invoice.machineName)}</strong>
              ${invoice.brandName ? `<div class="sub">Hãng: ${e(invoice.brandName)}</div>` : ''}
            </td>
            <td>
              <strong>SN: ${serial}</strong>
              ${invoice.specs.length ? `<div class="sub">${e(invoice.specs.join(' • '))}</div>` : ''}
            </td>
            <td class="center">1</td>
            <td class="right">${money(invoice.machineBasePrice)}</td>
          </tr>
          ${chargerRowHTML}
          ${upgradeRowsHTML}
          ${paidRowsHTML}
          ${giftRowHTML}
        </tbody>
      </table>

      <div class="total">
        ${invoice.discount > 0 ? `
          <div style="color:#dc2626;margin-bottom:4px;font-weight:600;">
            Ưu đãi / Giảm giá: -${money(invoice.discount)}
          </div>
        ` : ''}
        <strong>Tổng tiền thanh toán:</strong>
        <span class="total-price">${money(invoice.finalPrice)}</span>
      </div>
    </div>

    <div class="terms">
      <strong>CAM KẾT &amp; ĐIỀU KHOẢN BẢO HÀNH:</strong>
      <p>1. Sản phẩm còn nguyên tem niêm phong của QKShop, số Serial trên máy phải trùng khớp với phiếu bảo hành và hệ thống.</p>
      <p>2. Không bảo hành các trường hợp máy bị rơi vỡ, cấn móp, vào nước, chập cháy do nguồn điện hoặc có dấu hiệu tháo mở can thiệp phần cứng trái phép.</p>
      <p>3. Thời hạn bảo hành: <strong>${e(invoice.warrantyPeriod)}</strong> (Từ ngày <strong>${formatDate(invoice.saleDate)}</strong> ${warrantyDurationText}).</p>
    </div>

    <div class="signatures">
      <div class="sign-col">
        <div class="sign-title">KHÁCH HÀNG</div>
        <div class="sign-note">(Ký và ghi rõ họ tên)</div>
      </div>
      <div class="sign-col">
        <div class="sign-title">NGƯỜI LẬP PHIẾU</div>
        <div class="sign-note">(Ký và ghi rõ họ tên)</div>
        ${invoice.salesperson ? `<div class="sign-name">${e(invoice.salesperson)}</div>` : ''}
      </div>
    </div>

    <script>
      window.onload = function() {
        setTimeout(function() { window.print(); }, 200);
      };
    </script>
  </body>
  </html>
  `;
}

// ======================================================
// 3. THÀNH PHẦN GIAO DIỆN NHỎ DÙNG CHUNG
// ======================================================

function SectionHeader({ icon: Icon, title, right }) {
  return (
    <div className="d-flex align-items-center justify-content-between gap-2 pb-2 mb-2 border-bottom">
      <div className="d-flex align-items-center gap-1 text-secondary">
        <Icon size={14} className="text-primary flex-shrink-0" />
        <span
          className="fw-bold text-uppercase"
          style={{ fontSize: '0.7rem', letterSpacing: '0.45px' }}
        >
          {title}
        </span>
      </div>
      {right}
    </div>
  );
}

function CopyChip({ value, copied, onCopy, title = 'Sao chép', icon: LeadingIcon }) {
  if (!value) {
    return <span className="text-muted small">—</span>;
  }

  return (
    <button
      type="button"
      title={copied ? 'Đã sao chép!' : title}
      onClick={(event) => {
        event.stopPropagation();
        onCopy(value);
      }}
      className={`btn btn-sm d-inline-flex align-items-center gap-1 border shadow-none ${
        copied ? 'btn-success-subtle text-success border-success-subtle' : 'btn-light text-dark'
      }`}
      style={{ fontSize: '0.76rem', padding: '2px 8px', lineHeight: 1.35 }}
    >
      {LeadingIcon && <LeadingIcon size={12} className="text-secondary flex-shrink-0" />}
      <span className="font-monospace fw-semibold">{value}</span>
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} className="text-secondary" />}
    </button>
  );
}

// ======================================================
// 4. COMPONENT CHÍNH
// ======================================================

export default function ModalInHoaDonSauBan({ order, onClose }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const copyTimerRef = useRef(null);
  const statusTimerRef = useRef(null);

  const invoice = useMemo(() => (order ? buildInvoiceData(order) : null), [order]);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, []);

  const handleCopy = useCallback(async (value, key) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedKey(key);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      setStatusMessage('Không thể sao chép tự động. Vui lòng kiểm tra quyền clipboard của trình duyệt.');
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => setStatusMessage(''), 3000);
    }
  }, []);

  const handlePrint = useCallback(() => {
    if (!invoice) return;
    const printWindow = window.open('', '_blank', 'width=850,height=920');

    if (!printWindow) {
      setStatusMessage('Trình duyệt đang chặn cửa sổ bật lên. Vui lòng cho phép popup để in phiếu bảo hành.');
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => setStatusMessage(''), 4000);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(createPrintHTML(invoice));
    printWindow.document.close();
  }, [invoice]);

  useEffect(() => {
    if (!order) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key === 'Enter' && !event.repeat) {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          (target.closest('input, textarea, select, button, a') || target.isContentEditable)
        ) {
          return;
        }
        event.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, handlePrint, onClose]);

  if (!order || !invoice) return null;

  const isPendingShipping = invoice.isShipping && !invoice.isDelivered;

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-sale-success-title"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.62)',
        backdropFilter: 'blur(4px)',
        zIndex: 1060
      }}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg"
        style={{ maxWidth: '820px' }}
      >
        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">

          {/* HEADER GỌN SẮC NÉT */}
          <div
            className="modal-header text-white border-0 px-3 px-md-4 py-3"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' }}
          >
            <div className="d-flex align-items-center gap-3 min-w-0">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'rgba(255, 255, 255, 0.18)'
                }}
              >
                <CheckCircle2 size={22} className="text-white" />
              </div>

              <div className="min-w-0">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <h5 id="modal-sale-success-title" className="modal-title fw-bold mb-0 fs-6">
                    Giao Dịch Bán Máy Thành Công
                  </h5>
                  <span
                    className={`badge rounded-pill fw-semibold ${
                      isPendingShipping ? 'bg-warning text-dark' : 'bg-white text-success'
                    }`}
                    style={{ fontSize: '0.68rem' }}
                  >
                    {isPendingShipping ? 'CHỜ GIAO HÀNG' : 'ĐÃ XUẤT KHO'}
                  </span>
                </div>

                <div
                  className="d-flex flex-wrap align-items-center gap-2 mt-1"
                  style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.88)' }}
                >
                  <span>
                    Mã HĐ: <strong className="text-white font-monospace">#{invoice.orderCode}</strong>
                  </span>
                  {invoice.cycleId && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>
                        Chu kỳ: <strong className="text-white font-monospace">{invoice.cycleId}</strong>
                      </span>
                    </>
                  )}
                  {invoice.saleDate && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>
                        Ngày bán: <strong className="text-white">{formatDate(invoice.saleDate)}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-close btn-close-white shadow-none ms-2"
              onClick={onClose}
              aria-label="Đóng"
            />
          </div>

          {/* BODY */}
          <div className="modal-body p-3" style={{ backgroundColor: '#f1f5f9' }}>

            {/* TẦNG 1: THIẾT BỊ & BẢO HÀNH | KHÁCH HÀNG & GIAO NHẬN */}
            <div className="row g-2 g-md-3 mb-2 mb-md-3">

              {/* CỘT TRÁI: THIẾT BỊ & BẢO HÀNH */}
              <div className="col-md-6">
                <div className="bg-white border rounded-3 p-3 h-100 d-flex flex-column shadow-sm">
                  <SectionHeader
                    icon={Laptop}
                    title="Thiết bị & Bảo hành"
                    right={invoice.brandName ? (
                      <span
                        className="badge bg-primary-subtle text-primary border border-primary-subtle"
                        style={{ fontSize: '0.68rem' }}
                      >
                        {invoice.brandName}
                      </span>
                    ) : null}
                  />

                  <div className="fw-bold text-dark lh-sm mb-2" style={{ fontSize: '0.94rem' }}>
                    {invoice.machineName}
                  </div>

                  <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                    <span className="text-secondary" style={{ fontSize: '0.78rem' }}>Số Serial:</span>
                    <CopyChip
                      value={invoice.serial}
                      copied={copiedKey === 'serial'}
                      onCopy={(val) => handleCopy(val, 'serial')}
                      title="Sao chép số Serial"
                    />
                  </div>

                  {invoice.specs.length > 0 && (
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {invoice.specs.map((spec, idx) => (
                        <span
                          key={idx}
                          className="badge bg-light text-secondary border fw-normal text-wrap text-start"
                          style={{ fontSize: '0.71rem', lineHeight: 1.3 }}
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-1">
                    <div className={`d-flex align-items-center justify-content-between gap-2 border rounded-2 p-2 ${
                      invoice.hasWarranty
                        ? 'bg-success-subtle border-success-subtle'
                        : 'bg-light'
                    }`}>
                      <div className="d-flex align-items-center gap-2 min-w-0">
                        <ShieldCheck
                          size={16}
                          className={`flex-shrink-0 ${invoice.hasWarranty ? 'text-success' : 'text-secondary'}`}
                        />
                        <span
                          className={`fw-bold lh-sm ${invoice.hasWarranty ? 'text-success' : 'text-secondary'}`}
                          style={{ fontSize: '0.8rem' }}
                        >
                          {invoice.warrantyPeriod}
                        </span>
                      </div>
                      {invoice.hasWarranty && invoice.warrantyExpiry ? (
                        <span className="text-success-emphasis fw-medium text-nowrap" style={{ fontSize: '0.73rem' }}>
                          Đến {formatDate(invoice.warrantyExpiry)}
                        </span>
                      ) : invoice.hasWarranty && isPendingShipping ? (
                        <span className="text-warning-emphasis fw-medium text-nowrap" style={{ fontSize: '0.73rem' }}>
                          Kích hoạt khi giao
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: KHÁCH HÀNG & GIAO NHẬN */}
              <div className="col-md-6">
                <div className="bg-white border rounded-3 p-3 h-100 d-flex flex-column shadow-sm">
                  <SectionHeader
                    icon={User}
                    title="Khách hàng & Giao nhận"
                    right={
                      <span
                        className={`badge ${
                          invoice.isShipping
                            ? 'bg-primary-subtle text-primary border border-primary-subtle'
                            : 'bg-light text-secondary border'
                        }`}
                        style={{ fontSize: '0.68rem' }}
                      >
                        {invoice.isShipping ? 'Đơn ship xa' : 'Tại quầy'}
                      </span>
                    }
                  />

                  <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="fw-bold text-dark lh-sm" style={{ fontSize: '0.94rem' }}>
                        {invoice.customerName}
                      </div>
                      {invoice.salesperson && (
                        <div className="text-secondary mt-1" style={{ fontSize: '0.76rem' }}>
                          NV chốt: <strong className="text-dark">{invoice.salesperson}</strong>
                        </div>
                      )}
                    </div>

                    <CopyChip
                      value={invoice.customerPhone}
                      copied={copiedKey === 'phone'}
                      onCopy={(val) => handleCopy(val, 'phone')}
                      title="Sao chép số điện thoại"
                      icon={Phone}
                    />
                  </div>

                  <div className="mt-auto pt-1">
                    {invoice.isShipping ? (
                      <div className="bg-light border rounded-2 p-2 d-flex flex-column gap-1" style={{ fontSize: '0.77rem' }}>
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <span className="text-secondary d-inline-flex align-items-center gap-1">
                            <Truck size={13} className="text-primary" /> Trạng thái:
                          </span>
                          <span className={`badge ${
                            invoice.isDelivered
                              ? 'bg-success-subtle text-success'
                              : 'bg-warning-subtle text-warning-emphasis'
                          }`}>
                            {invoice.isDelivered
                              ? `Đã giao${invoice.deliveryDate ? ` • ${formatDate(invoice.deliveryDate)}` : ''}`
                              : 'Chờ khách nhận'}
                          </span>
                        </div>

                        {(invoice.shippingCarrier || invoice.trackingCode) && (
                          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                            <span className="text-secondary">
                              {invoice.shippingCarrier ? (
                                <strong className="text-primary">{invoice.shippingCarrier}</strong>
                              ) : 'Mã vận đơn:'}
                            </span>
                            {invoice.trackingCode && (
                              <CopyChip
                                value={invoice.trackingCode}
                                copied={copiedKey === 'tracking'}
                                onCopy={(val) => handleCopy(val, 'tracking')}
                                title="Sao chép mã vận đơn"
                              />
                            )}
                          </div>
                        )}

                        {invoice.shippingAddress && (
                          <div className="d-flex align-items-start gap-1 text-secondary border-top pt-1 mt-1">
                            <MapPin size={13} className="text-danger flex-shrink-0 mt-1" />
                            <span className="text-dark lh-sm">{invoice.shippingAddress}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="bg-light border rounded-2 px-2 py-2 d-flex align-items-center gap-2 text-dark fw-medium"
                        style={{ fontSize: '0.79rem' }}
                      >
                        <Store size={15} className="text-success flex-shrink-0" />
                        <span>Khách mua &amp; nhận máy trực tiếp tại quầy</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* TẦNG 2: CHI TIẾT ĐƠN HÀNG & TỔNG THANH TOÁN */}
            <div className="bg-white border rounded-3 overflow-hidden shadow-sm">
              <div className="px-3 py-2 border-bottom d-flex align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-1 text-secondary">
                  <Receipt size={14} className="text-primary" />
                  <span
                    className="fw-bold text-uppercase"
                    style={{ fontSize: '0.7rem', letterSpacing: '0.45px' }}
                  >
                    Chi tiết hạng mục &amp; Thanh toán
                  </span>
                </div>
                {invoice.upgradeWarrantyText && (
                  <span className="text-secondary" style={{ fontSize: '0.72rem' }}>
                    BH nâng cấp: <strong className="text-dark">{invoice.upgradeWarrantyText}</strong>
                  </span>
                )}
              </div>

              {/* DANH SÁCH HẠNG MỤC */}
              <div className="px-3 py-2 d-flex flex-column gap-2" style={{ fontSize: '0.82rem' }}>
                {/* Máy chính */}
                <div className="d-flex align-items-start justify-content-between gap-2">
                  <div className="d-flex align-items-start gap-2 min-w-0">
                    <span
                      className="badge bg-primary-subtle text-primary border border-primary-subtle flex-shrink-0 mt-1"
                      style={{ fontSize: '0.67rem' }}
                    >
                      Máy
                    </span>
                    <span className="fw-semibold text-dark lh-sm">{invoice.machineName}</span>
                  </div>
                  <span className="fw-bold text-dark text-nowrap flex-shrink-0">{money(invoice.machineBasePrice)}</span>
                </div>

                {/* Sạc kèm theo máy */}
                {invoice.chargerName && (
                  <div className="d-flex align-items-start justify-content-between gap-2 pt-2 border-top">
                    <div className="d-flex align-items-start gap-2 min-w-0">
                      <span
                        className="badge bg-success-subtle text-success border border-success-subtle flex-shrink-0 mt-1"
                        style={{ fontSize: '0.67rem' }}
                      >
                        Sạc kèm máy
                      </span>
                      <div className="min-w-0">
                        <span className="fw-medium text-dark lh-sm d-block">{invoice.chargerName}</span>
                        <span className="text-secondary d-block" style={{ fontSize: '0.73rem' }}>
                          {invoice.chargerSku ? `SKU: ${invoice.chargerSku} • ` : ''}
                          Bảo hành đồng bộ theo máy ({invoice.warrantyPeriod})
                        </span>
                      </div>
                    </div>
                    <span className="fw-semibold text-success text-nowrap flex-shrink-0">Kèm máy (0đ)</span>
                  </div>
                )}

                {/* Nâng cấp linh kiện */}
                {invoice.upgrades.map((item, idx) => (
                  <div
                    key={`upg-${idx}`}
                    className="d-flex align-items-start justify-content-between gap-2 pt-2 border-top"
                  >
                    <div className="d-flex align-items-start gap-2 min-w-0">
                      <span
                        className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle flex-shrink-0 mt-1"
                        style={{ fontSize: '0.67rem' }}
                      >
                        Nâng cấp
                      </span>
                      <span className="text-dark lh-sm">{item.label}</span>
                    </div>
                    <span className="fw-semibold text-warning-emphasis text-nowrap flex-shrink-0">
                      {item.priceText || 'Theo máy'}
                    </span>
                  </div>
                ))}

                {/* Phụ kiện bán kèm */}
                {invoice.paid.map((item, idx) => (
                  <div
                    key={`acc-${idx}`}
                    className="d-flex align-items-start justify-content-between gap-2 pt-2 border-top"
                  >
                    <div className="d-flex align-items-start gap-2 min-w-0">
                      <span
                        className="badge bg-info-subtle text-info-emphasis border border-info-subtle flex-shrink-0 mt-1"
                        style={{ fontSize: '0.67rem' }}
                      >
                        Phụ kiện
                      </span>
                      <span className="text-dark lh-sm">
                        {item.name}
                        {item.quantity > 1 && (
                          <span className="text-secondary ms-1" style={{ fontSize: '0.75rem' }}>
                            ({money(item.unitPrice)} × {item.quantity})
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="fw-semibold text-primary text-nowrap flex-shrink-0">+{money(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              {/* DẢI QUÀ TẶNG KÈM (NẾU CÓ) */}
              {invoice.gifts.length > 0 && (
                <div
                  className="px-3 py-2 border-top border-success-subtle d-flex flex-wrap align-items-center gap-2"
                  style={{ backgroundColor: '#f0fdf4', fontSize: '0.76rem' }}
                >
                  <span className="fw-semibold text-success d-inline-flex align-items-center gap-1 me-1">
                    <Gift size={13} /> Quà tặng miễn phí:
                  </span>
                  <div className="d-flex flex-wrap gap-1">
                    {invoice.gifts.map((item, idx) => (
                      <span
                        key={`gift-${idx}`}
                        className="badge bg-white text-success border border-success-subtle fw-medium"
                        style={{ fontSize: '0.72rem' }}
                      >
                        {item.name}
                        {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* TỔNG KẾT THANH TOÁN */}
              <div className="px-3 py-2 bg-light border-top d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <span
                    className="fw-bold text-secondary text-uppercase"
                    style={{ fontSize: '0.72rem', letterSpacing: '0.4px' }}
                  >
                    Tổng thanh toán thực tế
                  </span>
                  {invoice.discount > 0 && (
                    <span
                      className="badge bg-danger-subtle text-danger border border-danger-subtle"
                      style={{ fontSize: '0.72rem' }}
                    >
                      Giảm ưu đãi: -{money(invoice.discount)}
                    </span>
                  )}
                </div>

                <div className="fw-bolder text-success lh-1 text-nowrap" style={{ fontSize: '1.45rem' }}>
                  {dinhDangTien(invoice.finalPrice) || '0'}
                  <span className="ms-1 fw-bold" style={{ fontSize: '0.85rem' }}>VNĐ</span>
                </div>
              </div>
            </div>

            {statusMessage && (
              <div className="alert alert-warning mt-2 mb-0 py-2 px-3 small">
                {statusMessage}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="modal-footer bg-white border-top px-3 py-2 justify-content-between">
            <button
              type="button"
              className="btn btn-light border rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 fw-medium"
              style={{ fontSize: '0.85rem' }}
              onClick={onClose}
            >
              <PlusCircle size={16} className="text-primary" />
              <span>Bán máy tiếp theo</span>
              <kbd
                className="bg-white text-secondary border px-1 rounded"
                style={{ fontSize: '0.7rem' }}
              >
                Esc
              </kbd>
            </button>

            <button
              type="button"
              className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
              style={{ fontSize: '0.86rem' }}
              onClick={handlePrint}
            >
              <Printer size={17} />
              <span>In Phiếu Bảo Hành</span>
              <kbd
                className="border-0 px-1 rounded text-white"
                style={{ fontSize: '0.7rem', backgroundColor: 'rgba(255, 255, 255, 0.22)' }}
              >
                Enter ↵
              </kbd>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
