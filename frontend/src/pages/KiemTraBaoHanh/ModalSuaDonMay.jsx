import React, { useState } from 'react';
import { X, Edit3, Save, AlertCircle, Calendar, User, Phone, Laptop, FileText } from 'lucide-react';
import { apiBaoHanh } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { tinhNgayHetHanBaoHanh } from '../../utils/dinh_dang';

export default function ModalSuaDonMay({ order, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [warrantyPeriod, setWarrantyPeriod] = useState(order.warrantyPeriod || '6 tháng');
  const [warrantyExpiry, setWarrantyExpiry] = useState(
    order.warrantyExpiry ? String(order.warrantyExpiry).slice(0, 10) : ''
  );
  const [saleNote, setSaleNote] = useState(order.saleNote || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleWarrantyPeriodChange = (val) => {
    setWarrantyPeriod(val);
    const autoExpiry = tinhNgayHetHanBaoHanh(order.saleDate, val);
    if (autoExpiry) {
      setWarrantyExpiry(autoExpiry);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Vui lòng nhập tên khách hàng và số điện thoại', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await apiBaoHanh.updateMachineOrder(order.cycleId, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        warrantyPeriod: warrantyPeriod.trim(),
        warrantyExpiry: warrantyExpiry || null,
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
      <div className="modal-dialog modal-dialog-centered">
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
                  <label className="form-label small fw-semibold text-secondary">Ngày hết hạn bảo hành</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white"><Calendar size={16} className="text-muted" /></span>
                    <input
                      type="date"
                      className="form-control"
                      value={warrantyExpiry}
                      onChange={(e) => setWarrantyExpiry(e.target.value)}
                    />
                  </div>
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
