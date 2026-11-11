import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Wrench, Plus, Search, CheckCircle, RotateCcw, User, Phone, 
  Laptop, Trash2, Printer, ShieldCheck, Edit3, X, AlertCircle, Eye, Cpu, List, FileText, XCircle
} from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { apiSuaChua, apiLinhKien } from '../../api';
import { formatCurrency, parseCurrency, formatDate, getTodayDateString, getItemExpiryStatus } from '../../utils/dinh_dang';

// ======================================================================
// CÁC HÀM TIỆN ÍCH & COMPONENT DÙNG CHUNG (TÁCH RA ĐỂ RÚT GỌN MAIN FILE)
// ======================================================================

const StatusBadge = ({ status }) => {
  switch (status) {
    case 'RECEIVED': return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">Mới tiếp nhận</span>;
    case 'IN_REPAIR': return <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle">Đang sửa chữa</span>;
    case 'COMPLETED': return <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle">Đã hoàn tất</span>;
    case 'CANCELLED': return <span className="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">Hủy / Trả về</span>;
    default: return <span className="badge bg-secondary-subtle text-secondary border">{status || 'Chờ xử lý'}</span>;
  }
};

const printIntakeTicket = (order) => { 
  const win = window.open('', '_blank', 'width=850,height=750');
  if (!win || !order) return;
  const servicesText = (order.items || []).map((it, idx) => `<tr><td style="text-align:center;">${idx + 1}</td><td><strong>${it.serviceName || ''}</strong>${it.note ? `<br/><small style="color:#64748b;">${it.note}</small>` : ''}</td><td style="text-align:center;">${it.quantity || 1}</td><td style="text-align:right;">${it.price ? formatCurrency(it.price) + ' đ' : 'Chờ báo giá'}</td></tr>`).join('');
  win.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu Tiếp Nhận Máy - ${order.orderCode}</title><style>* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; } body { padding: 30px; color: #1e293b; font-size: 13px; line-height: 1.5; } .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; } .logo { font-size: 22px; font-weight: 800; color: #2563eb; } .title { text-align: center; margin: 15px 0; } .title h2 { font-size: 18px; font-weight: 700; text-transform: uppercase; color: #0f172a; } .title p { font-size: 11px; color: #64748b; margin-top: 2px; } .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 16px; } .row-info { display: flex; font-size: 13px; } .lbl { width: 140px; color: #64748b; font-weight: 500; } .val { flex: 1; font-weight: 600; color: #0f172a; } .table { width: 100%; border-collapse: collapse; margin-top: 10px; } .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; } .table th { background: #f1f5f9; text-transform: uppercase; font-weight: 600; } .condition-box { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 10px; margin-top: 12px; } .terms { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-top: 15px; font-size: 11px; color: #475569; } .signatures { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; } .sign-col { width: 220px; } .sign-title { font-weight: 600; margin-bottom: 50px; font-size: 12px; } @media print { body { padding: 15px; } }</style></head><body><div class="header"><div><div class="logo">QKSHOP.VN</div><div style="font-size: 11px; color: #64748b;">Dịch vụ Tiếp nhận Sửa Chữa & Bảo Hành Laptop</div><div style="font-size: 11px; color: #64748b;">Hotline: 0939.xxx.xxx</div></div><div style="text-align: right;"><div style="font-size: 14px; font-weight: 700; color: #2563eb;">Mã phiếu: ${order.orderCode}</div><div style="font-size: 11px; color: #64748b;">Ngày nhận: ${formatDate(order.createdDate)}</div>${order.promisedDate ? `<div style="font-size: 11px; color: #dc2626; font-weight: 600;">Hẹn trả máy: ${formatDate(order.promisedDate)}</div>` : ''}</div></div><div class="title"><h2>PHIẾU TIẾP NHẬN MÁY SỬA CHỮA / BẢO HÀNH</h2><p>(Quý khách vui lòng giữ phiếu này để đối chiếu khi nhận lại máy)</p></div><div class="grid"><div class="row-info"><span class="lbl">Khách hàng:</span><span class="val">${order.customerName || '—'}</span></div><div class="row-info"><span class="lbl">Số điện thoại:</span><span class="val font-monospace">${order.customerPhone || '—'}</span></div><div class="row-info"><span class="lbl">Dòng máy:</span><span class="val">${order.deviceModel || '—'}</span></div><div class="row-info"><span class="lbl">Số Serial:</span><span class="val font-monospace">${order.deviceSerial || '—'}</span></div><div class="row-info"><span class="lbl">KTV tiếp nhận:</span><span class="val">${order.technicianName || 'QKShop'}</span></div><div class="row-info"><span class="lbl">Trạng thái:</span><span class="val" style="color: #d97706;">${order.status === 'RECEIVED' ? 'Mới tiếp nhận máy' : (order.status || 'Chờ xử lý')}</span></div></div><div class="condition-box"><div style="font-weight: 700; color: #b45309; margin-bottom: 4px;">TÌNH TRẠNG TIẾP NHẬN & PHỤ KIỆN GỬI KÈM:</div><div><strong>• Tình trạng máy lúc nhận:</strong> ${order.intakeCondition || order.note || 'Bình thường / Chưa ghi chú'}</div><div><strong>• Phụ kiện gửi kèm:</strong> ${order.accessoriesReceived || 'Chỉ thân máy (Không có phụ kiện)'}</div></div><div style="margin-top: 14px;"><div style="font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 6px;">Hạng mục dịch vụ / Linh kiện yêu cầu kiểm tra:</div><table class="table"><thead><tr><th style="width: 8%; text-align: center;">STT</th><th>Dịch vụ / Linh kiện</th><th style="width: 15%; text-align: center;">Số lượng</th><th style="width: 25%; text-align: right;">Đơn giá dự kiến</th></tr></thead><tbody>${servicesText || '<tr><td colspan="4" style="text-align:center;color:#64748b;">Kiểm tra tổng quát theo tình trạng máy</td></tr>'}</tbody></table></div><div class="terms"><strong>LƯU Ý QUAN TRỌNG:</strong><p>1. QKShop không chịu trách nhiệm về dữ liệu cá nhân trong máy. Quý khách vui lòng sao lưu trước khi bàn giao.</p><p>2. Vui lòng kiểm tra lại tình trạng máy và phụ kiện được ghi trên phiếu trước khi rời cửa hàng.</p><p>3. Khi đến nhận máy, quý khách vui lòng mang theo phiếu này hoặc số điện thoại đăng ký.</p></div><div class="signatures"><div class="sign-col"><div class="sign-title">KHÁCH HÀNG BÀN GIAO MÁY<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div></div><div class="sign-col"><div class="sign-title">KỸ THUẬT VIÊN TIẾP NHẬN<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div><div style="font-weight: 600; font-size: 13px;">${order.technicianName || 'QKShop'}</div></div></div><script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script></body></html>`);
  win.document.close();
};

const printPaymentInvoice = (order) => { 
  const win = window.open('', '_blank', 'width=850,height=750');
  if (!win || !order) return;
  const rowsHtml = (order.items || []).map((it, idx) => {
    const pText = it.warrantyPeriod || (it.warrantyMonths > 0 ? it.warrantyMonths + ' Tháng' : 'Không BH');
    const lower = pText.toLowerCase();
    let badgeStyle = lower.includes('từ chối') || lower.includes('tu choi') ? 'color: #dc2626; font-weight: 700;' : (lower.includes('theo bh') || lower.includes('theo bảo hành') ? 'color: #2563eb; font-weight: 700;' : '');
    return `<tr><td style="text-align:center;">${idx + 1}</td><td><strong>${it.serviceName || ''}</strong>${it.note ? `<br/><small style="color:#64748b;">${it.note}</small>` : ''}</td><td style="text-align:center;">${it.quantity || 1}</td><td style="text-align:right;">${formatCurrency(it.price)} đ</td><td style="text-align:center; ${badgeStyle}">${pText}</td><td style="text-align:center;">${it.warrantyExpiry || '---'}</td></tr>`;
  }).join('');
  win.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Hóa Đơn & Bảo Hành - ${order.orderCode}</title><style>* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; } body { padding: 30px; color: #1e293b; font-size: 13px; line-height: 1.5; } .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16a34a; padding-bottom: 12px; margin-bottom: 16px; } .logo { font-size: 22px; font-weight: 800; color: #16a34a; } .title { text-align: center; margin: 15px 0; } .title h2 { font-size: 18px; font-weight: 700; text-transform: uppercase; color: #0f172a; } .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 16px; } .row-info { display: flex; font-size: 13px; } .lbl { width: 140px; color: #64748b; font-weight: 500; } .val { flex: 1; font-weight: 600; color: #0f172a; } .table { width: 100%; border-collapse: collapse; margin-top: 10px; } .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; } .table th { background: #f1f5f9; text-transform: uppercase; font-weight: 600; } .total-box { margin-top: 14px; text-align: right; } .total-price { font-size: 18px; font-weight: 800; color: #16a34a; } .terms { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-top: 15px; font-size: 11px; color: #475569; } .signatures { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; } .sign-col { width: 220px; } .sign-title { font-weight: 600; margin-bottom: 50px; font-size: 12px; } @media print { body { padding: 15px; } }</style></head><body><div class="header"><div><div class="logo">QKSHOP.VN</div><div style="font-size: 11px; color: #64748b;">Hóa Đơn Dịch Vụ Sửa Chữa & Bảo Hành</div><div style="font-size: 11px; color: #64748b;">Hotline: 0939.xxx.xxx</div></div><div style="text-align: right;"><div style="font-size: 14px; font-weight: 700; color: #16a34a;">Hóa đơn: ${order.orderCode}</div><div style="font-size: 11px; color: #64748b;">Ngày thanh toán: ${formatDate(order.createdDate)}</div></div></div><div class="title"><h2>PHIẾU THANH TOÁN & BẢO HÀNH DỊCH VỤ</h2></div><div class="grid"><div class="row-info"><span class="lbl">Khách hàng:</span><span class="val">${order.customerName || '—'}</span></div><div class="row-info"><span class="lbl">Số điện thoại:</span><span class="val font-monospace">${order.customerPhone || '—'}</span></div><div class="row-info"><span class="lbl">Dòng máy:</span><span class="val">${order.deviceModel || '—'}</span></div><div class="row-info"><span class="lbl">Số Serial:</span><span class="val font-monospace">${order.deviceSerial || '—'}</span></div><div class="row-info"><span class="lbl">KTV thực hiện:</span><span class="val">${order.technicianName || 'QKShop'}</span></div><div class="row-info"><span class="lbl">Trạng thái:</span><span class="val" style="color: #16a34a;">Đã hoàn tất & Giao khách</span></div></div><table class="table"><thead><tr><th style="width: 6%; text-align: center;">STT</th><th>Dịch vụ / Linh kiện</th><th style="width: 10%; text-align: center;">Số lượng</th><th style="width: 20%; text-align: right;">Đơn giá</th><th style="width: 18%; text-align: center;">Gói bảo hành</th><th style="width: 18%; text-align: center;">Hạn bảo hành</th></tr></thead><tbody>${rowsHtml}</tbody></table><div class="total-box"><div style="font-size: 14px; color: #64748b;">Tổng tiền thanh toán: <span class="total-price">${formatCurrency(order.totalAmount)} đ</span></div></div><div class="terms"><strong>ĐIỀU KHOẢN BẢO HÀNH:</strong><p>1. Các linh kiện thay thế được bảo hành theo thời hạn ghi trên phiếu, tem niêm phong phải còn nguyên vẹn.</p><p>2. Không bảo hành các hư hỏng do rơi vỡ, vào nước, chập cháy nguồn điện, hoặc can thiệp phần cứng trái phép.</p></div><div class="signatures"><div class="sign-col"><div class="sign-title">KHÁCH HÀNG THANH TOÁN<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div></div><div class="sign-col"><div class="sign-title">KỸ THUẬT VIÊN / THU NGÂN<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div><div style="font-weight: 600; font-size: 13px;">${order.technicianName || 'QKShop'}</div></div></div><script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script></body></html>`);
  win.document.close();
};

// ======================================================================
// COMPONENT 1: GỘP MODAL XEM CHI TIẾT & MODAL LƯU THÀNH CÔNG THÀNH 1
// ======================================================================
const OrderViewerModal = ({ order, type, onClose, onEdit, onStatusChange }) => {
  if (!order) return null;
  const isSuccess = type === 'SUCCESS';

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content border-0 shadow-lg rounded-3">
          <div className={`modal-header text-white py-3 ${isSuccess ? 'bg-success' : 'bg-dark'}`}>
            <h5 className="modal-title fw-bold d-flex align-items-center">
              {isSuccess ? <CheckCircle className="me-2" size={22} /> : <Wrench className="me-2 text-warning" size={22} />}
              {isSuccess ? 'Hóa Đơn Dịch Vụ - Mã: ' : 'Chi Tiết Đơn Dịch Vụ: '}{order.orderCode}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            {isSuccess && (
              <div className="alert alert-success border-success-subtle bg-success-subtle text-success-emphasis rounded-3 mb-3 small">
                Hóa đơn dịch vụ sửa chữa đã được cập nhật đồng bộ. Có thể tra cứu bảo hành bằng số điện thoại <strong>{order.customerPhone}</strong>.
              </div>
            )}
            <div className="p-3 bg-light rounded-3 border mb-3">
              <div className="row g-3 small">
                {!isSuccess && <div className="col-md-6 col-lg-3"><strong>Mã hóa đơn:</strong> <span className="badge bg-primary">{order.orderCode}</span></div>}
                {!isSuccess && <div className="col-md-6 col-lg-3"><strong>Ngày nhận:</strong> {formatDate(order.createdDate)}</div>}
                
                <div className="col-md-6 col-lg-3"><strong>Khách hàng:</strong> {order.customerName}</div>
                <div className="col-md-6 col-lg-3"><strong>Số điện thoại:</strong> <span className="text-dark fw-bold">{order.customerPhone}</span></div>
                <div className="col-md-6 col-lg-3"><strong>Dòng máy:</strong> <span className="text-primary fw-bold">{order.deviceModel}</span></div>
                
                {!isSuccess && <div className="col-md-6 col-lg-3"><strong>Số Serial:</strong> <span className="font-monospace fw-bold">{order.deviceSerial || '—'}</span></div>}
                {!isSuccess && <div className="col-md-6 col-lg-3"><strong>Kỹ thuật viên:</strong> {order.technicianName || '—'}</div>}
                
                <div className="col-md-6 col-lg-3"><strong>Hẹn trả máy:</strong> <span className="text-danger fw-bold">{formatDate(order.promisedDate) || '—'}</span></div>
                
                {!isSuccess && <div className="col-md-6"><strong>Tình trạng lúc nhận:</strong> {order.intakeCondition || '—'}</div>}
                {!isSuccess && <div className="col-md-6"><strong>Phụ kiện kèm:</strong> {order.accessoriesReceived || '—'}</div>}
                {isSuccess && order.intakeCondition && <div className="col-md-6"><strong>Tình trạng lúc nhận:</strong> {order.intakeCondition}</div>}

                {order.note && !isSuccess && (
                  <div className="col-12 mt-2 pt-2 border-top"><strong>Ghi chú:</strong> <span className="text-muted">{order.note}</span></div>
                )}
                
                <div className={`col-12 mt-2 pt-2 ${!isSuccess ? 'border-top d-flex flex-wrap justify-content-between align-items-center gap-2' : ''}`}>
                  {!isSuccess && (
                    <div className="d-flex align-items-center gap-2">
                      <span className="fw-semibold text-secondary">Trạng thái phiếu:</span>
                      <select 
                        className="form-select form-select-sm fw-bold border-primary shadow-sm" style={{ width: 'auto' }}
                        value={order.status || 'RECEIVED'} onChange={(e) => onStatusChange(order.id, e.target.value)}
                      >
                        <option value="RECEIVED">1. Mới tiếp nhận (RECEIVED)</option>
                        <option value="IN_REPAIR">2. Đang sửa chữa (IN_REPAIR)</option>
                        <option value="COMPLETED">3. Hoàn tất & Giao khách (COMPLETED)</option>
                        <option value="CANCELLED">4. Hủy phiếu / Không sửa (CANCELLED)</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <strong className="fs-6 me-2">Tổng tiền:</strong>
                    <span className="text-danger fw-bold fs-5">{formatCurrency(order.totalAmount)} đ</span>
                  </div>
                </div>
              </div>
            </div>

            <h6 className="fw-bold mb-2 text-dark">Danh sách dịch vụ & Linh kiện bảo hành:</h6>
            <div className="table-responsive border rounded">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th className="ps-4 py-3 text-center" style={{ width: '60px' }}>STT</th>
                    <th className="py-3">Dịch vụ / Linh kiện</th>
                    <th className="py-3 text-center" style={{ width: '70px' }}>SL</th>
                    <th className="py-3 text-end" style={{ width: '130px' }}>Đơn giá</th>
                    <th className="py-3 text-center" style={{ width: '120px' }}>Bảo hành</th>
                    <th className="py-3 text-center" style={{ width: '130px' }}>Hạn bảo hành</th>
                    {!isSuccess && <th className="pe-4 py-3 text-end" style={{ width: '130px' }}>Trạng thái</th>}
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((it, idx) => {
                    const itExp = getItemExpiryStatus(it.warrantyExpiry, it.warrantyPeriod);
                    const ItExpIcon = itExp.icon;
                    return (
                      <tr key={idx}>
                        <td className="ps-4 py-2 text-center fw-semibold text-muted">{idx + 1}</td>
                        <td className="py-2">
                          <strong className="text-dark">{it.serviceName}</strong>
                          {!isSuccess && it.note && <div className="small text-muted mt-1"><AlertCircle size={12} className="me-1 d-inline"/>Ghi chú/Tem: {it.note}</div>}
                        </td>
                        <td className="text-center">{it.quantity}</td>
                        <td className="text-end fw-medium">{formatCurrency(it.price)} đ</td>
                        <td className="text-center">
                          {it.warrantyPeriod ? ( <span className="badge bg-light text-dark border">{it.warrantyPeriod}</span>
                          ) : it.warrantyMonths > 0 ? ( <span className="badge bg-light text-dark border">{it.warrantyMonths} Tháng</span>
                          ) : ( <span className="badge bg-secondary-subtle text-secondary">Không BH</span> )}
                        </td>
                        <td className="text-center fw-bold text-dark">{it.warrantyExpiry || '—'}</td>
                        {!isSuccess && (
                          <td className="pe-4 text-end">
                            <span className={`badge rounded-pill px-2 py-1 small ${itExp.badge}`}>
                              <ItExpIcon size={12} className="me-1 mb-1 d-inline" /> {itExp.text}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-footer bg-light py-3 px-4 d-flex flex-wrap justify-content-between gap-2">
            <div className="d-flex flex-wrap gap-2">
              {!isSuccess && (
                <button type="button" className="btn btn-warning fw-medium d-flex align-items-center px-4" onClick={() => onEdit(order)}>
                  <Edit3 size={16} className="me-2" /> Sửa đơn này
                </button>
              )}
              <button type="button" className="btn btn-outline-primary d-flex align-items-center shadow-sm" onClick={() => printIntakeTicket(order)}>
                <Printer size={16} className="me-2" /> In Phiếu Nhận Máy
              </button>
              <button type="button" className="btn btn-outline-success d-flex align-items-center shadow-sm" onClick={() => printPaymentInvoice(order)}>
                <Printer size={16} className="me-2" /> In Phiếu Thanh Toán
              </button>
            </div>
            <button type="button" className="btn btn-secondary px-4 fw-medium" onClick={onClose}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ======================================================================
// COMPONENT 2: MODAL CHỌN LINH KIỆN TỪ KHO (TÁCH ĐỂ GỌN CODE)
// ======================================================================
const PartPickerModal = ({ availableParts, onClose, onPick }) => {
  const [term, setTerm] = useState('');
  
  const filtered = availableParts.filter(p => {
    if (!term.trim()) return true;
    const q = term.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
  });

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg rounded-3 overflow-hidden">
          <div className="modal-header bg-white border-bottom py-3">
            <div>
              <h5 className="modal-title fw-bold text-dark d-flex align-items-center">
                <Cpu size={20} className="me-2 text-primary" /> Chọn Linh Kiện Từ Kho
              </h5>
              <small className="text-muted">Chọn linh kiện để tự động điền đơn giá, thời hạn bảo hành và trừ tồn kho</small>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="p-3 bg-light border-bottom">
            <div className="position-relative">
              <Search size={18} className="position-absolute text-muted ms-3 top-50 translate-middle-y" />
              <input type="text" className="form-control ps-5 rounded-pill bg-white" placeholder="Tìm tên linh kiện, mã SKU..." value={term} onChange={e => setTerm(e.target.value)} autoFocus />
            </div>
          </div>
          <div className="modal-body p-0 overflow-y-auto" style={{ maxHeight: '450px' }}>
            {filtered.length === 0 ? (
              <div className="text-center py-5 text-muted"><Cpu size={36} className="text-secondary opacity-50 mb-2" /><div>Không tìm thấy linh kiện.</div></div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-uppercase">
                    <tr>
                      <th className="ps-4 text-center" style={{ width: '60px' }}>STT</th>
                      <th className="ps-2">Mã SKU</th>
                      <th>Tên linh kiện & Thông số</th>
                      <th className="text-center">Tồn kho</th>
                      <th className="text-end">Giá bán lẻ</th>
                      <th className="text-center">Bảo hành</th>
                      <th className="pe-4 text-end"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((part, idx) => (
                      <tr key={part.id} style={{ cursor: 'pointer' }} onClick={() => onPick(part)}>
                        <td className="ps-4 text-center fw-semibold text-muted">{idx + 1}</td>
                        <td className="ps-2"><span className="badge bg-light text-dark font-monospace border px-2 py-1">{part.sku}</span></td>
                        <td><div className="fw-bold text-dark">{part.name}</div>{part.note && <small className="text-muted d-block">{part.note}</small>}</td>
                        <td className="text-center"><span className={`badge rounded-pill px-2 py-1 ${part.quantity > 5 ? 'bg-success' : 'bg-warning text-dark'}`}>Còn {part.quantity}</span></td>
                        <td className="text-end fw-bold text-primary">{part.retailPrice ? formatCurrency(part.retailPrice) + 'đ' : '0đ'}</td>
                        <td className="text-center"><span className="badge bg-light text-secondary border">{part.warrantyPeriod || (part.warrantyMonths ? `${part.warrantyMonths}T` : 'Không BH')}</span></td>
                        <td className="pe-4 text-end"><button type="button" className="btn btn-sm btn-primary rounded-pill px-3 fw-medium shadow-sm" onClick={(e) => { e.stopPropagation(); onPick(part); }}>Chọn</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer bg-light py-2"><button type="button" className="btn btn-secondary rounded-pill px-4" onClick={onClose}>Đóng</button></div>
        </div>
      </div>
    </div>
  );
};


// ======================================================================
// COMPONENT CHÍNH: TRANG SỬA CHỮA
// ======================================================================
export default function TrangSuaChua() {
  const { showToast, confirm } = useToast();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('FORM');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingOrderCode, setEditingOrderCode] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [intakeCondition, setIntakeCondition] = useState('');
  const [accessoriesReceived, setAccessoriesReceived] = useState('');
  const [promisedDate, setPromisedDate] = useState('');
  const [orderStatus, setOrderStatus] = useState('RECEIVED');
  const [technicianName, setTechnicianName] = useState('');
  const [createdDate, setCreatedDate] = useState(() => getTodayDateString());
  const [note, setNote] = useState('');
  const [activeFilterStatus, setActiveFilterStatus] = useState('ALL');

  const [services, setServices] = useState([{ serviceName: '', sku: '', price: '', quantity: 1, warrantyPeriod: '1 Tháng', note: '' }]);

  const [warrantyEligibility, setWarrantyEligibility] = useState(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);

  const [availableParts, setAvailableParts] = useState([]);
  const [showPartPickerModal, setShowPartPickerModal] = useState(false);

  const [completedOrder, setCompletedOrder] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  useEffect(() => {
    fetchOrders();
    fetchAvailableParts();
    if (location.state?.editOrder) handleEditOrder(location.state.editOrder);
    const params = new URLSearchParams(location.search);
    if (params.get('prefillSerial') || params.get('serial')) setDeviceSerial(params.get('prefillSerial') || params.get('serial'));
    if (params.get('prefillCustomer') || params.get('customer')) setCustomerName(params.get('prefillCustomer') || params.get('customer'));
    if (params.get('prefillPhone') || params.get('phone')) setCustomerPhone(params.get('prefillPhone') || params.get('phone'));
    if (params.get('prefillModel') || params.get('device')) setDeviceModel(params.get('prefillModel') || params.get('device'));
  }, [location.state, location.search]);

  useEffect(() => {
    if (!deviceSerial || !deviceSerial.trim()) {
      setWarrantyEligibility(null);
      return;
    }
    const timer = setTimeout(() => {
      checkSerialEligibility(deviceSerial.trim(), customerPhone);
    }, 450);
    return () => clearTimeout(timer);
  }, [deviceSerial]);

  const checkSerialEligibility = async (serial, phone) => {
    if (!serial) return;
    setIsCheckingEligibility(true);
    try {
      const res = await apiSuaChua.checkWarrantyEligibility(serial, phone);
      const data = res.data?.data || res.data || null;
      setWarrantyEligibility(data);
    } catch (e) {
      console.warn('Lỗi kiểm tra tính hợp lệ bảo hành:', e);
      setWarrantyEligibility(null);
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const fetchAvailableParts = async () => {
    try { const res = await apiLinhKien.getAvailable(); setAvailableParts(res.data?.data || res.data || []); } 
    catch (err) { console.error('Lỗi kho:', err); }
  };

  const fetchOrders = async (keyword = '') => {
    setIsLoading(true);
    try { const res = await apiSuaChua.getOrders(keyword ? { keyword } : {}); setOrders(res.data?.data || res.data || []); } 
    catch (err) { console.error('Lỗi đơn:', err); } 
    finally { setIsLoading(false); }
  };

  const handleAddServiceRow = () => setServices([...services, { serviceName: '', sku: '', price: '', quantity: 1, warrantyPeriod: '1 Tháng', note: '' }]);
  
  const handleRemoveServiceRow = (index) => {
    if (services.length <= 1) return setServices([{ serviceName: '', price: '', quantity: 1, warrantyPeriod: '1 Tháng', note: '' }]);
    setServices(services.filter((_, i) => i !== index));
  };
  
  const handleUpdateServiceField = (index, field, value) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const handlePickPart = (part) => {
    const months = part.warrantyMonths !== undefined ? part.warrantyMonths : 1;
    const period = part.warrantyPeriod || (months > 0 ? `${months} Tháng` : 'Không bảo hành');
    const newRow = { serviceName: part.name, sku: part.sku, price: part.retailPrice || 0, quantity: 1, warrantyPeriod: period, partStock: part.quantity, note: '' };
    if (services.length === 1 && !services[0].serviceName.trim() && !services[0].price) setServices([newRow]);
    else setServices([...services, newRow]);
    setShowPartPickerModal(false);
    showToast(`Đã thêm: ${part.name}`, 'success');
  };

  const resetForm = () => {
    setEditingOrderId(null); setEditingOrderCode(''); setCustomerName(''); setCustomerPhone('');
    setDeviceModel(''); setDeviceSerial(''); setIntakeCondition(''); setAccessoriesReceived('');
    setPromisedDate(''); setOrderStatus('RECEIVED'); setTechnicianName(''); setCreatedDate(getTodayDateString());
    setNote(''); setWarrantyEligibility(null); setServices([{ serviceName: '', price: '', quantity: 1, warrantyPeriod: '1 Tháng', note: '' }]);
  };

  const handleEditOrder = (order) => {
    setActiveTab('FORM');
    setEditingOrderId(order.id); setEditingOrderCode(order.orderCode); setCustomerName(order.customerName || ''); setCustomerPhone(order.customerPhone || '');
    setDeviceModel(order.deviceModel || ''); setDeviceSerial(order.deviceSerial || ''); setIntakeCondition(order.intakeCondition || ''); setAccessoriesReceived(order.accessoriesReceived || '');
    setPromisedDate(order.promisedDate ? String(order.promisedDate).slice(0, 10) : ''); setOrderStatus(order.status || 'RECEIVED'); setTechnicianName(order.technicianName || '');
    setNote(order.note || ''); if (order.createdDate) setCreatedDate(order.createdDate.slice(0, 10));

    if (order.items && order.items.length > 0) {
      setServices(order.items.map(it => ({
        serviceName: it.serviceName || '', sku: it.sku || '', price: it.price || 0, quantity: it.quantity || 1,
        warrantyPeriod: it.warrantyPeriod || (it.warrantyMonths > 0 ? `${it.warrantyMonths} Tháng` : 'Không bảo hành'),
        warrantyExpiry: it.warrantyExpiry ? String(it.warrantyExpiry).slice(0, 10) : '', note: it.note || ''
      })));
    } else setServices([{ serviceName: '', price: '', quantity: 1, warrantyPeriod: '1 Tháng', note: '' }]);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Đang sửa hóa đơn ${order.orderCode}`, 'info');
  };

  const handleSaveOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) return showToast('Vui lòng nhập Tên khách hàng và Số điện thoại', 'danger');
    if (!deviceModel.trim()) return showToast('Vui lòng nhập Tên máy', 'danger');

    const validServices = services.filter(s => (s.serviceName || '').trim().length > 0);
    if (validServices.length === 0) return showToast('Nhập ít nhất 1 dịch vụ', 'danger');

    for (let i = 0; i < services.length; i++) {
      const s = services[i]; const sName = (s.serviceName || '').trim(); const wPeriod = (s.warrantyPeriod || '').trim(); const sNote = (s.note || '').trim();
      if (!sName && !wPeriod && !sNote && services.length > 1) continue;
      if (!sName) return showToast(`Dòng ${i + 1}: Vui lòng nhập Tên dịch vụ`, 'danger');
      if (!wPeriod) return showToast(`Dòng ${i + 1}: Bắt buộc nhập Bảo hành`, 'danger');
      if ((wPeriod.toLowerCase().includes('từ chối') || wPeriod.toLowerCase().includes('tu choi')) && !sNote) return showToast(`Dòng ${i + 1}: Từ chối bảo hành bắt buộc nhập ghi chú`, 'danger');
    }

    // Nếu máy đã thu lại về kho: Tuyệt đối từ chối tiếp nhận bảo hành miễn phí (0đ hoặc theo BH máy)
    if (warrantyEligibility?.isReturned) {
      for (let i = 0; i < validServices.length; i++) {
        const s = validServices[i];
        const sPrice = parseFloat(s.price) || 0;
        const wPeriod = (s.warrantyPeriod || '').toLowerCase();
        const sName = (s.serviceName || '').toLowerCase();
        if (sPrice <= 0 || wPeriod.includes('theo bh') || wPeriod.includes('bảo hành') || sName.includes('bảo hành') || sName.includes('rma')) {
          return showToast(`Dòng ${i + 1}: Máy này đã được thu lại về kho, gói bảo hành cũ đã BỊ HỦY. Chỉ nhận sửa chữa dịch vụ tính phí (nhập đơn giá > 0đ)!`, 'danger');
        }
      }
    }

    if (!await confirm(`Xác nhận ${editingOrderId ? 'cập nhật' : 'lưu mới'} đơn dịch vụ cho ${customerName}?`)) return;

    setIsLoading(true);
    try {
      const payload = {
        customerName: customerName.trim(), customerPhone: customerPhone.trim(), deviceModel: deviceModel.trim(),
        deviceSerial: deviceSerial ? deviceSerial.trim() : null, intakeCondition: intakeCondition ? intakeCondition.trim() : null,
        accessoriesReceived: accessoriesReceived ? accessoriesReceived.trim() : null, promisedDate: promisedDate || null,
        status: orderStatus || 'RECEIVED', technicianName: technicianName.trim(), createdDate, note: note.trim(),
        services: validServices.map(s => {
          const periodText = s.warrantyPeriod ? String(s.warrantyPeriod).trim() : 'Không bảo hành';
          let calculatedMonths = 0; const lower = periodText.toLowerCase();
          if (!lower.includes('không') && !lower.includes('từ chối') && !lower.includes('theo bh') && lower !== '0' && lower !== 'none') {
            const match = lower.match(/(\d+)/);
            if (match) {
              const val = parseInt(match[1], 10);
              if (lower.includes('năm') || lower.includes('nam')) calculatedMonths = val * 12;
              else if (lower.includes('ngày') || lower.includes('ngay')) calculatedMonths = Math.ceil(val / 30);
              else calculatedMonths = val;
            }
          }
          return { serviceName: s.serviceName.trim(), sku: s.sku || null, price: parseFloat(s.price) || 0, quantity: parseInt(s.quantity) || 1, warrantyMonths: calculatedMonths, warrantyPeriod: periodText, note: s.note ? s.note.trim() : '' };
        })
      };

      let res;
      if (editingOrderId) { res = await apiSuaChua.updateOrder(editingOrderId, payload); showToast('Cập nhật thành công!', 'success'); } 
      else { res = await apiSuaChua.createOrder(payload); showToast('Lưu mới thành công!', 'success'); }

      setCompletedOrder(res.data?.data || res.data);
      resetForm(); fetchOrders();
    } catch (err) { showToast(err.userMessage || err.message || 'Lỗi khi lưu', 'danger'); } finally { setIsLoading(false); }
  };

  const handleQuickStatusChange = async (orderId, newStatus) => {
    if (!orderId || !newStatus) return;
    try {
      await apiSuaChua.updateOrderStatus(orderId, newStatus);
      showToast(`Đã chuyển trạng thái: ${newStatus}`, 'success');
      fetchOrders();
      if (selectedOrderDetail && selectedOrderDetail.id === orderId) setSelectedOrderDetail({ ...selectedOrderDetail, status: newStatus });
    } catch (err) { showToast(err.userMessage || err.message || 'Lỗi cập nhật trạng thái', 'danger'); }
  };

  const totalAmount = services.reduce((sum, s) => sum + (parseFloat(s.price) || 0) * (parseInt(s.quantity) || 1), 0);
  const filteredOrders = orders.filter(ord => activeFilterStatus === 'ALL' || (ord.status || 'RECEIVED') === activeFilterStatus);

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      
      {/* Header & Tabs */}
      <div className="mb-4">
        <h2 className="fw-bold text-dark d-flex align-items-center mb-1"><Wrench className="me-2 text-warning-emphasis" size={28}/> Quản Lý Sửa Chữa & Dịch Vụ</h2>
        <p className="text-secondary small mb-3">Tạo đơn dịch vụ mới, cập nhật tiến độ, in phiếu bảo hành và quản lý lịch sử sửa chữa</p>

        <ul className="nav nav-tabs nav-tabs-custom border-bottom" role="tablist">
          <li className="nav-item">
            <button className={`nav-link fw-bold px-4 py-3 d-flex align-items-center gap-2 ${activeTab === 'FORM' ? 'active text-primary border-primary border-bottom-2' : 'text-secondary'}`} onClick={() => setActiveTab('FORM')} style={{ borderBottomWidth: activeTab === 'FORM' ? '3px' : '1px' }}>
              <FileText size={18} /> {editingOrderId ? 'Cập Nhật Đơn Sửa Chữa' : 'Tạo Đơn Tiếp Nhận Mới'}
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link fw-bold px-4 py-3 d-flex align-items-center gap-2 ${activeTab === 'LIST' ? 'active text-primary border-primary border-bottom-2' : 'text-secondary'}`} onClick={() => setActiveTab('LIST')} style={{ borderBottomWidth: activeTab === 'LIST' ? '3px' : '1px' }}>
              <List size={18} /> Danh Sách Đơn Gần Đây
            </button>
          </li>
        </ul>
      </div>

      <div className="tab-content">
        {/* ================= TAB 1: FORM ================= */}
        {activeTab === 'FORM' && (
          <div className="fade show active">
            <div className="card shadow-sm border-0 mb-4 rounded-3">
              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h5 className="card-title fw-bold m-0 d-flex align-items-center text-primary">
                  {editingOrderId ? <><Edit3 className="me-2 text-warning" size={20}/> Đang Cập Nhật: <span className="text-danger ms-2">{editingOrderCode}</span></> : <><Plus className="me-2" size={20}/> Tạo Mới Đơn Dịch Vụ</>}
                </h5>
                {editingOrderId && <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center" onClick={resetForm}><X size={14} className="me-1"/> Hủy sửa</button>}
              </div>

              <div className="card-body p-4">
                {editingOrderId && <div className="alert alert-warning border-warning-subtle bg-warning-subtle text-warning-emphasis rounded-3 mb-4 py-2 small d-flex align-items-center justify-content-between"><span>Đang chỉnh sửa hóa đơn <strong>{editingOrderCode}</strong>.</span><button className="btn btn-xs btn-outline-dark ms-2" onClick={resetForm}>Tạo mới</button></div>}

                <h6 className="fw-bold mb-3 text-dark border-bottom pb-2">Thông tin Khách hàng & Thiết bị</h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-6 col-lg-3"><label className="form-label text-muted fw-semibold small">Tên khách hàng *</label><div className="input-group"><span className="input-group-text bg-light text-muted border-end-0"><User size={16}/></span><input className="form-control border-start-0 ps-0" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div></div>
                  <div className="col-md-6 col-lg-3"><label className="form-label text-muted fw-semibold small">Số điện thoại *</label><div className="input-group"><span className="input-group-text bg-light text-muted border-end-0"><Phone size={16}/></span><input className="form-control border-start-0 ps-0" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div></div>
                  <div className="col-md-6 col-lg-3"><label className="form-label text-muted fw-semibold small">Tên máy *</label><div className="input-group"><span className="input-group-text bg-light text-muted border-end-0"><Laptop size={16}/></span><input className="form-control border-start-0 ps-0" value={deviceModel} onChange={e => setDeviceModel(e.target.value)} /></div></div>
                  <div className="col-md-6 col-lg-3">
                    <label className="form-label text-muted fw-semibold small d-flex justify-content-between align-items-center">
                      <span>Số Serial máy</span>
                      {isCheckingEligibility && <span className="spinner-border spinner-border-sm text-primary" style={{ width: '12px', height: '12px' }}></span>}
                    </label>
                    <input className="form-control font-monospace" placeholder="Nhập serial máy..." value={deviceSerial} onChange={e => setDeviceSerial(e.target.value)} />
                  </div>
                  <div className="col-md-4"><label className="form-label text-muted fw-semibold small">Tình trạng lúc nhận</label><input className="form-control" value={intakeCondition} onChange={e => setIntakeCondition(e.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label text-muted fw-semibold small">Phụ kiện kèm theo</label><input className="form-control" value={accessoriesReceived} onChange={e => setAccessoriesReceived(e.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label text-muted fw-semibold small">Ghi chú chung</label><input className="form-control" value={note} onChange={e => setNote(e.target.value)} /></div>
                  <div className="col-md-6 col-lg-3">
                    <label className="form-label text-muted fw-semibold small">Trạng thái xử lý</label>
                    <select className="form-select fw-semibold" value={orderStatus} onChange={e => setOrderStatus(e.target.value)}>
                      <option value="RECEIVED">1. Mới tiếp nhận</option><option value="IN_REPAIR">2. Đang sửa chữa</option><option value="COMPLETED">3. Hoàn tất & Giao khách</option><option value="CANCELLED">4. Hủy phiếu</option>
                    </select>
                  </div>
                  <div className="col-md-6 col-lg-3"><label className="form-label text-muted fw-semibold small">Kỹ thuật viên</label><input className="form-control" value={technicianName} onChange={e => setTechnicianName(e.target.value)} /></div>
                  <div className="col-md-6 col-lg-3"><label className="form-label text-muted fw-semibold small">Ngày tạo đơn</label><input type="date" className="form-control" value={createdDate} onChange={e => setCreatedDate(e.target.value)} /></div>
                  <div className="col-md-6 col-lg-3"><label className="form-label text-muted fw-semibold small">Ngày hẹn giao máy</label><input type="date" className="form-control" value={promisedDate} onChange={e => setPromisedDate(e.target.value)} /></div>

                  {/* Banner Cảnh Báo Nếu Máy Đã Thu Lại (Hủy Bảo Hành Khách Cũ) */}
                  {warrantyEligibility?.isReturned && (
                    <div className="col-12">
                      <div className="alert alert-danger border border-danger border-opacity-50 d-flex align-items-start gap-3 p-3 rounded-3 shadow-sm mb-0">
                        <XCircle className="text-danger flex-shrink-0 mt-1" size={24} />
                        <div className="flex-grow-1">
                          <div className="fw-bold text-danger fs-6 d-flex align-items-center gap-2 flex-wrap">
                            <span>TỪ CHỐI TIẾP NHẬN BẢO HÀNH MIỄN PHÍ</span>
                            <span className="badge bg-danger text-white">MÁY ĐÃ ĐƯỢC THU LẠI VỀ KHO</span>
                          </div>
                          <div className="small text-danger-emphasis mt-1">
                            {warrantyEligibility.reason || 'Máy này đã được shop thu lại về kho. Toàn bộ chính sách và quyền lợi bảo hành cho khách hàng trước đó đã BỊ HỦY HOÀN TOÀN.'}
                          </div>
                          {warrantyEligibility.previousCustomerName && (
                            <div className="small text-muted mt-1">
                              Khách hàng từng mua máy: <strong>{warrantyEligibility.previousCustomerName}</strong> ({warrantyEligibility.previousCustomerPhone || 'Không rõ SĐT'})
                            </div>
                          )}
                          <div className="small fw-semibold text-danger mt-1">
                            👉 Cửa hàng CHỈ TIẾP NHẬN sửa chữa dịch vụ tính phí. Không áp dụng bảo hành miễn phí (giá 0đ hoặc Theo BH máy) cho serial này!
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center mt-4 mb-3 border-bottom pb-2">
                  <h6 className="fw-bold m-0 text-dark">Danh sách Dịch vụ / Linh kiện thực hiện</h6>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline-success d-flex align-items-center rounded-pill px-3 shadow-sm" onClick={() => setShowPartPickerModal(true)}><Cpu size={14} className="me-1"/> Chọn từ kho</button>
                    <button type="button" className="btn btn-sm btn-outline-primary d-flex align-items-center rounded-pill px-3 shadow-sm" onClick={handleAddServiceRow}><Plus size={14} className="me-1"/> Thêm dòng mới</button>
                  </div>
                </div>

                <div className="table-responsive border rounded bg-white mb-4 shadow-sm">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-dark small text-uppercase">
                      <tr>
                        <th className="ps-3 py-3 text-center" style={{ width: '50px' }}>STT</th>
                        <th className="py-3" style={{ minWidth: '250px' }}>Tên dịch vụ / Linh kiện *</th>
                        <th className="py-3 text-center" style={{ width: '80px' }}>SL</th>
                        <th className="py-3 text-end" style={{ minWidth: '150px' }}>Đơn giá</th>
                        <th className="py-3 text-center" style={{ minWidth: '160px' }}>Bảo hành *</th>
                        <th className="py-3" style={{ minWidth: '240px' }}>Ghi chú</th>
                        <th className="pe-3 py-3 text-center" style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((row, idx) => {
                        const isRefused = (row.warrantyPeriod || '').toLowerCase().includes('từ chối') || (row.warrantyPeriod || '').toLowerCase().includes('tu choi');
                        return (
                          <tr key={idx}>
                            <td className="ps-3 py-3 text-center text-muted fw-semibold">{idx + 1}</td>
                            <td className="py-3">
                              <input type="text" className="form-control form-control-sm" placeholder="VD: Cài Win, Thay Pin..." value={row.serviceName} onChange={e => handleUpdateServiceField(idx, 'serviceName', e.target.value)} />
                              {row.sku && (
                                <div className="d-flex align-items-center gap-1 mt-1">
                                  <span className="badge bg-light text-primary font-monospace border" style={{ fontSize: '10px' }}>SKU: {row.sku}</span>
                                  {row.partStock !== undefined && <span className="badge bg-success-subtle text-success" style={{ fontSize: '10px' }}>Kho: {row.partStock}</span>}
                                  <button type="button" className="btn btn-link btn-xs text-danger p-0 ms-1 text-decoration-none" onClick={() => handleUpdateServiceField(idx, 'sku', '')}>&times; gỡ</button>
                                </div>
                              )}
                            </td>
                            <td className="text-center py-3"><input type="number" min="1" className="form-control form-control-sm text-center px-1" value={row.quantity} onChange={e => handleUpdateServiceField(idx, 'quantity', parseInt(e.target.value) || 1)} /></td>
                            <td className="text-end py-3">
                              <div className="input-group input-group-sm">
                                <input type="text" inputMode="numeric" className="form-control text-end fw-semibold text-danger border-end-0" placeholder="0" value={formatCurrency(row.price)} onChange={e => handleUpdateServiceField(idx, 'price', parseCurrency(e.target.value))} />
                                <span className="input-group-text bg-light text-muted">đ</span>
                              </div>
                            </td>
                            <td className="text-center py-3">
                              <input type="text" className="form-control form-control-sm text-center fw-medium px-2" placeholder="Chọn / Nhập..." list={`warranty-suggestions-${idx}`} value={row.warrantyPeriod ?? ''} onChange={e => handleUpdateServiceField(idx, 'warrantyPeriod', e.target.value)} />
                              <datalist id={`warranty-suggestions-${idx}`}>
                                <option value="Theo BH máy (Còn hạn)" /><option value="Từ chối bảo hành" /><option value="Không bảo hành" /><option value="1 Tháng" /><option value="3 Tháng" /><option value="6 Tháng" /><option value="12 Tháng" />
                              </datalist>
                            </td>
                            <td className="py-3">
                              <div className="position-relative">
                                <input type="text" className={`form-control form-control-sm ${isRefused && !row.note?.trim() ? 'border-danger pe-4' : ''}`} placeholder={isRefused ? 'Lý do...' : 'Tem...'} value={row.note} onChange={e => handleUpdateServiceField(idx, 'note', e.target.value)} />
                                {isRefused && !row.note?.trim() && <AlertCircle size={14} className="text-danger position-absolute" style={{ top: '8px', right: '8px' }} />}
                              </div>
                            </td>
                            <td className="pe-3 text-center py-3"><button type="button" className="btn btn-outline-danger btn-sm p-1 d-flex mx-auto" onClick={() => handleRemoveServiceRow(idx)}><Trash2 size={16} /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="table-light border-top">
                      <tr><td colSpan="3" className="text-end fw-semibold py-3 text-secondary">Tổng thanh toán:</td><td className="text-end fw-bold text-danger fs-5 py-3">{formatCurrency(totalAmount)} đ</td><td colSpan="3"></td></tr>
                    </tfoot>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <button type="button" className="btn btn-outline-secondary d-flex align-items-center" onClick={resetForm}><RotateCcw size={16} className="me-1"/> {editingOrderId ? 'Hủy bỏ' : 'Làm mới'}</button>
                  <button type="button" className={`btn fw-bold px-5 py-2 d-flex align-items-center shadow-sm ${editingOrderId ? 'btn-warning text-dark' : 'btn-primary'}`} onClick={handleSaveOrder} disabled={isLoading}>
                    <CheckCircle size={18} className="me-2"/> {editingOrderId ? 'Cập Nhật Hóa Đơn' : 'Lưu Đơn Dịch Vụ Mới'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: LIST ================= */}
        {activeTab === 'LIST' && (
          <div className="fade show active">
            <div className="card shadow-sm border-0 rounded-3">
              <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  <ul className="nav nav-pills small gap-1">
                    <li className="nav-item"><button className={`nav-link py-1 px-3 rounded-pill ${activeFilterStatus === 'ALL' ? 'active fw-bold' : 'text-secondary bg-light'}`} onClick={() => setActiveFilterStatus('ALL')}>Tất cả ({orders.length})</button></li>
                    <li className="nav-item"><button className={`nav-link py-1 px-3 rounded-pill ${activeFilterStatus === 'RECEIVED' ? 'active bg-warning text-dark fw-bold' : 'text-secondary bg-light'}`} onClick={() => setActiveFilterStatus('RECEIVED')}>Mới nhận ({orders.filter(o => o.status === 'RECEIVED' || !o.status).length})</button></li>
                    <li className="nav-item"><button className={`nav-link py-1 px-3 rounded-pill ${activeFilterStatus === 'IN_REPAIR' ? 'active bg-info text-dark fw-bold' : 'text-secondary bg-light'}`} onClick={() => setActiveFilterStatus('IN_REPAIR')}>Đang sửa ({orders.filter(o => o.status === 'IN_REPAIR').length})</button></li>
                    <li className="nav-item"><button className={`nav-link py-1 px-3 rounded-pill ${activeFilterStatus === 'COMPLETED' ? 'active bg-success text-white fw-bold' : 'text-secondary bg-light'}`} onClick={() => setActiveFilterStatus('COMPLETED')}>Hoàn tất ({orders.filter(o => o.status === 'COMPLETED').length})</button></li>
                    <li className="nav-item"><button className={`nav-link py-1 px-3 rounded-pill ${activeFilterStatus === 'CANCELLED' ? 'active bg-danger text-white fw-bold' : 'text-secondary bg-light'}`} onClick={() => setActiveFilterStatus('CANCELLED')}>Đã Hủy ({orders.filter(o => o.status === 'CANCELLED').length})</button></li>
                  </ul>
                </div>
                <div className="input-group" style={{maxWidth: '250px'}}><span className="input-group-text bg-light text-muted border-end-0"><Search size={16} /></span><input type="text" className="form-control border-start-0 ps-0" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); fetchOrders(e.target.value); }} /></div>
              </div>
              <div className="table-responsive bg-white">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-secondary small text-uppercase">
                    <tr><th className="ps-4 py-3 text-center" style={{ width: '60px' }}>STT</th><th className="py-3">Mã Đơn / Ngày</th><th className="py-3">Khách Hàng & SĐT</th><th className="py-3" style={{ minWidth: '180px' }}>Thiết bị</th><th className="py-3 text-center">Trạng thái</th><th className="py-3 text-end">Tổng tiền</th><th className="pe-4 py-3 text-center">Thao tác</th></tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan="7" className="text-center py-5 text-muted"><Wrench size={36} className="opacity-25 mb-2" /><p className="mb-0">Không có đơn nào.</p></td></tr>
                    ) : (
                      filteredOrders.map((ord, idx) => (
                        <tr key={ord.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrderDetail(ord)}>
                          <td className="ps-4 text-center fw-semibold text-muted">{idx + 1}</td>
                          <td><div className="fw-bold text-primary">{ord.orderCode}</div><div className="small text-muted">{formatDate(ord.createdDate)}</div></td>
                          <td><div className="fw-bold text-dark">{ord.customerName}</div><div className="small font-monospace text-muted">{ord.customerPhone}</div></td>
                          <td><div className="fw-medium text-dark text-truncate" style={{ maxWidth: '250px' }} title={ord.deviceModel}>{ord.deviceModel}</div>{ord.deviceSerial && <span className="badge bg-light text-secondary font-monospace border mt-1" style={{ fontSize: '10px' }}>SN: {ord.deviceSerial}</span>}</td>
                          <td className="text-center"><StatusBadge status={ord.status} /></td>
                          <td className="text-end fw-bold text-danger">{formatCurrency(ord.totalAmount)} đ</td>
                          <td className="pe-4 text-center">
                            <div className="d-flex gap-2 justify-content-center" onClick={e => e.stopPropagation()}>
                              <button className="btn btn-sm btn-outline-primary d-flex align-items-center px-2 py-1" onClick={() => handleEditOrder(ord)}><Edit3 size={14} className="me-1"/> Sửa</button>
                              <button className="btn btn-sm btn-light border d-flex align-items-center px-2 py-1 text-dark" onClick={() => setSelectedOrderDetail(ord)}><Eye size={14} className="me-1"/> Xem</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODALS ĐƯỢC TÁCH RA BÊN NGOÀI ================= */}
      {selectedOrderDetail && <OrderViewerModal order={selectedOrderDetail} type="DETAIL" onClose={() => setSelectedOrderDetail(null)} onEdit={(o) => { setSelectedOrderDetail(null); handleEditOrder(o); }} onStatusChange={handleQuickStatusChange} />}
      {completedOrder && <OrderViewerModal order={completedOrder} type="SUCCESS" onClose={() => setCompletedOrder(null)} />}
      {showPartPickerModal && <PartPickerModal availableParts={availableParts} onClose={() => setShowPartPickerModal(false)} onPick={handlePickPart} />}

    </div>
  );
}