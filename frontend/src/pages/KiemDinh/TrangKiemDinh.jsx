import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Save,
  Clock,
  Cpu,
  AlertTriangle,
  FileText,
  Info,
  ClipboardCheck,
  Database,
  X
} from 'lucide-react';
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
      setInspections(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const filteredInspections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inspections.filter(item => {
      let matchTab = false;
      if (activeTab === 'TẤT CẢ') matchTab = true;
      else if (activeTab === 'ĐANG MỞ') matchTab = item.status === 'OPEN';
      else if (activeTab === 'ĐANG XỬ LÝ') matchTab = item.status === 'IN_PROGRESS';
      else if (activeTab === 'YÊU CẦU KIỂM TRA LẠI') matchTab = item.status === 'RECHECK_REQUESTED';
      else if (activeTab === 'ĐẠT') matchTab = item.status === 'PASSED';
      else if (activeTab === 'HỦY/TRẢ') matchTab = item.status === 'REJECTED_RETURNED';
      else matchTab = true;

      if (!matchTab) return false;
      if (q !== '') {
        return (
          (item.serial || '').toLowerCase().includes(q) ||
          (item.name || '').toLowerCase().includes(q) ||
          (item.id || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeTab, searchQuery, inspections]);

  const tabCounts = useMemo(() => {
    const counts = {
      'ĐANG MỞ': 0,
      'ĐANG XỬ LÝ': 0,
      'YÊU CẦU KIỂM TRA LẠI': 0,
      'ĐẠT': 0,
      'HỦY/TRẢ': 0,
      'TẤT CẢ': inspections.length
    };
    for (const item of inspections) {
      if (item.status === 'OPEN') counts['ĐANG MỞ']++;
      else if (item.status === 'IN_PROGRESS') counts['ĐANG XỬ LÝ']++;
      else if (item.status === 'RECHECK_REQUESTED') counts['YÊU CẦU KIỂM TRA LẠI']++;
      else if (item.status === 'PASSED') counts['ĐẠT']++;
      else if (item.status === 'REJECTED_RETURNED') counts['HỦY/TRẢ']++;
    }
    return counts;
  }, [inspections]);

  useEffect(() => {
    if (filteredInspections.length > 0) {
      if (!activeItem || !filteredInspections.find(i => i.id === activeItem.id)) {
        setActiveItem(filteredInspections[0]);
      }
    } else {
      setActiveItem(null);
    }
  }, [filteredInspections]);

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

  const totalPages = Math.ceil(filteredInspections.length / pageSize);
  const isEditable = activeItem && activeItem.status !== 'PASSED' && activeItem.status !== 'REJECTED_RETURNED';

  return (
    <div className="container-fluid p-0">
      {/* HEADER TRANG */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h3 className="fw-bold m-0 text-dark d-flex align-items-center gap-2">
            <ClipboardCheck size={24} className="text-primary" />
            <span>Kiểm định chất lượng máy (QC)</span>
          </h3>
          <p className="text-secondary small m-0 mt-1">
            Quét mã Serial hoặc tìm kiếm máy đang chờ kiểm tra kỹ thuật
          </p>
        </div>
        <button
          className="btn btn-white bg-white border shadow-sm fw-medium text-dark d-flex align-items-center gap-2 px-3 py-2"
          onClick={fetchInspections}
        >
          <RefreshCw size={16} className="text-primary" />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* THANH CÔNG CỤ: TAB TRẠNG THÁI & TÌM KIẾM */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          {/* Hàng 1: Danh sách Tab trạng thái */}
          <div className="border-bottom pb-3 mb-3">
            <ul className="nav nav-pills gap-2 flex-wrap">
              {['ĐANG MỞ', 'ĐANG XỬ LÝ', 'YÊU CẦU KIỂM TRA LẠI', 'ĐẠT', 'HỦY/TRẢ', 'TẤT CẢ'].map(tab => {
                const count = tabCounts[tab] || 0;
                const isActive = activeTab === tab;
                return (
                  <li className="nav-item" key={tab}>
                    <button
                      type="button"
                      className={`nav-link btn-sm fw-semibold d-flex align-items-center gap-2 px-3 py-2 rounded-3 transition-all ${
                        isActive
                          ? 'active bg-primary text-white shadow-sm'
                          : 'bg-light text-secondary border border-light-subtle'
                      }`}
                      onClick={() => setActiveTab(tab)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <span>{tab}</span>
                      <span
                        className={`badge rounded-pill ${
                          isActive ? 'bg-white text-primary' : 'bg-white text-dark border'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Hàng 2: Ô tìm kiếm & Bộ đếm kết quả */}
          <div className="row g-3 align-items-center justify-content-between">
            <div className="col-md-7 col-lg-6">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-secondary">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="Quét mã vạch hoặc nhập Serial, Tên máy, Mã phiếu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="btn btn-light border border-start-0 text-secondary d-flex align-items-center gap-1"
                    type="button"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={14} />
                    <span>Xóa</span>
                  </button>
                )}
              </div>
            </div>

            <div className="col-md-5 col-lg-6 d-flex flex-wrap justify-content-md-end align-items-center gap-3">
              <span className="fw-medium text-secondary small bg-light px-3 py-2 rounded-3 border">
                Hiển thị <strong className="text-dark">{filteredInspections.length}</strong> kết quả
              </span>

              <div className="d-flex align-items-center gap-2">
                <span className="small text-secondary text-nowrap">Hiển thị:</span>
                <select
                  className="form-select form-select-sm w-auto fw-medium"
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                >
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BỐ CỤC CHÍNH: BẢNG DỮ LIỆU (TRÁI) & CHI TIẾT KIỂM TRA (PHẢI) */}
      <div className="row g-4 align-items-start">
        {/* CỘT TRÁI: BẢNG DỮ LIỆU */}
        <div className="col-xl-8 col-lg-7 col-md-12">
          <div className="card shadow-sm border-0 overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-secondary small text-uppercase">
                  <tr>
                    <th style={{ width: '6%' }} className="text-center py-3">STT</th>
                    <th style={{ width: '16%' }} className="py-3">Serial</th>
                    <th style={{ width: '24%' }} className="py-3">Tên máy</th>
                    <th style={{ width: '22%' }} className="py-3">Cấu hình</th>
                    <th style={{ width: '16%' }} className="py-3">Loại yêu cầu</th>
                    <th style={{ width: '16%' }} className="py-3">Thời gian (Tồn/Chờ)</th>
                  </tr>
                </thead>
                <tbody className="border-top-0">
                  {filteredInspections
                    .slice(page * pageSize, (page + 1) * pageSize)
                    .map((item, index) => {
                      const isSelected = activeItem?.id === item.id;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setActiveItem(item)}
                          className={
                            isSelected
                              ? 'bg-primary-subtle bg-opacity-25 border-start border-4 border-primary'
                              : ''
                          }
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="text-center text-secondary small fw-medium">
                            {page * pageSize + index + 1}
                          </td>
                          <td className="text-nowrap">
                            <span className="badge bg-light text-dark border font-monospace fs-6 fw-bold px-2 py-1">
                              {item.serial}
                            </span>
                          </td>
                          <td>
                            <div
                              className="fw-semibold text-dark text-truncate"
                              style={{ maxWidth: '220px' }}
                              title={item.name}
                            >
                              {item.name}
                            </div>
                          </td>
                          <td>
                            <div
                              className="small text-secondary text-truncate"
                              style={{ maxWidth: '200px' }}
                              title={item.config}
                            >
                              {item.config}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary-subtle text-secondary-emphasis fw-medium rounded-pill px-2 py-1">
                              {item.type}
                            </span>
                          </td>
                          <td className="text-nowrap">
                            <div className="d-flex flex-column gap-1 small">
                              <div className="d-flex align-items-center justify-content-between bg-light rounded px-2 py-0.5">
                                <span className="text-secondary">Tồn:</span>
                                <span className="fw-medium text-dark ms-1">{item.inventoryDays}</span>
                              </div>
                              <div className="d-flex align-items-center justify-content-between bg-danger-subtle bg-opacity-50 rounded px-2 py-0.5">
                                <span className="text-secondary">Chờ:</span>
                                <span className="text-danger fw-bold ms-1">{item.waitDays}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                  {filteredInspections.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-secondary">
                        <div className="d-flex flex-column align-items-center gap-2">
                          <ClipboardCheck size={36} className="text-secondary opacity-50" />
                          <span className="fw-medium">Không có dữ liệu</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER PHÂN TRANG */}
            <div className="d-flex flex-wrap justify-content-between align-items-center px-3 py-2.5 bg-light border-top">
              <div className="small text-secondary">
                Hiển thị: <strong className="text-dark">{pageSize}</strong> dòng / trang
              </div>

              {totalPages > 1 && (
                <div className="d-flex gap-2 align-items-center my-1">
                  <button
                    className="btn btn-sm btn-white bg-white border shadow-xs fw-medium"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Trước
                  </button>
                  <span className="small text-secondary px-2">
                    Trang <strong className="text-dark">{page + 1}</strong> / {totalPages}
                  </span>
                  <button
                    className="btn btn-sm btn-white bg-white border shadow-xs fw-medium"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT KIỂM TRA */}
        <div className="col-xl-4 col-lg-5 col-md-12">
          {activeItem ? (
            <div
              className="card shadow-sm border-0 sticky-top overflow-hidden"
              style={{ top: '1rem', zIndex: 1 }}
            >
              {/* Header Card Chi tiết */}
              <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold text-dark m-0">Chi tiết kiểm tra</h5>
                <div
                  className={`badge rounded-pill border py-1.5 px-3 fw-semibold ${
                    activeItem.status === 'PASSED'
                      ? 'bg-success-subtle text-success border-success-subtle'
                      : activeItem.status === 'REJECTED_RETURNED'
                      ? 'bg-secondary-subtle text-secondary border-secondary-subtle'
                      : 'bg-warning-subtle text-warning-emphasis border-warning-subtle'
                  }`}
                >
                  {formatInspectionStatus(activeItem.status).toUpperCase()}
                </div>
              </div>

              <div className="card-body p-3">
                {/* Khối Định danh thiết bị */}
                <div className="bg-light rounded-3 p-3 mb-3 border border-light-subtle">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <div className="fs-5 fw-bold text-primary font-monospace mb-1">
                        {activeItem.serial}
                      </div>
                      <div className="fw-semibold text-dark">{activeItem.name}</div>
                    </div>
                    <span className="badge bg-white text-secondary border small">
                      {activeItem.id}
                    </span>
                  </div>
                </div>

                {/* Lưới 3 chỉ số nhanh: Ngày tồn, Thời gian chờ, Dữ liệu bắt buộc */}
                <div className="row g-2 mb-3 text-center">
                  <div className="col-4">
                    <div className="border rounded-3 p-2 h-100 bg-white">
                      <div className="text-secondary small mb-1" style={{ fontSize: '0.75rem' }}>
                        Ngày tồn kho
                      </div>
                      <div className="fw-bold text-dark small">{activeItem.inventoryDays}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="border border-danger-subtle rounded-3 p-2 h-100 bg-danger-subtle bg-opacity-10">
                      <div className="text-secondary small mb-1" style={{ fontSize: '0.75rem' }}>
                        Thời gian chờ xử lý
                      </div>
                      <div className="fw-bold text-danger small">{activeItem.waitDays}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="border rounded-3 p-2 h-100 bg-white">
                      <div className="text-secondary small mb-1" style={{ fontSize: '0.75rem' }}>
                        Dữ liệu bắt buộc
                      </div>
                      <div
                        className={`fw-bold small ${
                          activeItem.dataStatus === 'Đã đủ' ? 'text-success' : 'text-warning-emphasis'
                        }`}
                      >
                        {activeItem.dataStatus}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thông tin Mã yêu cầu, Loại yêu cầu, Cấu hình */}
                <div className="border rounded-3 p-3 mb-3 bg-white">
                  <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                    <span className="text-secondary small">Mã yêu cầu</span>
                    <span className="fw-bold text-dark small text-end ms-3 text-break font-monospace">
                      {activeItem.id}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                    <span className="text-secondary small">Loại yêu cầu</span>
                    <span className="fw-bold text-dark small text-end ms-3 text-break">
                      {activeItem.type}
                    </span>
                  </div>
                  <div>
                    <div className="text-secondary small mb-1 d-flex align-items-center gap-1">
                      <Cpu size={14} />
                      <span>Cấu hình</span>
                    </div>
                    <div className="fw-semibold text-dark small bg-light rounded-2 p-2 text-break">
                      {activeItem.config}
                    </div>
                  </div>
                </div>

                {/* Khối cảnh báo Lý do / Ghi chú lỗi & Ghi chú yêu cầu */}
                {activeItem.reason && (
                  <div className="alert alert-danger border-danger-subtle py-2.5 px-3 mb-3 rounded-3">
                    <div className="text-danger-emphasis small fw-semibold mb-1 d-flex align-items-center gap-1">
                      <AlertTriangle size={15} />
                      <span>Lý do / Ghi chú lỗi</span>
                    </div>
                    <div className="fw-medium text-danger small text-break">
                      {activeItem.reason}
                    </div>
                  </div>
                )}

                {activeItem.note && (
                  <div className="alert alert-warning border-warning-subtle py-2.5 px-3 mb-3 rounded-3">
                    <div className="text-warning-emphasis small fw-semibold mb-1 d-flex align-items-center gap-1">
                      <FileText size={15} />
                      <span>Ghi chú yêu cầu</span>
                    </div>
                    <div className="fw-medium text-dark small text-break">
                      {activeItem.note}
                    </div>
                  </div>
                )}

                {/* Ô nhập Ghi chú tiến độ */}
                {isEditable && (
                  <div className="mb-3">
                    <textarea
                      className="form-control bg-light-subtle"
                      rows="3"
                      placeholder="Ghi chú thêm nếu có..."
                      value={progressNotes}
                      onChange={(e) => setProgressNotes(e.target.value)}
                    />
                  </div>
                )}

                {/* Thông báo hướng dẫn quy trình */}
                <div className="alert alert-info border-info-subtle bg-info-subtle bg-opacity-25 text-info-emphasis small p-2.5 mb-3 d-flex align-items-start gap-2 rounded-3">
                  <Info size={16} className="flex-shrink-0 mt-0.5 text-info" />
                  <span>
                    Lưu tiến độ không đóng yêu cầu. Kết quả cuối chỉ là Đạt hoặc Hủy/Trả.
                  </span>
                </div>

                {/* Khối Button hành động */}
                {isEditable && (
                  <div className="pt-3 border-top d-flex flex-column gap-2">
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-danger fw-semibold flex-grow-1 d-flex align-items-center justify-content-center gap-1.5 py-2"
                        onClick={handleReject}
                      >
                        <XCircle size={17} />
                        <span>Hủy/Trả</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-success fw-semibold flex-grow-1 d-flex align-items-center justify-content-center gap-1.5 py-2 shadow-sm"
                        onClick={handleApprove}
                      >
                        <CheckCircle2 size={17} />
                        <span>Xác nhận Đạt</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-secondary fw-medium w-100 d-flex align-items-center justify-content-center gap-1.5 py-1.5"
                      onClick={handleUpdateProgress}
                    >
                      <Save size={16} />
                      <span>Lưu tiến độ</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card shadow-sm border-0 p-5 text-center text-secondary">
              <div className="d-flex flex-column align-items-center gap-2">
                <ClipboardCheck size={40} className="opacity-25" />
                <div className="fw-medium">Không có dữ liệu</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}