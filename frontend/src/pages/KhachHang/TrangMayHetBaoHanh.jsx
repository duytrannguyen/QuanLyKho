import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, ShieldAlert, AlertCircle, Calendar, Search, 
  RefreshCw, Download, FileText, User, Phone, MessageSquare, 
  Copy, Check, ExternalLink, Laptop, Tag, ArrowRight, ChevronLeft, 
  ChevronRight, Sparkles, Filter, CheckCircle2, X
} from 'lucide-react';
import { crmApi } from '../../api';
import { dinhDangTien, formatDate } from '../../utils/dinh_dang';
import ModalChiTietHoaDonCRM from './ModalChiTietHoaDonCRM';

export default function TrangMayHetBaoHanh() {
  const navigate = useNavigate();

  // State dữ liệu & phân trang
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // State thống kê & danh sách hãng
  const [summary, setSummary] = useState({
    totalExpired: 0,
    expiredWithin30Days: 0,
    expired1To3Months: 0,
    expiredOver3Months: 0,
  });
  const [brands, setBrands] = useState([]);

  // State bộ lọc & tìm kiếm
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [brand, setBrand] = useState('');
  const [range, setRange] = useState(''); // '' (Tất cả), 'LAST_30_DAYS', '1_TO_3_MONTHS', '3_TO_6_MONTHS', 'OVER_6_MONTHS'

  // State tương tác & Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [messagingOrder, setMessagingOrder] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Load KPI thống kê và danh sách hãng
  const loadMetadata = useCallback(async () => {
    try {
      const [sumRes, brandRes] = await Promise.all([
        crmApi.getExpiredWarrantySummary(),
        crmApi.getExpiredWarrantyBrands(),
      ]);
      if (sumRes?.success && sumRes?.data) {
        setSummary(sumRes.data);
      }
      if (brandRes?.success && brandRes?.data) {
        setBrands(brandRes.data);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu thống kê bảo hành:', err);
    }
  }, []);

  // Load danh sách đơn hàng máy hết hạn
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmApi.getExpiredWarrantyOrders({
        keyword: debouncedKeyword,
        brand,
        range,
        page,
        size,
      });
      if (res?.success && res?.data) {
        const d = res.data;
        setOrders(d.items || []);
        setTotalPages(d.totalPages || 0);
        setTotalElements(d.totalElements || 0);
      } else if (res && !res.success) {
        setError(res.userMessage || 'Không thể tải danh sách thiết bị.');
      }
    } catch (err) {
      console.error('Lỗi tải danh sách máy hết hạn bảo hành:', err);
      setError('Không thể tải danh sách thiết bị hết hạn bảo hành. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, brand, range, page, size]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Sao chép clipboard
  const handleCopy = (e, text, key) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Xuất file Excel
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await crmApi.exportExpiredWarrantyExcel({
        keyword: debouncedKeyword,
        brand,
        range,
      });
      const blob = new Blob([res], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `May_Het_Han_Bao_Hanh_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
      alert('Không thể xuất file Excel. Vui lòng thử lại sau.');
    } finally {
      setExporting(false);
    }
  };

  // Xử lý bộ lọc mốc thời gian nhanh
  const RANGE_OPTIONS = [
    { value: '', label: 'Tất cả mốc' },
    { value: 'LAST_30_DAYS', label: 'Mới hết hạn (< 30 ngày)', badge: summary.expiredWithin30Days },
    { value: '1_TO_3_MONTHS', label: 'Hết hạn 1 - 3 tháng', badge: summary.expired1To3Months },
    { value: '3_TO_6_MONTHS', label: 'Hết hạn 3 - 6 tháng' },
    { value: 'OVER_6_MONTHS', label: 'Hết hạn trên 6 tháng' },
  ];

  return (
    <div className="container-fluid py-3 px-4 min-vh-100 bg-light">
      
      {/* 1. Header Trang & Thanh điều hướng */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle d-inline-flex align-items-center gap-1 px-2.5 py-1 rounded-pill small fw-semibold">
              <Clock size={13} />
              <span>Hậu Mãi & Bảo Dưỡng</span>
            </span>
            <span className="text-secondary small">/</span>
            <span className="text-secondary small fw-medium">Danh mục Khách hàng</span>
          </div>
          <h4 className="fw-bolder text-dark mb-0 d-flex align-items-center gap-2">
            <span>Thiết Bị Hết Hạn Bảo Hành</span>
            <span className="badge bg-secondary bg-opacity-15 text-dark rounded-pill fs-6 px-2.5 py-0.5">
              {summary.totalExpired || totalElements} máy
            </span>
          </h4>
          <p className="text-secondary small mb-0 mt-1">
            Theo dõi chi tiết thời hạn bảo hành từng máy theo ngày bán để chủ động liên hệ mời bảo dưỡng, nâng cấp và thu cũ đổi mới.
          </p>
        </div>

        {/* Nút hành động */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-white bg-white border shadow-2xs text-secondary rounded-pill d-inline-flex align-items-center gap-1.5 px-3 py-1.5 small fw-medium hover-primary"
            onClick={() => {
              loadMetadata();
              loadOrders();
            }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            className="btn btn-outline-success rounded-pill d-inline-flex align-items-center gap-1.5 px-3 py-1.5 small fw-medium shadow-2xs"
            onClick={handleExportExcel}
            disabled={exporting || totalElements === 0}
          >
            <Download size={14} />
            <span>{exporting ? 'Đang xuất Excel...' : 'Xuất Excel'}</span>
          </button>
        </div>
      </div>

      {/* 2. Thẻ Thống Kê KPI (4 Card) */}
      <div className="row g-2.5 mb-3.5">
        
        {/* Card 1: Tổng máy hết hạn */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            role="button"
            onClick={() => { setRange(''); setPage(0); }}
            className={`card border shadow-xs rounded-4 p-3 bg-white h-100 cursor-pointer transition-all ${
              range === '' ? 'border-primary ring-2' : ''
            }`}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Tổng máy hết hạn BH</div>
                <div className="fs-4 fw-bolder text-dark mt-0.5 font-monospace">
                  {summary.totalExpired}
                </div>
                <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Toàn bộ thiết bị trong hệ thống</div>
              </div>
              <div className="bg-dark bg-opacity-10 text-dark p-2.5 rounded-3">
                <Clock size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Mới hết hạn (< 30 ngày) */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            role="button"
            onClick={() => { setRange('LAST_30_DAYS'); setPage(0); }}
            className={`card border shadow-xs rounded-4 p-3 bg-white h-100 cursor-pointer transition-all ${
              range === 'LAST_30_DAYS' ? 'border-danger ring-2' : ''
            }`}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-danger small fw-semibold" style={{ fontSize: '0.78rem' }}>Mới hết hạn (&lt; 30 ngày)</div>
                <div className="fs-4 fw-bolder text-danger mt-0.5 font-monospace">
                  {summary.expiredWithin30Days}
                </div>
                <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Ưu tiên mời bảo dưỡng / tra keo</div>
              </div>
              <div className="bg-danger bg-opacity-10 text-danger p-2.5 rounded-3">
                <AlertCircle size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Hết hạn 1 - 3 tháng */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            role="button"
            onClick={() => { setRange('1_TO_3_MONTHS'); setPage(0); }}
            className={`card border shadow-xs rounded-4 p-3 bg-white h-100 cursor-pointer transition-all ${
              range === '1_TO_3_MONTHS' ? 'border-warning ring-2' : ''
            }`}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-warning-emphasis small fw-semibold" style={{ fontSize: '0.78rem' }}>Hết hạn từ 1 - 3 tháng</div>
                <div className="fs-4 fw-bolder text-warning-emphasis mt-0.5 font-monospace">
                  {summary.expired1To3Months}
                </div>
                <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Thăm hỏi tình trạng & tư vấn nâng cấp</div>
              </div>
              <div className="bg-warning bg-opacity-15 text-warning-emphasis p-2.5 rounded-3">
                <Calendar size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Hết hạn trên 3 tháng */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div 
            role="button"
            onClick={() => { setRange('OVER_6_MONTHS'); setPage(0); }}
            className={`card border shadow-xs rounded-4 p-3 bg-white h-100 cursor-pointer transition-all ${
              range === 'OVER_6_MONTHS' ? 'border-info ring-2' : ''
            }`}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-secondary small fw-medium" style={{ fontSize: '0.78rem' }}>Hết hạn lâu (&gt; 3 tháng)</div>
                <div className="fs-4 fw-bolder text-secondary mt-0.5 font-monospace">
                  {summary.expiredOver3Months}
                </div>
                <div className="text-muted small" style={{ fontSize: '0.72rem' }}>Tiềm năng thu cũ đổi mới (Trade-in)</div>
              </div>
              <div className="bg-secondary bg-opacity-10 text-secondary p-2.5 rounded-3">
                <ShieldAlert size={22} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Bộ lọc & Công cụ tìm kiếm */}
      <div className="card border-0 shadow-sm rounded-4 bg-white mb-3 p-3">
        <div className="row g-2.5 align-items-center">
          
          {/* Ô tìm kiếm */}
          <div className="col-12 col-md-5 col-lg-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0 text-secondary">
                <Search size={14} />
              </span>
              <input
                type="text"
                className="form-control bg-light border-start-0"
                placeholder="Tìm SĐT, tên khách, mã đơn, serial máy..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              {keyword && (
                <button
                  type="button"
                  className="btn btn-light border-start-0 text-secondary"
                  onClick={() => setKeyword('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Lọc Hãng (Brand) */}
          <div className="col-6 col-md-3 col-lg-2">
            <select
              className="form-select form-select-sm bg-light"
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setPage(0); }}
            >
              <option value="">Tất cả hãng</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Lọc Mốc thời gian */}
          <div className="col-6 col-md-4 col-lg-3">
            <select
              className="form-select form-select-sm bg-light"
              value={range}
              onChange={(e) => { setRange(e.target.value); setPage(0); }}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} {opt.badge !== undefined ? `(${opt.badge})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Nút reset bộ lọc */}
          {(keyword || brand || range) && (
            <div className="col-auto">
              <button
                type="button"
                className="btn btn-sm btn-link text-danger text-decoration-none p-0 d-inline-flex align-items-center gap-1"
                style={{ fontSize: '0.78rem' }}
                onClick={() => {
                  setKeyword('');
                  setBrand('');
                  setRange('');
                  setPage(0);
                }}
              >
                <X size={13} />
                <span>Xóa bộ lọc</span>
              </button>
            </div>
          )}

          <div className="col text-end text-secondary small d-none d-lg-block">
            Hiển thị <strong>{orders.length}</strong> / <strong>{totalElements}</strong> thiết bị
          </div>
        </div>
      </div>

      {/* 4. Bảng Dữ Liệu Máy Hết Hạn Bảo Hành */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        
        {error && (
          <div className="alert alert-danger m-3 d-flex align-items-center gap-2 py-2 px-3 small border-0 rounded-3">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="table-responsive">
          <table className="table table-hover table-borderless align-middle mb-0">
            <thead className="table-light border-bottom">
              <tr>
                <th className="py-2.5 text-center text-secondary fw-semibold" style={{ width: '45px' }}>STT</th>
                <th className="py-2.5 text-secondary fw-semibold" style={{ width: '135px' }}>Mã đơn & Ngày mua</th>
                <th className="py-2.5 text-secondary fw-semibold" style={{ width: '220px' }}>Khách hàng & SĐT</th>
                <th className="py-2.5 text-secondary fw-semibold">Thiết bị & Cấu hình</th>
                <th className="py-2.5 text-secondary fw-semibold text-center" style={{ width: '185px' }}>Hạn bảo hành & Quá hạn</th>
                <th className="py-2.5 text-secondary fw-semibold text-end" style={{ width: '120px' }}>Giá trị đơn</th>
                <th className="py-2.5 text-secondary fw-semibold text-center" style={{ width: '130px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="border-top-0">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-secondary">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    <span>Đang tải danh sách thiết bị hết hạn bảo hành...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <Clock size={32} className="text-secondary opacity-40 mb-2" />
                    <div className="fw-semibold">Không tìm thấy thiết bị nào phù hợp.</div>
                    <small className="text-secondary">Hãy thử thay đổi từ khóa tìm kiếm hoặc mốc thời gian lọc.</small>
                  </td>
                </tr>
              ) : orders.map((o, idx) => {
                const cleanPhone = (o.customerPhone || '').replace(/\D/g, '');
                const days = o.daysExpired;

                return (
                  <tr 
                    key={o.id} 
                    role="button"
                    className="border-bottom hover-table-row transition-all"
                    onClick={() => setSelectedOrder(o)}
                    title="Nhấn để xem chi tiết hóa đơn máy"
                  >
                    
                    {/* STT */}
                    <td className="text-center text-secondary small fw-medium">
                      {page * size + idx + 1}
                    </td>

                    {/* Mã đơn & Ngày mua */}
                    <td className="text-nowrap">
                      <div className="font-monospace fw-bold text-primary mb-0.5" style={{ fontSize: '0.82rem' }}>
                        {o.transactionId}
                      </div>
                      <div className="text-muted small d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <Calendar size={11} /> {formatDate(o.saleDate)}
                      </div>
                    </td>

                    {/* Khách hàng & SĐT */}
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        {o.crmCustomerId ? (
                          <span
                            role="button"
                            className="fw-bold text-dark hover-primary text-truncate"
                            style={{ maxWidth: '160px', fontSize: '0.82rem' }}
                            title="Nhấn để xem Hồ Sơ Khách Hàng CRM 360°"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/khach-hang/${o.crmCustomerId}`);
                            }}
                          >
                            {o.customerName || 'Khách chưa đặt tên'}
                          </span>
                        ) : (
                          <span className="fw-bold text-dark text-truncate" style={{ maxWidth: '160px', fontSize: '0.82rem' }}>
                            {o.customerName || 'Khách vãng lai'}
                          </span>
                        )}
                        {o.crmCustomerId && (
                          <ExternalLink size={10} className="text-muted flex-shrink-0" />
                        )}
                      </div>

                      {/* SĐT + Nút gọi + Zalo */}
                      <div className="d-flex align-items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                        <span className="font-monospace text-secondary small" style={{ fontSize: '0.74rem' }}>
                          {o.customerPhone || '—'}
                        </span>
                        {cleanPhone && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm p-0 text-secondary hover-primary border-0"
                              onClick={(e) => handleCopy(e, o.customerPhone, `p-${o.id}`)}
                              title="Sao chép SĐT"
                            >
                              {copiedKey === `p-${o.id}` ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                            </button>
                            <a
                              href={`https://zalo.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="badge bg-primary bg-opacity-10 text-primary border border-primary-subtle text-decoration-none py-0.5 px-1 d-inline-flex align-items-center gap-0.5"
                              style={{ fontSize: '0.65rem' }}
                              title="Chat Zalo với khách"
                            >
                              <span>Zalo</span>
                            </a>
                            <a
                              href={`tel:${cleanPhone}`}
                              className="badge bg-success bg-opacity-10 text-success border border-success-subtle text-decoration-none py-0.5 px-1 d-inline-flex align-items-center gap-0.5"
                              style={{ fontSize: '0.65rem' }}
                              title="Gọi điện trực tiếp"
                            >
                              <Phone size={9} />
                              <span>Gọi</span>
                            </a>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Thiết bị & Cấu hình */}
                    <td>
                      <div className="d-flex align-items-center gap-1.5 flex-wrap">
                        <span className="fw-bold text-dark" style={{ fontSize: '0.82rem' }}>
                          {o.productName || 'Thiết bị Laptop'}
                        </span>
                        {o.brand && (
                          <span className="badge bg-light text-secondary border px-1.5 py-0.5" style={{ fontSize: '0.65rem' }}>
                            {o.brand}
                          </span>
                        )}
                      </div>

                      {/* Serial */}
                      {o.serialKeys && (
                        <div className="d-flex align-items-center gap-1 mt-0.5">
                          <span className="badge bg-light text-dark font-monospace border py-0 px-1.5 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.68rem' }}>
                            <span>Serial: {o.serialKeys}</span>
                            <button
                              type="button"
                              className="btn btn-sm p-0 border-0 text-secondary hover-primary"
                              onClick={(e) => handleCopy(e, o.serialKeys, `s-${o.id}`)}
                              title="Sao chép Serial"
                            >
                              {copiedKey === `s-${o.id}` ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                            </button>
                          </span>
                        </div>
                      )}

                      {/* Tóm tắt cấu hình */}
                      {o.configSummary && (
                        <div className="small text-secondary mt-0.5 text-truncate" style={{ maxWidth: '320px', fontSize: '0.73rem' }} title={o.configSummary}>
                          {o.configSummary}
                        </div>
                      )}
                    </td>

                    {/* Hạn bảo hành & Quá hạn */}
                    <td className="text-center text-nowrap">
                      <div className="d-flex flex-column align-items-center gap-0.5">
                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle py-0.5 px-2 d-inline-flex align-items-center gap-1 fw-semibold" style={{ fontSize: '0.72rem' }}>
                          <ShieldAlert size={12} className="text-danger" />
                          <span>Đã hết hạn BH</span>
                        </span>
                        <div className="small text-danger fw-bold" style={{ fontSize: '0.72rem' }}>
                          Quá hạn {days} ngày
                        </div>
                        <div className="text-muted small" style={{ fontSize: '0.68rem' }}>
                          Hạn chót: {formatDate(o.warrantyExpiry)}
                        </div>
                      </div>
                    </td>

                    {/* Doanh thu */}
                    <td className="text-end text-nowrap">
                      <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.85rem' }}>
                        {dinhDangTien(o.netRevenue || 0)} đ
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="d-inline-flex align-items-center gap-1">
                        
                        {/* Nút Tin nhắn mẫu hậu mãi */}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning text-dark p-1.5 rounded-3 shadow-2xs"
                          title="Gửi tin nhắn mời bảo dưỡng / tri ân hậu mãi"
                          onClick={() => setMessagingOrder(o)}
                        >
                          <Sparkles size={13} className="text-warning" />
                        </button>

                        {/* Nút Xem chi tiết hóa đơn */}
                        <button
                          type="button"
                          className="btn btn-sm btn-light border p-1.5 rounded-3 shadow-2xs hover-primary"
                          title="Xem chi tiết hóa đơn & in phiếu"
                          onClick={() => setSelectedOrder(o)}
                        >
                          <FileText size={13} />
                        </button>

                        {/* Nút Xem hồ sơ khách hàng */}
                        {o.crmCustomerId && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary p-1.5 rounded-3 shadow-2xs"
                            title="Mở hồ sơ khách hàng 360°"
                            onClick={() => navigate(`/khach-hang/${o.crmCustomerId}`)}
                          >
                            <User size={13} />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 5. Phân Trang (Pagination) */}
        {totalPages > 1 && (
          <div className="card-footer bg-white border-top p-2.5 px-3.5 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="small text-secondary">
              Trang <strong>{page + 1}</strong> / <strong>{totalPages}</strong> (Tổng {totalElements} kết quả)
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="btn btn-sm btn-white border px-2 py-1 rounded-2 shadow-2xs"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={14} />
              </button>

              {/* Các nút trang số */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pNum = page - 2 + i;
                if (pNum < 0) pNum = i;
                if (pNum >= totalPages) return null;

                return (
                  <button
                    key={pNum}
                    type="button"
                    className={`btn btn-sm rounded-2 px-2.5 py-1 ${
                      page === pNum ? 'btn-primary shadow-2xs fw-bold' : 'btn-white border text-secondary'
                    }`}
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => setPage(pNum)}
                  >
                    {pNum + 1}
                  </button>
                );
              })}

              <button
                type="button"
                className="btn btn-sm btn-white border px-2 py-1 rounded-2 shadow-2xs"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                <ChevronRight size={14} />
              </button>

              <select
                className="form-select form-select-sm ms-2"
                style={{ width: '80px', fontSize: '0.78rem' }}
                value={size}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setPage(0);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}

      </div>

      {/* 6. Modal Chi Tiết Hóa Đơn */}
      {selectedOrder && (
        <ModalChiTietHoaDonCRM
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* 7. Modal Mẫu Tin Nhắn Chăm Sóc Hậu Mãi */}
      {messagingOrder && (
        <ModalTinNhanHauMai
          order={messagingOrder}
          onClose={() => setMessagingOrder(null)}
        />
      )}

    </div>
  );
}

/**
 * Modal Kịch Bản Tin Nhắn Hậu Mãi Riêng Cho Thiết Bị Hết Hạn Bảo Hành
 */
function ModalTinNhanHauMai({ order, onClose }) {
  const [copiedIdx, setCopiedIdx] = useState(null);
  const customerName = order.customerName || 'Quý khách';
  const modelName = order.productName || 'Laptop';
  const expiryDate = order.warrantyExpiry ? formatDate(order.warrantyExpiry) : '';
  const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');

  const templates = [
    {
      id: 'maintenance_free',
      title: '1. Mời ghé shop bảo dưỡng, tra keo tản nhiệt máy định kỳ',
      badge: 'Vệ sinh máy',
      badgeClass: 'bg-primary text-white',
      content: `Dạ chào anh/chị ${customerName}, QKShop xin phép gửi thông báo chăm sóc máy:\nChiếc ${modelName} của anh/chị hiện đã qua thời gian sử dụng và hết hạn bảo hành gốc từ ngày ${expiryDate}.\nĐể máy luôn hoạt động mát mẻ, êm ái và kéo dài tuổi thọ linh kiện, QKShop trân trọng mời anh/chị mang máy ghé cửa hàng để bên em hỗ trợ vệ sinh quạt gió, tra keo tản nhiệt MX4 chất lượng cao hoàn toàn miễn phí nhé ạ!\nHotline/Zalo hỗ trợ: 0939.558.894 - QKShop hân hạnh đón tiếp anh/chị.`,
    },
    {
      id: 'upgrade_offer',
      title: '2. Ưu đãi trợ giá nâng cấp SSD / RAM tăng tốc máy',
      badge: 'Ưu đãi nâng cấp',
      badgeClass: 'bg-warning text-dark',
      content: `Dạ chào anh/chị ${customerName}, chiếc ${modelName} của anh/chị sử dụng thời gian qua vẫn mượt mà chứ ạ?\nNhân dịp máy đã hoàn thành chu kỳ bảo hành, QKShop xin gửi tặng anh/chị Voucher GIẢM 15% khi nâng cấp ổ cứng SSD tốc độ cao hoặc nâng dung lượng RAM để máy chạy mượt hơn cho công việc.\nAnh/chị cần tư vấn nâng cấp hoặc kiểm tra cấu hình cứ nhắn lại em hỗ trợ ngay nhé!`,
    },
    {
      id: 'trade_in',
      title: '3. Chương trình Thu cũ đổi mới (Trade-in trợ giá lên đời)',
      badge: 'Thu cũ đổi mới',
      badgeClass: 'bg-success text-white',
      content: `Dạ chào anh/chị ${customerName}, QKShop đang có chương trình "Thu cũ đổi mới - Trợ giá lên đời máy cấu hình cao" dành riêng cho khách hàng thân thiết.\nNếu anh/chị có nhu cầu đổi chiếc ${modelName} lên dòng máy mới mỏng nhẹ hoặc cấu hình mạnh hơn, QKShop hỗ trợ thu lại máy cũ với giá tốt nhất thị trường và tặng thêm 500.000đ khi lên đời máy mới.\nAnh/chị ghé shop để trải nghiệm trực tiếp nhiều mẫu máy mới nhé ạ!`,
    },
  ];

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div className="modal-header bg-light border-bottom p-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-warning bg-opacity-20 text-warning-emphasis p-2 rounded-circle">
                <Sparkles size={18} />
              </div>
              <div>
                <h6 className="modal-title fw-bold text-dark mb-0">Mẫu Tin Nhắn Chăm Sóc Khách Máy Hết Hạn Bảo Hành</h6>
                <small className="text-secondary">Gửi cho: <strong>{customerName}</strong> ({order.customerPhone}) - {modelName}</small>
              </div>
            </div>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body p-3.5 px-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="d-flex flex-column gap-3">
              {templates.map((tpl, idx) => (
                <div key={tpl.id} className="card border rounded-3 p-3 shadow-2xs bg-white">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${tpl.badgeClass} rounded-pill px-2 py-0.5`} style={{ fontSize: '0.7rem' }}>
                        {tpl.badge}
                      </span>
                      <strong className="text-dark small">{tpl.title}</strong>
                    </div>

                    <div className="d-flex align-items-center gap-1.5">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-pill px-2.5 py-0.5 d-inline-flex align-items-center gap-1"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => handleCopy(tpl.content, idx)}
                      >
                        {copiedIdx === idx ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                        <span>{copiedIdx === idx ? 'Đã sao chép' : 'Sao chép'}</span>
                      </button>

                      {cleanPhone && (
                        <a
                          href={`https://zalo.me/${cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-primary rounded-pill px-2.5 py-0.5 d-inline-flex align-items-center gap-1"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => handleCopy(tpl.content, idx)}
                        >
                          <MessageSquare size={12} />
                          <span>Mở Zalo gửi ngay</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 bg-light rounded-2 font-monospace text-secondary small" style={{ fontSize: '0.76rem', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                    {tpl.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer bg-light border-top p-2.5 px-4">
            <button type="button" className="btn btn-secondary rounded-pill px-4 btn-sm" onClick={onClose}>
              Đóng
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

