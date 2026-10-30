import React, { useState } from 'react';
import { 
  X, ShieldCheck, AlertCircle, XCircle, FileText, Copy, Check, 
  Printer, User, Phone, Calendar, Laptop, Cpu, HardDrive, 
  Layers, Tag, Clock, Package, DollarSign, CheckCircle2, UserCheck, Hash
} from 'lucide-react';
import { getCleanWarrantyType } from '../../utils/dinh_dang';

export default function ModalChiTietDonHang({ order, onClose, statusInfo }) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!order) return null;

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateOnly = (d) => {
    if (!d) return '—';
    try {
      const date = d instanceof Date ? d : new Date(d);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return String(d);
    }
  };

  const formatMoney = (val) => {
    if (val === null || val === undefined) return '0 đ';
    const num = Number(val);
    if (isNaN(num)) return val + ' đ';
    return num.toLocaleString('vi-VN') + ' đ';
  };

  // Trích xuất phụ kiện từ saleNote nếu có
  const extractAccessoriesAndNote = (note) => {
    if (!note) return { accessories: [], cleanNote: '' };
    const marker = 'Phụ kiện bán kèm: ';
    const idx = note.indexOf(marker);
    if (idx !== -1) {
      const accPart = note.substring(idx + marker.length);
      const cleanNote = note.substring(0, idx).replace(/\|\s*$/, '').trim();
      const items = accPart.split(',').map(s => s.trim()).filter(Boolean);
      return { accessories: items, cleanNote };
    }
    return { accessories: [], cleanNote: note };
  };

  const { accessories, cleanNote } = extractAccessoriesAndNote(order.saleNote);
  const StatusIcon = statusInfo?.icon || ShieldCheck;

  // In phiếu bảo hành kiêm xuất kho
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      alert('Vui lòng cho phép mở popup để in hóa đơn / phiếu bảo hành');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>Phiếu Xuất Kho & Bảo Hành - ${order.serialKey}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
          body { padding: 30px; color: #1e293b; font-size: 14px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
          .title { text-align: center; margin: 20px 0; }
          .title h2 { font-size: 20px; font-weight: 700; text-transform: uppercase; color: #0f172a; }
          .title p { font-size: 12px; color: #64748b; margin-top: 4px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 14px; font-weight: 700; color: #0284c7; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .info-row { display: flex; margin-bottom: 6px; }
          .info-label { width: 140px; color: #64748b; font-weight: 500; font-size: 13px; }
          .info-val { flex: 1; font-weight: 600; color: #0f172a; }
          .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          .table th { background-color: #f1f5f9; font-weight: 600; font-size: 12px; text-transform: uppercase; }
          .total-box { margin-top: 15px; text-align: right; font-size: 15px; }
          .total-box .total-price { font-size: 20px; font-weight: 800; color: #0284c7; }
          .terms { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-top: 20px; font-size: 11px; color: #475569; }
          .terms h4 { font-size: 12px; margin-bottom: 6px; color: #0f172a; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
          .sign-col { width: 200px; }
          .sign-title { font-weight: 600; margin-bottom: 60px; }
          @media print {
            body { padding: 15px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">QKSHOP.VN</div>
            <div class="subtitle">Hệ thống Laptop & Linh Kiện Chính Hãng</div>
            <div class="subtitle">Hotline: 0939.xxx.xxx | Website: qkshop.vn</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #64748b;">Mã đơn: <strong>${order.cycleId || '—'}</strong></div>
            <div style="font-size: 12px; color: #64748b;">Mã phiếu: <strong>${order.sourceReference || '—'}</strong></div>
            <div style="font-size: 12px; color: #64748b;">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        <div class="title">
          <h2>PHIẾU XUẤT KHO KIÊM BẢO HÀNH</h2>
          <p>Ngày mua hàng: ${formatDate(order.saleDate)}</p>
        </div>

        <div class="section">
          <div class="section-title">I. Thông Tin Khách Hàng</div>
          <div class="grid">
            <div class="info-row">
              <span class="info-label">Khách hàng:</span>
              <span class="info-val">${order.customerName || 'Khách vãng lai'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Số điện thoại:</span>
              <span class="info-val">${order.customerPhone || 'Không có'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Nhân viên bán:</span>
              <span class="info-val">${order.salesperson || 'Nhân viên QKShop'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Gói bảo hành:</span>
              <span class="info-val">${getCleanWarrantyType(order.warrantyPeriod)}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">II. Chi Tiết Sản Phẩm & Thiết Bị</div>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">STT</th>
                <th>Sản phẩm / Dòng máy</th>
                <th>Serial / IMEI</th>
                <th>Cấu hình chi tiết</th>
                <th style="text-align: right;">Đơn giá</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">1</td>
                <td>
                  <strong>${order.productFullName || order.sourceModelText || 'Laptop'}</strong>
                  ${order.brandName ? `<br><small style="color:#64748b;">Hãng: ${order.brandName}</small>` : ''}
                </td>
                <td style="font-family: monospace; font-weight: bold;">${order.serialKey}</td>
                <td>
                  ${order.configInfo || order.productSummary || 'Theo máy'}
                  ${order.upgradeNote && order.upgradeNote !== order.productSummary ? `<br><span style="color:#0284c7; font-weight: 600;">Nâng cấp: ${order.upgradeNote}</span>` : ''}
                </td>
                <td style="text-align: right; font-weight: bold;">
                  ${formatMoney(order.salePrice)}
                </td>
              </tr>
              ${accessories.length > 0 ? `
              <tr>
                <td style="text-align: center;">2</td>
                <td colspan="3">
                  <strong>Phụ kiện kèm theo:</strong> ${accessories.join(', ')}
                </td>
                <td style="text-align: right; color:#64748b;">Kèm máy</td>
              </tr>` : ''}
            </tbody>
          </table>

          <div class="total-box">
            ${order.discount ? `<div>Giảm giá / Ưu đãi: <strong>${formatMoney(order.discount)}</strong></div>` : ''}
            <div>Tổng số tiền thanh toán: <span class="total-price">${formatMoney(order.salePrice)}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">III. Cam Kết & Điều Khoản Bảo Hành</div>
          <div class="terms">
            <h4>Quy định bảo hành tại QKShop:</h4>
            <p>1. Sản phẩm còn nguyên tem bảo hành, số Serial phải trùng khớp với phiếu bảo hành và hệ thống.</p>
            <p>2. Không bảo hành các trường hợp máy bị rơi vỡ, cấn móp, vào nước, cháy nổ do nguồn điện không ổn định hoặc có dấu hiệu can thiệp phần cứng trái phép.</p>
            <p>3. Thời hạn bảo hành: <strong>${getCleanWarrantyType(order.warrantyPeriod)}</strong> (Từ ngày <strong>${formatDateOnly(order.saleDate)}</strong> ${statusInfo?.endDate ? `đến ngày <strong>${formatDateOnly(statusInfo.endDate)}</strong>` : ''}).</p>
          </div>
        </div>

        <div class="signatures">
          <div class="sign-col">
            <div class="sign-title">KHÁCH HÀNG</div>
            <div style="font-size: 12px; color: #94a3b8;">(Ký và ghi rõ họ tên)</div>
          </div>
          <div class="sign-col">
            <div class="sign-title">NGƯỜI LẬP PHIẾU</div>
            <div style="font-size: 12px; color: #94a3b8;">(Ký và ghi rõ họ tên)</div>
            <div style="margin-top: 45px; font-weight: 600;">${order.salesperson || 'QKShop'}</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      style={{ 
        backgroundColor: 'rgba(15, 23, 42, 0.65)', 
        backdropFilter: 'blur(5px)', 
        zIndex: 1055 
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden">
          
          {/* Header */}
          <div className="modal-header bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-primary bg-opacity-10 p-2 rounded-3 text-primary">
                <FileText size={24} />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="modal-title fw-bold text-dark mb-0">Chi Tiết Đơn Hàng & Giao Dịch</h5>
                  <span className="badge bg-light text-secondary border font-monospace">
                    #{order.cycleId || 'DON-HANG'}
                  </span>
                </div>
                <div className="small text-muted mt-1 d-flex align-items-center gap-3">
                  <span>Ngày bán: <strong className="text-dark">{formatDate(order.saleDate)}</strong></span>
                  {order.sourceReference && (
                    <span>Mã tham chiếu: <strong className="text-dark">{order.sourceReference}</strong></span>
                  )}
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button 
                type="button" 
                className="btn btn-outline-primary btn-sm rounded-pill px-3 d-flex align-items-center gap-2 shadow-sm"
                onClick={handlePrint}
                title="In phiếu xuất kho & bảo hành"
              >
                <Printer size={16} />
                <span>In phiếu</span>
              </button>
              <button 
                type="button" 
                className="btn-close shadow-none" 
                aria-label="Close" 
                onClick={onClose}
              />
            </div>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4 bg-light custom-scrollbar">
            
            {/* Top Warranty Status Banner */}
            <div className="card border-0 shadow-sm rounded-3 mb-4 overflow-hidden">
              <div className={`p-3 d-flex flex-wrap justify-content-between align-items-center ${
                statusInfo?.status === 'VALID' ? 'bg-success-subtle text-success-emphasis border-start border-4 border-success' :
                statusInfo?.status === 'EXPIRED' ? 'bg-danger-subtle text-danger-emphasis border-start border-4 border-danger' :
                statusInfo?.status === 'VOIDED' ? 'bg-dark-subtle text-dark-emphasis border-start border-4 border-dark' :
                'bg-info-subtle text-info-emphasis border-start border-4 border-info'
              }`}>
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2 rounded-circle bg-white shadow-sm">
                    <StatusIcon size={24} className={
                      statusInfo?.status === 'VALID' ? 'text-success' :
                      statusInfo?.status === 'EXPIRED' ? 'text-danger' :
                      statusInfo?.status === 'VOIDED' ? 'text-dark' : 'text-info'
                    } />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                      {statusInfo?.text || 'Trạng thái bảo hành'}
                      <span className="badge bg-white text-dark border px-2 py-1 small fw-normal">
                        Gói: {getCleanWarrantyType(order.warrantyPeriod)}
                      </span>
                    </h6>
                    <div className="small mt-1 opacity-75">
                      {order.isInStock ? (
                        statusInfo?.endDate ? (
                          <>Hạn bảo hành hãng: <strong>{formatDateOnly(statusInfo.endDate)}</strong></>
                        ) : (
                          <>Gói bảo hành gán cho máy: <strong>{order.warrantyPeriod || 'Chưa thiết lập'}</strong> (Sẽ kích hoạt tính từ ngày bán máy cho khách)</>
                        )
                      ) : statusInfo?.endDate ? (
                        <>Hạn bảo hành đến ngày: <strong>{formatDateOnly(statusInfo.endDate)}</strong></>
                      ) : (
                        'Thời hạn bảo hành theo thỏa thuận hoặc chưa xác định'
                      )}
                      {!order.isInStock && statusInfo?.diffDays !== undefined && (
                        <span className="ms-2">
                          ({statusInfo.status === 'VALID' 
                            ? `Còn ${statusInfo.diffDays} ngày` 
                            : `Đã hết hạn ${statusInfo.diffDays} ngày trước`})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {order.isVoided && (
                  <div className="badge bg-danger text-white px-3 py-2 rounded-pill mt-2 mt-md-0">
                    <AlertCircle size={14} className="me-1 d-inline" /> Vòng tồn đã đóng / Đã thu hồi
                  </div>
                )}
              </div>
            </div>

            <div className="row g-4">
              
              {/* Left Column: Khách hàng & Thanh toán */}
              <div className="col-12 col-lg-5 d-flex flex-column gap-4">
                
                {/* Khách hàng & Nhân viên */}
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-white border-bottom py-3 px-4">
                    <h6 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
                      <User size={18} className="text-primary" />
                      Thông tin khách hàng & Bán hàng
                    </h6>
                  </div>
                  <div className="card-body p-4">
                    <div className="d-flex flex-column gap-3">
                      
                      <div className="d-flex justify-content-between align-items-start pb-2 border-bottom">
                        <span className="text-muted small">Họ và tên khách:</span>
                        <div className="fw-bold text-dark text-end">{order.customerName || 'Khách vãng lai'}</div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                        <span className="text-muted small">Số điện thoại:</span>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-dark font-monospace">{order.customerPhone || '—'}</span>
                          {order.customerPhone && (
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-secondary p-1 border-0 rounded-circle"
                              title="Sao chép SĐT"
                              onClick={() => copyToClipboard(order.customerPhone, 'phone')}
                            >
                              {copiedKey === 'phone' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                        <span className="text-muted small">Nhân viên phụ trách:</span>
                        <div className="d-flex align-items-center gap-1">
                          <UserCheck size={16} className="text-success" />
                          <span className="fw-semibold text-dark">{order.salesperson || 'Nhân viên QKShop'}</span>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                        <span className="text-muted small">Ngày giao dịch:</span>
                        <div className="fw-medium text-dark">{formatDate(order.saleDate)}</div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small">Mã chu kỳ (Cycle):</span>
                        <div className="d-flex align-items-center gap-1 font-monospace small bg-white px-2 py-1 rounded border">
                          <Hash size={12} className="text-muted" />
                          <span>{order.cycleId || '—'}</span>
                          <button 
                            type="button" 
                            className="btn btn-sm p-0 ms-1 border-0"
                            onClick={() => copyToClipboard(order.cycleId, 'cycle')}
                            title="Sao chép mã chu kỳ"
                          >
                            {copiedKey === 'cycle' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Thanh toán & Hóa đơn */}
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-header bg-white border-bottom py-3 px-4">
                    <h6 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
                      <DollarSign size={18} className="text-success" />
                      Thanh toán & Hóa đơn
                    </h6>
                  </div>
                  <div className="card-body p-4">
                    <div className="d-flex flex-column gap-3">
                      
                      {order.grossRevenue && (
                        <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                          <span className="text-muted small">Doanh thu gộp:</span>
                          <span className="text-secondary fw-semibold">{formatMoney(order.grossRevenue)}</span>
                        </div>
                      )}

                      {order.defaultSalePrice && !order.grossRevenue && (
                        <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                          <span className="text-muted small">Giá niêm yết ban đầu:</span>
                          <span className="text-secondary">{formatMoney(order.defaultSalePrice)}</span>
                        </div>
                      )}

                      <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                        <span className="text-muted small">Chiết khấu / Giảm giá:</span>
                        <span className="fw-semibold text-success">
                          {order.discount ? `- ${formatMoney(order.discount)}` : '0 đ'}
                        </span>
                      </div>

                      {order.paymentStatus && (
                        <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                          <span className="text-muted small">Trạng thái thanh toán:</span>
                          <span className="badge bg-primary-subtle text-primary border px-2 py-1 small fw-semibold">
                            {order.paymentStatus}
                          </span>
                        </div>
                      )}

                      <div className="d-flex justify-content-between align-items-center pt-1">
                        <span className="fw-bold text-dark">Giá chốt giao dịch:</span>
                        <span className="h4 m-0 fw-bold text-primary">
                          {formatMoney(order.salePrice)}
                        </span>
                      </div>

                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Thiết bị & Cấu hình */}
              <div className="col-12 col-lg-7 d-flex flex-column gap-4">
                
                {/* Thông tin máy */}
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-header bg-white border-bottom py-3 px-4">
                    <h6 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
                      <Laptop size={18} className="text-primary" />
                      Thông tin thiết bị & Cấu hình
                    </h6>
                  </div>
                  <div className="card-body p-4">
                    
                    {/* Tên máy & Serial Header */}
                    <div className="bg-white p-3 rounded-3 border mb-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="text-muted small text-uppercase fw-semibold">Tên dòng máy</div>
                          <h5 className="fw-bold text-dark mt-1 mb-0">
                            {order.productFullName || order.sourceModelText || order.platformDisplayName || 'Laptop'}
                          </h5>
                          {order.brandName && (
                            <span className="badge bg-secondary-subtle text-secondary border mt-1">
                              {order.brandName} {order.modelLineName ? `• ${order.modelLineName}` : ''}
                            </span>
                          )}
                        </div>

                        {/* Serial Box */}
                        <div className="text-end">
                          <div className="text-muted small text-uppercase fw-semibold">Số Serial</div>
                          <div className="d-flex align-items-center gap-2 mt-1">
                            <span className="font-monospace fw-bold fs-6 bg-light text-primary px-3 py-1 rounded border">
                              {order.serialKey}
                            </span>
                            <button 
                              type="button" 
                              className="btn btn-outline-secondary btn-sm p-1"
                              onClick={() => copyToClipboard(order.serialKey, 'serial')}
                              title="Sao chép Serial"
                            >
                              {copiedKey === 'serial' ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chi tiết thông số phần cứng */}
                    <div className="row g-2 mb-3">
                      <div className="col-12 col-md-6">
                        <div className="p-3 bg-white rounded-3 border h-100">
                          <div className="text-muted small d-flex align-items-center gap-1 mb-1">
                            <Cpu size={14} className="text-primary" /> Vi xử lý (CPU)
                          </div>
                          <div className="fw-semibold text-dark">
                            {order.cpuCode || 'Theo máy'}
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-md-6">
                        <div className="p-3 bg-white rounded-3 border h-100">
                          <div className="text-muted small d-flex align-items-center gap-1 mb-1">
                            <Layers size={14} className="text-info" /> Card đồ họa (GPU)
                          </div>
                          <div className="fw-semibold text-dark">
                            {order.gpuCode || 'Onboard / VGA mặc định'}
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-md-6">
                        <div className="p-3 bg-white rounded-3 border h-100">
                          <div className="text-muted small d-flex align-items-center gap-1 mb-1">
                            <HardDrive size={14} className="text-success" /> RAM & Ổ cứng (Gốc)
                          </div>
                          <div className="fw-semibold text-dark">
                            RAM: {order.ramCode || '—'} | SSD: {order.ssdCode || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-md-6">
                        <div className="p-3 bg-white rounded-3 border h-100">
                          <div className="text-muted small d-flex align-items-center gap-1 mb-1">
                            <Laptop size={14} className="text-warning" /> Màn hình
                          </div>
                          <div className="fw-semibold text-dark">
                            {order.screenSize ? `${order.screenSize} inch` : 'Mặc định'}
                            {order.touchFlag === 'YES' && <span className="ms-1 badge bg-info-subtle text-info border">Cảm ứng</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Khung nâng cấp cấu hình nếu có */}
                    {order.upgradeNote && (
                      <div className="p-3 rounded-3 bg-warning bg-opacity-10 border border-warning-subtle mb-3">
                        <div className="fw-bold text-dark d-flex align-items-center gap-2 mb-1">
                          <span className="badge bg-warning text-dark">Nâng cấp cấu hình</span>
                          <span>Cấu hình bàn giao cho khách:</span>
                        </div>
                        <div className="fw-semibold text-dark fs-6 mt-1">
                          {order.upgradeNote}
                        </div>
                      </div>
                    )}

                    {/* Phụ kiện bán kèm / Tặng kèm */}
                    {accessories.length > 0 && (
                      <div className="p-3 rounded-3 bg-white border mb-3">
                        <div className="fw-bold text-dark d-flex align-items-center gap-2 mb-2">
                          <Package size={16} className="text-primary" />
                          <span>Phụ kiện bán kèm / Tặng kèm:</span>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {accessories.map((acc, idx) => (
                            <span key={idx} className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle px-3 py-2 rounded-pill font-normal fs-7">
                              <CheckCircle2 size={13} className="me-1 d-inline" /> {acc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ghi chú đơn hàng nếu có */}
                    {cleanNote && (
                      <div className="p-3 rounded-3 bg-white border">
                        <div className="text-muted small fw-semibold mb-1">Ghi chú giao dịch:</div>
                        <div className="text-dark small" style={{ whiteSpace: 'pre-line' }}>
                          {cleanNote}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Modal Footer */}
          <div className="modal-footer bg-white border-top px-4 py-3 d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              Nhấp nút <strong>"In phiếu"</strong> để in phiếu xuất kho kiêm bảo hành cho khách hàng.
            </div>
            <div className="d-flex gap-2">
              <button 
                type="button" 
                className="btn btn-outline-secondary px-4 rounded-pill" 
                onClick={onClose}
              >
                Đóng
              </button>
              <button 
                type="button" 
                className="btn btn-primary px-4 rounded-pill d-flex align-items-center gap-2 shadow-sm"
                onClick={handlePrint}
              >
                <Printer size={16} />
                <span>In phiếu bảo hành</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
