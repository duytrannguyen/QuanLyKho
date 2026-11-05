import React, { useState, useEffect } from 'react';
import { apiMayMoc, apiTonKho, apiNhapKho, apiCatalog } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { INTAKE_TYPE_MAP, CYCLE_STATE_MAP } from '../../constants/trangThai';
import { formatCurrency, parseCurrency, tinhNgayHetHanBaoHanh, formatDate } from '../../utils/dinh_dang';

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TrangNhapMayMoc() {
  const { showToast, confirm } = useToast();
  const [tab, setTab] = useState('single');
  const [serialsText, setSerialsText] = useState('');
  const [excelFile, setExcelFile] = useState(null);
  const [isExisting, setIsExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSerial, setIsLoadingSerial] = useState(false);
  const [previewGroups, setPreviewGroups] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const [form, setForm] = useState({
    serial: '', brand: '', productLine: '', modelFull: '',
    segment: '', importType: 'PURCHASE', initialStatus: 'READY',
    importDate: getTodayDateString(),
    warrantyOption: '',
    warrantyPeriod: '',
    warrantyExpiry: '',
    customWarranty: '',
    cpu: '', gpu: '', ram: '16GB', ssd: '512GB',
    touchscreen: 'Không cảm ứng', screenSize: '', price: '', notes: ''
  });

  const [filterOptions, setFilterOptions] = useState({
    cpus: [], gpus: [], screenSizes: [],
    brands: [], productLines: [], models: []
  });

  useEffect(() => {
    // Fetch cpus/gpus
    apiTonKho.getFilters().then(res => {
      setFilterOptions(prev => ({
        ...prev,
        cpus: res.data.cpus || [],
        gpus: res.data.gpus || [],
        screenSizes: res.data.screenSizes || []
      }));
    }).catch(console.error);

    // Fetch brands, modelLines, platforms
    Promise.all([
      apiCatalog.getBrands().catch(() => ({ data: [] })),
      apiCatalog.getModelLines().catch(() => ({ data: [] })),
      apiCatalog.getPlatforms().catch(() => ({ data: [] }))
    ]).then(([brandsRes, linesRes, platformsRes]) => {
      setFilterOptions(prev => ({
        ...prev,
        brands: brandsRes.data.map(b => b.brandName) || [],
        productLines: linesRes.data.map(l => l.modelLineName) || [],
        models: platformsRes.data.map(p => p.displayName) || []
      }));
    });
  }, []);

  const detectSegment = (brand, line, model) => {
    const combined = `${brand || ''} ${line || ''} ${model || ''}`.toLowerCase();
    if (combined.includes('macbook') || combined.includes('apple')) return 'MACBOOK';
    const gamingKeywords = ['gaming', 'nitro', 'predator', 'legion', 'rog', 'tuf', 'alienware', 'omen', 'victus', 'loq', 'g15', 'g16', 'cyborg', 'katana', 'bravo', 'stealth', 'raider', 'titan'];
    if (gamingKeywords.some(k => combined.includes(k))) return 'GAMING';
    const workstationKeywords = ['precision', 'zbook', 'thinkpad p', 'proart', 'studiobook', 'conceptd'];
    if (workstationKeywords.some(k => combined.includes(k))) return 'WORKSTATION';
    return 'OFFICE';
  };

  const handleChange = (field, value) => {
    setForm(prev => {
      const nextForm = { ...prev, [field]: value };
      if (['brand', 'productLine', 'modelFull'].includes(field)) {
        nextForm.segment = detectSegment(nextForm.brand, nextForm.productLine, nextForm.modelFull);
      }
      return nextForm;
    });
  };

  const handleSerialBlur = async () => {
    const raw = form.serial.trim();
    if (!raw) {
      setIsExisting(false);
      return;
    }
    const multiParts = raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    if (multiParts.length > 1) {
      setIsExisting(false);
      showToast(`Phát hiện ${multiParts.length} mã Serial cùng cấu hình. Sẽ nhập theo lô!`, 'info');
      return;
    }
    setIsLoadingSerial(true);
    try {
      const res = await apiMayMoc.getBySerial(form.serial.trim());
      if (res && res.data) {
        setIsExisting(true);
        const m = res.data;
        let rawModel = m.platformCode || m.platform || m.sourceModelText || '';
        let cleanModel = rawModel;
        const lowerModel = cleanModel.toLowerCase();
        const kwMatch = lowerModel.match(/ (core|ryzen|ram|ssd|intel|amd|\/|- \d{4})/);
        if (kwMatch && kwMatch.index > 0) {
            cleanModel = cleanModel.substring(0, kwMatch.index).trim();
        }

        setForm({
          serial: m.serial || m.serialKey || '',
          brand: m.brand || '',
          productLine: m.productLine || '',
          modelFull: cleanModel,
          segment: m.segment === 'OFFICE' ? 'Văn phòng (Office)' :
                   m.segment === 'GAMING' ? 'Gaming' :
                   m.segment === 'WORKSTATION' ? 'Máy trạm (Workstation)' :
                   m.segment === 'MACBOOK' ? 'MacBook' : '',
          importType: m.state === 'CLOSED' ? 'CUSTOMER_RETURN' : (m.intakeType || 'PURCHASE'),
          initialStatus: m.state === 'READY' ? 'READY' : 'NEEDS_INSPECTION',
          importDate: getTodayDateString(),
          warrantyOption: (m.warrantyExpiry || (m.warrantyPeriod && m.warrantyPeriod.toLowerCase().includes('hãng')))
            ? 'Bảo hành hãng'
            : ['BH phần cứng 3 tháng', 'BH phần cứng 6 tháng', 'BH phần cứng 9 tháng', 'BH phần cứng 12 tháng', 'Không BH'].includes(m.warrantyPeriod)
              ? m.warrantyPeriod
              : m.warrantyPeriod ? 'Khác' : 'BH phần cứng 6 tháng',
          warrantyPeriod: m.warrantyPeriod || 'BH phần cứng 6 tháng',
          warrantyExpiry: m.warrantyExpiry ? m.warrantyExpiry.substring(0, 10) : '',
          customWarranty: (!['BH phần cứng 3 tháng', 'BH phần cứng 6 tháng', 'BH phần cứng 9 tháng', 'BH phần cứng 12 tháng', 'Bảo hành hãng', 'Không BH'].includes(m.warrantyPeriod)) ? (m.warrantyPeriod || '') : '',
          cpu: (!m.cpu || m.cpu === 'N/A') ? '' : m.cpu,
          gpu: (!m.gpu || m.gpu === 'ONBOARD' || m.gpu === 'N/A') ? '' : m.gpu,
          ram: m.ram || '16GB',
          ssd: m.ssd || '512GB',
          touchscreen: m.touch || 'Không cảm ứng',
          screenSize: m.screenSize || '',
          price: m.salePrice || '',
          notes: m.note || ''
        });
        if (m.state === 'CLOSED') {
          setIsExisting(false);
          showToast('Máy này đã xuất/bán. Tự động chuyển sang nhập "Khách đổi/trả".', 'info');
        } else {
          setIsExisting(true);
          showToast('Serial đã tồn tại trong kho! Tự động tải dữ liệu để CẬP NHẬT.', 'info');
        }
      }
    } catch (err) {
      setIsExisting(false);
      showToast('Serial chưa có trong kho. Tiến hành NHẬP MÁY MỚI.', 'success');
    } finally {
      setIsLoadingSerial(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isPreviewing) return;
    
    if (!form.serial.trim()) {
      showToast('Vui lòng nhập Serial', 'danger');
      return;
    }

    setIsPreviewing(true);
    try {
      if (tab === 'single') {
        const resolvedWarranty = !form.warrantyOption
          ? null
          : form.warrantyOption === 'Bảo hành hãng'
            ? 'Bảo hành hãng'
            : form.warrantyOption === 'Khác'
              ? (form.customWarranty ? form.customWarranty.trim() : null)
              : form.warrantyOption;
        const resolvedExpiry = form.warrantyOption === 'Bảo hành hãng' && form.warrantyExpiry
          ? form.warrantyExpiry
          : null;

        const payload = {
          ...form,
          warrantyPeriod: resolvedWarranty,
          warrantyExpiry: resolvedExpiry,
          price: form.price ? form.price : null
        };
        const parsedSerials = [...new Set(form.serial.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean))];
        if (isExisting && parsedSerials.length === 1) {
          const updatePayload = {
            brand: payload.brand, productLine: payload.productLine, modelFull: payload.modelFull,
            segment: payload.segment, importType: payload.importType, status: payload.initialStatus,
            importDate: payload.importDate, warrantyPeriod: payload.warrantyPeriod,
            warrantyExpiry: payload.warrantyExpiry,
            cpu: payload.cpu, gpu: payload.gpu, ram: payload.ram, ssd: payload.ssd, touchscreen: payload.touchscreen,
            screenSize: payload.screenSize, price: payload.price, notes: payload.notes
          };
          setPreviewGroups([{ isUpdate: true, serials: parsedSerials, count: 1, ...updatePayload }]);
        } else {
          setPreviewGroups([{ isUpdate: false, serials: parsedSerials, count: parsedSerials.length, ...payload }]);
        }
      }
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi hệ thống', 'danger');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (isSubmitting || isPreviewing) return;
    setIsPreviewing(true);
    try {
      if (excelFile) {
        const formData = new FormData();
        formData.append('file', excelFile);
        const res = await apiMayMoc.previewBulkExcel(formData);
        if (res.data && res.data.groups) {
          setPreviewGroups(res.data.groups);
          if (res.data.errorDetails && res.data.errorDetails.length > 0) {
            showToast(`Có ${res.data.errorDetails.length} dòng lỗi không hợp lệ`, 'warning');
          }
        }
      } else {
        if (!serialsText.trim()) return;
        const rawSerials = serialsText.split('\n').map(s => s.trim()).filter(s => s);
        const serialsList = [...new Set(rawSerials)];
        if (serialsList.length === 0) return;
        if (rawSerials.length > serialsList.length) {
            showToast(`Đã tự động loại bỏ ${rawSerials.length - serialsList.length} serial trùng lặp`, 'info');
        }
        const resolvedWarranty = !form.warrantyOption
          ? null
          : form.warrantyOption === 'Bảo hành hãng'
            ? 'Bảo hành hãng'
            : form.warrantyOption === 'Khác'
              ? (form.customWarranty ? form.customWarranty.trim() : null)
              : form.warrantyOption;
        const resolvedExpiry = form.warrantyOption === 'Bảo hành hãng' && form.warrantyExpiry
          ? form.warrantyExpiry
          : null;
        const payload = { 
          serials: serialsList, 
          count: serialsList.length, 
          ...form, 
          warrantyPeriod: resolvedWarranty,
          warrantyExpiry: resolvedExpiry,
          price: form.price ? form.price : null 
        };
        setPreviewGroups([{ isUpdate: false, ...payload }]);
      }
    } catch (err) {
      showToast(err.userMessage || 'Lỗi hệ thống', 'danger');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting || !previewGroups || previewGroups.length === 0) return;
    setIsSubmitting(true);
    try {
      for (const group of previewGroups) {
        if (group.isUpdate) {
          await apiMayMoc.update(group.serials[0], group);
        } else {
          if (group.serials.length === 1) {
            await apiNhapKho.submitSingle({ serial: group.serials[0], ...group });
          } else {
            await apiNhapKho.submitBatch({ serials: group.serials, commonConfig: group });
          }
        }
      }
      showToast('Lưu kho thành công!', 'success');
      setPreviewGroups(null);
      setExcelFile(null);
      setSerialsText('');
      setForm({ 
        serial: '', brand: '', productLine: '', modelFull: '', segment: '', 
        importType: 'PURCHASE', initialStatus: 'READY', importDate: getTodayDateString(), 
        warrantyOption: '', warrantyPeriod: '', 
        warrantyExpiry: '', customWarranty: '',
        cpu: '', gpu: '', ram: '16GB', ssd: '512GB', touchscreen: 'Không cảm ứng', 
        screenSize: '', price: '', notes: '' 
      });
      setIsExisting(false);
    } catch (err) {
      showToast(err.userMessage || 'Lỗi hệ thống', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = async (withData) => {
    try {
      let data = [];
      if (withData) {
        data = [{
          ...form,
          price: form.price ? form.price : null,
          serial: form.serial || 'SAMPLE-001'
        }];
      }
      const res = await apiMayMoc.downloadExcelTemplate(data);
      const url = window.URL.createObjectURL(new Blob([res]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_NhapMay.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showToast('Lỗi khi tải file mẫu', 'danger');
    }
  };

  // --- COMPONENT STYLES ---
  // Style tái sử dụng cho nhãn (label) để giữ tính nhất quán
  const labelClass = "form-label fw-bold text-secondary small text-uppercase mb-1";

  return (
    <div className="container-fluid p-0">
      
      {/* KHU VỰC CHỌN TAB */}
      <div className="mb-4 d-inline-block p-1 bg-light rounded-4 shadow-sm border">
        <ul className="nav nav-pills" style={{ gap: '4px' }}>
          <li className="nav-item">
            <button 
              className={`nav-link px-4 py-2 fw-medium rounded-pill transition-all ${tab === 'single' ? 'active shadow-sm' : 'text-secondary'}`} 
              onClick={() => setTab('single')}
            >
              Nhập một máy
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link px-4 py-2 fw-medium rounded-pill transition-all ${tab === 'bulk' ? 'active shadow-sm' : 'text-secondary'}`} 
              onClick={() => setTab('bulk')}
            >
              Nhập nhiều máy
            </button>
          </li>
        </ul>
      </div>

      <div className="row g-4">
        {/* ================= CARD TRÁI: THÔNG TIN MÁY & CẤU HÌNH ================= */}
        <div className="col-xl-8 col-lg-7 col-md-12 mb-4 mb-lg-0">
          <form className="card shadow-sm border-0 rounded-4 p-4 p-xl-5 h-100 bg-white" onSubmit={tab === 'single' ? handleSubmit : (e) => e.preventDefault()}>
            
            {/* --- SECTION 1: THÔNG TIN CƠ BẢN --- */}
            <div className="d-flex align-items-center mb-4 pb-2 border-bottom">
              <h5 className="fw-bolder text-primary mb-0">Thông tin nhập kho</h5>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <label className={labelClass}>Serial (Ngăn cách bằng dấu phẩy nếu nhập nhiều máy) <span className="text-danger">*</span></label>
                <div className="input-group">
                  <input className="form-control bg-light" placeholder="Quét mã vạch hoặc nhập nhiều Serial cách nhau dấu phẩy (VD: SN01, SN02)..."
                    value={form.serial} onChange={e => handleChange('serial', e.target.value)} onBlur={handleSerialBlur} />
                  {isLoadingSerial && <span className="input-group-text bg-light"><div className="spinner-border spinner-border-sm text-primary"></div></span>}
                </div>
              </div>
              <div className="col-md-6">
                <label className={labelClass}>Hãng <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="Ví dụ: Dell, HP..." list="brand-options"
                  value={form.brand} onChange={e => handleChange('brand', e.target.value)} />
                <datalist id="brand-options">{filterOptions.brands.map(b => <option key={b} value={b} />)}</datalist>
              </div>

              <div className="col-md-6">
                <label className={labelClass}>Dòng máy <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="Ví dụ: Latitude, Nitro 5..." list="line-options"
                  value={form.productLine} onChange={e => handleChange('productLine', e.target.value)} />
                <datalist id="line-options">{filterOptions.productLines.map(l => <option key={l} value={l} />)}</datalist>
              </div>
              <div className="col-md-6">
                <label className={labelClass}>Model đầy đủ <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="Ví dụ: Dell Latitude 7430..." list="model-options"
                  value={form.modelFull} onChange={e => handleChange('modelFull', e.target.value)} />
                <datalist id="model-options">{filterOptions.models.map(m => <option key={m} value={m} />)}</datalist>
              </div>

              <div className="col-md-4">
                <label className={labelClass}>Phân khúc</label>
                <select className="form-select text-dark" value={form.segment} onChange={e => handleChange('segment', e.target.value)}>
                  <option value="">Tự đề xuất theo dòng máy</option>
                  <option value="Văn phòng (Office)">Văn phòng (Office)</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Máy trạm (Workstation)">Máy trạm (Workstation)</option>
                  <option value="MacBook">MacBook</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className={labelClass}>Nghiệp vụ <span className="text-danger">*</span></label>
                <select className="form-select text-dark" value={form.importType} onChange={e => handleChange('importType', e.target.value)}>
                  <option value="PURCHASE">{INTAKE_TYPE_MAP['PURCHASE']}</option>
                  <option value="CUSTOMER_BUYBACK">{INTAKE_TYPE_MAP['CUSTOMER_BUYBACK']}</option>
                  <option value="CUSTOMER_RETURN">{INTAKE_TYPE_MAP['CUSTOMER_RETURN']}</option>
                  <option value="OPENING_BALANCE">{INTAKE_TYPE_MAP['OPENING_BALANCE']}</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className={labelClass}>Trạng thái <span className="text-danger">*</span></label>
                <select className="form-select text-dark" value={form.initialStatus} onChange={e => handleChange('initialStatus', e.target.value)}>
                  <option value="READY">{CYCLE_STATE_MAP['READY']}</option>
                  <option value="NEEDS_INSPECTION">{CYCLE_STATE_MAP['NEEDS_INSPECTION']}</option>
                </select>
              </div>
            </div>

            {/* --- SECTION 2: GÓI BẢO HÀNH (Được đưa vào khối xám riêng biệt) --- */}
            <div className="bg-light p-3 p-md-4 rounded-4 mb-5 border border-light-subtle">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className={labelClass}>Ngày nhập <span className="text-danger">*</span></label>
                  <input type="date" className="form-control"
                    value={form.importDate} onChange={e => handleChange('importDate', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className={labelClass}>Gói bảo hành</label>
                    {form.warrantyOption && form.warrantyOption !== 'Bảo hành hãng' && (
                      <span className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle rounded-pill">
                        Kích hoạt khi bán
                      </span>
                    )}
                  </div>
                  <select 
                    className="form-select" 
                    value={form.warrantyOption || ''} 
                    onChange={e => handleChange('warrantyOption', e.target.value)}
                  >
                    <option value="">-- Chưa gán (Cập nhật sau) --</option>
                    <option value="BH phần cứng 3 tháng">BH phần cứng 3 tháng</option>
                    <option value="BH phần cứng 6 tháng">BH phần cứng 6 tháng</option>
                    <option value="BH phần cứng 9 tháng">BH phần cứng 9 tháng</option>
                    <option value="BH phần cứng 12 tháng">BH phần cứng 12 tháng</option>
                    <option value="Bảo hành hãng">Bảo hành hãng</option>
                    <option value="Không BH">Không BH</option>
                    <option value="Khác">Khác (Tự nhập)</option>
                  </select>
                </div>

                {form.warrantyOption === 'Bảo hành hãng' && (
                  <div className="col-md-12 mt-2">
                    <div className="p-3 bg-white rounded-3 border border-primary border-opacity-25 shadow-sm">
                      <label className="form-label fw-bold text-primary mb-2 small">
                        <i className="bi bi-calendar-check me-1"></i> Ngày kết thúc bảo hành hãng (Không bắt buộc)
                      </label>
                      <input 
                        type="date" 
                        className="form-control border-primary-subtle" 
                        value={form.warrantyExpiry || ''} 
                        onChange={e => handleChange('warrantyExpiry', e.target.value)} 
                      />
                      <div className="text-muted mt-2 fst-italic" style={{ fontSize: '0.8rem' }}>
                        * Có thể để trống và cập nhật sau khi tra cứu được trên trang web của hãng.
                      </div>
                    </div>
                  </div>
                )}

                {form.warrantyOption === 'Khác' && (
                  <div className="col-md-12 mt-2">
                    <div className="p-3 bg-white rounded-3 border shadow-sm">
                      <label className="form-label fw-bold text-dark mb-2 small">Nhập nội dung gói bảo hành (Tùy chọn)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="VD: Bảo hành 1 đổi 1 trong 30 ngày..." 
                        value={form.customWarranty || ''} 
                        onChange={e => handleChange('customWarranty', e.target.value)} 
                      />
                    </div>
                  </div>
                )}
                
                {/* Text hint nhỏ nằm dưới cùng khối */}
                {!form.warrantyOption ? (
                  <div className="col-12 text-muted" style={{ fontSize: '0.8rem' }}>
                    <i className="bi bi-info-circle me-1"></i> Không bắt buộc, có thể cập nhật sau khi máy đã lưu kho.
                  </div>
                ) : form.warrantyOption !== 'Bảo hành hãng' ? (
                  <div className="col-12 text-muted" style={{ fontSize: '0.8rem' }}>
                    <i className="bi bi-info-circle me-1"></i> Thời gian bảo hành bắt đầu tính từ ngày xuất bán máy cho khách.
                  </div>
                ) : null}
              </div>
            </div>

            {/* --- SECTION 3: CẤU HÌNH --- */}
            <div className="d-flex align-items-center mb-4 pb-2 border-bottom">
              <h5 className="fw-bolder text-dark mb-0">Cấu hình chi tiết</h5>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-12 col-sm-6 col-xl-3">
                <label className={labelClass}>CPU <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="Core i5..." list="cpu-options"
                  value={form.cpu} onChange={e => handleChange('cpu', e.target.value)} />
                <datalist id="cpu-options">{filterOptions.cpus.map(cpu => <option key={cpu} value={cpu} />)}</datalist>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className={labelClass}>GPU <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="Intel Iris Xe..." list="gpu-options"
                  value={form.gpu} onChange={e => handleChange('gpu', e.target.value)} />
                <datalist id="gpu-options">{filterOptions.gpus.map(gpu => <option key={gpu} value={gpu} />)}</datalist>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className={labelClass}>RAM <span className="text-danger">*</span></label>
                <select className="form-select" value={form.ram} onChange={e => handleChange('ram', e.target.value)}>
                  <option>4GB</option><option>8GB</option><option>16GB</option><option>32GB</option><option>64GB</option>
                </select>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className={labelClass}>SSD <span className="text-danger">*</span></label>
                <select className="form-select" value={form.ssd} onChange={e => handleChange('ssd', e.target.value)}>
                  <option>128GB</option><option>256GB</option><option>512GB</option><option>1TB</option><option>2TB</option>
                </select>
              </div>

              <div className="col-12 col-sm-6 col-xl-3">
                <label className={labelClass}>Cảm ứng <span className="text-danger">*</span></label>
                <select className="form-select" value={form.touchscreen} onChange={e => handleChange('touchscreen', e.target.value)}>
                  <option>Không cảm ứng</option><option>Cảm ứng</option>
                </select>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className={labelClass}>Màn hình</label>
                <input className="form-control" placeholder="VD: 14 inch" list="screen-options"
                  value={form.screenSize} onChange={e => handleChange('screenSize', e.target.value)} />
                <datalist id="screen-options">
                  {filterOptions.screenSizes.map(size => <option key={size} value={size} />)}
                </datalist>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className={labelClass}>Giá bán (VND)</label>
                <input className="form-control text-success fw-bold" placeholder="Bổ sung sau..."
                  value={formatCurrency(form.price)} onChange={e => handleChange('price', parseCurrency(e.target.value))} />
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className={labelClass}>Ghi chú</label>
                <input className="form-control" placeholder="Nếu có..."
                  value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
              </div>
            </div>

            {/* --- FOOTER FORM (SINGLE) --- */}
            {tab === 'single' && (
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between border-top pt-4 mt-auto gap-3">
                <span className="text-secondary small fst-italic">Hệ thống sẽ phân loại trước; chưa ghi dữ liệu ở bước này.</span>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light border fw-medium px-4" onClick={() => setForm({ ...form, serial: '' })}>
                    Làm lại
                  </button>
                  <button type="submit" className="btn btn-primary fw-medium px-4 shadow-sm" disabled={isSubmitting}>
                    {isPreviewing ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span> Đang xử lý...</>
                    ) : (isExisting ? 'Phân loại trước (Cập nhật)' : 'Phân loại trước')}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* ================= CARD PHẢI: TRẠNG THÁI / PREVIEW ================= */}
        <div className="col-xl-4 col-lg-5 col-md-12">
          {previewGroups ? (
            <div className="card shadow-sm border-0 rounded-4 p-4 h-100 bg-white">
              <h5 className="fw-bolder mb-4 text-dark border-bottom pb-2">
                Danh sách xác nhận <span className="badge bg-primary rounded-pill ms-2">{previewGroups.reduce((a, b) => a + b.count, 0)} máy</span>
              </h5>
              
              <div className="d-flex flex-column gap-3 mb-4 pe-2" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                {previewGroups.map((group, idx) => (
                  <div key={idx} className={`p-3 border rounded-3 bg-light shadow-sm position-relative ${group.isUpdate ? 'border-info' : 'border-success'}`}>
                    <div className="fw-bold text-dark fs-6 mb-1">
                      {group.brand} {group.productLine} {group.modelFull}
                    </div>
                    <div className="text-secondary small mb-2 pb-2 border-bottom">
                      {group.cpu} • {group.ram} • {group.ssd}
                    </div>

                    <div className="d-flex flex-column gap-1 small text-dark">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Giá:</span>
                        <strong className={group.isUpdate ? 'text-info' : 'text-success'}>{group.price ? formatCurrency(group.price) + 'đ' : 'Chưa có'}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">T.Thái:</span>
                        <strong>{CYCLE_STATE_MAP[group.initialStatus] || group.initialStatus}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Bảo hành:</span>
                        <strong className="text-primary text-end">
                          {group.warrantyPeriod || 'Không BH'}
                          {group.warrantyExpiry ? (
                            <div className="text-success" style={{ fontSize: '10px' }}>(Hạn hãng: {formatDate(group.warrantyExpiry)})</div>
                          ) : group.warrantyPeriod && group.warrantyPeriod !== 'Không BH' ? (
                            <div className="text-muted" style={{ fontSize: '10px' }}>(Kích hoạt khi bán)</div>
                          ) : null}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Số lượng:</span>
                        <strong className="fs-6">{group.count} máy</strong>
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-top small text-secondary text-break fst-italic" style={{ fontSize: '0.75rem' }}>
                      <span className="fw-medium">SN:</span> {group.serials.join(', ')}
                    </div>
                    
                    {/* Badge góc */}
                    <span className={`position-absolute top-0 end-0 badge rounded-bottom-0 rounded-start-3 ${group.isUpdate ? 'bg-info' : 'bg-success'}`} style={{ borderTopRightRadius: '0.5rem'}}>
                      {group.isUpdate ? 'Cập nhật' : 'Thêm mới'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="d-flex gap-2 mt-auto pt-3 border-top justify-content-end">
                <button type="button" className="btn btn-light border fw-medium" onClick={() => setPreviewGroups(null)}>Hủy bỏ</button>
                <button type="button" className="btn btn-success fw-bold px-4 shadow-sm" onClick={handleConfirmSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span> Đang lưu...</>
                  ) : 'Xác nhận nhập kho'}
                </button>
              </div>
            </div>

          ) : tab === 'single' ? (
            
            <div className="card shadow-sm border-0 rounded-4 p-4 h-100 bg-light border">
              <h5 className="fw-bolder mb-4 text-dark border-bottom pb-2">Hệ thống nhận diện</h5>

              <div className="alert alert-primary border-0 bg-primary bg-opacity-10 d-flex gap-3 align-items-start mb-4 p-3 rounded-3">
                <i className="bi bi-lightbulb-fill text-primary fs-4"></i>
                <div>
                  <strong className="d-block text-primary mb-1">Nhập dữ liệu theo máy thực tế</strong>
                  <span className="small text-dark opacity-75">Hệ thống tự động đồng bộ, bạn không cần phải biết chính xác mã dòng máy hoặc mã biến thể trên web.</span>
                </div>
              </div>

              <div className="d-flex flex-column gap-3 mb-4 mt-2">
                <div className="d-flex align-items-center bg-white p-2 rounded-3 shadow-sm border">
                  <span className="badge bg-secondary rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '28px', height: '28px'}}>1</span>
                  <span className="fw-medium text-dark small">Chuẩn hóa model và cấu hình</span>
                </div>
                <div className="d-flex align-items-center bg-white p-2 rounded-3 shadow-sm border">
                  <span className="badge bg-secondary rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '28px', height: '28px'}}>2</span>
                  <span className="fw-medium text-dark small">Khớp danh mục hoặc tạo biến thể mới</span>
                </div>
                <div className="d-flex align-items-center bg-white p-2 rounded-3 shadow-sm border">
                  <span className="badge bg-secondary rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '28px', height: '28px'}}>3</span>
                  <span className="fw-medium text-dark small">Hiển thị kết quả để bạn xác nhận</span>
                </div>
              </div>

              <div className="alert alert-secondary border-0 mt-auto mb-0 p-3 small text-secondary rounded-3">
                <i className="bi bi-info-circle me-1"></i> Dòng máy đã có sẽ tự kế thừa phân khúc. Dòng hoàn toàn mới sẽ tự ghi nhớ phân khúc cho các lần sau.
              </div>
            </div>

          ) : (
            
            /* NHẬP LÔ */
            <div className="card shadow-sm border-0 rounded-4 p-4 h-100 bg-white">
              <div className="d-flex flex-column mb-4 pb-2 border-bottom">
                <h5 className="fw-bolder text-dark mb-3">Nhập nhiều máy (Lô)</h5>
                <div className="d-flex gap-2 w-100">
                  <button className="btn btn-outline-primary btn-sm fw-medium flex-fill" type="button" onClick={() => handleDownloadTemplate(false)}>
                    Tải mẫu trống
                  </button>
                  <button className="btn btn-outline-secondary btn-sm fw-medium flex-fill" type="button" onClick={() => handleDownloadTemplate(true)}>
                    Tải mẫu có dữ liệu
                  </button>
                </div>
              </div>

              <div className="mb-4 bg-light p-3 rounded-3 border">
                <label className={labelClass}>Upload file Excel</label>
                <input type="file" className="form-control form-control-sm" accept=".xlsx, .xls" 
                  onChange={e => { setExcelFile(e.target.files[0]); if (e.target.files[0]) setSerialsText(''); }} 
                />
              </div>

              <div className="mb-4 flex-grow-1 d-flex flex-column">
                <label className={labelClass}>Hoặc dán danh sách Serial <span className="text-lowercase fw-normal">(Mỗi dòng 1 serial)</span></label>
                <textarea 
                  className="form-control flex-grow-1 bg-light border-light-subtle" 
                  style={{minHeight: '200px', resize: 'none'}} 
                  value={serialsText} 
                  placeholder="SN_001&#10;SN_002&#10;SN_003..." 
                  disabled={!!excelFile} 
                  onChange={e => setSerialsText(e.target.value)} 
                />
              </div>

              <div className="d-flex gap-2 justify-content-end pt-3 border-top mt-auto">
                <button type="button" className="btn btn-light border fw-medium px-4" onClick={() => { setSerialsText(''); setExcelFile(null); }}>Xóa</button>
                <button type="button" className="btn btn-primary fw-medium px-4 shadow-sm" onClick={handleBulkSubmit} disabled={isPreviewing || (!excelFile && !serialsText.trim())}>
                  {isPreviewing ? <><span className="spinner-border spinner-border-sm me-2"></span> Đang xử lý</> : 'Phân loại trước'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}