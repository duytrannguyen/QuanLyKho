import React, { useState } from 'react';
import { X, Edit3, Save, Wrench, User, Phone, Calendar, ClipboardList, ShieldAlert, Monitor } from 'lucide-react';
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

    // Kiểm tra tính hợp lệ của từng dịch vụ
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const sName = (it.serviceName || '').trim();
      const wPeriod = (it.warrantyPeriod || '').trim();
      const sNote = (it.note || '').trim();

      if (!wPeriod) {
        showToast(`Dịch vụ "${sName}": Vui lòng chọn hoặc nhập Gói bảo hành (bắt buộc)`, 'danger');
        return;
      }

      const lower = wPeriod.toLowerCase();
      if ((lower.includes('từ chối') || lower.includes('tu choi')) && !sNote) {
        showToast(`Dịch vụ "${sName}": Do từ chối bảo hành, bắt buộc nhập lý do vào cột Ghi chú`, 'danger');
        return;
      }
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
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1065 }} tabIndex="-1">
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
          
          {/* Header */}
          <div className="modal-header bg-primary bg-gradient text-white py-3 border-bottom-0">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2 m-0">
              <Wrench size={20} />
              Chỉnh Sửa Phiếu Dịch Vụ Sửa Chữa #{order.orderCode}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={isSaving} />
          </div>

          <form onSubmit={handleSubmit} className="d-flex flex-column" style={{ overflow: 'hidden' }}>
            <div className="modal-body p-4 bg-light">
              
              {/* Card 1: Thông tin chung */}
              <div className="card shadow-sm border-0 mb-4 rounded-3">
                <div className="card-header bg-white py-3 border-bottom">
                  <h6 className="fw-bold text-dark m-0 d-flex align-items-center">
                    <ClipboardList size={18} className="me-2 text-primary" />
                    Thông tin khách hàng & Thiết bị
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6 col-lg-3">
                      <label className="form-label small fw-semibold text-secondary mb-1">Tên khách hàng</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-light text-muted border-end-0"><User size={15} /></span>
                        <input
                          type="text"
                          className="form-control border-start-0 ps-0"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                      <label className="form-label small fw-semibold text-secondary mb-1">Số điện thoại</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-light text-muted border-end-0"><Phone size={15} /></span>
                        <input
                          type="text"
                          className="form-control border-start-0 ps-0"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                      <label className="form-label small fw-semibold text-secondary mb-1">Thiết bị sửa chữa</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-light text-muted border-end-0"><Monitor size={15} /></span>
                        <input
                          type="text"
                          className="form-control border-start-0 ps-0"
                          placeholder="VD: Dell XPS 9500..."
                          value={deviceModel}
                          onChange={(e) => setDeviceModel(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6 col-lg-3">
                      <label className="form-label small fw-semibold text-secondary mb-1">Kỹ thuật viên</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-light text-muted border-end-0"><Wrench size={15} /></span>
                        <input
                          type="text"
                          className="form-control border-start-0 ps-0"
                          placeholder="Tên KTV..."
                          value={technicianName}
                          onChange={(e) => setTechnicianName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-secondary mb-1">Ghi chú chung của phiếu</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows="2"
                        placeholder="Ghi chú thêm về tình trạng nhận máy..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Chi tiết dịch vụ */}
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-header bg-white py-3 border-bottom">
                  <h6 className="fw-bold text-dark m-0 d-flex align-items-center">
                    <ShieldAlert size={18} className="me-2 text-primary" />
                    Chỉnh sửa bảo hành theo từng dịch vụ
                  </h6>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light text-secondary small">
                        <tr>
                          <th className="ps-4 py-3" style={{ minWidth: '220px' }}>Dịch vụ / Linh kiện</th>
                          <th className="py-3 text-center" style={{ width: '80px' }}>SL</th>
                          <th className="py-3" style={{ minWidth: '180px' }}>
                            Gói bảo hành <span className="text-danger">*</span>
                          </th>
                          <th className="py-3" style={{ minWidth: '160px' }}>Ngày hết hạn</th>
                          <th className="pe-4 py-3" style={{ minWidth: '250px' }}>
                            Ghi chú / Tem <span className="text-muted fw-normal" style={{ fontSize: '11px' }}>(bắt buộc nếu từ chối)</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => {
                          const lower = (it.warrantyPeriod || '').toLowerCase();
                          const isRefused = lower.includes('từ chối') || lower.includes('tu choi');

                          return (
                            <tr key={it.id || idx}>
                              <td className="ps-4 py-3 fw-medium text-dark">{it.serviceName}</td>
                              <td className="text-center">
                                <span className="badge bg-secondary rounded-pill px-2">{it.quantity}</span>
                              </td>
                              <td className="py-3">
                                <input
                                  type="text"
                                  className={`form-control ${!it.warrantyPeriod?.trim() ? 'border-warning shadow-none' : ''}`}
                                  placeholder="Chọn / Nhập..."
                                  list={`modal-warranty-suggestions-${idx}`}
                                  value={it.warrantyPeriod || ''}
                                  onChange={(e) => handleItemChange(idx, 'warrantyPeriod', e.target.value)}
                                  required
                                />
                                <datalist id={`modal-warranty-suggestions-${idx}`}>
                                  <option value="Theo BH máy (Còn hạn)" />
                                  <option value="Từ chối bảo hành" />
                                  <option value="Không bảo hành" />
                                  <option value="Bao test 7 ngày" />
                                  <option value="15 Ngày" />
                                  <option value="1 Tháng" />
                                  <option value="2 Tháng" />
                                  <option value="3 Tháng" />
                                  <option value="6 Tháng" />
                                  <option value="12 Tháng" />
                                  <option value="24 Tháng" />
                                  <option value="36 Tháng" />
                                </datalist>
                              </td>
                              <td className="py-3">
                                <input
                                  type="date"
                                  className="form-control text-muted"
                                  value={it.warrantyExpiry || ''}
                                  onChange={(e) => handleItemChange(idx, 'warrantyExpiry', e.target.value)}
                                  disabled={isRefused || lower.includes('theo bh')}
                                />
                              </td>
                              <td className="pe-4 py-3">
                                <div className="position-relative">
                                  <input
                                    type="text"
                                    className={`form-control ${isRefused && !it.note?.trim() ? 'is-invalid pe-4' : ''}`}
                                    placeholder={isRefused ? 'Bắt buộc nhập lý do từ chối...' : 'Ghi chú thêm...'}
                                    value={it.note || ''}
                                    onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                                  />
                                  {isRefused && !it.note?.trim() && (
                                    <div className="invalid-feedback d-block mt-1" style={{ fontSize: '12px' }}>
                                      * Cần ghi rõ lý do từ chối
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer bg-white border-top py-3 px-4 d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light border px-4 fw-medium text-secondary" onClick={onClose} disabled={isSaving}>
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary px-4 fw-bold d-flex align-items-center gap-2 shadow-sm" disabled={isSaving}>
                {isSaving ? <span className="spinner-border spinner-border-sm" /> : <Save size={18} />}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}