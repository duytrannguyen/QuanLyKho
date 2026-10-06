import { useState, useEffect } from 'react';
import { machineApi } from '../../api/machineApi';
import { inventoryApi } from '../../api/inventoryApi';
import { intakeApi } from '../../api/intakeApi';
import { useToast } from '../../toast/ToastContext';
import { formatCurrency, parseCurrency } from '../../utils/formatters';
import styles from './MachineImportPage.module.css';

export default function MachineImportPage() {
  const { showToast, confirm } = useToast();
  const [tab, setTab] = useState('single');
  const [serialsText, setSerialsText] = useState('');
  const [excelFile, setExcelFile] = useState(null);
  const [isExisting, setIsExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSerial, setIsLoadingSerial] = useState(false);
  
  const [form, setForm] = useState({
    serial: '', brand: '', productLine: '', modelFull: '',
    segment: '', importType: 'PURCHASE', initialStatus: 'SAN_SANG_BAN',
    cpu: '', gpu: '', ram: '16GB', ssd: '512GB',
    touchscreen: 'Không cảm ứng', screenSize: '', price: '', notes: ''
  });

  const [filterOptions, setFilterOptions] = useState({
    cpus: [],
    gpus: []
  });

  useEffect(() => {
    inventoryApi.getFilters().then(res => {
      setFilterOptions(prev => ({
        ...prev,
        cpus: res.data.cpus || [],
        gpus: res.data.gpus || []
      }));
    }).catch(console.error);
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSerialBlur = async () => {
    if (!form.serial.trim()) {
      setIsExisting(false);
      return;
    }
    setIsLoadingSerial(true);
    try {
      const res = await machineApi.getBySerial(form.serial.trim());
      if (res && res.data) {
        setIsExisting(true);
        const m = res.data;
        setForm({
          serial: m.serial || '',
          brand: m.brand || '',
          productLine: m.productLine || '',
          modelFull: m.modelFull || '',
          segment: m.segment || '',
          importType: m.importType || 'PURCHASE',
          initialStatus: m.status || 'SAN_SANG_BAN',
          cpu: m.cpu || '',
          gpu: m.gpu || '',
          ram: m.ram || '16GB',
          ssd: m.ssd || '512GB',
          touchscreen: m.touchscreen || 'Không cảm ứng',
          screenSize: m.screenSize || '',
          price: m.price || '',
          notes: m.notes || ''
        });
      }
    } catch (err) {
      // 404 or other error means machine not found or API error. Just reset mode to creation.
      setIsExisting(false);
      // We don't clear the form to let the user keep typing.
    } finally {
      setIsLoadingSerial(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (tab === 'single') {
      const isConfirmed = await confirm(isExisting ? 'Xác nhận cập nhật thông tin máy này?' : 'Xác nhận lưu máy mới vào kho?');
      if (!isConfirmed) return;
    }

    setIsSubmitting(true);
    try {
      if (tab === 'single') {
        const payload = { ...form, price: form.price ? form.price : null };
        if (isExisting) {
          const updatePayload = {
            brand: payload.brand, productLine: payload.productLine, modelFull: payload.modelFull,
            segment: payload.segment, importType: payload.importType, status: payload.initialStatus,
            cpu: payload.cpu, gpu: payload.gpu, ram: payload.ram, ssd: payload.ssd, touchscreen: payload.touchscreen,
            screenSize: payload.screenSize, price: payload.price, notes: payload.notes
          };
          await machineApi.update(payload.serial, updatePayload);
          showToast('Cập nhật máy thành công!', 'success');
        } else {
          const res = await intakeApi.submitSingle(payload);
          showToast('Nhập máy thành công: ' + res.message, 'success');
        }
        // Reset full form on success
        setIsExisting(false);
        setForm({ serial: '', brand: '', productLine: '', modelFull: '', segment: '', importType: 'PURCHASE', initialStatus: 'SAN_SANG_BAN', cpu: '', gpu: '', ram: '16GB', ssd: '512GB', touchscreen: 'Không cảm ứng', screenSize: '', price: '', notes: '' });
      }
    } catch (err) {
      const msg = err.userMessage || err.message || 'Lỗi hệ thống';
      if (err.data && typeof err.data === 'object') {
        const details = Object.values(err.data).join('\n');
        showToast(`${msg}\n${details}`, 'danger');
      } else {
        showToast(msg, 'danger');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (isSubmitting) return;

    const isConfirmed = await confirm('Xác nhận nhập lô máy này?');
    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      if (excelFile) {
        const formData = new FormData();
        formData.append('file', excelFile);
        const res = await machineApi.importBulkExcel(formData);
        const data = res.data;
        showToast(`Đã xử lý file: ${data.totalProcessed} | Thành công: ${data.successCount} | Lỗi: ${data.errorCount}`, data.errorCount > 0 ? 'warning' : 'success');
        if (data.errorCount > 0) {
          console.log("Lỗi:", data.errorDetails);
          showToast("Có lỗi xảy ra, vui lòng mở F12 Console để xem chi tiết lỗi các dòng.", 'warning');
        }
        setExcelFile(null);
      } else {
        if (!serialsText.trim()) return;
        const serialsList = serialsText.split('\n').map(s => s.trim()).filter(s => s);
        const payload = {
          serials: serialsList,
          commonConfig: { ...form, price: form.price ? form.price : null }
        };
        const res = await intakeApi.submitBatch(payload);
        const data = res.data;
        showToast(`Đã xử lý text: ${data.total} | Thành công: ${data.successCount} | Lỗi: ${data.failedCount}`, data.failedCount > 0 ? 'warning' : 'success');
        if (data.failedCount > 0) {
          console.log("Lỗi:", data.errors);
          setSerialsText(data.failedList.join('\n'));
        } else {
          setSerialsText('');
          setForm({ serial: '', brand: '', productLine: '', modelFull: '', segment: '', importType: 'PURCHASE', initialStatus: 'SAN_SANG_BAN', cpu: '', gpu: '', ram: '16GB', ssd: '512GB', touchscreen: 'Không cảm ứng', screenSize: '', price: '', notes: '' });
        }
      }
    } catch (err) {
      const msg = err.userMessage || err.message || 'Lỗi hệ thống';
      if (err.data && typeof err.data === 'object') {
        const details = Object.values(err.data).join('\n');
        showToast(`${msg}\n${details}`, 'danger');
      } else {
        showToast(msg, 'danger');
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>Nhập máy</h1>
          <p>Ghi nhận máy mới vào hệ thống tồn kho</p>
        </div>
        <div className={styles.actionsArea}>
          <button className={`${styles.toggleBtn} ${tab === 'single' ? styles.active : ''}`}
            onClick={() => setTab('single')}>Nhập một máy</button>
          <button className={`${styles.toggleBtn} ${tab === 'bulk' ? styles.active : ''}`}
            onClick={() => setTab('bulk')}>Nhập nhiều máy</button>
          <span>Tối đa 50 serial mỗi lượt</span>
        </div>
      </div>

      <div className={styles.stepsContainer}>
        <div className={`${styles.step} ${styles.active}`}>
          <span className={styles.stepNum}>1</span>
          <span>Thông tin dùng chung</span>
        </div>
        <div className={styles.stepLine}></div>
        <div className={`${styles.step} ${styles.active}`}>
          <span className={styles.stepNum}>2</span>
          <span>Danh sách serial</span>
        </div>
        <div className={styles.stepLine}></div>
        <div className={styles.step}>
          <span className={styles.stepNum}>3</span>
          <span>Kiểm tra & xác nhận</span>
        </div>
      </div>

      <div className={styles.contentGrid} style={tab === 'single' ? { gridTemplateColumns: '1fr 320px' } : {}}>
        {/* Left - Form */}
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 className={styles.formSection} style={{ margin: 0 }}>Thông tin dùng chung</h3>
            {tab === 'bulk' && <span className={`${styles.bulkBadge} ${styles.green}`}>CÙNG MỘT BIẾN THỂ</span>}
          </div>
          
          <div className={styles.formGrid}>
            {tab === 'single' && (
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Serial <span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" placeholder="Nhập serial máy"
                    value={form.serial} 
                    onChange={e => handleChange('serial', e.target.value)} 
                    onBlur={handleSerialBlur} />
                  {isLoadingSerial && (
                    <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                      <div className="spinner-border text-secondary" role="status"><span className="visually-hidden">Loading...</span></div>
                    </div>
                  )}
                </div>
                {isExisting && <span style={{ color: 'var(--blue-500)', fontSize: '13px', marginTop: '4px', display: 'block' }}>ℹ Máy đã tồn tại trong kho. Thông tin bên dưới sẽ dùng để cập nhật.</span>}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Hãng <span className="required">*</span></label>
              <input className="form-input" placeholder="Ví dụ: Dell"
                value={form.brand} onChange={e => handleChange('brand', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Dòng máy <span className="required">*</span></label>
              <input className="form-input" placeholder="Ví dụ: Latitude, Nitro 5"
                value={form.productLine} onChange={e => handleChange('productLine', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Model đầy đủ của hãng <span className="required">*</span></label>
              <input className="form-input" placeholder="Ví dụ: Dell Latitude 7430 hoặc AN515-58-51R3"
                value={form.modelFull} onChange={e => handleChange('modelFull', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Phân khúc</label>
              <select className="form-select" value={form.segment} onChange={e => handleChange('segment', e.target.value)}>
                <option value="">Tự đề xuất theo dòng máy</option>
                <option value="OFFICE">Văn phòng</option>
                <option value="GAMING">Gaming</option>
                <option value="WORKSTATION">Máy trạm</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">CPU <span className="required">*</span></label>
              <input className="form-input" placeholder="Ví dụ: Intel Core i5-1740P"
                list="cpu-options"
                value={form.cpu} onChange={e => handleChange('cpu', e.target.value)} />
              <datalist id="cpu-options">
                {filterOptions.cpus.map(cpu => <option key={cpu} value={cpu} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">GPU <span className="required">*</span></label>
              <input className="form-input" placeholder="Ví dụ: Intel Iris Xe Graphics"
                list="gpu-options"
                value={form.gpu} onChange={e => handleChange('gpu', e.target.value)} />
              <datalist id="gpu-options">
                {filterOptions.gpus.map(gpu => <option key={gpu} value={gpu} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">RAM <span className="required">*</span></label>
              <select className="form-select" value={form.ram} onChange={e => handleChange('ram', e.target.value)}>
                <option>4GB</option><option>8GB</option><option>16GB</option><option>32GB</option><option>64GB</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">SSD <span className="required">*</span></label>
              <select className="form-select" value={form.ssd} onChange={e => handleChange('ssd', e.target.value)}>
                <option>128GB</option><option>256GB</option><option>512GB</option><option>1TB</option><option>2TB</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Cảm ứng <span className="required">*</span></label>
              <select className="form-select" value={form.touchscreen} onChange={e => handleChange('touchscreen', e.target.value)}>
                <option>Không cảm ứng</option><option>Cảm ứng</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Kích thước màn hình</label>
              <input className="form-input" placeholder="Tùy chọn, ví dụ: 14 inch"
                value={form.screenSize} onChange={e => handleChange('screenSize', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Nghiệp vụ nhập <span className="required">*</span></label>
              <select className="form-select" value={form.importType} onChange={e => handleChange('importType', e.target.value)}>
                <option value="PURCHASE">MUA/NHẬP HÀNG</option>
                <option value="CUSTOMER_RETURN">KHÁCH ĐỔI/TRẢ</option>
                <option value="OPENING_BALANCE">TỒN ĐẦU KỲ</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Trạng thái ban đầu <span className="required">*</span></label>
              <select className="form-select" value={form.initialStatus} onChange={e => handleChange('initialStatus', e.target.value)}>
                <option value="SAN_SANG_BAN">SẴN SÀNG BÁN</option>
                <option value="CAN_KIEM_TRA">CẦN KIỂM TRA</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Giá bán chung</label>
              <input className="form-input" placeholder="Có thể bổ sung sau" type="text"
                value={formatCurrency(form.price)} onChange={e => handleChange('price', parseCurrency(e.target.value))} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Ghi chú lô</label>
              <input className="form-input" placeholder="Nếu có"
                value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
            </div>
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px', borderRadius: '8px', color: '#b45309', fontSize: '13px', marginTop: '16px' }}>
            ⚠️ Máy khác CPU, GPU, RAM, SSD hoặc cảm ứng phải tách sang lô khác.
          </div>
          
          {tab === 'single' && (
            <div className={styles.formFooter}>
              <p className={styles.footerNote}>Hệ thống sẽ phân loại trước khi ghi dữ liệu.</p>
              <div className={styles.footerBtns}>
                <button type="button" className="btn btn-outline"
                  onClick={() => setForm({ serial: '', brand: '', productLine: '', modelFull: '', segment: '', importType: 'PURCHASE', initialStatus: 'SAN_SANG_BAN', cpu: '', gpu: '', ram: '16GB', ssd: '512GB', touchscreen: 'Không cảm ứng', screenSize: '', price: '', notes: '' })}>
                  Làm lại
                </button>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="spinner-container">
                      <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
                      <span>Đang xử lý...</span>
                    </div>
                  ) : (isExisting ? 'Cập nhật máy' : 'Lưu nhập kho (F10)')}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Right Panel */}
        {tab === 'single' ? (
          <div className={styles.recognitionPanel}>
            <h3 className={styles.formSection}>Hệ thống nhận diện</h3>
            <div className={styles.infoBox}>
              <p>ℹ️ Nhập dữ liệu theo máy thực tế.<br />Không cần biết mã dòng máy hoặc mã biến thể.</p>
            </div>
            <div className={styles.stepList}>
              <div className={styles.stepItem}>
                <span className={styles.stepNum}>1</span>
                <span className={styles.stepText}>Chuẩn hóa model và cấu hình</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNum}>2</span>
                <span className={styles.stepText}>Khớp danh mục hoặc tạo biến thể mới</span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNum}>3</span>
                <span className={styles.stepText}>Hiển thị kết quả để xác nhận</span>
              </div>
            </div>
            <div className={styles.noteBox}>
              <p>Dòng máy đã có sẽ tự kế thừa phân khúc. Dòng hoàn toàn mới sẽ lưu tạm rồi chọn phân khúc một lần cho các máy sau.</p>
            </div>
          </div>
        ) : (
          <div className={styles.bulkPanel}>
            <h3 className={styles.bulkPanelTitle}>Danh sách máy (Nhập lô)</h3>
            <p className={styles.bulkPanelSub}>Tải lên file Excel (.xlsx) để nhập đầy đủ thuộc tính hoặc dán danh sách serial cùng cấu hình.</p>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Tải lên file Excel</label>
              <input 
                type="file" 
                className="form-input" 
                accept=".xlsx, .xls"
                onChange={e => {
                  setExcelFile(e.target.files[0]);
                  if(e.target.files[0]) setSerialsText(''); // Clear text if file selected
                }}
              />
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                * Excel nên có các cột (không cần đúng tên, nhưng đúng thứ tự): Serial, Brand, ProductLine, ModelFull, Segment, CPU, GPU, RAM, SSD, Touchscreen, ImportType, InitialStatus, Price.
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '16px 0', fontWeight: 'bold', color: '#9ca3af' }}>HOẶC</div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Nhập tay danh sách serial</label>
              <textarea 
                className={styles.serialTextarea} 
                value={serialsText}
                placeholder="Mỗi serial một dòng"
                disabled={!!excelFile}
                onChange={e => setSerialsText(e.target.value)}
              />
              
              <div className={styles.bulkStatusArea}>
                <span className={`${styles.bulkBadge} ${styles.gray}`}>{serialsText.split('\n').filter(s=>s.trim()).length} serial</span>
              </div>
              
              <div className={styles.infoBoxAlert}>
                <span style={{ fontSize: '16px' }}>ℹ️</span>
                Hệ thống chỉ nhập các dòng hợp lệ. Các dòng lỗi vẫn được giữ lại để chỉnh sửa.
              </div>
            </div>
            
            <div className={styles.formFooter} style={{ borderTop: 'none', paddingTop: 0, marginTop: 'auto' }}>
              <div className={styles.footerBtns}>
                <button type="button" className="btn btn-outline" onClick={() => { setSerialsText(''); setExcelFile(null); }}>
                  Làm lại
                </button>
                <button type="button" className="btn btn-primary" 
                  onClick={handleBulkSubmit}
                  disabled={isSubmitting || (!excelFile && !serialsText.trim())}>
                  {isSubmitting ? (
                    <div className="spinner-container">
                      <div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div>
                      <span>Đang xử lý...</span>
                    </div>
                  ) : (
                    'Nhập lô máy &rarr;'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
