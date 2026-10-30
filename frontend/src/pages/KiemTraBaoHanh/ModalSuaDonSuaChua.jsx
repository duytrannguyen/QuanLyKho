import React, { useState } from 'react';
import { X, Edit3, Save, Wrench, User, Phone, Calendar } from 'lucide-react';
import { apiBaoHanh } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { tinhNgayHetHanBaoHanh } from '../../utils/dinh_dang';

export default function ModalSuaDonSuaChua({ order, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || '');
  const [deviceModel, setDeviceModel] = useState(order.deviceModel || '');
  const [technicianName, setTechnicianName] = useState(order.technicianName || '');
  const [note, setNote] = useState(order.note || '');
  const [items, setItems] = useState(() => (order.items || []).map(it => ({
    id: it.id,
    serviceName: it.serviceName,
    quantity: it.quantity,
    warrantyPeriod: it.warrantyPeriod || (it.warrantyMonths > 0 ? `${it.warrantyMonths} Tháng` : 'Không BH'),
    warrantyMonths: it.warrantyMonths !== undefined ? it.warrantyMonths : 0,
    warrantyExpiry: it.warrantyExpiry ? String(it.warrantyExpiry).slice(0, 10) : '',
    note: it.note || ''
  })));
  const [isSaving, setIsSaving] = useState(false);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    if (field === 'warrantyPeriod') {
      const autoExpiry = tinhNgayHetHanBaoHanh(order.createdDate || order.orderDate, value);
      if (autoExpiry) {
        item.warrantyExpiry = autoExpiry;
      }
    }

    updated[index] = item;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deviceModel.trim()) {
      showToast('Vui lòng nhập tên khách, SĐT và tên máy sửa chữa', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await apiBaoHanh.updateRepairOrder(order.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deviceModel: deviceModel.trim(),
        technicianName: technicianName.trim(),
        note: note.trim(),
        items: items.map(it => ({
          id: it.id,
          warrantyPeriod: it.warrantyPeriod,
          warrantyExpiry: it.warrantyExpiry || null,
          note: it.note
        }))
      });
      showToast('Cập nhật phiếu sửa chữa thành công!', 'success');
      onSuccess?.();
      onClose();

    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi cập nhật phiếu sửa chữa', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1065 }} tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content shadow border-0 rounded-4">
          <div className="modal-header bg-primary text-white py-3">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <Wrench size={20} />
              Chỉnh Sửa Phiếu Dịch Vụ Sửa Chữa #{order.orderCode}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={isSaving} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              <div className="row g-3 mb-4">
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
                  <label className="form-label small fw-semibold text-secondary">Thiết bị sửa chữa</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Dell XPS 9500..."
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    required
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label small fw-semibold text-secondary">Kỹ thuật viên</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tên KTV..."
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small fw-semibold text-secondary">Ghi chú phiếu</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Ghi chú thêm..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>

              <h6 className="fw-bold text-dark mb-2">Chỉnh sửa bảo hành theo từng dịch vụ:</h6>
              <div className="table-responsive border rounded">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light small">
                    <tr>
                      <th className="ps-3 py-2">Dịch vụ / Linh kiện</th>
                      <th className="py-2 text-center" style={{ width: '60px' }}>SL</th>
                      <th className="py-2" style={{ width: '150px' }}>Gói bảo hành</th>
                      <th className="py-2" style={{ width: '160px' }}>Ngày hết hạn</th>
                      <th className="pe-3 py-2" style={{ width: '160px' }}>Ghi chú/Tem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="ps-3 py-2 fw-semibold text-dark">{it.serviceName}</td>
                        <td className="text-center">{it.quantity}</td>
                        <td className="py-2">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="VD: 1 Ngày, 1 Tháng..."
                            value={it.warrantyPeriod}
                            onChange={(e) => handleItemChange(idx, 'warrantyPeriod', e.target.value)}
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={it.warrantyExpiry}
                            onChange={(e) => handleItemChange(idx, 'warrantyExpiry', e.target.value)}
                          />
                        </td>

                        <td className="pe-3 py-2">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Ghi chú"
                            value={it.note}
                            onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
