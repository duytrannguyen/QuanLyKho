import React, { useState, useEffect } from 'react';
import { 
  X, Printer, Copy, Check, FileText, User, Phone, 
  Calendar, Laptop, ShieldCheck, AlertCircle, 
  Tag, Package, DollarSign, CheckCircle2, UserCheck, 
  Hash, Layers, Cpu, HardDrive, Info, Smartphone
} from 'lucide-react';
import { dinhDangTien, formatDate, getCleanWarrantyType } from '../../utils/dinh_dang';
import { CategoryBadge, OrderStatusBadge } from './HoaDonKhachHang';

export default function ModalChiTietHoaDonCRM({ order, onClose }) {
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!order) return null;

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Tính trạng thái hạn bảo hành
  const getWarrantyInfo = () => {
    if (!order.warrantyExpiry) {
      return { status: 'UNKNOWN', label: order.warrantyPeriod || 'Chưa thiết lập', className: 'bg-secondary bg-opacity-10 text-secondary border-secondary-subtle' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(order.warrantyExpiry);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      return {
        status: 'ACTIVE',
        diffDays,
        label: `Còn ${diffDays} ngày bảo hành`,
        className: 'bg-success bg-opacity-10 text-success border-success-subtle'
      };
    } else {
      return {
        status: 'EXPIRED',
        diffDays: Math.abs(diffDays),
        label: `Đã hết hạn ${Math.abs(diffDays)} ngày trước`,
        className: 'bg-danger bg-opacity-10 text-danger border-danger-subtle'
      };
    }
  };

  const warrantyStatus = getWarrantyInfo();

  // In hóa đơn / Phiếu xuất kho kiêm bảo hành (GIỮ NGUYÊN HOÀN TOÀN)
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) {
      alert('Vui lòng cho phép trình duyệt mở popup để in hóa đơn.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>Hóa Đơn & Phiếu Bảo Hành - ${order.transactionId}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
          body { padding: 32px; color: #1e293b; font-size: 14px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d6efd; padding-bottom: 16px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 800; color: #0d6efd; letter-spacing: -0.5px; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
          .title { text-align: center; margin: 20px 0; }
          .title h2 { font-size: 20px; font-weight: 700; text-transform: uppercase; color: #0f172a; }
          .title p { font-size: 12px; color: #64748b; margin-top: 4px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 13px; font-weight: 700; color: #0d6efd; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .info-row { display: flex; margin-bottom: 6px; }
          .info-label { width: 140px; color: #64748b; font-weight: 500; font-size: 13px; }
          .info-val { flex: 1; font-weight: 600; color: #0f172a; }
          .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          .table th { background-color: #f8fafc; font-weight: 600; font-size: 12px; text-transform: uppercase; }
          .total-box { margin-top: 15px; text-align: right; font-size: 14px; }
          .total-box .total-price { font-size: 20px; font-weight: 800; color: #0d6efd; }
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
            <div class="subtitle">Hệ thống Laptop & Phụ Kiện Uy Tín</div>
            <div class="subtitle">Hotline: 0939 558 894 | Website: qkshop.vn</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #64748b;">Mã hóa đơn: <strong style="color: #0d6efd; font-family: monospace;">${order.transactionId}</strong></div>
            ${order.matchedCycleId ? `<div style="font-size: 12px; color: #64748b;">Mã chu kỳ: <strong>${order.matchedCycleId}</strong></div>` : ''}
            <div style="font-size: 12px; color: #64748b;">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        <div class="title">
          <h2>HÓA ĐƠN XUẤT KHO KIÊM BẢO HÀNH</h2>
          <p>Ngày lập đơn: ${formatDate(order.saleDate)}</p>
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
              <span class="info-val">${order.customerPhone || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Nhân viên bán:</span>
              <span class="info-val">${order.salesperson || 'QKShop'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Gói bảo hành:</span>
              <span class="info-val">${getCleanWarrantyType(order.warrantyPeriod) || 'Theo quy định'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">II. Chi Tiết Mặt Hàng & Giao Dịch</div>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">STT</th>
                <th>Sản phẩm / Mặt hàng</th>
                <th>Serial / Model</th>
                <th>Cấu hình / Chi tiết</th>
                <th style="text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">1</td>
                <td>
                  <strong>${order.productName || 'Sản phẩm'}</strong>
                  ${order.brand ? `<br><small style="color:#64748b;">Hãng: ${order.brand}</small>` : ''}
                </td>
                <td style="font-family: monospace; font-weight: bold;">
                  ${order.serialKeys || order.modelName || '—'}
                </td>
                <td>${order.configSummary || order.note || '—'}</td>
                <td style="text-align: right; font-weight: bold;">
                  ${dinhDangTien(order.netRevenue || 0)} đ
                </td>
              </tr>
              ${order.accompanyingOrder ? `
              <tr>
                <td style="text-align: center;">2</td>
                <td>
                  <strong>${order.accompanyingOrder.productName || 'Phụ kiện kèm'}</strong>
                  <br><small style="color:#0284c7;">(Đơn kèm: ${order.accompanyingOrder.transactionId})</small>
                </td>
                <td style="font-family: monospace;">Kèm máy</td>
                <td>${order.accompanyingOrder.note || 'Theo máy'}</td>
                <td style="text-align: right; font-weight: bold;">
                  ${dinhDangTien(order.accompanyingOrder.netRevenue || 0)} đ
                </td>
              </tr>` : ''}
            </tbody>
          </table>

          <div class="total-box">
            ${Number(order.grossRevenue) > 0 ? `<div style="color: #64748b; font-size: 13px;">Giá niêm yết: ${dinhDangTien(order.grossRevenue)} đ</div>` : ''}
            ${Number(order.discount) > 0 ? `<div style="color: #dc2626; font-size: 13px; font-weight: 600;">Chiết khấu / Giảm giá: -${dinhDangTien(order.discount)} đ</div>` : ''}
            <div style="margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
              Tổng thanh toán: <span class="total-price">${dinhDangTien(order.combinedNetRevenue || order.netRevenue || 0)} đ</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">III. Cam Kết & Điều Khoản Bảo Hành</div>
          <div class="terms">
            <h4>Quy định bảo hành tại QKShop:</h4>
            <p>1. Sản phẩm còn nguyên tem bảo hành, số Serial/IMEI phải trùng khớp với hóa đơn trên hệ thống.</p>
            <p>2. Không bảo hành các trường hợp máy bị rơi vỡ, cấn móp, vào nước, cháy nổ nguồn điện hoặc có dấu hiệu tự ý can thiệp phần cứng.</p>
            <p>3. Thời hạn bảo hành: <strong>${getCleanWarrantyType(order.warrantyPeriod) || 'Theo quy định'}</strong> (Từ ngày <strong>${formatDate(order.saleDate)}</strong> ${order.warrantyExpiry ? `đến ngày <strong>${formatDate(order.warrantyExpiry)}</strong>` : ''}).</p>
          </div>
        </div>

        <div class="signatures">
          <div class="sign-col">
            <div class="sign-title">KHÁCH HÀNG</div>
            <div style="font-size: 12px; color: #94a3b8;">(Ký và ghi rõ họ tên)</div>
          </div>
          <div class="sign-col">
            <div class="sign-title">ĐẠI DIỆN BÁN HÀNG</div>
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
      className="modal fade show d-block animate__animated animate__fadeIn animate__faster" 
      tabIndex="-1" 
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1055 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable animate__animated animate__zoomIn animate__faster">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-light">
          
          {/* --- HEADER --- */}
          <div className="modal-header bg-white border-bottom px-4 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-primary bg-opacity-10 p-3 rounded-circle text-primary d-none d-sm-flex">
                <FileText size={24} />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                  <h5 className="modal-title fw-bolder text-dark mb-0 me-2">Chi Tiết Hóa Đơn</h5>
                  
                  <div className="badge bg-light text-primary border border-primary-subtle font-monospace fs-6 px-2 py-1 d-flex align-items-center gap-2">
                    {order.transactionId}
                    <button 
                      type="button" 
                      className="btn btn-sm p-0 border-0 hover-opacity"
                      onClick={() => copyToClipboard(order.transactionId, 'transactionId')}
                      title="Sao chép mã hóa đơn"
                    >
                      {copiedKey === 'transactionId' ? <Check size={14} className="text-success" /> : <Copy size={14} className="text-secondary" />}
                    </button>
                  </div>
                  
                  <CategoryBadge category={order.orderCategory} />
                </div>

                <div className="small text-muted d-flex align-items-center gap-3 flex-wrap">
                  <span className="d-flex align-items-center gap-1">
                    <Calendar size={14} /> Ngày lập: <strong className="text-dark">{formatDate(order.saleDate)}</strong>
                  </span>
                  {order.matchedCycleId && (
                    <span className="d-flex align-items-center gap-1">
                      <Hash size={14} /> Chu kỳ: <strong className="text-dark font-monospace">{order.matchedCycleId}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button 
                type="button" 
                className="btn btn-outline-primary rounded-pill px-4 d-none d-sm-flex align-items-center gap-2 shadow-sm hover-primary"
                onClick={handlePrint}
              >
                <Printer size={16} /> In hóa đơn
              </button>
              <button type="button" className="btn-close shadow-none p-3" aria-label="Đóng" onClick={onClose} />
            </div>
          </div>

          {/* --- MODAL BODY --- */}
          <div className="modal-body p-4 p-md-4">
            
            {/* 1. KHỐI TÀI CHÍNH TỔNG QUAN (Financial Summary) */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-lg-3">
                <div className="bg-white border rounded-4 p-3 h-100 shadow-sm">
                  <div className="text-muted small fw-medium mb-1 d-flex align-items-center gap-1">
                    <Tag size={14} /> Giá niêm yết
                  </div>
                  <div className="fs-5 fw-bold text-dark mt-2">
                    {dinhDangTien(order.grossRevenue || order.netRevenue || 0)} đ
                  </div>
                </div>
              </div>

              <div className="col-6 col-lg-3">
                <div className="bg-white border rounded-4 p-3 h-100 shadow-sm">
                  <div className="text-muted small fw-medium mb-1 d-flex align-items-center gap-1">
                    <DollarSign size={14} /> Giảm giá
                  </div>
                  <div className={`fs-5 fw-bold mt-2 ${Number(order.discount) > 0 ? 'text-danger' : 'text-secondary'}`}>
                    {Number(order.discount) > 0 ? `- ${dinhDangTien(order.discount)} đ` : '0 đ'}
                  </div>
                </div>
              </div>

              <div className="col-6 col-lg-3">
                <div className="bg-white border rounded-4 p-3 h-100 shadow-sm">
                  <div className="text-muted small fw-medium mb-2">Trạng thái xử lý</div>
                  <div className="d-flex flex-column align-items-start gap-2">
                    <OrderStatusBadge status={order.orderStatus} />
                    {order.paymentStatus && (
                      <span className="badge bg-light text-secondary border px-2 py-1 fw-medium">
                        {order.paymentStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-6 col-lg-3">
                <div className="bg-success bg-opacity-10 border border-success border-opacity-25 rounded-4 p-3 h-100 shadow-sm d-flex flex-column justify-content-center">
                  <div className="text-success small fw-bold text-uppercase mb-1">Tổng thực thu</div>
                  <div className="fs-4 fw-bolder text-success lh-1 mt-1">
                    {dinhDangTien(order.combinedNetRevenue || order.netRevenue || 0)} đ
                  </div>
                  {order.accompanyingOrder && (
                    <div className="text-success text-opacity-75 small fw-medium mt-2" style={{ fontSize: '0.75rem' }}>
                      Máy: {dinhDangTien(order.netRevenue)} + Phụ kiện: {dinhDangTien(order.accompanyingOrder.netRevenue)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. GRID CHI TIẾT (2 cột) */}
            <div className="row g-4">
              
              {/* CỘT TRÁI: Khách hàng & Bảo hành */}
              <div className="col-12 col-lg-5 d-flex flex-column gap-4">
                
                {/* Khối Khách hàng */}
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-white border-bottom py-3 px-4">
                    <h6 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
                      <div className="bg-primary bg-opacity-10 p-1 rounded text-primary"><User size={16} /></div>
                      Thông tin Khách hàng
                    </h6>
                  </div>
                  <div className="card-body p-0">
                    <ul className="list-group list-group-flush">
                      
                      <li className="list-group-item d-flex justify-content-between align-items-start px-4 py-3 border-0 border-bottom">
                        <span className="text-muted small w-50">Họ và tên:</span>
                        <span className="fw-bold text-dark text-end w-50">
                          {order.customerName || <span className="fst-italic text-muted fw-normal">Khách vãng lai</span>}
                        </span>
                      </li>

                      <li className="list-group-item d-flex justify-content-between align-items-center px-4 py-3 border-0 border-bottom">
                        <span className="text-muted small">Số điện thoại:</span>
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-dark font-monospace">{order.customerPhone || '—'}</span>
                          {order.customerPhone && (
                            <button type="button" className="btn btn-sm btn-light rounded-circle p-1 text-secondary hover-primary" onClick={() => copyToClipboard(order.customerPhone, 'phone')}>
                              {copiedKey === 'phone' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            </button>
                          )}
                        </div>
                      </li>

                      {order.customerType && (
                        <li className="list-group-item d-flex justify-content-between align-items-center px-4 py-3 border-0 border-bottom">
                          <span className="text-muted small">Phân loại:</span>
                          <span className="badge bg-info bg-opacity-10 text-info border border-info rounded-pill px-3 py-1">
                            {order.customerType}
                          </span>
                        </li>
                      )}

                      {order.isStudent !== null && order.isStudent !== undefined && (
                        <li className="list-group-item d-flex justify-content-between align-items-center px-4 py-3 border-0 border-bottom">
                          <span className="text-muted small">Ưu đãi sinh viên:</span>
                          <span className={`badge rounded-pill ${order.isStudent ? 'bg-success bg-opacity-10 text-success border border-success-subtle' : 'bg-light text-secondary border'}`}>
                            {order.isStudent ? 'Có ưu đãi HSSV' : 'Không có'}
                          </span>
                        </li>
                      )}

                      <li className="list-group-item d-flex justify-content-between align-items-center px-4 py-3 border-0 border-bottom">
                        <span className="text-muted small">Nhân viên chốt:</span>
                        <div className="d-flex align-items-center gap-1">
                          <UserCheck size={16} className="text-success" />
                          <span className="fw-semibold text-dark">{order.salesperson || 'QKShop'}</span>
                        </div>
                      </li>

                      {(order.lastSource || order.firstSource) && (
                        <li className="list-group-item d-flex justify-content-between align-items-center px-4 py-3 border-0">
                          <span className="text-muted small">Nguồn biết đến:</span>
                          <span className="badge bg-light text-dark border px-2 py-1">
                            {order.lastSource || order.firstSource}
                          </span>
                        </li>
                      )}

                    </ul>
                  </div>
                </div>

                {/* Khối Bảo hành */}
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-header bg-white border-bottom py-3 px-4">
                    <h6 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
                      <div className="bg-success bg-opacity-10 p-1 rounded text-success"><ShieldCheck size={16} /></div>
                      Chính sách Bảo hành
                    </h6>
                  </div>
                  <div className="card-body p-4">
                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                        <span className="text-muted small">Gói bảo hành:</span>
                        <span className="fw-bold text-primary">
                          {getCleanWarrantyType(order.warrantyPeriod) || 'Theo tiêu chuẩn'}
                        </span>
                      </div>
                      
                      <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                        <span className="text-muted small">Ngày hết hạn:</span>
                        <span className="fw-bold text-dark">
                          {order.warrantyExpiry ? formatDate(order.warrantyExpiry) : '—'}
                        </span>
                      </div>

                      {order.warrantyExpiry && (
                        <div className="d-flex justify-content-between align-items-center pt-1">
                          <span className="text-muted small">Tình trạng:</span>
                          <span className={`badge rounded-pill border px-3 py-2 fw-medium ${warrantyStatus.className}`}>
                            {warrantyStatus.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* CỘT PHẢI: Thiết bị & Phụ kiện */}
              <div className="col-12 col-lg-7 d-flex flex-column gap-4">
                
                {/* Khối Thông tin sản phẩm */}
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-header bg-white border-bottom py-3 px-4">
                    <h6 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
                      <div className="bg-primary bg-opacity-10 p-1 rounded text-primary"><Laptop size={16} /></div>
                      Sản phẩm & Cấu hình
                    </h6>
                  </div>
                  <div className="card-body p-4">
                    
                    {/* Tên & Serial */}
                    <div className="bg-light p-4 rounded-4 mb-4">
                      <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                        <div className="flex-grow-1">
                          <div className="text-muted small fw-semibold text-uppercase mb-1">Tên sản phẩm</div>
                          <h5 className="fw-bolder text-dark mb-3">
                            {order.productName || <span className="fst-italic text-muted fw-normal">Chưa cập nhật tên</span>}
                          </h5>
                          
                          <div className="d-flex flex-wrap gap-2">
                            {order.brand && <span className="badge bg-white text-dark border shadow-sm">Hãng: {order.brand}</span>}
                            {order.modelName && <span className="badge bg-white text-dark border shadow-sm">Dòng: {order.modelName}</span>}
                            {order.series && <span className="badge bg-white text-dark border shadow-sm">Series: {order.series}</span>}
                            {order.segment && <span className="badge bg-info bg-opacity-10 text-info border border-info shadow-sm">{order.segment}</span>}
                          </div>
                        </div>

                        {order.serialKeys && (
                          <div className="text-md-end border-start-md ps-md-4 mt-3 mt-md-0">
                            <div className="text-muted small fw-semibold text-uppercase mb-2">Số Serial / IMEI</div>
                            <div className="d-inline-flex align-items-center gap-2 bg-white px-3 py-2 rounded-3 border shadow-sm">
                              <span className="font-monospace fw-bold fs-6 text-primary">{order.serialKeys}</span>
                              <button 
                                type="button" 
                                className="btn btn-sm btn-light p-1 rounded-circle text-secondary hover-primary"
                                onClick={() => copyToClipboard(order.serialKeys, 'serial')}
                              >
                                {copiedKey === 'serial' ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cấu hình & Ghi chú */}
                    <div className="row g-4">
                      {order.configSummary && (
                        <div className="col-12">
                          <div className="d-flex align-items-start gap-2">
                            <Cpu size={18} className="text-primary mt-1 flex-shrink-0" />
                            <div>
                              <div className="text-muted small fw-semibold mb-1">Cấu hình chi tiết</div>
                              <div className="text-dark bg-white border rounded-3 p-3" style={{ whiteSpace: 'pre-line', fontSize: '0.9rem' }}>
                                {order.configSummary}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {order.note && (
                        <div className="col-12">
                          <div className="d-flex align-items-start gap-2">
                            <Info size={18} className="text-warning mt-1 flex-shrink-0" />
                            <div>
                              <div className="text-muted small fw-semibold mb-1">Ghi chú giao dịch</div>
                              <div className="text-dark bg-warning bg-opacity-10 border border-warning-subtle rounded-3 p-3 fst-italic" style={{ whiteSpace: 'pre-line', fontSize: '0.9rem' }}>
                                {order.note}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Khối Phụ kiện kèm theo (nếu có) */}
                {order.accompanyingOrder && (
                  <div className="card border-0 border-start border-info border-4 shadow-sm rounded-4 overflow-hidden">
                    <div className="card-body p-4 bg-info bg-opacity-10 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <Package size={18} className="text-info" />
                          <h6 className="fw-bold text-dark m-0">Phụ kiện bán kèm</h6>
                          <span className="badge bg-white text-info border border-info font-monospace rounded-pill ms-2">
                            {order.accompanyingOrder.transactionId}
                          </span>
                        </div>
                        <div className="fw-semibold text-dark fs-6">
                          {order.accompanyingOrder.productName}
                        </div>
                        {order.accompanyingOrder.note && (
                          <div className="text-muted small fst-italic mt-1">
                            {order.accompanyingOrder.note}
                          </div>
                        )}
                      </div>
                      <div className="text-md-end bg-white p-3 rounded-4 shadow-sm border border-info-subtle">
                        <div className="text-muted small mb-1">Giá phụ kiện</div>
                        <div className="fs-5 fw-bolder text-info">
                          +{dinhDangTien(order.accompanyingOrder.netRevenue || 0)} đ
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* --- MODAL FOOTER --- */}
          <div className="modal-footer bg-white border-top px-4 py-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="text-muted small d-none d-md-block">
              Nhấn <strong>"In hóa đơn"</strong> để xuất phiếu bảo hành bản cứng cho khách hàng.
            </div>
            <div className="d-flex flex-grow-1 flex-md-grow-0 gap-2 w-100 w-md-auto">
              <button type="button" className="btn btn-light border text-secondary rounded-pill px-4 flex-grow-1 flex-md-grow-0 fw-medium" onClick={onClose}>
                Đóng
              </button>
              <button type="button" className="btn btn-primary rounded-pill px-4 flex-grow-1 flex-md-grow-0 d-flex align-items-center justify-content-center gap-2 shadow-sm hover-primary fw-medium" onClick={handlePrint}>
                <Printer size={18} /> In Phiếu Bảo Hành
              </button>
            </div>
          </div>

        </div>
      </div>
      
      {/* CSS Utility Classes */}
      <style dangerouslySetInnerHTML={{__html: `
        .border-start-md { border-left: none; }
        @media (min-width: 768px) {
          .border-start-md { border-left: 1px solid #dee2e6 !important; }
        }
        .hover-opacity:hover { opacity: 0.7; }
        .hover-primary:hover { background-color: #0d6efd !important; color: white !important; }
      `}} />
    </div>
  );
}