import React, { useState, useEffect } from 'react';
import { apiNhapKho } from '../../api';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { formatCurrency, parseCurrency } from '../../utils/dinh_dang';
import { PackagePlus, RefreshCcw, Search } from 'lucide-react';

// Giả lập biến đếm bên ngoài component để giữ giá trị (sau này Back-end sẽ cấp)
let skuCounters = {
  CHUOT: 1,
  BANPHIM: 1,
  BALO: 1,
  SAC: 1,
  TAINGHE: 1,
  KHAC: 1
};

const removeAccents = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

export default function TrangNhapPhuKien() {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importType, setImportType] = useState('NEW'); // 'NEW' hoặc 'EXISTING'
  const [existingAccessories, setExistingAccessories] = useState([]);

  // State cho dropdown tìm kiếm
  const [searchExisting, setSearchExisting] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [form, setForm] = useState({
    category: '',
    sku: '',
    name: '',
    quantity: 1,
    price: ''
  });

  useEffect(() => {
    // Tải danh sách phụ kiện có sẵn để nhập thêm
    const fetchAccessories = async () => {
      try {
        const res = await axiosClient.get('/accessory/all');
        if (res.success) {
          setExistingAccessories(res.data);
          
          // Cập nhật lại bộ đếm SKU dựa trên dữ liệu thực tế từ DB
          const dbCounters = {
            CHUOT: 0, BANPHIM: 0, BALO: 0, SAC: 0, TAINGHE: 0, KHAC: 0
          };
          
          res.data.forEach(acc => {
            if (acc.sku && acc.sku.startsWith('PK-')) {
              const parts = acc.sku.split('-');
              if (parts.length === 3) {
                const cat = parts[1];
                const num = parseInt(parts[2], 10);
                if (!isNaN(num) && num > (dbCounters[cat] || 0)) {
                  dbCounters[cat] = num;
                }
              }
            }
          });
          
          // Cập nhật giá trị bắt đầu cho bộ đếm (mã tiếp theo = max + 1)
          Object.keys(dbCounters).forEach(key => {
             skuCounters[key] = dbCounters[key] + 1;
          });
        }
      } catch (err) {
        console.error('Lỗi tải phụ kiện', err);
      }
    };
    fetchAccessories();
  }, []);

  const categories = [
    { value: 'CHUOT', label: 'Chuột (Mouse)' },
    { value: 'BANPHIM', label: 'Bàn phím (Keyboard)' },
    { value: 'BALO', label: 'Balo / Túi chống sốc' },
    { value: 'SAC', label: 'Sạc / Cáp' },
    { value: 'TAINGHE', label: 'Tai nghe / Loa' },
    { value: 'KHAC', label: 'Phụ kiện khác' }
  ];

  const getCategoryCode = (text) => {
    if (!text) return '';
    const predefined = categories.find(c => c.label.toLowerCase() === text.toLowerCase() || c.value.toLowerCase() === text.toLowerCase());
    if (predefined) return predefined.value;

    let code = removeAccents(text).toUpperCase();
    code = code.replace(/[^A-Z0-9]/g, '');
    return code.substring(0, 10);
  };

  const generateSKU = (code, increment = false) => {
    if (!code) return '';
    if (increment) {
      skuCounters[code] = (skuCounters[code] || 0) + 1;
    }
    const currentCount = skuCounters[code] || 1;
    const suffix = String(currentCount).padStart(4, '0');
    return `PK-${code}-${suffix}`;
  };

  const handleCategoryChange = (val) => {
    const code = getCategoryCode(val);
    const newSku = generateSKU(code, false);
    setForm(prev => ({ ...prev, category: val, sku: newSku }));
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectExisting = (sku) => {
    const selected = existingAccessories.find(a => a.sku === sku);
    if (selected) {
      setForm({
        category: selected.category || '',
        sku: selected.sku,
        name: selected.name,
        quantity: 1,
        price: selected.price || ''
      });
    } else {
      handleReset();
    }
  };

  const handleRegenerateSKU = () => {
    if (form.category) {
      const code = getCategoryCode(form.category);
      setForm(prev => ({ ...prev, sku: generateSKU(code, true) }));
    } else {
      showToast('Vui lòng chọn phân loại trước', 'warning');
    }
  };

  const handleReset = () => {
    setForm({
      category: '',
      sku: '',
      name: '',
      quantity: 1,
      price: ''
    });
  };

  const handleImportTypeChange = (type) => {
    setImportType(type);
    handleReset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.sku.trim()) {
      showToast('Vui lòng nhập SKU phụ kiện', 'danger');
      return;
    }
    if (!form.name.trim()) {
      showToast('Vui lòng nhập tên phụ kiện', 'danger');
      return;
    }
    if (!form.quantity || form.quantity < 1) {
      showToast('Số lượng phải lớn hơn 0', 'danger');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiNhapKho.submitPhuKien(form);

      showToast('Nhập phụ kiện thành công!', 'success');

      if (importType === 'NEW' && form.category) {
        const code = getCategoryCode(form.category);
        skuCounters[code] = (skuCounters[code] || 1) + 1;
      }

      handleReset();
    } catch (err) {
      showToast(err.userMessage || 'Lỗi hệ thống', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAccessories = existingAccessories.filter(a => 
    (a.name || '').toLowerCase().includes(searchExisting.toLowerCase()) || 
    (a.sku || '').toLowerCase().includes(searchExisting.toLowerCase())
  );

  return (
    <div className="container-fluid p-0">
      <div className="d-flex align-items-center mb-4">
        <PackagePlus className="text-primary me-2" size={28} />
        <h4 className="fw-bold mb-0 text-dark">Nhập Phụ Kiện</h4>
      </div>

      <div className="row">
        <div className="col-lg-7" style={{ width: "50%", padding: "0px" }}>
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-header bg-white border-bottom p-3">
              {/* Toggle Nhập Mới / Có Sẵn */}
              <div className="d-flex bg-light p-1 rounded-pill d-inline-flex border">
                <button
                  className={`btn rounded-pill border-0 px-4 py-2 fw-medium transition-all ${importType === 'NEW' ? 'btn-primary shadow-sm' : 'text-secondary hover-bg-light'}`}
                  onClick={() => handleImportTypeChange('NEW')}
                >
                  Tạo phụ kiện mới
                </button>
                <button
                  className={`btn rounded-pill border-0 px-4 py-2 fw-medium transition-all ${importType === 'EXISTING' ? 'btn-primary shadow-sm' : 'text-secondary hover-bg-light'}`}
                  onClick={() => handleImportTypeChange('EXISTING')}
                >
                  Nhập thêm hàng có sẵn
                </button>
              </div>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>

                {importType === 'EXISTING' && (
                  <div className="mb-3 position-relative">
                    <label className="form-label fw-semibold mb-1">
                      Tìm và chọn phụ kiện có sẵn <span className="text-danger">*</span>
                    </label>

                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0 py-2">
                        <Search size={17} className="text-secondary" />
                      </span>

                      <input
                        type="text"
                        className="form-control border-start-0 ps-0 py-2"
                        placeholder="Nhập tên hoặc mã SKU để tìm kiếm..."
                        value={searchExisting}
                        onChange={e => {
                          setSearchExisting(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      />
                    </div>

                    {showDropdown && (
                      <div
                        className="position-absolute w-100 bg-white shadow rounded-3 mt-1 border overflow-auto"
                        style={{ zIndex: 1000, maxHeight: 220 }}
                      >
                        {filteredAccessories.length ? (
                          <div className="list-group list-group-flush">
                            {filteredAccessories.map(acc => (
                              <button
                                key={acc.sku}
                                type="button"
                                className="list-group-item list-group-item-action py-2 px-3 d-flex justify-content-between align-items-center"
                                onClick={() => handleSelectExisting(acc.sku)}
                              >
                                <div>
                                  <div className="fw-semibold">
                                    {acc.name}
                                  </div>

                                  <small className="text-secondary">
                                    SKU: {acc.sku} | Giá: {formatCurrency(acc.price)} đ
                                  </small>
                                </div>

                                <span
                                  className={`badge rounded-pill ${acc.quantity > 0
                                    ? 'bg-success-subtle text-success'
                                    : 'bg-danger-subtle text-danger'
                                    }`}
                                >
                                  Tồn: {acc.quantity}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-2 text-center text-muted small">
                            Không tìm thấy phụ kiện phù hợp
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-dark">Phân loại {importType === 'NEW' && <span className="text-danger">*</span>}</label>
                    <input
                      type="text"
                      className="form-control"
                      list="categories-list"
                      placeholder="Chọn hoặc nhập loại mới..."
                      value={form.category}
                      onChange={e => handleCategoryChange(e.target.value)}
                      disabled={importType === 'EXISTING'}
                    />
                    <datalist id="categories-list">
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.label} />
                      ))}
                    </datalist>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-dark">Mã SKU <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control bg-light"
                        placeholder="Tự động tạo (vd: PK-CHUOT-1234)"
                        value={form.sku}
                        readOnly
                      />
                      {importType === 'NEW' && (
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          title="Tạo lại mã ngẫu nhiên"
                          onClick={handleRegenerateSKU}
                          disabled={!form.category}
                        >
                          <RefreshCcw size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-dark">Tên phụ kiện <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập tên phụ kiện (vd: Chuột không dây Logitech)"
                    value={form.name}
                    onChange={e => handleChange('name', e.target.value)}
                    disabled={importType === 'EXISTING'}
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-dark">Số lượng nhập <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      value={form.quantity}
                      onChange={e => handleChange('quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="col-md-6 mb-4">
                    <label className="form-label fw-semibold text-dark">Giá bán (VNĐ)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nhập giá phụ kiện..."
                      value={formatCurrency(form.price)}
                      onChange={e => handleChange('price', parseCurrency(e.target.value))}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-flex align-items-center fw-medium rounded-pill px-4"
                    onClick={handleReset}
                  >
                    <RefreshCcw size={18} className="me-2" /> Làm mới
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center fw-medium rounded-pill px-4"
                    disabled={isSubmitting || (importType === 'EXISTING' && !form.sku)}
                  >
                    <PackagePlus size={18} className="me-2" /> {isSubmitting ? 'Đang lưu...' : (importType === 'NEW' ? 'Tạo mới' : 'Nhập thêm')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-6 mt-4 mt-lg-0">
          <div className="alert alert-info border-info d-flex flex-column gap-2 p-4 shadow-sm">
            <strong className="d-flex align-items-center gap-2 text-info-emphasis fs-5">
              <span className="badge rounded-circle bg-info text-white d-flex align-items-center justify-content-center p-0" style={{ width: '24px', height: '24px' }}><i className="bi bi-info"></i>i</span>
              Hướng dẫn nhập phụ kiện
            </strong>
            <ul className="text-info-emphasis mb-0 mt-2" style={{ lineHeight: '1.8' }}>
              <li><strong>Phân loại:</strong> Bạn có thể <b>chọn</b> từ danh sách có sẵn, hoặc <b>nhập một loại hoàn toàn mới</b> (vd: "Ốp lưng"). Hệ thống sẽ tự chuẩn hóa mã để tạo SKU.</li>
              <li><strong>Mã SKU:</strong> Hệ thống tự sinh mã duy nhất theo công thức <code>PK-[Phân Loại]-[Mã Ngẫu Nhiên]</code>.</li>
              <li><strong>Tên phụ kiện:</strong> Mô tả chi tiết tên, hãng sản xuất để dễ dàng nhận biết (vd: Chuột không dây Logitech M331).</li>
              <li><strong>Số lượng:</strong> Số lượng nhập kho hiện tại. Tồn kho sẽ được cộng dồn theo mã SKU.</li>
              <li><strong>Giá nhập:</strong> Lưu lại lịch sử giá nhập hoặc để trống nếu chưa có thông tin.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
