import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, AlertCircle, XCircle, FileText, Copy, Check, 
  Printer, User, Phone, Calendar, Laptop, Cpu, HardDrive, 
  Layers, Tag, Clock, Package, DollarSign, CheckCircle2, UserCheck, Hash, Truck, Wrench, RotateCcw, Lock
} from 'lucide-react';
import { apiSuaChua } from '../../api';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { getCleanWarrantyType, formatDate, formatMoney } from '../../utils/dinh_dang';

export default function ModalChiTietDonHang({ order, onClose, statusInfo, onConfirmDelivery, onReturnOrder }) {
  const { hasPermission, requirePermission } = useAuth();
  const { showToast } = useToast();
  const canManageShip = hasPermission('SHIP_MANAGE');
  const canReturnOrder = hasPermission('ORDER_RETURN');
  const canRepair = hasPermission('SERVICE_REPAIR');
  const [copiedKey, setCopiedKey] = useState(null);
  const [repairHistory, setRepairHistory] = useState([]);
  const [isLoadingRepairs, setIsLoadingRepairs] = useState(false);

  useEffect(() => {
    if (order?.serialKey) {
      setIsLoadingRepairs(true);
      apiSuaChua.getOrdersBySerial(order.serialKey)
        .then(res => {
          setRepairHistory(res.data?.data || res.data || []);
        })
        .catch(err => {
          console.error('Lỗi lấy lịch sử sửa chữa theo serial:', err);
          setRepairHistory([]);
        })
        .finally(() => setIsLoadingRepairs(false));
    }
  }, [order?.serialKey]);

  if (!order) return null;

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Trích xuất phụ kiện và quà tặng từ saleNote
  const extractAccessoriesAndNote = (note) => {
    if (!note) return { accessories: [], cleanNote: '' };
    let cleanNote = note;
    const items = [];

    // Tìm quà tặng mặc định
    const giftMarker = 'Quà tặng mặc định: ';
    const giftIdx = cleanNote.indexOf(giftMarker);
    if (giftIdx !== -1) {
      const part = cleanNote.substring(giftIdx + giftMarker.length);
      const splitIdx = part.indexOf(' | ');
      const content = splitIdx !== -1 ? part.substring(0, splitIdx) : part;
      content.split(',').forEach(s => {
        const t = s.trim();
        if (t) items.push(t + ' (Quà tặng)');
      });
      cleanNote = cleanNote.substring(0, giftIdx) + (splitIdx !== -1 ? part.substring(splitIdx + 3) : '');
    }

    // Tìm phụ kiện bán kèm / bán thêm
    const extraMarkers = ['Phụ kiện bán thêm: ', 'Phụ kiện bán kèm: '];
    for (const marker of extraMarkers) {
      const extraIdx = cleanNote.indexOf(marker);
      if (extraIdx !== -1) {
        const part = cleanNote.substring(extraIdx + marker.length);
        const splitIdx = part.indexOf(' | ');
        const content = splitIdx !== -1 ? part.substring(0, splitIdx) : part;
        content.split(',').forEach(s => {
          const t = s.trim();
          if (t) items.push(t);
        });
        cleanNote = cleanNote.substring(0, extraIdx) + (splitIdx !== -1 ? part.substring(splitIdx + 3) : '');
      }
    }

    cleanNote = cleanNote.replace(/^\|\s*|\s*\|\s*$/g, '').trim();
    return { accessories: items, cleanNote };
  };

  const { accessories, cleanNote } = extractAccessoriesAndNote(order.saleNote);
  const StatusIcon = statusInfo?.icon || ShieldCheck;

  const extractUpgradeTotal = (note) => {
    if (!note) return 0;
    const regex = /[(\[]\+([0-9.,]+)[^)]*[)\]]/g;
    let total = 0;
    let match;
    while ((match = regex.exec(note)) !== null) {
      const val = Number(match[1].replace(/[^0-9]/g, '')) || 0;
      total += val;
    }
    return total;
  };

  const upgradeTotal = extractUpgradeTotal(order.upgradeNote);

  const rawSalePrice = Number(order.salePrice) || 0;
  const discAmt = Number(order.discount) || 0;
  const originalAmt = Number(order.grossRevenue) || (Number(order.defaultSalePrice) > 0 ? Number(order.defaultSalePrice) : 0) || rawSalePrice;

  // Nếu salePrice trong DB là giá máy gốc (chưa cộng phí nâng cấp), tự động tính đúng tổng thực thu
  const finalAmt = (upgradeTotal > 0 && rawSalePrice <= originalAmt)
    ? (Math.max(0, originalAmt - discAmt) + upgradeTotal)
    : rawSalePrice;

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
            <div style="font-size: 12px; color: #64748b;">Mã hóa đơn: <strong style="color: #2563eb;">${order.orderCode || order.sourceReference || '—'}</strong></div>
            <div style="font-size: 12px; color: #64748b;">Mã chu kỳ: <strong>${order.cycleId || '—'}</strong></div>
            <div style="font-size: 12px; color: #64748b;">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        <div class="title">
          <h2>PHIẾU XUẤT KHO KIÊM BẢO HÀNH</h2>
          <p>Ngày mua hàng: ${formatDate(order.saleDate)}</p>
        </div>

        ${(order.isVoided || order.closeType === 'CUSTOMER_RETURN' || order.warrantyCancelled) ? `
        <div style="background-color: #fee2e2; border: 2px dashed #dc2626; color: #991b1b; padding: 12px; text-align: center; border-radius: 6px; margin-bottom: 18px;">
          <div style="font-size: 15px; font-weight: 800; margin-bottom: 2px;">⚠️ ĐƠN HÀNG ĐÃ THU HỒI / TRẢ MÁY — GÓI BẢO HÀNH ĐÃ BỊ HỦY</div>
          <div style="font-size: 11px;">Chiếc máy này đã được thu lại về kho. Toàn bộ quyền lợi bảo hành đối với đơn hàng này đã chấm dứt.</div>
        </div>` : ''}

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
              <span class="info-val">${(order.isVoided || order.closeType === 'CUSTOMER_RETURN' || order.warrantyCancelled) ? '<span style="color: #dc2626; font-weight: bold;">ĐÃ HỦY (ĐÃ THU LẠI MÁY)</span>' : getCleanWarrantyType(order.warrantyPeriod)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Hình thức giao:</span>
              <span class="info-val">${order.isShipping ? `Đơn ship xa ${order.isDelivered ? `(Đã nhận: ${formatDate(order.deliveryDate)})` : '(Chờ nhận hàng)'}` : 'Mua tại cửa hàng'}</span>
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
                  ${formatMoney(originalAmt > 0 ? originalAmt : finalAmt)}
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
            <div style="color: #64748b; font-size: 13px;">Giá gốc / Niêm yết máy: <span style="${discAmt > 0 ? 'text-decoration: line-through;' : 'font-weight: 600; color: #0f172a;'}">${formatMoney(originalAmt > 0 ? originalAmt : finalAmt)}</span></div>
            ${upgradeTotal > 0 ? `<div style="color: #b45309; font-size: 13px; font-weight: 600;">Phí nâng cấp linh kiện: +${formatMoney(upgradeTotal)}</div>` : ''}
            ${discAmt > 0 ? `<div style="color: #dc2626; font-size: 13px; font-weight: 600;">Giảm giá / Ưu đãi: -${formatMoney(discAmt)}</div>` : ''}
            <div style="margin-top: 6px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">Tổng thanh toán thực tế: <span class="total-price">${formatMoney(finalAmt)}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">III. Cam Kết & Điều Khoản Bảo Hành</div>
          <div class="terms">
            <h4>Quy định bảo hành tại QKShop:</h4>
            <p>1. Sản phẩm còn nguyên tem bảo hành, số Serial phải trùng khớp với phiếu bảo hành và hệ thống.</p>
            <p>2. Không bảo hành các trường hợp máy bị rơi vỡ, cấn móp, vào nước, cháy nổ do nguồn điện không ổn định hoặc có dấu hiệu can thiệp phần cứng trái phép.</p>
            <p>3. Thời hạn bảo hành: <strong>${getCleanWarrantyType(order.warrantyPeriod)}</strong> (Từ ngày <strong>${formatDate(order.saleDate)}</strong> ${statusInfo?.endDate ? `đến ngày <strong>${formatDate(statusInfo.endDate)}</strong>` : ''}).</p>
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
                  {(order.orderCode || order.sourceReference) && (
                    <span>Mã hóa đơn: <strong className="text-primary font-monospace">{order.orderCode || order.sourceReference}</strong></span>
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
                (order.isVoided || order.closeType === 'CUSTOMER_RETURN' || order.warrantyCancelled)
                  ? 'bg-danger-subtle text-danger-emphasis border-start border-4 border-danger'
                  : statusInfo?.status === 'VALID' ? 'bg-success-subtle text-success-emphasis border-start border-4 border-success'
                  : statusInfo?.status === 'EXPIRED' ? 'bg-danger-subtle text-danger-emphasis border-start border-4 border-danger'
                  : statusInfo?.status === 'VOIDED' ? 'bg-dark-subtle text-dark-emphasis border-start border-4 border-dark'
                  : 'bg-info-subtle text-info-emphasis border-start border-4 border-info'
              }`}>
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2 rounded-circle bg-white shadow-sm">
                    {(order.isVoided || order.closeType === 'CUSTOMER_RETURN' || order.warrantyCancelled) ? (
                      <XCircle size={24} className="text-danger" />
                    ) : (
                      <StatusIcon size={24} className={
                        statusInfo?.status === 'VALID' ? 'text-success' :
                        statusInfo?.status === 'EXPIRED' ? 'text-danger' :
                        statusInfo?.status === 'VOIDED' ? 'text-dark' : 'text-info'
                      } />
                    )}
                  </div>
                  <div>
                    <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                      {(order.isVoided || order.closeType === 'CUSTOMER_RETURN' || order.warrantyCancelled)
                        ? 'Đã hủy bảo hành (Đã thu lại máy)'
                        : (statusInfo?.text || 'Trạng thái bảo hành')}
                      <span className="badge bg-white text-dark border px-2 py-1 small fw-normal">
                        Gói: {(order.isVoided || order.closeType === 'CUSTOMER_RETURN' || order.warrantyCancelled)
                          ? 'Đã hủy'
                          : getCleanWarrantyType(order.warrantyPeriod)}
                      </span>
                    </h6>
                    <div className="small mt-1 opacity-75">
                      {(order.isVoided || order.closeType === 'CUSTOMER_RETURN' || order.warrantyCancelled) ? (
                        <span className="fw-semibold text-danger">
                          Máy này đã được shop thu lại về kho. Toàn bộ quyền lợi bảo hành cho khách hàng này đã chấm dứt hoàn toàn.
                        </span>
                      ) : order.isInStock ? (
                        statusInfo?.endDate ? (
                          <>Hạn bảo hành hãng: <strong>{formatDate(statusInfo.endDate)}</strong></>
                        ) : (
                          <>Gói bảo hành gán cho máy: <strong>{order.warrantyPeriod || 'Chưa thiết lập'}</strong> (Sẽ kích hoạt tính từ ngày bán máy cho khách)</>
                        )
                      ) : statusInfo?.endDate ? (
                        <>Hạn bảo hành đến ngày: <strong>{formatDate(statusInfo.endDate)}</strong></>
                      ) : (
                        'Thời hạn bảo hành theo thỏa thuận hoặc chưa xác định'
                      )}
                      {!order.isInStock && !(order.isVoided || order.closeType === 'CUSTOMER_RETURN' || order.warrantyCancelled) && statusInfo?.diffDays !== undefined && (
                        <span className="ms-2">
                          ({statusInfo.status === 'VALID' 
                            ? `Còn ${statusInfo.diffDays} ngày` 
                            : `Đã hết hạn ${statusInfo.diffDays} ngày trước`})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {(order.isVoided || order.closeType === 'CUSTOMER_RETURN' || order.warrantyCancelled) ? (
                  <div className="badge bg-danger text-white px-3 py-2 rounded-pill mt-2 mt-md-0 fw-bold">
                    <XCircle size={14} className="me-1 d-inline" /> Đã thu máy — Bảo hành đã hủy
                  </div>
                ) : order.isVoided && (
                  <div className="badge bg-danger text-white px-3 py-2 rounded-pill mt-2 mt-md-0">
                    <AlertCircle size={14} className="me-1 d-inline" /> Vòng tồn đã đóng / Đã thu hồi
                  </div>
                )}
              </div>
            </div>

            {/* Thông báo trạng thái hiện tại của chiếc máy nếu đã thu lại hoặc chuyển chu kỳ */}
            {(order.isVoided || order.closeType === 'CUSTOMER_RETURN' || order.currentMachineStateText) && (
              <div className="alert alert-info border border-info border-opacity-25 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between p-3 rounded-3 mb-4 shadow-sm gap-2">
                <div className="d-flex align-items-center gap-2">
                  <Package className="text-primary flex-shrink-0" size={22} />
                  <div>
                    <div className="fw-bold text-dark">
                      Trạng thái hiện tại của chiếc máy này:
                    </div>
                    <div className="small text-secondary">
                      {order.currentMachineStateText || (order.isInStockNow ? 'Máy đang trong kho' : 'Đã thu lại')}
                      {order.currentCycleId && (
                        <span className="ms-2 font-monospace text-muted">
                          (Chu kỳ: {order.currentCycleId})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {order.isInStockNow && (
                  <span className="badge bg-primary px-3 py-2 rounded-pill text-white fw-medium">
                    Đang có sẵn trong kho
                  </span>
                )}
              </div>
            )}

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

                      {/* Vận chuyển & Giao nhận */}
                      <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                        <span className="text-muted small">Hình thức bán:</span>
                        <div>
                          {order.isShipping ? (
                            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 d-inline-flex align-items-center gap-1">
                              <Truck size={13} /> Đơn ship xa
                            </span>
                          ) : (
                            <span className="badge bg-light text-secondary border">
                              Tại cửa hàng
                            </span>
                          )}
                        </div>
                      </div>

                      {order.isShipping && (
                        <div className="p-3 rounded-3 bg-light border mb-1">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small text-secondary fw-semibold">Trạng thái nhận hàng:</span>
                            {order.isDelivered ? (
                              <span className="badge bg-success bg-opacity-15 text-success border border-success d-inline-flex align-items-center gap-1">
                                <CheckCircle2 size={13} /> Khách đã nhận
                              </span>
                            ) : (
                              <span className="badge bg-warning bg-opacity-25 text-warning-emphasis border border-warning d-inline-flex align-items-center gap-1">
                                <Clock size={13} /> Chờ khách nhận hàng
                              </span>
                            )}
                          </div>

                          {order.isDelivered ? (
                            <div className="small text-muted mt-1">
                              Ngày nhận: <strong className="text-dark">{formatDate(order.deliveryDate)}</strong>
                              <div className="text-success small mt-1 fw-medium">
                                (Thời hạn bảo hành bắt đầu tính từ ngày này)
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2">
                              <div className="small text-warning-emphasis mb-2">
                                ⏳ Thời gian bảo hành chưa kích hoạt cho đến khi xác nhận giao thành công.
                              </div>
                              {onConfirmDelivery && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm rounded-3 text-white"
                                  onClick={() => onConfirmDelivery(order)}
                                  title={canManageShip ? 'Xác nhận khách đã nhận & Kích hoạt BH' : 'Yêu cầu quyền: Quản lý đơn ship'}
                                >
                                  <Truck size={15} />
                                  <span>Xác nhận khách đã nhận & Kích hoạt BH</span>
                                  {!canManageShip && <Lock size={13} className="text-warning" />}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {(order.shippingCarrier || order.trackingCode || order.shippingAddress || order.codAmount > 0) && (
                        <div className="p-3 rounded-3 bg-white border">
                          <div className="small fw-bold text-dark mb-2 d-flex align-items-center gap-1">
                            <Truck size={14} className="text-primary" /> Thông tin vận đơn & Giao nhận
                          </div>
                          {order.shippingCarrier && (
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-muted">Đơn vị vận chuyển:</span>
                              <span className="fw-semibold text-dark">{order.shippingCarrier}</span>
                            </div>
                          )}
                          {order.trackingCode && (
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-muted">Mã vận đơn:</span>
                              <span className="fw-bold text-primary font-monospace">{order.trackingCode}</span>
                            </div>
                          )}
                          {order.shippingAddress && (
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-muted">Địa chỉ:</span>
                              <span className="fw-medium text-dark text-end ms-2">{order.shippingAddress}</span>
                            </div>
                          )}
                          {order.depositAmount > 0 && (
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-muted">Đã đặt cọc:</span>
                              <span className="fw-semibold text-success">{formatMoney(order.depositAmount)}</span>
                            </div>
                          )}
                          {order.codAmount > 0 && (
                            <div className="d-flex justify-content-between small">
                              <span className="text-muted">Thu hộ COD:</span>
                              <span className="fw-bold text-danger">{formatMoney(order.codAmount)}</span>
                            </div>
                          )}
                        </div>
                      )}

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
                      
                      <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                        <span className="text-muted small">Giá gốc / Niêm yết máy:</span>
                        <span className={`fw-semibold ${discAmt > 0 ? 'text-secondary text-decoration-line-through' : 'text-dark'}`}>
                          {formatMoney(originalAmt > 0 ? originalAmt : finalAmt)}
                        </span>
                      </div>

                      {order.upgradeNote && (
                        <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                          <span className="text-muted small">Cấu hình nâng cấp:</span>
                          <span className="badge bg-warning bg-opacity-25 text-dark border border-warning small text-truncate" style={{maxWidth: '180px'}} title={order.upgradeNote}>
                            {order.upgradeNote}
                          </span>
                        </div>
                      )}

                      {upgradeTotal > 0 && (
                        <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                          <span className="text-muted small">Phí nâng cấp linh kiện:</span>
                          <span className="fw-bold text-warning">
                            + {formatMoney(upgradeTotal)}
                          </span>
                        </div>
                      )}

                      <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                        <span className="text-muted small">Chiết khấu / Giảm giá:</span>
                        <span className={`fw-semibold ${discAmt > 0 ? 'text-danger' : 'text-muted'}`}>
                          {discAmt > 0 ? `- ${formatMoney(discAmt)}` : '0 đ'}
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

                      <div className="d-flex justify-content-between align-items-center pt-2 bg-light p-3 rounded-3">
                        <div>
                          <span className="fw-bold text-dark d-block">Tổng hóa đơn thực thu:</span>
                          <small className="text-muted" style={{ fontSize: '11px' }}>(Đã tính nâng cấp & giảm giá)</small>
                        </div>
                        <span className="h4 m-0 fw-bold text-primary">
                          {formatMoney(finalAmt)}
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
                          <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
                            {order.brandName && (
                              <span className="badge bg-secondary-subtle text-secondary border">
                                {order.brandName} {order.modelLineName ? `• ${order.modelLineName}` : ''}
                              </span>
                            )}
                            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle py-1 px-2 fw-semibold">
                              Giá gốc máy: {formatMoney(originalAmt > 0 ? originalAmt : finalAmt)}
                            </span>
                          </div>
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
                        <div className="fw-bold text-dark d-flex align-items-center justify-content-between mb-1">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-warning text-dark">Nâng cấp cấu hình</span>
                            <span>Cấu hình bàn giao cho khách:</span>
                          </div>
                          <span className="badge bg-success-subtle text-success border border-success-subtle small">
                            <ShieldCheck size={12} className="me-1 d-inline" /> Bảo hành đồng bộ theo máy
                          </span>
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

                {/* Lịch sử Sửa chữa & Tiếp nhận Bảo hành của máy */}
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold text-dark m-0 d-flex align-items-center gap-2">
                      <Wrench size={18} className="text-warning-emphasis" />
                      Lịch sử Tiếp nhận Sửa Chữa & Bảo Hành (RMA)
                    </h6>
                    <span className="badge bg-light text-secondary border font-monospace">
                      Serial: {order.serialKey}
                    </span>
                  </div>
                  <div className="card-body p-4">
                    {isLoadingRepairs ? (
                      <div className="text-center py-3 text-muted">
                        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                        <span>Đang kiểm tra lịch sử sửa chữa...</span>
                      </div>
                    ) : repairHistory.length === 0 ? (
                      <div className="text-center py-4 bg-light rounded-3 border border-dashed">
                        <ShieldCheck size={32} className="text-success mb-2 opacity-75" />
                        <div className="fw-semibold text-dark">Chưa có lịch sử sửa chữa / bảo hành</div>
                        <small className="text-muted">Chiếc máy này chưa từng phát sinh bảo hành hoặc sửa chữa tại cửa hàng.</small>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {repairHistory.map((rep) => (
                          <div key={rep.id} className="p-3 rounded-3 border bg-light">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-primary fw-bold font-monospace">{rep.orderCode}</span>
                                <span className="small text-muted">{formatDate(rep.createdDate)}</span>
                              </div>
                              <span className={`badge rounded-pill px-2 py-1 small ${
                                rep.status === 'COMPLETED' ? 'bg-success' :
                                rep.status === 'IN_REPAIR' ? 'bg-info text-dark' :
                                rep.status === 'CANCELLED' ? 'bg-danger' : 'bg-warning text-dark'
                              }`}>
                                {rep.status === 'COMPLETED' ? 'Đã hoàn tất & Giao khách' :
                                 rep.status === 'IN_REPAIR' ? 'Đang sửa chữa' :
                                 rep.status === 'CANCELLED' ? 'Hủy phiếu' : 'Mới tiếp nhận máy'}
                              </span>
                            </div>

                            {rep.intakeCondition && (
                              <div className="small text-dark mb-1">
                                <strong>Tình trạng lúc nhận:</strong> {rep.intakeCondition}
                              </div>
                            )}
                            {rep.accessoriesReceived && (
                              <div className="small text-muted mb-2">
                                <strong>Phụ kiện kèm:</strong> {rep.accessoriesReceived}
                              </div>
                            )}

                            {rep.items && rep.items.length > 0 && (
                              <div className="bg-white rounded border p-2 mt-2">
                                <div className="small fw-bold text-secondary mb-1">Dịch vụ & Linh kiện thực hiện:</div>
                                <ul className="mb-0 ps-3 small text-dark">
                                  {rep.items.map((it, idx) => (
                                    <li key={idx}>
                                      <strong>{it.serviceName}</strong> (SL: {it.quantity || 1})
                                      {it.price > 0 && ` - ${formatMoney(it.price)}`}
                                      {it.warrantyPeriod && ` • BH: ${it.warrantyPeriod}`}
                                      {it.warrantyExpiry && ` (Đến: ${formatDate(it.warrantyExpiry)})`}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                              <span className="small text-muted">KTV: <strong>{rep.technicianName || 'QKShop'}</strong></span>
                              <span className="fw-bold text-danger">{formatMoney(rep.totalAmount)}</span>
                            </div>
                          </div>
                        ))}
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
            <div className="d-flex flex-wrap gap-2">
              <button 
                type="button" 
                className="btn btn-outline-secondary px-3 rounded-pill" 
                onClick={onClose}
              >
                Đóng
              </button>
              {!order.isInStock && !order.isVoided && onReturnOrder && (
                <button
                  type="button"
                  className="btn btn-outline-danger px-3 rounded-pill d-flex align-items-center gap-1 shadow-sm fw-semibold"
                  onClick={() => onReturnOrder(order)}
                  title={canReturnOrder ? 'Hoàn trả / Thu hồi máy về kho' : 'Yêu cầu quyền: Hoàn hàng & Trả máy'}
                >
                  <RotateCcw size={15} />
                  <span>Hoàn trả về kho</span>
                  {!canReturnOrder && <Lock size={12} className="text-warning" />}
                </button>
              )}
              {order.isVoided || order.closeType === 'CUSTOMER_RETURN' || order.warrantyCancelled ? (
                <button
                  type="button"
                  className="btn btn-outline-danger px-3 rounded-pill d-flex align-items-center gap-1 shadow-sm fw-medium disabled"
                  disabled
                  title="Gói bảo hành đã bị hủy do máy đã được thu lại về kho. Từ chối tiếp nhận bảo hành theo đơn này."
                >
                  <XCircle size={16} className="text-danger" />
                  <span>Từ chối tiếp nhận BH (Đã thu máy)</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-warning px-3 rounded-pill d-flex align-items-center gap-1 shadow-sm text-dark fw-bold"
                  onClick={() => {
                    if (!requirePermission('SERVICE_REPAIR', showToast, 'Tạo phiếu tiếp nhận bảo hành / sửa chữa (RMA)')) return;
                    window.location.href = `/dich-vu-sua-chua?prefillSerial=${order.serialKey}&prefillCustomer=${encodeURIComponent(order.customerName || '')}&prefillPhone=${order.customerPhone || ''}&prefillModel=${encodeURIComponent(order.sourceModelText || '')}`;
                  }}
                  title={canRepair ? 'Tạo phiếu dịch vụ tiếp nhận bảo hành máy này' : 'Yêu cầu quyền: Dịch vụ sửa chữa & Tiếp nhận BH'}
                >
                  <ShieldCheck size={16} />
                  <span>Tiếp nhận Bảo hành (RMA)</span>
                  {!canRepair && <Lock size={12} className="text-danger" />}
                </button>
              )}
              <button 
                type="button" 
                className="btn btn-primary px-3 rounded-pill d-flex align-items-center gap-2 shadow-sm"
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
