import React, { useState } from 'react';
import { X, Edit3, Save, AlertCircle, Calendar, User, Phone, Laptop, FileText, Truck, Clock, CheckCircle } from 'lucide-react';
import { apiBaoHanh } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { tinhNgayHetHanBaoHanh, getTodayDateString } from '../../utils/dinh_dang';

export default function ModalSuaDonMay({ order, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [warrantyPeriod, setWarrantyPeriod] = useState(order.warrantyPeriod || '6 tháng');
  const [isShipping, setIsShipping] = useState(Boolean(order.isShipping));
  const [isDelivered, setIsDelivered] = useState(Boolean(order.isDelivered));
  const [deliveryDate, setDeliveryDate] = useState(
    order.deliveryDate ? String(order.deliveryDate).slice(0, 10) : ''
  );
  const [warrantyExpiry, setWarrantyExpiry] = useState(
    order.warrantyExpiry ? String(order.warrantyExpiry).slice(0, 10) : ''
  );
  const [shippingCarrier, setShippingCarrier] = useState(order.shippingCarrier || '');
  const [trackingCode, setTrackingCode] = useState(order.trackingCode || '');
  const [shippingAddress, setShippingAddress] = useState(order.shippingAddress || '');
  const [depositAmount, setDepositAmount] = useState(order.depositAmount || '');
  const [codAmount, setCodAmount] = useState(order.codAmount || '');
  const [saleNote, setSaleNote] = useState(order.saleNote || '');
  const [isSaving, setIsSaving] = useState(false);

  const isCompanyWarranty = Boolean(
    warrantyPeriod && (warrantyPeriod.toLowerCase().includes('hãng') || warrantyPeriod.toLowerCase().includes('hang'))
  );

  const calculateExpiry = (period, ship, deliv, dDate) => {
    if (period && period.toLowerCase().includes('hãng')) {
      return warrantyExpiry;
    }
    if (ship && !deliv) return '';
    const baseDate = (ship && deliv) ? (dDate || getTodayDateString()) : order.saleDate;
    return tinhNgayHetHanBaoHanh(baseDate, period) || '';
  };

  const handleWarrantyPeriodChange = (val) => {
    setWarrantyPeriod(val);
    const auto = calculateExpiry(val, isShipping, isDelivered, deliveryDate);
    if (auto) setWarrantyExpiry(auto);
  };

  const handleShippingChange = (checked) => {
    setIsShipping(checked);
    if (!checked) {
      setIsDelivered(false);
      setDeliveryDate('');
      if (!isCompanyWarranty) {
        const auto = calculateExpiry(warrantyPeriod, false, false, '');
        if (auto) setWarrantyExpiry(auto);
      }
    } else {
      if (!isDelivered && !isCompanyWarranty) {
        setWarrantyExpiry('');
      }
    }
  };

  const handleDeliveredChange = (checked) => {
    setIsDelivered(checked);
    const newDate = checked && !deliveryDate ? getTodayDateString() : deliveryDate;
    if (checked && !deliveryDate) {
      setDeliveryDate(newDate);
    }
    const auto = calculateExpiry(warrantyPeriod, isShipping, checked, newDate);
    setWarrantyExpiry(auto);
  };

  const handleDeliveryDateChange = (val) => {
    setDeliveryDate(val);
    if (isDelivered) {
      const auto = calculateExpiry(warrantyPeriod, isShipping, true, val);
      if (auto) setWarrantyExpiry(auto);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Vui lòng nhập tên khách hàng và số điện thoại', 'warning');
      return;
    }

    if (isShipping && isDelivered && !deliveryDate) {
      showToast('Vui lòng chọn ngày khách nhận hàng', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await apiBaoHanh.updateMachineOrder(order.cycleId, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        isShipping,
        isDelivered: isShipping ? isDelivered : true,
        deliveryDate: isShipping ? (isDelivered ? (deliveryDate || null) : null) : null,
        shippingCarrier: shippingCarrier || null,
        trackingCode: trackingCode || null,
        shippingAddress: shippingAddress || null,
        depositAmount: depositAmount ? Number(depositAmount) : 0,
        codAmount: codAmount ? Number(codAmount) : 0,
        warrantyPeriod: warrantyPeriod.trim(),
        warrantyExpiry: (isShipping && !isDelivered && !isCompanyWarranty) ? null : (warrantyExpiry || null),
        saleNote: saleNote.trim()
      });
      showToast('Cập nhật thông tin đơn máy thành công!', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi cập nhật đơn máy', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1065 }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow border-0 rounded-4">
          <div className="modal-header bg-primary text-white py-3">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <Edit3 size={20} />
              Chỉnh Sửa Đơn Máy: {order.serialKey}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={isSaving} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              <div className="mb-3">
                <label className="form-label small fw-semibold text-secondary">Dòng máy & Serial</label>
                <div className="p-2 bg-light rounded border fw-bold text-dark">
                  {order.sourceModelText || 'Không rõ'} - <span className="font-monospace text-primary">{order.serialKey}</span>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Tên khách hàng</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><User size={16} className="text-muted" /></span>
                    <input
                      type="text"
                      className="form-control"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Số điện thoại</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><Phone size={16} className="text-muted" /></span>
                    <input
                      type="text"
                      className="form-control"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* --- KHỐI ĐƠN SHIP XA & NHẬN HÀNG --- */}
                <div className="col-12">
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="form-check form-switch d-flex align-items-center mb-2">
                      <input
                        className="form-check-input fs-5 mt-0 me-2"
                        type="checkbox"
                        role="switch"
                        id="modalShippingSwitch"
                        checked={isShipping}
                        onChange={(e) => handleShippingChange(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label className="form-check-label fw-bold text-dark d-flex align-items-center gap-2" htmlFor="modalShippingSwitch" style={{ cursor: 'pointer' }}>
                        <Truck size={17} className="text-primary" />
                        Đơn ship xa / Giao hàng đi tỉnh
                      </label>
                    </div>

                    {isShipping && (
                      <div className="mt-3 pt-3 border-top">
                        <div className="row g-2 mb-3">
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold text-secondary mb-0.5">Đơn vị vận chuyển</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="VD: GHTK, Viettel Post..."
                              value={shippingCarrier}
                              onChange={(e) => setShippingCarrier(e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold text-secondary mb-0.5">Mã vận đơn</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Mã tracking"
                              value={trackingCode}
                              onChange={(e) => setTrackingCode(e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold text-secondary mb-0.5">Tiền cọc trước (VNĐ)</label>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              placeholder="0"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                            />
                          </div>
                          <div className="col-md-8">
                            <label className="form-label small fw-semibold text-secondary mb-0.5">Địa chỉ giao hàng</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Địa chỉ cụ thể"
                              value={shippingAddress}
                              onChange={(e) => setShippingAddress(e.target.value)}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold text-secondary mb-0.5">Thu hộ COD (VNĐ)</label>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              placeholder="Số tiền COD"
                              value={codAmount}
                              onChange={(e) => setCodAmount(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="row g-3 align-items-center pt-2 border-top">
                          <div className="col-md-6">
                            <div className="form-check form-switch d-flex align-items-center">
                              <input
                                className="form-check-input fs-5 mt-0 me-2"
                                type="checkbox"
                                role="switch"
                                id="modalDeliveredSwitch"
                                checked={isDelivered}
                                onChange={(e) => handleDeliveredChange(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                              />
                              <label className="form-check-label fw-bold text-dark" htmlFor="modalDeliveredSwitch" style={{ cursor: 'pointer' }}>
                                Xác nhận khách đã nhận hàng
                              </label>
                            </div>
                            <div className="text-muted small ms-4 ps-1 mt-1">
                              {isDelivered ? 'Đã giao - Bảo hành tính từ ngày nhận' : 'Đang giao - Chờ khách nhận hàng'}
                            </div>
                          </div>

                          <div className="col-md-6">
                            {isDelivered ? (
                              <div>
                                <label className="form-label small fw-semibold text-dark mb-1">
                                  Ngày khách nhận hàng <span className="text-danger">*</span>
                                </label>
                                <input
                                  type="date"
                                  className="form-control border-success"
                                  value={deliveryDate}
                                  onChange={(e) => handleDeliveryDateChange(e.target.value)}
                                  required={isDelivered}
                                />
                              </div>
                            ) : (
                              <div className="badge bg-warning bg-opacity-25 text-warning-emphasis border border-warning px-3 py-2 rounded-2 text-wrap w-100 text-start">
                                ⏳ <strong>Đang ở trạng thái Chờ:</strong> Thời gian bảo hành chưa được kích hoạt cho đến khi khách nhận máy (ngoại trừ gói Bảo hành hãng).
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Gói bảo hành</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: 1 tháng, 6 tháng, 1 năm..."
                    value={warrantyPeriod}
                    onChange={(e) => handleWarrantyPeriodChange(e.target.value)}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary">
                    Ngày hết hạn bảo hành
                    {isShipping && !isDelivered && !isCompanyWarranty && (
                      <span className="badge bg-warning text-dark ms-2">Chờ nhận hàng</span>
                    )}
                    {isCompanyWarranty && (
                      <span className="badge bg-primary text-white ms-2">Bảo hành hãng</span>
                    )}
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><Calendar size={16} className="text-muted" /></span>
                    <input
                      type="date"
                      className="form-control"
                      value={warrantyExpiry}
                      onChange={(e) => setWarrantyExpiry(e.target.value)}
                      disabled={isShipping && !isDelivered && !isCompanyWarranty}
                    />
                  </div>
                  {isShipping && !isDelivered && !isCompanyWarranty && (
                    <div className="small text-muted mt-1">
                      (Bảo hành sẽ tự động tính khi tích "Xác nhận khách đã nhận hàng")
                    </div>
                  )}
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary">Ghi chú giao dịch</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Nhập ghi chú thêm cho đơn hàng..."
                    value={saleNote}
                    onChange={(e) => setSaleNote(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer bg-light d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-secondary px-4 rounded-pill" onClick={onClose} disabled={isSaving}>
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary px-4 rounded-pill fw-bold d-flex align-items-center gap-2" disabled={isSaving}>
                {isSaving ? <span className="spinner-border spinner-border-sm" /> : <Save size={16} />}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
