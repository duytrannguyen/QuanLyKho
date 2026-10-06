import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { inventoryApi } from '../../api/inventoryApi';
import { machineApi } from '../../api/machineApi';
import { formatCurrency, parseCurrency } from '../../utils/formatters';
import { useToast } from '../../toast/ToastContext';
import styles from './InventorySearchPage.module.css';

export default function InventorySearchPage() {
  const { showToast, confirm } = useToast();
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('Tất cả');
  const [status, setStatus] = useState('Tất cả');
  const [segment, setSegment] = useState('Tất cả');
  const [results, setResults] = useState([]);
  const [pageInfo, setPageInfo] = useState({ number: 0, totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [activeVariant, setActiveVariant] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [innerPage, setInnerPage] = useState(0);
  const [updateForm, setUpdateForm] = useState({ price: '', status: '', segment: '', notes: '', applyToAll: false });
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [filterOptions, setFilterOptions] = useState({
    brands: [],
    segments: [],
    productLines: []
  });

  useEffect(() => {
    setInnerPage(0);
  }, [activeVariant?.variant?.id]);

  const getDisplayName = (variant) => {
    return variant?.variantName || 'Không xác định';
  };

  useEffect(() => {
    // Load dynamic filters
    inventoryApi.getFilters().then(res => {
      setFilterOptions({
        brands: res.data?.brands || [],
        segments: res.data?.segments || [],
        productLines: res.data?.productLines || []
      });
    }).catch(console.error);
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await inventoryApi.search({ query, brand, status, segment, page, size: 10 });
      if (res.data && res.data.content) {
        setResults(res.data.content);
        setPageInfo({
          number: res.data.number,
          totalPages: res.data.totalPages,
          totalElements: res.data.totalElements
        });
        if (res.data.content.length > 0) {
          setActiveVariant(res.data.content[0]);
        } else {
          setActiveVariant(null);
        }
      } else {
        // Fallback in case backend hasn't restarted yet
        setResults(res.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInventory();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [query, brand, status, segment, page]);

  useEffect(() => {
    // Reset page to 0 when filters change
    setPage(0);
  }, [query, brand, status, segment]);

  const clearFilters = () => {
    setQuery('');
    setBrand('Tất cả');
    setStatus('Tất cả');
    setSegment('Tất cả');
  };

  const STATUS_MAP = {
    'NEEDS_INSPECTION': 'Cần kiểm tra',
    'READY': 'Sẵn sàng bán',
    'CLOSED': 'Đã đóng'
  };

  const handleOpenDetail = (machine) => {
    setSelectedMachine(machine);
    setUpdateForm({
      price: machine.price || '',
      status: machine.status || '',
      segment: machine.segment || '',
      notes: machine.notes || '',
      applyToAll: false
    });
  };

  const handleUpdateMachine = async () => {
    if (!selectedMachine) return;

    const isConfirmed = await confirm('Xác nhận cập nhật thông tin máy?');
    if (!isConfirmed) return;

    setIsUpdating(true);
    try {
      await machineApi.update(selectedMachine.serial, updateForm);
      showToast('Cập nhật thành công', 'success');
      setSelectedMachine(null);
      fetchInventory(); // Tải lại dữ liệu
    } catch (err) {
      showToast('Cập nhật thất bại: ' + (err.response?.data?.message || err.message), 'danger');
    } finally {
      setIsUpdating(false);
    }
  };

  const hasActiveSearchOrFilter = query.trim().length > 0 || brand !== 'Tất cả' || status !== 'Tất cả' || segment !== 'Tất cả';

  return (
    <div className={styles.page}>
      <div className={styles.filters}>
        <div className={styles.searchInput} style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input className="form-input" style={{ paddingLeft: '36px' }}
            placeholder="Tìm theo dòng máy, model, cấu hình, biến thể hoặc serial"
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: '160px' }} value={segment} onChange={e => setSegment(e.target.value)}>
          <option value="Tất cả">Phân khúc: Tất cả</option>
          {filterOptions.segments.map(seg => (
            <option key={seg} value={seg}>{seg}</option>
          ))}
        </select>
        <select className="form-select" style={{ width: '140px' }} value={brand} onChange={e => setBrand(e.target.value)}>
          <option value="Tất cả">Hãng: Tất cả</option>
          {filterOptions.brands.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select className="form-select" style={{ width: '150px' }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="Tất cả">Trạng thái: Tất cả</option>
          <option value="READY">Sẵn sàng bán</option>
          <option value="NEEDS_INSPECTION">Cần kiểm tra</option>
        </select>
        <button className="btn btn-outline btn-sm" onClick={clearFilters}>Xóa bộ lọc</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <p style={{ color: 'var(--gray-500)', fontSize: 'var(--font-sm)', margin: 0 }}>
          {hasActiveSearchOrFilter 
            ? (pageInfo.totalElements > 0 ? `${pageInfo.totalElements} biến thể phù hợp` : `${results.length} biến thể phù hợp`)
            : 'Nhập từ khóa hoặc chọn bộ lọc để hiển thị kết quả'}
        </p>
        
        {(hasActiveSearchOrFilter && pageInfo.totalPages > 1) && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button>
            <span style={{ fontSize: '13px' }}>Trang {page + 1} / {pageInfo.totalPages}</span>
            <button className="btn btn-outline btn-sm" disabled={page >= pageInfo.totalPages - 1} onClick={() => setPage(page + 1)}>Sau</button>
          </div>
        )}
      </div>

      {hasActiveSearchOrFilter ? (
        <div className={styles.contentGrid}>
        {/* Left Column - Variants */}
        <div className={styles.variantList}>
          {results.map(item => (
            <div key={item?.variant?.id || Math.random()} 
                 className={`${styles.variantCard} ${activeVariant?.variant?.id === item?.variant?.id ? styles.active : ''}`}
                 onClick={() => setActiveVariant(item)}
                 style={{ cursor: 'pointer', border: activeVariant?.variant?.id === item?.variant?.id ? '2px solid var(--primary-500)' : '' }}>
              <div className={styles.variantHeader}>
                <div className={styles.variantName}>{getDisplayName(item?.variant)}</div>
                <div className={styles.stockInfo}>
                  <div className={styles.stockCount}>Tồn: {item?.totalCount || 0}</div>
                  <div className={styles.priceLabel}>Giá từ</div>
                  <div className={styles.priceValue}>{(item?.machines?.length > 0 && item.machines[0]?.price) ? formatCurrency(item.machines[0].price) + ' ₫' : 'Chưa có'}</div>
                </div>
              </div>
              <div className={styles.specs}>
                {item?.variant?.platform?.platformCode || ''} | {item?.variant?.cpuCode} | {item?.variant?.gpuCode} {item?.variant?.touchFlag === 'YES' ? '| Cảm ứng' : ''}
              </div>
              <div className={styles.badges}>
                <span className={`${styles.badge} ${styles.blue}`}>{item?.variant?.platform?.modelLine?.segmentCode || 'Chưa phân loại'}</span>
              </div>
              <div className={styles.refCodes}>
                Code: {item?.variant?.variantId || ''}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column - Detail */}
        {activeVariant && activeVariant.variant && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <h2 className={styles.detailTitle}>Chi tiết biến thể</h2>
              <h3 className={styles.detailTitle} style={{ marginTop: 'var(--space-4)' }}>{getDisplayName(activeVariant?.variant)}</h3>
              <p className={styles.detailSpecs}>{activeVariant?.variant?.platform?.platformCode} | {activeVariant?.variant?.cpuCode} | {activeVariant?.variant?.gpuCode}</p>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statHeader}>
                  <span className={`${styles.statDot} ${styles.green}`}></span>
                  <span className={styles.statLabel}>Máy đang tồn</span>
                </div>
                <div className={styles.statValue}>{activeVariant.totalCount || 0}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statHeader}>
                  <span className={`${styles.statDot} ${styles.green}`}></span>
                  <span className={styles.statLabel}>Sẵn sàng bán</span>
                </div>
                <div className={styles.statValue}>{activeVariant.readyCount || 0}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statHeader}>
                  <span className={`${styles.statDot} ${styles.yellow}`}></span>
                  <span className={styles.statLabel}>Kiểm tra</span>
                </div>
                <div className={styles.statValue}>{activeVariant.inspectionCount || 0}</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statHeader}>
                  <span className={`${styles.statDot} ${styles.blue}`}></span>
                  <span className={styles.statLabel}>Đã xuất</span>
                </div>
                <div className={styles.statValue}>0</div>
              </div>
            </div>

            <div className={styles.tableSection}>
              <div className={styles.tableHeader}>
                <h4 className={styles.tableTitle}>Danh sách serial</h4>
                <span className={styles.tableCount}>{(activeVariant?.machines || []).length} serial</span>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Serial</th>
                    <th>Phân khúc</th>
                    <th>Trạng thái</th>
                    <th>Giá bán</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeVariant?.machines || []).slice(innerPage * 5, (innerPage + 1) * 5).map((machine, index) => (
                    <tr key={machine.serial}>
                      <td>{innerPage * 5 + index + 1}</td>
                      <td><strong>{machine.serial}</strong></td>
                      <td>{machine.configId || '-'}</td>
                      <td>
                        <span className={`${styles.badge} ${machine.status === 'READY' ? styles.green : styles.yellow}`}>
                          {STATUS_MAP[machine.status] || machine.status}
                        </span>
                      </td>
                      <td>{machine.price ? formatCurrency(machine.price) + ' ₫' : '-'}</td>
                      <td>
                        <button className="btn btn-outline btn-sm">Chi tiết</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(activeVariant?.machines || []).length > 5 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', alignItems: 'center' }}>
                  <button className="btn btn-outline btn-sm" disabled={innerPage === 0} onClick={() => setInnerPage(innerPage - 1)}>Trang trước</button>
                  <span style={{ fontSize: '13px' }}>Trang {innerPage + 1} / {Math.ceil(activeVariant.machines.length / 5)}</span>
                  <button className="btn btn-outline btn-sm" disabled={innerPage >= Math.ceil(activeVariant.machines.length / 5) - 1} onClick={() => setInnerPage(innerPage + 1)}>Trang sau</button>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--gray-400)' }}>
          <Search size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>Sẵn sàng tìm kiếm</h3>
          <p>Nhập từ khóa hoặc chọn bộ lọc ở trên để bắt đầu tra cứu kho</p>
        </div>
      )}
      
      {/* Modal Cập nhật máy */}
      {selectedMachine && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Chi tiết & Cập nhật: {selectedMachine.serial}</h3>
            
            <div className="form-group">
              <label className="form-label">Giá bán</label>
              <input className="form-input" placeholder="Ví dụ: 15000000" type="text"
                value={formatCurrency(updateForm.price)} onChange={e => setUpdateForm({...updateForm, price: parseCurrency(e.target.value)})} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={updateForm.status} onChange={e => setUpdateForm({...updateForm, status: e.target.value})}>
                <option value="SAN_SANG_BAN">Sẵn sàng bán</option>
                <option value="CAN_KIEM_TRA">Cần kiểm tra</option>
                <option value="DANG_KIEM_TRA">Đang kiểm tra</option>
                <option value="DA_BAN">Đã bán</option>
                <option value="HUY_TRA">Hủy/Trả</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Phân khúc</label>
              <select className="form-select" value={updateForm.segment} onChange={e => setUpdateForm({...updateForm, segment: e.target.value})}>
                <option value="">-- Chọn phân khúc --</option>
                <option value="Phổ thông">Phổ thông</option>
                <option value="Văn phòng">Văn phòng</option>
                <option value="Đồ họa">Đồ họa</option>
                <option value="Doanh nhân">Doanh nhân</option>
                <option value="Cao cấp">Cao cấp</option>
                <option value="Máy trạm">Máy trạm</option>
                <option value="Gaming">Gaming</option>
                {/* Fallback cho các phân khúc khác đang có trong DB nhưng không thuộc list chuẩn */}
                {updateForm.segment && !['Phổ thông', 'Văn phòng', 'Đồ họa', 'Doanh nhân', 'Cao cấp', 'Máy trạm', 'Gaming', ''].includes(updateForm.segment) && (
                  <option value={updateForm.segment}>{updateForm.segment}</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú</label>
              <textarea className="form-input" rows="3" 
                value={updateForm.notes} onChange={e => setUpdateForm({...updateForm, notes: e.target.value})} 
                placeholder="Ghi chú chi tiết về tình trạng máy..." />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <input type="checkbox" id="applyToAll" style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                checked={updateForm.applyToAll} onChange={e => setUpdateForm({...updateForm, applyToAll: e.target.checked})} />
              <label htmlFor="applyToAll" style={{ margin: 0, fontSize: '13px', color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                Áp dụng thay đổi cho <strong>tất cả {activeVariant?.machines?.length || 1} máy</strong> cùng cấu hình này
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button className="btn btn-outline" onClick={() => setSelectedMachine(null)} disabled={isUpdating}>Hủy</button>
              <button className="btn btn-primary" onClick={handleUpdateMachine} disabled={isUpdating}>
                {isUpdating ? 'Đang lưu...' : 'Lưu cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
