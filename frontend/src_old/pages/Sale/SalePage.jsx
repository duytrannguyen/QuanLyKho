import { useState, useEffect } from 'react';
import { Search, Info, RotateCcw } from 'lucide-react';
import { useToast } from '../../toast/ToastContext';
import axiosClient from '../../api/axiosClient';
import { formatCurrency, parseCurrency } from '../../utils/formatters';
import styles from './SalePage.module.css';

export default function SalePage() {
  const { showToast, confirm } = useToast();
  const [serial, setSerial] = useState('');
  const [scannedMachine, setScannedMachine] = useState(null);
  
  // Form State
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [salesperson, setSalesperson] = useState('');
  const [discount, setDiscount] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [saleRam, setSaleRam] = useState('');
  const [saleSsd, setSaleSsd] = useState('');
  const [customer, setCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [upgradeNote, setUpgradeNote] = useState('');
  const [saleNote, setSaleNote] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Derive initial config parts for RAM/SSD if possible from configId
  useEffect(() => {
    if (scannedMachine) {
      setFinalPrice(scannedMachine.salePrice || '');
      setSaleDate(new Date().toISOString().slice(0, 16));
      setDiscount('0');
      
      // Attempt to extract RAM/SSD from config string if available
      // e.g. "CFG-17182... | 16GB | 512GB" but the API might not return it directly.
      // We will just leave them empty for the user to fill, or use defaults.
      setSaleRam('');
      setSaleSsd('');
    }
  }, [scannedMachine]);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!serial.trim()) return;

    setIsLoading(true);
    setScannedMachine(null);
    try {
      const res = await axiosClient.post('/sale/lookup', { serial });
      setScannedMachine(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi tra cứu serial', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSale = async () => {
    if (!scannedMachine) return;
    if (scannedMachine.state !== 'READY') return;

    const isConfirmed = await confirm(`Xác nhận bán máy ${scannedMachine.serialKey}?`);
    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      await axiosClient.post('/sale/submit', {
        serial: scannedMachine.serialKey,
        finalPrice: parseCurrency(finalPrice),
        salesperson,
        saleDate,
        discount: parseCurrency(discount) || 0,
        saleRam,
        saleSsd,
        customerName: customer,
        customerPhone,
        upgradeNote,
        saleNote
      });
      showToast('Giao dịch bán thành công!', 'success');
      
      // Reset everything
      setScannedMachine(null);
      setSerial('');
      setFinalPrice('');
      setSalesperson('');
      setDiscount('');
      setCustomer('');
      setCustomerPhone('');
      setUpgradeNote('');
      setSaleNote('');
      setSaleRam('');
      setSaleSsd('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi xử lý giao dịch bán', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const resetLookup = () => {
    setScannedMachine(null);
    setSerial('');
  };

  const isReady = scannedMachine?.state === 'READY';
  const waitDays = scannedMachine?.intakeAt ? Math.floor((new Date() - new Date(scannedMachine.intakeAt)) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className={styles.page}>
      
      {/* 1. Search Section */}
      <div className={styles.searchSection}>
        <div className={styles.searchHeader}>
          <h2>1. Quét hoặc nhập serial</h2>
          <p>Hệ thống chỉ cho bán máy đang SẴN SÀNG BÁN</p>
        </div>
        <form onSubmit={handleLookup} className={styles.searchForm}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Quét hoặc nhập serial thật" 
              value={serial}
              onChange={e => setSerial(e.target.value)}
              disabled={isLoading || scannedMachine}
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading || scannedMachine || !serial}>
            Tra cứu máy
          </button>
        </form>
      </div>

      {scannedMachine ? (
        <div className={styles.contentGrid}>
          {/* Left Panel */}
          <div className={styles.leftPanel}>
            <h3 className={styles.panelTitle}>Máy đã nhận diện</h3>
            
            <div className={styles.machineNameHeader}>
              <h4 className={styles.machineName}>{scannedMachine.sourceModelText || 'Không rõ dòng máy'}</h4>
              <span className={isReady ? styles.badgeReady : styles.badgeWarning}>
                {isReady ? 'SẴN SÀNG BÁN' : 'CẦN KIỂM TRA'}
              </span>
            </div>
            
            <div className={styles.machineConfig}>
              {scannedMachine.configId || 'Chưa cấu hình'}
            </div>

            <table className={styles.detailsTable}>
              <tbody>
                <tr>
                  <td>Serial</td>
                  <td>{scannedMachine.serialKey}</td>
                </tr>
                <tr>
                  <td>Vòng tồn đang mở</td>
                  <td>{scannedMachine.cycleId}</td>
                </tr>
                <tr>
                  <td>Giá niêm yết</td>
                  <td>{scannedMachine.salePrice ? formatCurrency(scannedMachine.salePrice) : 'Chưa có giá'}</td>
                </tr>
                <tr>
                  <td>Ngày nhập</td>
                  <td>{new Date(scannedMachine.intakeAt).toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td>Số ngày tồn</td>
                  <td>{waitDays} ngày</td>
                </tr>
              </tbody>
            </table>

            {!isReady && (
              <div className={styles.warningBox}>
                Máy không ở trạng thái Sẵn sàng bán.
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className={styles.rightPanel}>
            <h3 className={styles.panelTitle}>2. Thông tin bán hàng</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: '1.5rem', marginTop: '-8px' }}>
              Cấu hình tại thời điểm bán được lưu riêng, không sửa cấu hình gốc của máy.
            </p>

            <div className={styles.formGrid}>
              <div className="form-group">
                <label className="form-label">Serial <span className="required">*</span></label>
                <input className="form-input" value={scannedMachine.serialKey} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Ngày bán <span className="required">*</span></label>
                <input type="datetime-local" className="form-input" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Nhân viên bán</label>
                <input className="form-input" value={salesperson} onChange={e => setSalesperson(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Giá niêm yết</label>
                <input className="form-input" value={scannedMachine.salePrice ? formatCurrency(scannedMachine.salePrice) : 'Chưa có giá'} disabled />
              </div>

              <div className="form-group">
                <label className="form-label">Giảm giá</label>
                <input className="form-input" value={formatCurrency(discount)} onChange={e => setDiscount(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Giá bán cuối cùng <span className="required">*</span></label>
                <input className="form-input" style={{ fontWeight: 'bold', color: 'var(--blue-700)' }} value={formatCurrency(finalPrice)} onChange={e => setFinalPrice(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">RAM khi bán</label>
                <input className="form-input" value={saleRam} onChange={e => setSaleRam(e.target.value)} placeholder="VD: 16" />
              </div>
              <div className="form-group">
                <label className="form-label">SSD khi bán</label>
                <input className="form-input" value={saleSsd} onChange={e => setSaleSsd(e.target.value)} placeholder="VD: 512" />
              </div>

              <div className="form-group">
                <label className="form-label">Khách hàng</label>
                <input className="form-input" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Không bắt buộc" />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input className="form-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Không bắt buộc" />
              </div>

              <div className="form-group formGroupFull">
                <label className="form-label">Cấu hình sau nâng cấp</label>
                <textarea className="form-input" rows="2" value={upgradeNote} onChange={e => setUpgradeNote(e.target.value)} placeholder="Để trống nếu giữ nguyên cấu hình hiện tại"></textarea>
              </div>

              <div className="form-group formGroupFull">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-input" rows="2" value={saleNote} onChange={e => setSaleNote(e.target.value)} placeholder="Không bắt buộc"></textarea>
              </div>
            </div>

            <div className={styles.formFooter}>
              <button type="button" className="btn btn-outline" onClick={resetLookup}>
                Chọn máy khác
              </button>
              
              <p className={styles.footerNote}>Transaction ID được tạo khi xác nhận giao dịch</p>
              
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSale}
                disabled={!isReady || isLoading}
              >
                {isLoading ? 'Đang xử lý...' : 'Kiểm tra & xác nhận'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        !isLoading && (
          <div className={styles.emptyState}>
            <RotateCcw size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3>Chưa chọn máy</h3>
            <p>Vui lòng quét Serial máy ở khung bên trên để bắt đầu giao dịch</p>
          </div>
        )
      )}
    </div>
  );
}
