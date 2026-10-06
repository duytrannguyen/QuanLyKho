import React, { useState, useEffect } from 'react';
import { apiMayMoc, apiTonKho, apiNhapKho, apiCatalog } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { INTAKE_TYPE_MAP, CYCLE_STATE_MAP } from '../../constants/trangThai';
import { formatCurrency, parseCurrency } from '../../utils/dinh_dang';

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

    // Fetch brands, modelLines, platforms for autocomplete suggestions
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

    return 'OFFICE'; // Default
  };

  const handleChange = (field, value) => {
    setForm(prev => {
      const nextForm = { ...prev, [field]: value };
      
      // Auto-detect segment if typing brand, line, or model
      if (['brand', 'productLine', 'modelFull'].includes(field)) {
        nextForm.segment = detectSegment(nextForm.brand, nextForm.productLine, nextForm.modelFull);
      }
      
      return nextForm;
    });
  };

  const handleSerialBlur = async () => {
    if (!form.serial.trim()) {
      setIsExisting(false);
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
          importType: m.state === 'CLOSED' ? 'CUSTOMER_RETURN' :
                      (m.intakeType || 'PURCHASE'),
          initialStatus: m.state === 'READY' ? 'READY' : 'NEEDS_INSPECTION',
          importDate: getTodayDateString(),
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
    
    // Validate
    if (!form.serial.trim()) {
      showToast('Vui lòng nhập Serial', 'danger');
      return;
    }

    setIsPreviewing(true);
    try {
      if (tab === 'single') {
        const payload = { ...form, price: form.price ? form.price : null };
        if (isExisting) {
          const updatePayload = {
            brand: payload.brand, productLine: payload.productLine, modelFull: payload.modelFull,
            segment: payload.segment, importType: payload.importType, status: payload.initialStatus,
            importDate: payload.importDate,
            cpu: payload.cpu, gpu: payload.gpu, ram: payload.ram, ssd: payload.ssd, touchscreen: payload.touchscreen,
            screenSize: payload.screenSize, price: payload.price, notes: payload.notes
          };
          setPreviewGroups([{ isUpdate: true, serials: [payload.serial], count: 1, ...updatePayload }]);
        } else {
          setPreviewGroups([{ isUpdate: false, serials: [payload.serial], count: 1, ...payload }]);
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
        const payload = { serials: serialsList, count: serialsList.length, ...form, price: form.price ? form.price : null };
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
      setForm({ serial: '', brand: '', productLine: '', modelFull: '', segment: '', importType: 'PURCHASE', initialStatus: 'READY', importDate: getTodayDateString(), cpu: '', gpu: '', ram: '16GB', ssd: '512GB', touchscreen: 'Không cảm ứng', screenSize: '', price: '', notes: '' });
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

  return (
    <div className="container-fluid p-0">
      
      <div className="mb-4">
        <ul className="nav nav-pills gap-2">
          <li className="nav-item">
            <button className={`nav-link fw-medium border ${tab === 'single' ? 'active bg-primary border-primary' : 'bg-white text-secondary border-secondary'}`} onClick={() => setTab('single')}>Nhập một máy</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link fw-medium border ${tab === 'bulk' ? 'active bg-primary border-primary' : 'bg-white text-secondary border-secondary'}`} onClick={() => setTab('bulk')}>Nhập nhiều máy</button>
          </li>
        </ul>
      </div>

      <div className="row g-4">
        {/* CARD TRÁI: THÔNG TIN MÁY & CẤU HÌNH */}
        <div className="col-xl-8 col-lg-7 col-md-12 mb-4 mb-lg-0">
          <form className="card shadow-sm border-0 p-4 h-100" onSubmit={tab === 'single' ? handleSubmit : (e) => e.preventDefault()}>
            <h5 className="fw-bold mb-4 text-dark">Thông tin máy</h5>

            <div className="row g-3">
              {/* Hàng 1 */}
              <div className="col-md-6">
                <label className="form-label fw-semibold text-dark">Serial <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="Nhập hoặc quét serial thật"
                  value={form.serial} onChange={e => handleChange('serial', e.target.value)} onBlur={handleSerialBlur} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold text-dark">Hãng <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="Ví dụ: Dell" list="brand-options"
                  value={form.brand} onChange={e => handleChange('brand', e.target.value)} />
                <datalist id="brand-options">{filterOptions.brands.map(b => <option key={b} value={b} />)}</datalist>
              </div>

              {/* Hàng 2 */}
              <div className="col-md-6">
                <label className="form-label fw-semibold text-dark">Dòng máy <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="Ví dụ: Latitude, Nitro 5" list="line-options"
                  value={form.productLine} onChange={e => handleChange('productLine', e.target.value)} />
                <datalist id="line-options">{filterOptions.productLines.map(l => <option key={l} value={l} />)}</datalist>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold text-dark">Model đầy đủ của hãng <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="Ví dụ: Dell Latitude 7430 hoặc AN515-58-51R3" list="model-options"
                  value={form.modelFull} onChange={e => handleChange('modelFull', e.target.value)} />
                <datalist id="model-options">{filterOptions.models.map(m => <option key={m} value={m} />)}</datalist>
              </div>

              {/* Hàng 3 */}
              <div className="col-md-6">
                <label className="form-label fw-semibold text-dark">Phân khúc</label>
                <select className="form-select" value={form.segment} onChange={e => handleChange('segment', e.target.value)}>
                  <option value="">Tự đề xuất theo dòng máy</option>
                  <option value="Văn phòng (Office)">Văn phòng (Office)</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Máy trạm (Workstation)">Máy trạm (Workstation)</option>
                  <option value="MacBook">MacBook</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold text-dark">Nghiệp vụ nhập <span className="text-danger">*</span></label>
                <select className="form-select" value={form.importType} onChange={e => handleChange('importType', e.target.value)}>
                  <option value="PURCHASE">{INTAKE_TYPE_MAP['PURCHASE']}</option>
                  <option value="CUSTOMER_BUYBACK">{INTAKE_TYPE_MAP['CUSTOMER_BUYBACK']}</option>
                  <option value="CUSTOMER_RETURN">{INTAKE_TYPE_MAP['CUSTOMER_RETURN']}</option>
                  <option value="OPENING_BALANCE">{INTAKE_TYPE_MAP['OPENING_BALANCE']}</option>
                </select>
              </div>

              {/* Hàng 4 */}
              <div className="col-md-6">
                <label className="form-label fw-semibold text-dark">Trạng thái ban đầu <span className="text-danger">*</span></label>
                <select className="form-select" value={form.initialStatus} onChange={e => handleChange('initialStatus', e.target.value)}>
                  <option value="READY">{CYCLE_STATE_MAP['READY']}</option>
                  <option value="NEEDS_INSPECTION">{CYCLE_STATE_MAP['NEEDS_INSPECTION']}</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold text-dark">Ngày nhập <span className="text-danger">*</span></label>
                <input type="date" className="form-control"
                  value={form.importDate} onChange={e => handleChange('importDate', e.target.value)} />
              </div>
            </div>

            <hr className="my-4 text-secondary" />

            <h5 className="fw-bold mb-4 text-dark">Cấu hình</h5>

            <div className="row g-3">
              {/* Hàng 1 (4 cột) */}
              <div className="col-12 col-sm-6 col-xl-3">
                <label className="form-label fw-semibold text-dark">CPU <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="Intel Core i5..." list="cpu-options"
                  value={form.cpu} onChange={e => handleChange('cpu', e.target.value)} />
                <datalist id="cpu-options">{filterOptions.cpus.map(cpu => <option key={cpu} value={cpu} />)}</datalist>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className="form-label fw-semibold text-dark">GPU <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="Intel Iris Xe..." list="gpu-options"
                  value={form.gpu} onChange={e => handleChange('gpu', e.target.value)} />
                <datalist id="gpu-options">{filterOptions.gpus.map(gpu => <option key={gpu} value={gpu} />)}</datalist>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className="form-label fw-semibold text-dark">RAM <span className="text-danger">*</span></label>
                <select className="form-select" value={form.ram} onChange={e => handleChange('ram', e.target.value)}>
                  <option>4GB</option><option>8GB</option><option>16GB</option><option>32GB</option><option>64GB</option>
                </select>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className="form-label fw-semibold text-dark">SSD <span className="text-danger">*</span></label>
                <select className="form-select" value={form.ssd} onChange={e => handleChange('ssd', e.target.value)}>
                  <option>128GB</option><option>256GB</option><option>512GB</option><option>1TB</option><option>2TB</option>
                </select>
              </div>

              {/* Hàng 2 (4 cột) */}
              <div className="col-12 col-sm-6 col-xl-3">
                <label className="form-label fw-semibold text-dark">Cảm ứng <span className="text-danger">*</span></label>
                <select className="form-select" value={form.touchscreen} onChange={e => handleChange('touchscreen', e.target.value)}>
                  <option>Không cảm ứng</option><option>Cảm ứng</option>
                </select>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className="form-label fw-semibold text-dark">K.thước màn</label>
                <input className="form-control" placeholder="VD: 14 in" list="screen-options"
                  value={form.screenSize} onChange={e => handleChange('screenSize', e.target.value)} />
                <datalist id="screen-options">
                  {filterOptions.screenSizes.map(size => <option key={size} value={size} />)}
                </datalist>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className="form-label fw-semibold text-dark">Giá bán</label>
                <input className="form-control" placeholder="Bổ sung sau..."
                  value={formatCurrency(form.price)} onChange={e => handleChange('price', parseCurrency(e.target.value))} />
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <label className="form-label fw-semibold text-dark">Ghi chú</label>
                <input className="form-control" placeholder="Nếu có..."
                  value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
              </div>
            </div>

            {/* Footer Form Nhập lẻ */}
            {tab === 'single' && (
              <div className="d-flex align-items-center justify-content-between border-top pt-4 mt-4">
                <span className="text-secondary small">Hệ thống sẽ phân loại trước; chưa ghi dữ liệu ở bước này.</span>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary fw-medium" onClick={() => setForm({ ...form, serial: '' })}>
                    Làm lại
                  </button>
                  <button type="submit" className="btn btn-primary fw-medium" disabled={isSubmitting}>
                    {isPreviewing ? 'Đang phân loại...' : (isExisting ? 'Phân loại trước (Cập nhật)' : 'Phân loại trước')}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* CARD PHẢI */}
        <div className="col-xl-4 col-lg-5 col-md-12">
          {previewGroups ? (
            <div className="card shadow-sm border-0 p-4 h-100">
              <h5 className="fw-bold mb-4 text-dark">Xem trước danh sách ({previewGroups.reduce((a, b) => a + b.count, 0)} máy)</h5>
              <div className="d-flex flex-column gap-3 mb-4" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {previewGroups.map((group, idx) => (
                  <div key={idx} className="p-3 border rounded bg-light">
                    <div className="fw-bold mb-2 text-dark">
                      {group.brand} {group.productLine} {group.modelFull} - {group.cpu} / {group.ram} / {group.ssd}
                    </div>
                    <div className="d-flex flex-wrap gap-3 mb-2 small text-secondary">
                      <span>Giá: <strong className={group.isUpdate ? 'text-info' : 'text-success'}>{group.price ? formatCurrency(group.price) + 'đ' : 'Chưa có'}</strong></span>
                      <span>T.Thái ban đầu: <strong className="text-dark">{CYCLE_STATE_MAP[group.initialStatus] || group.initialStatus}</strong></span>
                      <span>SL: <strong className="text-dark">{group.count}</strong> máy</span>
                    </div>
                    <div className="small text-secondary text-break">
                      Serials: {group.serials.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
              <div className="d-flex gap-2 mt-auto pt-3 border-top justify-content-end">
                <button type="button" className="btn btn-outline-secondary fw-medium" onClick={() => setPreviewGroups(null)}>Hủy</button>
                <button type="button" className="btn btn-primary fw-medium" onClick={handleConfirmSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Xác nhận nhập kho'}
                </button>
              </div>
            </div>
          ) : tab === 'single' ? (
            <div className="card shadow-sm border-0 p-4 h-100">
              <h5 className="fw-bold mb-4 text-dark">Hệ thống nhận diện</h5>

              <div className="alert alert-info border-info d-flex flex-column gap-1 mb-4 p-3">
                <strong className="d-flex align-items-center gap-2 text-info-emphasis">
                  <span className="badge rounded-circle bg-info text-white d-flex align-items-center justify-content-center p-0" style={{width: '20px', height: '20px'}}>i</span>
                  Nhập dữ liệu theo máy thực tế
                </strong>
                <span className="small text-info-emphasis ms-4">Không cần biết mã dòng máy hoặc mã biến thể.</span>
              </div>

              <div className="d-flex flex-column gap-3 mb-4 ps-2">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fs-5 text-secondary">1</span>
                  <span className="fw-medium text-dark text-end">Chuẩn hóa model và cấu hình</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fs-5 text-secondary">2</span>
                  <span className="fw-medium text-dark text-end">Khớp danh mục hoặc tạo biến thể mới</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fs-5 text-secondary">3</span>
                  <span className="fw-medium text-dark text-end">Hiển thị kết quả để xác nhận</span>
                </div>
              </div>

              <div className="alert alert-secondary border-secondary mt-auto mb-0 p-3 small text-secondary">
                Dòng máy đã có sẽ tự kế thừa phân khúc. Dòng hoàn toàn mới sẽ lưu lựa chọn phân khúc một lần cho các máy sau.
              </div>
            </div>
          ) : (
            /* Nhập Lô */
            <div className="card shadow-sm border-0 p-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold text-dark mb-0">Nhập nhiều máy (Excel/Serial)</h5>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-primary btn-sm fw-medium" type="button" onClick={() => handleDownloadTemplate(false)}>
                    Tải mẫu trống
                  </button>
                  <button className="btn btn-outline-secondary btn-sm fw-medium" type="button" onClick={() => handleDownloadTemplate(true)}>
                    Tải mẫu có dữ liệu
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold text-dark">Tải file Excel</label>
                <input type="file" className="form-control" accept=".xlsx, .xls" onChange={e => { setExcelFile(e.target.files[0]); if (e.target.files[0]) setSerialsText(''); }} />
              </div>
              <div className="mb-4 flex-grow-1 d-flex flex-column">
                <label className="form-label fw-semibold text-dark">Hoặc nhập tay danh sách serial</label>
                <textarea className="form-control flex-grow-1" style={{minHeight: '200px'}} value={serialsText} placeholder="Mỗi serial một dòng" disabled={!!excelFile} onChange={e => setSerialsText(e.target.value)} />
              </div>
              <div className="d-flex gap-2 justify-content-end pt-3 border-top">
                <button type="button" className="btn btn-outline-secondary fw-medium" onClick={() => { setSerialsText(''); setExcelFile(null); }}>Xóa</button>
                <button type="button" className="btn btn-primary fw-medium" onClick={handleBulkSubmit} disabled={isPreviewing || (!excelFile && !serialsText.trim())}>{isPreviewing ? 'Đang xử lý...' : 'Phân loại trước'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}