import React, { useState, useEffect } from 'react';
import { 
  Cpu, RefreshCcw, Search, CheckCircle2, AlertCircle, 
  PackagePlus, ShieldCheck, DollarSign, Tag, TrendingUp, Layers, Plus, Info, FileText
} from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { apiLinhKien } from '../../api';
import { formatCurrency, parseCurrency } from '../../utils/dinh_dang';

// Bộ đếm SKU linh kiện khởi tạo (sẽ được đồng bộ với max SKU trong DB khi load trang)
let skuCounters = {
  RAM: 1,
  SSD: 1,
  HDD: 1,
  PIN: 1,
  MANHINH: 1,
  BANPHIM: 1,
  SAC: 1,
  MAIN: 1,
  FAN: 1,
  BANLE: 1,
  LOA: 1,
  KHAC: 1
};

const removeAccents = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

export default function TrangNhapLinhKien() {
  const { showToast, confirm } = useToast();

  const [importType, setImportType] = useState('NEW'); // 'NEW' hoặc 'EXISTING'
  const [existingParts, setExistingParts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State cho dropdown tìm kiếm khi nhập thêm vào mã có sẵn
  const [searchExisting, setSearchExisting] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    category: '',
    sku: '',
    quantity: 1,
    retailPrice: '',
    upgradePrice: '',
    importPrice: '',
    warrantyMonths: 1,
    warrantyPeriod: '1 Tháng',
    note: ''
  });

  // Lịch sử vừa nhập trong phiên làm việc
  const [recentlyImported, setRecentlyImported] = useState([]);

  // Danh mục phân loại chuẩn gợi ý
  const categories = [
    { value: 'RAM', label: 'RAM (Bộ nhớ trong)' },
    { value: 'SSD', label: 'SSD (Ổ cứng thể rắn)' },
    { value: 'HDD', label: 'HDD (Ổ cứng cơ)' },
    { value: 'PIN', label: 'Pin (Battery)' },
    { value: 'MANHINH', label: 'Màn hình (Screen/LCD)' },
    { value: 'BANPHIM', label: 'Bàn phím (Keyboard)' },
    { value: 'SAC', label: 'Sạc / Nguồn (Adapter)' },
    { value: 'MAIN', label: 'Bo mạch chủ (Mainboard)' },
    { value: 'FAN', label: 'Quạt tản nhiệt / Fan' },
    { value: 'BANLE', label: 'Bản lề (Hinge)' },
    { value: 'LOA', label: 'Loa (Speaker)' },
    { value: 'KHAC', label: 'Linh kiện khác' }
  ];

  // Chuẩn hóa tên phân loại thành mã viết hoa không dấu
  const getCategoryCode = (text) => {
    if (!text) return '';
    const predefined = categories.find(
      c => c.label.toLowerCase() === text.toLowerCase() || c.value.toLowerCase() === text.toLowerCase()
    );
    if (predefined) return predefined.value;

    let code = removeAccents(text).toUpperCase();
    code = code.replace(/[^A-Z0-9]/g, '');
    return code.substring(0, 10) || 'KHAC';
  };

  // Hàm sinh mã SKU chuẩn tiền tố LK-
  const generateSKU = (code, increment = false) => {
    if (!code) return '';
    if (increment) {
      skuCounters[code] = (skuCounters[code] || 0) + 1;
    }
    const currentCount = skuCounters[code] || 1;
    const suffix = String(currentCount).padStart(4, '0');
    return `LK-${code}-${suffix}`;
  };

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      const res = await apiLinhKien.getAll();
      const list = res.data?.data || res.data || [];
      setExistingParts(list);

      // Cập nhật lại bộ đếm SKU dựa trên dữ liệu thực tế từ DB
      const dbCounters = {};
      list.forEach(p => {
        if (p.sku && p.sku.startsWith('LK-')) {
          const parts = p.sku.split('-');
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
    } catch (err) {
      console.error('Lỗi tải danh sách linh kiện:', err);
    }
  };

  const handleCategoryChange = (val) => {
    const code = getCategoryCode(val);
    const newSku = generateSKU(code, false);
    setForm(prev => ({ ...prev, category: val, sku: newSku }));
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRegenerateSKU = () => {
    if (form.category) {
      const code = getCategoryCode(form.category);
      setForm(prev => ({ ...prev, sku: generateSKU(code, true) }));
    } else {
      showToast('Vui lòng chọn hoặc nhập phân loại trước', 'warning');
    }
  };

  const handleSelectExisting = (sku) => {
    const selected = existingParts.find(p => p.sku === sku);
    if (selected) {
      setForm({
        name: selected.name,
        category: selected.category || '',
        sku: selected.sku,
        quantity: 1,
        retailPrice: selected.retailPrice ? formatCurrency(selected.retailPrice) : '',
        upgradePrice: selected.upgradePrice ? formatCurrency(selected.upgradePrice) : '',
        importPrice: selected.importPrice ? formatCurrency(selected.importPrice) : '',
        warrantyMonths: selected.warrantyMonths || 1,
        warrantyPeriod: selected.warrantyPeriod || '1 Tháng',
        note: selected.note || ''
      });
      setShowDropdown(false);
      setSearchExisting('');
    } else {
      handleReset();
    }
  };

  const handleWarrantyOptionChange = (months) => {
    const m = parseInt(months, 10);
    let periodText = 'Không bảo hành';
    if (m > 0) {
      if (m >= 12 && m % 12 === 0) {
        periodText = `${m / 12} Năm`;
      } else {
        periodText = `${m} Tháng`;
      }
    }
    setForm(prev => ({
      ...prev,
      warrantyMonths: m,
      warrantyPeriod: periodText
    }));
  };

  const handleReset = () => {
    setForm({
      name: '',
      category: '',
      sku: '',
      quantity: 1,
      retailPrice: '',
      upgradePrice: '',
      importPrice: '',
      warrantyMonths: 1,
      warrantyPeriod: '1 Tháng',
      note: ''
    });
    setSearchExisting('');
  };

  const handleImportTypeChange = (type) => {
    setImportType(type);
    handleReset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.sku.trim()) {
      showToast('Vui lòng nhập hoặc tạo mã SKU', 'warning');
      return;
    }
    if (!form.name.trim()) {
      showToast('Vui lòng nhập tên linh kiện', 'warning');
      return;
    }
    if (!form.category.trim()) {
      showToast('Vui lòng nhập phân loại linh kiện', 'warning');
      return;
    }
    if (parseInt(form.quantity, 10) <= 0) {
      showToast('Số lượng nhập phải lớn hơn 0', 'warning');
      return;
    }

    const retailPriceNum = parseCurrency(form.retailPrice) || 0;
    const upgradePriceNum = parseCurrency(form.upgradePrice) || 0;

    if (retailPriceNum <= 0 && upgradePriceNum <= 0) {
      const isConfirmed = await confirm('Cả giá bán lẻ và giá nâng cấp đều đang là 0đ. Bạn có chắc chắn muốn lưu mức giá này?');
      if (!isConfirmed) return;
    }

    setIsSubmitting(true);
    try {
      const categoryCode = getCategoryCode(form.category);
      const payload = {
        name: form.name.trim(),
        category: categoryCode,
        sku: form.sku.trim(),
        quantity: parseInt(form.quantity, 10),
        retailPrice: retailPriceNum,
        upgradePrice: upgradePriceNum,
        importPrice: parseCurrency(form.importPrice) || 0,
        warrantyMonths: form.warrantyMonths,
        warrantyPeriod: form.warrantyPeriod,
        note: form.note ? form.note.trim() : ''
      };

      const res = await apiLinhKien.importPart(payload);
      const savedPart = res.data?.data || res.data;

      // Cập nhật bộ đếm nếu nhập mới
      if (importType === 'NEW') {
        const parts = savedPart.sku.split('-');
        if (parts.length === 3) {
          const cat = parts[1];
          const num = parseInt(parts[2], 10);
          if (!isNaN(num)) {
            skuCounters[cat] = Math.max(skuCounters[cat] || 0, num + 1);
          }
        }
      }

      showToast(`Đã nhập linh kiện ${savedPart.name} (SL: +${form.quantity}) thành công!`, 'success');
      setRecentlyImported(prev => [savedPart, ...prev.filter(p => p.sku !== savedPart.sku)]);
      
      fetchParts();
      handleReset();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi nhập kho linh kiện', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredParts = existingParts.filter(p => {
    if (!searchExisting.trim()) return false;
    const q = searchExisting.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) ||
           (p.sku || '').toLowerCase().includes(q) ||
           (p.category || '').toLowerCase().includes(q);
  });

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      {/* HEADER PAGE */}
      <div className="mb-4">
        <h2 className="m-0 fw-bold text-dark d-flex align-items-center">
          <Cpu className="me-2 text-primary" size={28} /> Nhập Kho Linh Kiện
        </h2>
        <p className="text-secondary mb-0 mt-1">
          Quản lý nhập linh kiện phục vụ sửa chữa, thay thế hoặc nâng cấp cấu hình theo máy.
        </p>
      </div>

      <div className="row g-4">
        {/* CỘT TRÁI: FORM NHẬP LIỆU CHÍNH */}
        <div className="col-xl-8 col-lg-7">
          <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
            <div className="card-body p-4">
              
              {/* TABS CHUYỂN ĐỔI CHẾ ĐỘ NHẬP */}
              <ul className="nav nav-pills nav-fill p-1 bg-light rounded-3 mb-4 border shadow-sm" role="tablist">
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link rounded-2 fw-semibold py-2 transition-all ${importType === 'NEW' ? 'active bg-primary text-white shadow-sm' : 'text-secondary'}`}
                    onClick={() => handleImportTypeChange('NEW')}
                    type="button"
                  >
                    <Plus size={18} className="me-2 mb-1" />
                    Nhập mã linh kiện mới
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button 
                    className={`nav-link rounded-2 fw-semibold py-2 transition-all ${importType === 'EXISTING' ? 'active bg-primary text-white shadow-sm' : 'text-secondary'}`}
                    onClick={() => handleImportTypeChange('EXISTING')}
                    type="button"
                  >
                    <PackagePlus size={18} className="me-2 mb-1" />
                    Nhập thêm (Đã có sẵn)
                  </button>
                </li>
              </ul>

              <form onSubmit={handleSubmit}>
                
                {/* NẾU LÀ CHẾ ĐỘ NHẬP THÊM: Ô TÌM KIẾM AUTOCOMPLETE DROPDOWN */}
                {importType === 'EXISTING' && (
                  <div className="mb-4 position-relative">
                    <label className="form-label fw-bold text-dark">
                      Tìm linh kiện trong kho <span className="text-danger">*</span>
                    </label>
                    <div className="input-group input-group-lg shadow-sm rounded-3">
                      <span className="input-group-text bg-white border-end-0 text-primary">
                        <Search size={20} />
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        placeholder="Nhập tên hoặc mã SKU linh kiện để tìm nhanh..."
                        value={searchExisting}
                        onChange={e => {
                          setSearchExisting(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
                      />
                    </div>

                    {showDropdown && (
                      <div 
                        className="position-absolute w-100 bg-white shadow-lg rounded-3 mt-2 border overflow-auto"
                        style={{ zIndex: 1050, maxHeight: 300 }}
                      >
                        {filteredParts.length ? (
                          <div className="list-group list-group-flush">
                            {filteredParts.map(p => (
                              <button
                                key={p.sku}
                                type="button"
                                className="list-group-item list-group-item-action py-3 px-4 d-flex justify-content-between align-items-center border-bottom"
                                onClick={() => handleSelectExisting(p.sku)}
                              >
                                <div>
                                  <div className="fw-bold text-dark fs-6">{p.name}</div>
                                  <div className="text-secondary small mt-1">
                                    <span className="badge bg-light text-dark font-monospace border me-2">{p.sku}</span>
                                    Giá lẻ: <span className="text-danger fw-medium">{formatCurrency(p.retailPrice)}đ</span> | 
                                    Nâng cấp: <span className="text-primary fw-medium">{formatCurrency(p.upgradePrice)}đ</span>
                                  </div>
                                </div>
                                <span className={`badge rounded-pill px-3 py-2 ${p.quantity > 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                  Kho: {p.quantity}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-muted">
                            <Search size={32} className="mb-2 text-light-subtle opacity-50" />
                            <div>{searchExisting.trim() ? 'Không tìm thấy linh kiện phù hợp' : 'Vui lòng gõ từ khóa để tìm linh kiện...'}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* KHU VỰC 1: THÔNG TIN CƠ BẢN */}
                <div className="p-3 bg-light rounded-3 border mb-4">
                  <h6 className="fw-bold text-secondary mb-3 d-flex align-items-center">
                    <Info size={16} className="me-2" /> Thông tin cơ bản
                  </h6>
                  
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-dark">
                        Phân loại {importType === 'NEW' && <span className="text-danger">*</span>}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        list="categories-list"
                        placeholder="VD: RAM, SSD, Pin..."
                        value={form.category}
                        onChange={e => handleCategoryChange(e.target.value)}
                        disabled={importType === 'EXISTING'}
                        required
                      />
                      <datalist id="categories-list">
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.label} />
                        ))}
                      </datalist>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-dark">Mã SKU <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control bg-white font-monospace fw-bold text-primary"
                          placeholder="LK-RAM-0001"
                          value={form.sku}
                          readOnly
                        />
                        {importType === 'NEW' && (
                          <button
                            className="btn btn-outline-secondary"
                            type="button"
                            title="Tạo lại mã SKU tiếp theo"
                            onClick={handleRegenerateSKU}
                            disabled={!form.category}
                          >
                            <RefreshCcw size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-1">
                    <label className="form-label fw-semibold text-dark">Tên linh kiện <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="VD: RAM DDR4 8GB 3200MHz Kingston..."
                      value={form.name}
                      onChange={e => handleChange('name', e.target.value)}
                      disabled={importType === 'EXISTING'}
                      required
                    />
                  </div>
                </div>

                {/* KHU VỰC 2: SỐ LƯỢNG VÀ GIÁ BÁN */}
                <div className="p-3 bg-white rounded-3 border border-primary-subtle shadow-sm mb-4">
                  <h6 className="fw-bold text-primary mb-3 d-flex align-items-center">
                    <Tag size={16} className="me-2" /> Định lượng & Giá bán
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold text-dark">
                        Số lượng <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light text-muted">
                          <Plus size={16}/>
                        </span>
                        <input
                          type="number"
                          min="1"
                          className="form-control text-center fw-bold fs-6"
                          value={form.quantity}
                          onChange={e => handleChange('quantity', parseInt(e.target.value, 10) || 1)}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold text-danger">Giá bán lẻ <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control text-end fw-bold text-danger"
                          placeholder="0"
                          value={form.retailPrice}
                          onChange={e => {
                            const raw = parseCurrency(e.target.value);
                            handleChange('retailPrice', raw ? formatCurrency(raw) : '');
                          }}
                        />
                        <span className="input-group-text bg-light text-muted">đ</span>
                      </div>
                      <small className="text-muted d-block mt-1" style={{ fontSize: '11px' }}>Khách mua lẻ/sửa chữa</small>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold text-primary">Giá nâng cấp <span className="text-primary">*</span></label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control text-end fw-bold text-primary"
                          placeholder="0"
                          value={form.upgradePrice}
                          onChange={e => {
                            const raw = parseCurrency(e.target.value);
                            handleChange('upgradePrice', raw ? formatCurrency(raw) : '');
                          }}
                        />
                        <span className="input-group-text bg-light text-muted">đ</span>
                      </div>
                      <small className="text-muted d-block mt-1" style={{ fontSize: '11px' }}>Khách mua kèm máy</small>
                    </div>
                  </div>
                </div>

                {/* KHU VỰC 3: GIÁ VỐN, BẢO HÀNH & GHI CHÚ */}
                <div className="row g-4 mb-4">
                  <div className="col-md-12">
                    <div className="d-flex align-items-center mb-3">
                      <ShieldCheck size={18} className="text-success me-2" />
                      <h6 className="fw-bold text-dark m-0">Bảo hành & Nhập vốn</h6>
                    </div>
                    
                    <div className="row g-3 mb-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold text-dark">Giá nhập vốn</label>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control text-end"
                            placeholder="0"
                            value={form.importPrice}
                            onChange={e => {
                              const raw = parseCurrency(e.target.value);
                              handleChange('importPrice', raw ? formatCurrency(raw) : '');
                            }}
                          />
                          <span className="input-group-text bg-light text-muted">đ</span>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-semibold text-dark">BH Mặc định (Lẻ)</label>
                        <select
                          className="form-select"
                          value={form.warrantyMonths}
                          onChange={e => handleWarrantyOptionChange(e.target.value)}
                        >
                          <option value="0">Không bảo hành</option>
                          <option value="1">1 Tháng (Test máy, vệ sinh)</option>
                          <option value="3">3 Tháng (LK Phổ thông)</option>
                          <option value="6">6 Tháng (Pin, Màn, Sạc)</option>
                          <option value="12">12 Tháng (RAM, SSD chuẩn)</option>
                          <option value="24">24 Tháng (SSD chính hãng)</option>
                          <option value="36">36 Tháng (RAM, SSD 3 năm)</option>
                        </select>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-semibold text-dark">Tên hiển thị BH</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="VD: 1 Tháng..."
                          value={form.warrantyPeriod}
                          onChange={e => handleChange('warrantyPeriod', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="alert alert-primary d-flex align-items-center py-2 px-3 mb-3 border-0 bg-primary-subtle text-primary-emphasis rounded-3" role="alert">
                      <AlertCircle size={20} className="me-2 flex-shrink-0" />
                      <div style={{ fontSize: '13px' }}>
                        <strong>Lưu ý:</strong> Nếu linh kiện này được <strong>nâng cấp cho máy bán mới</strong>, hệ thống tự động áp dụng chế độ bảo hành của máy thay vì bảo hành lẻ.
                      </div>
                    </div>

                    <div>
                      <label className="form-label fw-semibold text-dark d-flex align-items-center">
                         <FileText size={16} className="me-2 text-secondary" /> Ghi chú / Thông số
                      </label>
                      <textarea
                        rows="2"
                        className="form-control"
                        placeholder="VD: Bus 3200MHz, chuẩn 2280..."
                        value={form.note}
                        onChange={e => handleChange('note', e.target.value)}
                      />
                    </div>

                  </div>
                </div>

                {/* NÚT THAO TÁC */}
                <div className="d-flex justify-content-end gap-3 pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-light border px-4 rounded-pill fw-medium"
                    onClick={handleReset}
                    disabled={isSubmitting}
                  >
                    Làm mới form
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-5 rounded-pill fw-bold shadow-sm d-flex align-items-center transition-all"
                    disabled={isSubmitting || (importType === 'EXISTING' && !form.sku)}
                  >
                    <CheckCircle2 size={18} className="me-2" />
                    {isSubmitting ? 'Đang xử lý...' : (importType === 'NEW' ? 'Nhập Linh Kiện Mới' : 'Xác Nhận Nhập Thêm')}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>

        {/* CỘT PHẢI: LỊCH SỬ VỪA NHẬP */}
        <div className="col-xl-4 col-lg-5">
          <div className="card shadow-sm border-0 rounded-4 overflow-hidden h-100 bg-white">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 className="card-title fw-bold m-0 text-dark d-flex align-items-center">
                <Layers size={18} className="me-2 text-primary" /> Vừa nhập gần đây
              </h6>
              <span className="badge bg-primary rounded-pill">{recentlyImported.length}</span>
            </div>
            
            <div className="card-body p-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {recentlyImported.length === 0 ? (
                <div className="h-100 d-flex flex-column align-items-center justify-content-center py-5 text-muted px-4 text-center">
                  <PackagePlus size={48} className="text-light-subtle mb-3 opacity-50" />
                  <p className="mb-0 small">Chưa có linh kiện nào được nhập trong phiên này.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentlyImported.map((item, idx) => (
                    <div key={item.id || item.sku} className={`list-group-item p-3 border-bottom ${idx === 0 ? 'bg-success-subtle bg-opacity-10' : ''}`}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="fw-bold text-dark lh-sm pe-2">{item.name}</div>
                        <span className="badge bg-success rounded-pill px-2 py-1 fs-6 flex-shrink-0 shadow-sm">
                          +{item.quantity}
                        </span>
                      </div>
                      
                      <div className="d-flex align-items-center gap-2 mb-2 small">
                        <span className="badge bg-light text-dark font-monospace border">{item.sku}</span>
                        <span className="badge bg-info-subtle text-info-emphasis">{item.category}</span>
                      </div>
                      
                      <div className="p-2 bg-light rounded-3 small">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Giá lẻ:</span>
                          <strong className="text-danger">{item.retailPrice ? formatCurrency(item.retailPrice) + 'đ' : '0đ'}</strong>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Nâng cấp:</span>
                          <strong className="text-primary">{item.upgradePrice ? formatCurrency(item.upgradePrice) + 'đ' : '0đ'}</strong>
                        </div>
                        <div className="d-flex justify-content-between border-top pt-1 mt-1">
                          <span className="text-muted">Bảo hành:</span>
                          <span className="fw-medium text-dark">{item.warrantyPeriod || '1 Tháng'}</span>
                        </div>
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
  );
}