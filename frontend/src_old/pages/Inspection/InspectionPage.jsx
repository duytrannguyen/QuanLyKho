import { useState, useEffect } from 'react';
import { Search, ChevronDown, Check, X, FileText, Settings, SlidersHorizontal, Camera, Clock, User, Download, FilePlus, ChevronLeft, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';
import { inspectionApi } from '../../api/inspectionApi';
import { useToast } from '../../toast/ToastContext';
import styles from './InspectionPage.module.css';

export default function InspectionPage() {
  const { showToast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState('TẤT CẢ');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspections, setInspections] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [progressNotes, setProgressNotes] = useState('');

  const fetchInspections = async () => {
    try {
      const res = await inspectionApi.getActive('ALL');
      setInspections(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  useEffect(() => {
    const filtered = inspections.filter(item => {
      // 1. Tab filter
      let matchTab = false;
      if (activeTab === 'TẤT CẢ') matchTab = true;
      else if (activeTab === 'CẦN XỬ LÝ') matchTab = item.status === 'OPEN';
      else if (activeTab === 'ĐANG KIỂM TRA') matchTab = item.status === 'IN_PROGRESS';
      else if (activeTab === 'KIỂM TRA LẠI') matchTab = item.status === 'RECHECK_REQUESTED';
      else if (activeTab === 'ĐẠT') matchTab = item.status === 'PASSED';
      else if (activeTab === 'HỦY/TRẢ') matchTab = item.status === 'REJECTED_RETURNED';
      else matchTab = true;

      // 2. Search query filter
      let matchSearch = true;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        matchSearch =
          (item.serial || '').toLowerCase().includes(q) ||
          (item.name || '').toLowerCase().includes(q) ||
          (item.id || '').toLowerCase().includes(q);
      }

      return matchTab && matchSearch;
    });

    if (filtered.length > 0) {
      if (!activeItem || !filtered.find(i => i.id === activeItem.id)) {
        setActiveItem(filtered[0]);
      }
    } else {
      setActiveItem(null);
    }
  }, [activeTab, searchQuery, inspections]);

  useEffect(() => {
    if (activeItem) {
      setProgressNotes(activeItem.progressNotes || '');
    }
  }, [activeItem]);

  const handleUpdateProgress = async () => {
    if (!activeItem) return;
    const isConfirmed = await confirm('Xác nhận lưu tiến độ kiểm tra?');
    if (!isConfirmed) return;

    try {
      await inspectionApi.updateProgress(activeItem.id, {
        progressNotes: progressNotes,
        requiredDataComplete: activeItem.dataStatus === 'Đã đủ' // Simplified for now
      });
      showToast('Đã lưu tiến độ', 'success');
      fetchInspections();
    } catch (err) {
      showToast('Lỗi lưu tiến độ', 'danger');
    }
  };

  const handleStartInspection = async () => {
    if (!activeItem) return;
    try {
      await inspectionApi.start(activeItem.id);
      showToast('Đã bắt đầu kiểm tra', 'success');
      fetchInspections();
    } catch (err) {
      showToast('Lỗi bắt đầu kiểm tra', 'danger');
    }
  };

  const handleApprove = async () => {
    if (!activeItem) return;
    const isConfirmed = await confirm('Xác nhận máy đã đạt yêu cầu (Sẵn sàng bán)?');
    if (!isConfirmed) return;

    try {
      await inspectionApi.approve(activeItem.id, { notes: progressNotes });
      showToast('Xác nhận đạt thành công', 'success');
      setActiveItem(null);
      fetchInspections();
    } catch (err) {
      showToast('Lỗi xác nhận', 'danger');
    }
  };

  const handleReject = async () => {
    if (!activeItem) return;
    const isConfirmed = await confirm('Xác nhận HỦY/TRẢ máy này?');
    if (!isConfirmed) return;

    try {
      await inspectionApi.reject(activeItem.id, { notes: progressNotes });
      showToast('Đã hủy/trả máy', 'warning');
      setActiveItem(null);
      fetchInspections();
    } catch (err) {
      showToast('Lỗi hủy/trả máy', 'danger');
    }
  };

  const filteredInspections = inspections.filter(item => {
    let matchTab = false;
    if (activeTab === 'TẤT CẢ') matchTab = true;
    else if (activeTab === 'CẦN XỬ LÝ') matchTab = item.status === 'OPEN';
    else if (activeTab === 'ĐANG KIỂM TRA') matchTab = item.status === 'IN_PROGRESS';
    else if (activeTab === 'KIỂM TRA LẠI') matchTab = item.status === 'RECHECK_REQUESTED';
    else if (activeTab === 'ĐẠT') matchTab = item.status === 'PASSED';
    else if (activeTab === 'HỦY/TRẢ') matchTab = item.status === 'REJECTED_RETURNED';
    else matchTab = true;

    let matchSearch = true;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      matchSearch =
        (item.serial || '').toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.id || '').toLowerCase().includes(q);
    }

    return matchTab && matchSearch;
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>Kiểm tra máy</h1>
          <p>Xử lý các máy đang chờ kiểm tra kỹ thuật</p>
        </div>
      </div>

      <div className={styles.tabs} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['TẤT CẢ', 'CẦN XỬ LÝ', 'ĐANG KIỂM TRA', 'KIỂM TRA LẠI', 'ĐẠT', 'HỦY/TRẢ'].map(tab => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '36px', width: '100%' }}
            placeholder="Tìm theo serial, tên máy, mã phiếu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Left List */}
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            Hiển thị {filteredInspections.length} kết quả
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Serial</th>
                <th>Tên máy</th>
                <th>Cấu hình</th>
                <th>Loại yêu cầu</th>
                <th>Thời gian chờ</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.map(item => (
                <tr key={item.id} onClick={() => setActiveItem(item)} style={{ cursor: 'pointer', background: activeItem?.id === item.id ? 'var(--gray-50)' : 'transparent' }}>
                  <td><strong>{item.serial}</strong></td>
                  <td>{item.name}</td>
                  <td>{item.config}</td>
                  <td>{item.type}</td>
                  <td>{item.waitDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Detail */}
        {activeItem && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <div>
                <h2 className={styles.detailTitle}>Chi tiết kiểm tra</h2>
                <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '12px', lineHeight: '1.2' }}>{activeItem.name}</div>
                <div style={{ fontSize: '14px', color: 'var(--gray-500)', marginTop: '4px' }}>Serial: {activeItem.serial}</div>
              </div>
              <span className={`${styles.badge} ${activeItem.status === 'PASSED' ? styles.success :
                  (activeItem.status === 'REJECTED_RETURNED' ? styles.gray :
                    (activeItem.status === 'IN_PROGRESS' ? styles.primary : styles.warning))
                }`}>
                {activeItem.status === 'OPEN' ? 'CẦN XỬ LÝ' :
                  (activeItem.status === 'IN_PROGRESS' ? 'ĐANG KIỂM TRA' :
                    (activeItem.status === 'RECHECK_REQUESTED' ? 'KIỂM TRA LẠI' :
                      (activeItem.status === 'PASSED' ? 'ĐẠT' : 'HỦY/TRẢ')))
                }
              </span>
            </div>

            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Mã yêu cầu</div>
              <div className={styles.infoValue} style={{ fontSize: '12px' }}>{activeItem.id}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Cấu hình</div>
              <div className={styles.infoValue}>{activeItem.config}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Loại yêu cầu</div>
              <div className={styles.infoValue}>{activeItem.type}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Thời gian chờ</div>
              <div className={styles.infoValue}>{activeItem.waitDays}</div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Dữ liệu bắt buộc</div>
              <div className={styles.infoValue}>{activeItem.dataStatus}</div>
            </div>

            <div className={styles.infoRow} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div className={styles.infoLabel} style={{ marginBottom: '8px' }}>Tiến độ / Ghi chú</div>
              <textarea
                className="form-input"
                rows="3"
                style={{ width: '100%', resize: 'vertical' }}
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="Nhập ghi chú kiểm tra..."
              />
            </div>

            <div className={styles.infoBox}>
              Lưu tiến độ không đóng yêu cầu. Kết quả cuối chỉ là Đạt hoặc Hủy/Trả.
            </div>

            {activeItem.status !== 'PASSED' && activeItem.status !== 'REJECTED_RETURNED' && (
              <div className={styles.actionBtns}>
                {activeItem.status === 'OPEN' && (
                  <button className="btn btn-primary" onClick={handleStartInspection}>Bắt đầu kiểm tra</button>
                )}
                {activeItem.status !== 'OPEN' && (
                  <button className="btn btn-outline" onClick={handleUpdateProgress}>Lưu tiến độ</button>
                )}
                <button className={`btn btn-outline ${styles.btnDanger}`} onClick={handleReject}>Hủy/Trả</button>
                <button className={`btn ${styles.btnSuccess}`} onClick={handleApprove}>Xác nhận Đạt</button>
              </div>
            )}

            {(activeItem.status === 'PASSED' || activeItem.status === 'REJECTED_RETURNED') && (
              <div className={styles.infoBox} style={{ backgroundColor: activeItem.status === 'PASSED' ? '#f0fdf4' : '#f3f4f6', borderColor: activeItem.status === 'PASSED' ? '#bbf7d0' : '#d1d5db', color: activeItem.status === 'PASSED' ? '#166534' : '#374151' }}>
                Yêu cầu này đã hoàn tất ({activeItem.status === 'PASSED' ? 'ĐẠT' : 'HỦY/TRẢ'}). Không thể thay đổi trạng thái nữa.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
