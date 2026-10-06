import React, { useState, useEffect } from 'react';
import { apiKiemDinh } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { formatInspectionStatus } from '../../constants/trangThai';

export default function TrangKiemDinh() {
  const { showToast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState('ĐANG MỞ');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspections, setInspections] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [progressNotes, setProgressNotes] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  const fetchInspections = async () => {
    try {
      const res = await apiKiemDinh.getActive('ALL');
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
      let matchTab = false;
      if (activeTab === 'TẤT CẢ') matchTab = true;
      else if (activeTab === 'ĐANG MỞ') matchTab = item.status === 'OPEN';
      else if (activeTab === 'ĐANG XỬ LÝ') matchTab = item.status === 'IN_PROGRESS';
      else if (activeTab === 'YÊU CẦU KIỂM TRA LẠI') matchTab = item.status === 'RECHECK_REQUESTED';
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

    if (filtered.length > 0) {
      if (!activeItem || !filtered.find(i => i.id === activeItem.id)) {
        setActiveItem(filtered[0]);
      }
    } else {
      setActiveItem(null);
    }
  }, [activeTab, searchQuery, inspections]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, searchQuery, pageSize]);

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
      await apiKiemDinh.updateProgress(activeItem.id, {
        progressNotes: progressNotes,
        requiredDataComplete: activeItem.dataStatus === 'Đã đủ'
      });
      showToast('Đã lưu tiến độ', 'success');
      fetchInspections();
    } catch (err) {
      showToast('Lỗi lưu tiến độ', 'danger');
    }
  };

  const handleApprove = async () => {
    if (!activeItem) return;
    const isConfirmed = await confirm('Xác nhận máy đã đạt yêu cầu (Sẵn sàng bán)?');
    if (!isConfirmed) return;

    try {
      await apiKiemDinh.approve(activeItem.id, { notes: progressNotes });
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
      await apiKiemDinh.reject(activeItem.id, { notes: progressNotes });
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
    else if (activeTab === 'ĐANG MỞ') matchTab = item.status === 'OPEN';
    else if (activeTab === 'ĐANG XỬ LÝ') matchTab = item.status === 'IN_PROGRESS';
    else if (activeTab === 'YÊU CẦU KIỂM TRA LẠI') matchTab = item.status === 'RECHECK_REQUESTED';
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
    <div className="container-fluid p-0">
      
      <div className="mb-4">
        <h2 className="fw-bold m-0 text-dark">Kiểm tra máy</h2>
        <p className="text-secondary">Xử lý các máy đang chờ kiểm tra kỹ thuật</p>
      </div>

      <div className="mb-4">
        <ul className="nav nav-pills gap-2 flex-nowrap overflow-auto pb-2">
          {['ĐANG MỞ', 'YÊU CẦU KIỂM TRA LẠI', 'ĐẠT', 'HỦY/TRẢ', 'TẤT CẢ'].map(tab => (
            <li className="nav-item" key={tab}>
              <button
                className={`nav-link fw-medium border ${activeTab === tab ? 'active bg-primary border-primary' : 'bg-white text-secondary border-secondary'}`}
                onClick={() => setActiveTab(tab)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {tab}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-3 fw-medium text-secondary small">Hiển thị {filteredInspections.length} kết quả</div>

      <div className="row g-4 align-items-start">
        {/* CỘT TRÁI: BẢNG DỮ LIỆU */}
        <div className="col-xl-8 col-lg-7 col-md-12 mb-4 mb-lg-0">
          <div className="card shadow-sm border-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ tableLayout: 'fixed' }}>
                <thead className="table-light text-secondary small">
                  <tr>
                    <th style={{ width: '5%' }} className="text-center">STT</th>
                    <th style={{ width: '15%' }}>Serial</th>
                    <th style={{ width: '15%' }}>Tên máy</th>
                    <th style={{ width: '25%' }}>Cấu hình</th>
                    <th style={{ width: '25%' }}>Loại yêu cầu</th>
                    <th style={{ width: '15%' }}>Thời gian (Tồn/Chờ)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInspections.slice(page * pageSize, (page + 1) * pageSize).map((item, index) => (
                    <tr
                      key={item.id}
                      onClick={() => setActiveItem(item)}
                      className={activeItem?.id === item.id ? 'table-primary' : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="text-center">{page * pageSize + index + 1}</td>
                      <td><strong className="text-dark">{item.serial}</strong></td>
                      <td className="text-truncate" title={item.name}>{item.name}</td>
                      <td className="text-truncate" title={item.config}>{item.config}</td>
                      <td>{item.type}</td>
                      <td>
                        <div className="small"><span className="text-secondary">Tồn:</span> {item.inventoryDays}</div>
                        <div className="small"><span className="text-secondary">Chờ:</span> <span className="text-danger fw-medium">{item.waitDays}</span></div>
                      </td>
                    </tr>
                  ))}
                  {filteredInspections.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center p-4 text-secondary">
                        Không có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <div className="d-flex align-items-center gap-2">
                <span className="small text-secondary">Hiển thị:</span>
                <select className="form-select form-select-sm w-auto" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              
              {Math.ceil(filteredInspections.length / pageSize) > 1 && (
                <div className="d-flex gap-2 align-items-center">
                  <button className="btn btn-sm btn-outline-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button>
                  <span className="small text-secondary">
                    Trang {page + 1} / {Math.ceil(filteredInspections.length / pageSize)}
                  </span>
                  <button className="btn btn-sm btn-outline-secondary" disabled={page >= Math.ceil(filteredInspections.length / pageSize) - 1} onClick={() => setPage(page + 1)}>Sau</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT */}
        {activeItem && (
          <div className="col-xl-4 col-lg-5 col-md-12">
            <div className="card shadow-sm border-0 p-4 sticky-top" style={{ top: '1rem', zIndex: 1 }}>
              <h4 className="fw-bold text-dark mb-4">Chi tiết kiểm tra</h4>

              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <div className="fs-5 fw-bold text-dark mb-1">{activeItem.serial}</div>
                  <div className="small text-secondary">{activeItem.name}</div>
                </div>
                <div className={`badge rounded-pill border py-1 px-3 ${activeItem.status === 'PASSED' ? 'bg-success-subtle text-success border-success-subtle' :
                    (activeItem.status === 'REJECTED_RETURNED' ? 'bg-secondary-subtle text-secondary border-secondary-subtle' : 'bg-warning-subtle text-warning-emphasis border-warning-subtle')
                  }`}>
                  {formatInspectionStatus(activeItem.status).toUpperCase()}
                </div>
              </div>

              <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                <span className="text-secondary small">Mã yêu cầu</span>
                <span className="fw-bold text-dark small text-end ms-3 text-break">{activeItem.id}</span>
              </div>
              <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                <span className="text-secondary small">Cấu hình</span>
                <span className="fw-bold text-dark small text-end ms-3 text-break">{activeItem.config}</span>
              </div>
              <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                <span className="text-secondary small">Loại yêu cầu</span>
                <span className="fw-bold text-dark small text-end ms-3 text-break">{activeItem.type}</span>
              </div>
              <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                <span className="text-secondary small">Ngày tồn kho</span>
                <span className="fw-bold text-dark small text-end ms-3 text-break">{activeItem.inventoryDays}</span>
              </div>
              <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                <span className="text-secondary small">Thời gian chờ xử lý</span>
                <span className="fw-bold text-dark small text-end ms-3 text-break">{activeItem.waitDays}</span>
              </div>
              <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                <span className="text-secondary small">Dữ liệu bắt buộc</span>
                <span className="fw-bold text-dark small text-end ms-3 text-break">{activeItem.dataStatus}</span>
              </div>

              {activeItem.reason && (
                <div className="mb-3 border-bottom pb-2">
                  <div className="text-secondary small mb-1">Lý do / Ghi chú lỗi</div>
                  <div className="fw-medium text-danger small text-break">{activeItem.reason}</div>
                </div>
              )}
              {activeItem.note && (
                <div className="mb-3 border-bottom pb-2">
                  <div className="text-secondary small mb-1">Ghi chú yêu cầu</div>
                  <div className="fw-medium text-dark small text-break">{activeItem.note}</div>
                </div>
              )}

              {/* Ghi chú */}
              {activeItem.status !== 'PASSED' && activeItem.status !== 'REJECTED_RETURNED' && (
                <textarea
                  className="form-control mb-3"
                  rows="3"
                  placeholder="Ghi chú thêm nếu có..."
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                />
              )}

              <div className="alert alert-info border-info small p-3 mb-4">
                Lưu tiến độ không đóng yêu cầu. Kết quả cuối chỉ là Đạt hoặc Hủy/Trả.
              </div>

              {/* Khối Button hành động */}
              {activeItem.status !== 'PASSED' && activeItem.status !== 'REJECTED_RETURNED' && (
                <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                  <button className="btn btn-outline-secondary fw-medium" onClick={handleUpdateProgress}>Lưu tiến độ</button>
                  <button className="btn btn-outline-danger fw-medium" onClick={handleReject}>Hủy/Trả</button>
                  <button className="btn btn-success fw-medium" onClick={handleApprove}>Xác nhận Đạt</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}