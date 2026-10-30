import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, RefreshCw, Settings, Plus, Menu, Bell, CheckCircle2,
  AlertTriangle, ArrowRight, Trash2, Check, CheckCheck, Info,
  AlertCircle, Package, Clock, ExternalLink, X,
  User, KeyRound, Shield, LogOut, Sliders
} from 'lucide-react';
import { useAuth } from '../../contexts/NguCanhXacThuc';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { syncApi, notificationApi } from '../../api';
import ModalCaiDatCaNhan from './ModalCaiDatCaNhan';

export default function PhanDau({ collapsed, sidebarWidth, marginGap = '0px', isMobile, onOpenMenu }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [time] = useState(() => {
    const now = new Date();
    return `Cập nhật ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const [syncStatus, setSyncStatus] = useState(null);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);
  const notiRef = useRef(null);

  // State Cài đặt cá nhân & Dropdown người dùng
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [personalModalTab, setPersonalModalTab] = useState('profile');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef(null);


  // Danh sách thông báo & trạng thái thời gian thực
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [isLoadingNoti, setIsLoadingNoti] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Tải thông tin đồng bộ Google Sheet
  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await syncApi.getLatestStatus();
      if (res?.data) {
        setSyncStatus(res.data);
      }
    } catch {
      // Bỏ qua lỗi polling ngầm
    }
  }, []);

  // Tải danh sách thông báo
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoadingNoti(true);
      const res = await notificationApi.getAll();
      if (res?.data) {
        setNotifications(res.data);
        const unread = res.data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch {
      // Im lặng khi polling
    } finally {
      setIsLoadingNoti(false);
    }
  }, []);

  // Tải số lượng chưa đọc
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      if (res?.data?.unreadCount !== undefined) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // Im lặng
    }
  }, []);

  // Thiết lập SSE (Server-Sent Events) kết nối thời gian thực
  useEffect(() => {
    fetchSyncStatus();
    fetchNotifications();

    const token = localStorage.getItem('token');
    const sseUrl = `/api/notifications/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    let eventSource;

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('NOTIFICATION', (event) => {
        try {
          const newNoti = JSON.parse(event.data);
          setNotifications(prev => [newNoti, ...prev.filter(n => n.id !== newNoti.id)]);
          setUnreadCount(prev => prev + 1);

          // Cập nhật trạng thái đồng bộ nếu có
          fetchSyncStatus();

          // Báo Toast nổi góc trên
          showToast(`🔔 ${newNoti.title}: ${newNoti.message}`,
            newNoti.type === 'SYNC_ERROR' ? 'danger' : (newNoti.type === 'SYNC_SUCCESS' ? 'success' : 'primary')
          );
        } catch (e) {
          console.error('Lỗi nhận thông báo SSE:', e);
        }
      });

      eventSource.onerror = () => {
        // Trình duyệt tự động kết nối lại SSE khi lỗi
      };
    } catch (err) {
      console.warn('Không thể khởi tạo EventSource:', err);
    }

    // Polling định kỳ kiểm tra thông báo và đồng bộ mỗi 45 giây (dự phòng)
    const interval = setInterval(() => {
      fetchSyncStatus();
      fetchUnreadCount();
    }, 45000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [fetchSyncStatus, fetchNotifications, fetchUnreadCount, showToast]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notiRef.current && !notiRef.current.contains(e.target)) {
        setShowNotiDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // Khi mở dropdown, load lại dữ liệu mới nhất
  const handleToggleDropdown = () => {
    const nextState = !showNotiDropdown;
    setShowNotiDropdown(nextState);
    if (nextState) {
      fetchNotifications();
      fetchSyncStatus();
    }
  };

  // Đánh dấu 1 thông báo là đã đọc
  const handleMarkAsRead = async (noti, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markAsRead(noti.id);
      setNotifications(prev =>
        prev.map(item => item.id === noti.id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      showToast(err.userMessage || 'Không thể đánh dấu đã đọc', 'danger');
    }
  };

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllAsRead = async (e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(item => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
    } catch (err) {
      showToast(err.userMessage || 'Thao tác thất bại', 'danger');
    }
  };

  // Xóa 1 thông báo (chỉ cho phép xóa khi đã đọc)
  const handleDeleteNotification = async (noti, e) => {
    if (e) e.stopPropagation();

    // Kiểm tra quy tắc: "nếu các thông báo nào chưa đọc thì đc đánh dấu, nếu đọc rồi thì có xóa đc"
    if (!noti.isRead) {
      showToast('Chỉ có thể xóa thông báo đã đọc. Vui lòng đọc hoặc đánh dấu đã đọc trước khi xóa.', 'warning');
      return;
    }

    try {
      setDeletingId(noti.id);
      await notificationApi.delete(noti.id);
      setNotifications(prev => prev.filter(item => item.id !== noti.id));
      showToast('Đã xóa thông báo thành công', 'success');
    } catch (err) {
      showToast(err.userMessage || 'Không thể xóa thông báo', 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  // Xóa tất cả thông báo đã đọc
  const handleDeleteAllRead = async (e) => {
    if (e) e.stopPropagation();
    const hasRead = notifications.some(n => n.isRead);
    if (!hasRead) {
      showToast('Chưa có thông báo nào đã đọc để xóa', 'info');
      return;
    }

    try {
      const res = await notificationApi.deleteAllRead();
      setNotifications(prev => prev.filter(item => !item.isRead));
      const deletedCount = res?.data?.deletedCount || 0;
      showToast(`Đã dọn sạch ${deletedCount} thông báo đã đọc`, 'success');
    } catch (err) {
      showToast(err.userMessage || 'Không thể dọn thông báo đã đọc', 'danger');
    }
  };

  // Click vào thông báo: Đánh dấu đã đọc + điều hướng nếu có link
  const handleNotificationClick = (noti) => {
    if (!noti.isRead) {
      handleMarkAsRead(noti);
    }
    if (noti.link) {
      setShowNotiDropdown(false);
      navigate(noti.link);
    }
  };

  // Nút đồng bộ nhanh Google Sheet
  const handleQuickSync = async () => {
    setIsQuickSyncing(true);
    try {
      const res = await syncApi.run('MANUAL');
      const run = res?.data;
      if (run?.runStatus === 'FAILED') {
        showToast(`Đồng bộ thất bại: ${run.errorMessage || 'Không rõ lỗi'}`, 'danger');
      } else if (run) {
        if (run.rowsProcessed > 0 && run.rowsError === 0) {
          showToast(`🎉 Đồng bộ thành công: Đã xuất kho ${run.rowsProcessed} máy!`, 'success');
        } else if (run.rowsError > 0) {
          showToast(`⚠️ Đồng bộ xong: Đã xuất kho ${run.rowsProcessed} máy, nhưng có ${run.rowsError} lỗi!`, 'warning');
        } else {
          showToast(`ℹ️ Đồng bộ hoàn tất: Kho đã khớp với Google Sheet.`, 'info');
        }
      }
      fetchSyncStatus();
      fetchNotifications();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi đồng bộ', 'danger');
    } finally {
      setIsQuickSyncing(false);
    }
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const formatRunTime = (dtStr) => {
    if (!dtStr) return 'Chưa rõ';
    try {
      const d = new Date(dtStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}`;
    } catch {
      return dtStr;
    }
  };

  const formatTimeAgo = (dtStr) => {
    if (!dtStr) return '';
    try {
      const d = new Date(dtStr);
      const diffMs = Date.now() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffMin < 1) return 'Vừa xong';
      if (diffMin < 60) return `${diffMin} phút trước`;
      if (diffHour < 24) return `${diffHour} giờ trước`;
      if (diffDay === 1) return 'Hôm qua';
      return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dtStr;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'SYNC_SUCCESS':
        return <CheckCircle2 size={16} className="text-success flex-shrink-0 mt-0.5" />;
      case 'SYNC_ERROR':
        return <AlertTriangle size={16} className="text-danger flex-shrink-0 mt-0.5" />;
      case 'ISSUE_ALERT':
        return <AlertCircle size={16} className="text-warning flex-shrink-0 mt-0.5" />;
      case 'INVENTORY':
        return <Package size={16} className="text-primary flex-shrink-0 mt-0.5" />;
      default:
        return <Info size={16} className="text-info flex-shrink-0 mt-0.5" />;
    }
  };

  const openIssues = syncStatus?.openIssuesCount || 0;
  const latestRun = syncStatus?.latestRun;

  // Lọc thông báo hiển thị theo tab
  const filteredNotifications = notifications.filter(noti => {
    if (activeFilter === 'UNREAD') return !noti.isRead;
    return true;
  });

  const hasReadNotifications = notifications.some(n => n.isRead);

  return (
    <header className="position-fixed top-0 end-0 bg-white border-bottom d-flex align-items-center justify-content-between px-3 px-md-4 z-2"
      style={{ left: isMobile ? '0px' : `calc(${sidebarWidth} + ${marginGap})`, height: '64px', transition: 'left 0.3s ease' }}
    >
      <div className="d-flex align-items-center flex-grow-1 gap-2 gap-md-3">
        {isMobile && (
          <button className="btn btn-light d-md-none p-1 border-0" onClick={onOpenMenu}>
            <Menu size={24} />
          </button>
        )}
      </div>

      <div className="d-flex align-items-center gap-3 position-relative">
        {/* Status Badge */}
        <div className="badge bg-primary bg-opacity-10 text-primary border border-primary rounded-pill d-flex align-items-center gap-2 py-1 px-3">
          <span className="bg-primary rounded-circle" style={{ width: '6px', height: '6px' }}></span>
          DỮ LIỆU CHÍNH THỨC
        </div>

        {/* Timestamp */}
        <span className="text-secondary small">{time}</span>

        {/* Refresh Button */}
        <button className="btn btn-light btn-sm d-flex align-items-center gap-1 border d-none d-sm-flex" onClick={() => {
          fetchSyncStatus();
          fetchNotifications();
          showToast('Đang làm mới dữ liệu hệ thống...', 'info');
        }}>
          <Plus size={14} />
          Làm mới
        </button>

        {/* Notification Bell (Hệ thống thông báo thời gian thực) */}
        <div className="position-relative" ref={notiRef}>
          <button
            className={`btn btn-light btn-sm p-1 border position-relative d-flex align-items-center justify-content-center transition-all ${showNotiDropdown ? 'active bg-light border-primary shadow-sm' : ''}`}
            style={{ width: '38px', height: '38px', borderRadius: '10px' }}
            onClick={handleToggleDropdown}
            title="Trung tâm thông báo hệ thống & đồng bộ thời gian thực"
          >
            <Bell size={19} className={unreadCount > 0 ? 'text-primary' : 'text-secondary'} />
            {unreadCount > 0 ? (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white shadow-sm" style={{ fontSize: '0.65rem' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : syncStatus?.enabled ? (
              <span className="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-white rounded-circle"></span>
            ) : null}
          </button>

          {/* Dropdown Card Thông Báo Thời Gian Thực */}
          {showNotiDropdown && (
            <div className="card shadow-lg border-0 position-absolute end-0 mt-2 rounded-3 text-start"
              style={{
                width: 'min(410px, 94vw)',
                zIndex: 1060,
                top: '100%',
                boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                overflow: 'hidden'
              }}
            >
              {/* Card Header */}
              <div className="card-header bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <span className="position-relative d-flex">
                    <Bell size={16} className="text-primary" />
                    {unreadCount > 0 && (
                      <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger rounded-circle"></span>
                    )}
                  </span>
                  <span className="fw-bold small text-dark">Thông báo</span>
                  {unreadCount > 0 ? (
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill py-0 px-2" style={{ fontSize: '0.68rem' }}>
                      {unreadCount} chưa đọc
                    </span>
                  ) : (
                    <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill py-0 px-2" style={{ fontSize: '0.68rem' }}>
                      Đã đọc hết
                    </span>
                  )}
                </div>

                <div className="d-flex align-items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      className="btn btn-sm btn-link text-decoration-none text-primary p-0 d-flex align-items-center gap-1"
                      style={{ fontSize: '0.72rem' }}
                      onClick={handleMarkAllAsRead}
                      title="Đánh dấu tất cả thông báo là đã đọc"
                    >
                      <CheckCheck size={14} /> Đọc tất cả
                    </button>
                  )}
                  {hasReadNotifications && (
                    <button
                      className="btn btn-sm btn-link text-decoration-none text-danger p-0 d-flex align-items-center gap-1 ms-2"
                      style={{ fontSize: '0.72rem' }}
                      onClick={handleDeleteAllRead}
                      title="Xóa tất cả các thông báo đã đọc"
                    >
                      <Trash2 size={13} /> Xóa đã đọc
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="d-flex border-bottom bg-light px-3 py-1 gap-2" style={{ fontSize: '0.75rem' }}>
                <button
                  className={`btn btn-sm py-1 px-2.5 border-0 rounded-pill ${activeFilter === 'ALL' ? 'bg-white text-primary fw-bold shadow-sm' : 'text-secondary'}`}
                  onClick={() => setActiveFilter('ALL')}
                >
                  Tất cả ({notifications.length})
                </button>
                <button
                  className={`btn btn-sm py-1 px-2.5 border-0 rounded-pill ${activeFilter === 'UNREAD' ? 'bg-white text-danger fw-bold shadow-sm' : 'text-secondary'}`}
                  onClick={() => setActiveFilter('UNREAD')}
                >
                  Chưa đọc ({unreadCount})
                </button>
              </div>

              {/* Notification List Body */}
              <div
                className="card-body p-0"
                style={{
                  maxHeight: '320px',
                  overflowY: 'auto',
                  scrollbarWidth: 'thin'
                }}
              >
                {isLoadingNoti ? (
                  <div className="text-center py-4 text-muted small">
                    <RefreshCw size={18} className="spinner-border spinner-border-sm text-primary mb-1" />
                    <div>Đang cập nhật thông báo...</div>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-4 text-muted small">
                    <Bell size={28} className="text-secondary opacity-50 mb-2" />
                    <div>{activeFilter === 'UNREAD' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}</div>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {filteredNotifications.map((noti) => {
                      const isUnread = !noti.isRead;
                      return (
                        <div
                          key={noti.id}
                          className={`list-group-item list-group-item-action p-2.5 d-flex gap-2.5 align-items-start border-bottom position-relative transition-colors ${
                            isUnread
                              ? 'bg-primary bg-opacity-10 border-start border-3 border-primary'
                              : 'bg-white'
                          }`}
                          style={{ cursor: noti.link ? 'pointer' : 'default' }}
                          onClick={() => handleNotificationClick(noti)}
                        >
                          {/* Type Icon */}
                          <div className="pt-0.5">
                            {getNotificationIcon(noti.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-grow-1 min-w-0" style={{ lineHeight: '1.3' }}>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className={`small text-truncate pe-1 ${isUnread ? 'fw-bold text-dark' : 'text-secondary'}`}>
                                {noti.title}
                              </span>
                              <span className="text-muted text-nowrap" style={{ fontSize: '0.68rem' }}>
                                {formatTimeAgo(noti.createdAt)}
                              </span>
                            </div>

                            <div className="text-secondary small mb-1" style={{ fontSize: '0.78rem', wordBreak: 'break-word' }}>
                              {noti.message}
                            </div>

                            <div className="d-flex align-items-center justify-content-between pt-1">
                              <div>
                                {isUnread ? (
                                  <span className="badge bg-primary text-white rounded-pill px-2 py-0.5" style={{ fontSize: '0.65rem' }}>
                                    Chưa đọc
                                  </span>
                                ) : (
                                  <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                                    Đã đọc
                                  </span>
                                )}
                                {noti.link && (
                                  <span className="text-primary small ms-2 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                    Xem chi tiết <ExternalLink size={10} />
                                  </span>
                                )}
                              </div>

                              {/* Thao tác: Đánh dấu đã đọc HOẶC Xóa khi đã đọc */}
                              <div className="d-flex align-items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                {isUnread ? (
                                  /* Nút đánh dấu đã đọc */
                                  <button
                                    className="btn btn-outline-primary btn-sm py-0 px-1.5 rounded-pill d-flex align-items-center gap-1"
                                    style={{ fontSize: '0.68rem' }}
                                    onClick={(e) => handleMarkAsRead(noti, e)}
                                    title="Đánh dấu thông báo này là đã đọc"
                                  >
                                    <Check size={12} /> Đã đọc
                                  </button>
                                ) : (
                                  /* Nút XÓA CHỈ HIỆN VÀ CHO PHÉP KHI ĐÃ ĐỌC (Quy tắc người dùng) */
                                  <button
                                    className="btn btn-outline-danger btn-sm py-0 px-1.5 border-0 text-danger rounded d-flex align-items-center gap-1"
                                    style={{ fontSize: '0.68rem' }}
                                    onClick={(e) => handleDeleteNotification(noti, e)}
                                    disabled={deletingId === noti.id}
                                    title="Xóa thông báo đã đọc này"
                                  >
                                    <Trash2 size={13} className={deletingId === noti.id ? 'spinner-border spinner-border-sm' : ''} />
                                    <span>Xóa</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card Footer: Trạng thái & Thao tác Đồng Bộ Google Sheet */}
              <div className="card-footer bg-light border-top p-2.5">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-1.5">
                    <span className="bg-primary rounded-circle" style={{ width: '6px', height: '6px' }}></span>
                    <span className="fw-semibold text-dark small" style={{ fontSize: '0.75rem' }}>Đồng bộ Google Sheet:</span>
                  </div>
                  <span className={`badge ${syncStatus?.enabled ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary'} small`} style={{ fontSize: '0.68rem' }}>
                    {syncStatus?.enabled ? `Tự động: Mỗi ${syncStatus.intervalMinutes}p` : 'Tự động: Tắt'}
                  </span>
                </div>

                {latestRun && (
                  <div className="d-flex justify-content-between align-items-center bg-white p-2 rounded border mb-2 small" style={{ fontSize: '0.74rem' }}>
                    <div className="d-flex align-items-center gap-1.5">
                      {latestRun.runStatus === 'COMPLETED' ? (
                        <CheckCircle2 size={14} className="text-success flex-shrink-0" />
                      ) : (
                        <AlertTriangle size={14} className="text-danger flex-shrink-0" />
                      )}
                      <span>
                        Xuất kho: <strong className="text-success">{latestRun.rowsProcessed} máy</strong>
                        {latestRun.rowsError > 0 && <span> • Lỗi: <strong className="text-danger">{latestRun.rowsError}</strong></span>}
                      </span>
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                      {formatRunTime(latestRun.finishedAt || latestRun.startedAt)}
                    </span>
                  </div>
                )}

                {openIssues > 0 && (
                  <div className="alert alert-warning py-1.5 px-2 small d-flex align-items-center gap-2 mb-2" style={{ fontSize: '0.74rem' }}>
                    <AlertTriangle size={14} className="text-warning flex-shrink-0" />
                    <div>
                      Có <strong className="text-danger">{openIssues} lỗi sai lệch / đơn hủy</strong> cần kiểm tra đối soát.
                    </div>
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-primary btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                    style={{ fontSize: '0.8rem' }}
                    onClick={handleQuickSync}
                    disabled={isQuickSyncing}
                  >
                    <RefreshCw size={13} className={isQuickSyncing ? 'spinner-border spinner-border-sm' : ''} />
                    {isQuickSyncing ? 'Đang chạy...' : 'Đồng bộ ngay'}
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => {
                      setShowNotiDropdown(false);
                      navigate('/doi-soat');
                    }}
                  >
                    Đối soát <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button 
          className="btn btn-light btn-sm p-1 d-none d-sm-flex align-items-center justify-content-center border" 
          onClick={() => {
            setPersonalModalTab('preferences');
            setShowPersonalModal(true);
          }} 
          title="Cài đặt & Tùy chọn trải nghiệm cá nhân"
          style={{ width: '38px', height: '38px', borderRadius: '10px' }}
        >
          <Settings size={18} className="text-secondary" />
        </button>

        {/* User Profile & Menu */}
        <div className="position-relative" ref={userDropdownRef}>
          <div 
            className="d-flex align-items-center gap-2.5 ps-3 border-start ms-1 user-select-none"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowUserDropdown(prev => !prev)}
            title="Nhấp để mở menu cá nhân"
          >
            <div className="text-end d-none d-sm-block" style={{ lineHeight: '1.2' }}>
              <div className="fw-bold small text-dark text-truncate" style={{ maxWidth: '140px' }}>
                {user?.fullName || user?.username || 'User'}
              </div>
              <div className="text-secondary" style={{ fontSize: '0.7rem' }}>
                {user?.role || 'Nhân viên'}
              </div>
            </div>
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm transition-all" 
              style={{ 
                width: '38px', height: '38px', 
                background: (() => {
                  const cId = user?.username ? localStorage.getItem(`user_avatar_color_${user.username}`) : 'grad-orange';
                  const map = {
                    'grad-orange': 'linear-gradient(135deg, #ef4444, #f97316)',
                    'grad-blue': 'linear-gradient(135deg, #0d6efd, #0dcaf0)',
                    'grad-purple': 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    'grad-green': 'linear-gradient(135deg, #10b981, #059669)',
                    'grad-dark': 'linear-gradient(135deg, #1e293b, #0f172a)'
                  };
                  return map[cId] || map['grad-orange'];
                })(),
                outline: showUserDropdown ? '2px solid #0d6efd' : 'none'
              }}
            >
              {initials}
            </div>
          </div>

          {/* User Dropdown Menu */}
          {showUserDropdown && (
            <div 
              className="card shadow-lg border-0 position-absolute end-0 mt-2 rounded-3 text-start overflow-hidden animate__animated animate__fadeIn"
              style={{ width: '270px', zIndex: 1060, top: '100%', boxShadow: '0 12px 35px rgba(0,0,0,0.18)' }}
            >
              <div className="bg-light p-3 border-bottom d-flex align-items-center gap-2.5">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm flex-shrink-0" 
                  style={{ 
                    width: '42px', height: '42px', 
                    background: (() => {
                      const cId = user?.username ? localStorage.getItem(`user_avatar_color_${user.username}`) : 'grad-orange';
                      const map = {
                        'grad-orange': 'linear-gradient(135deg, #ef4444, #f97316)',
                        'grad-blue': 'linear-gradient(135deg, #0d6efd, #0dcaf0)',
                        'grad-purple': 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        'grad-green': 'linear-gradient(135deg, #10b981, #059669)',
                        'grad-dark': 'linear-gradient(135deg, #1e293b, #0f172a)'
                      };
                      return map[cId] || map['grad-orange'];
                    })(),
                    fontSize: '1rem' 
                  }}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-grow-1">
                  <div className="fw-bold text-dark text-truncate small">
                    {user?.fullName || user?.username}
                  </div>
                  <div className="text-secondary small text-truncate" style={{ fontSize: '0.72rem' }}>
                    @{user?.username}
                  </div>
                  <span className="badge bg-primary-subtle text-primary border" style={{ fontSize: '0.65rem' }}>
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="list-group list-group-flush p-1.5">
                <button 
                  className="list-group-item list-group-item-action border-0 rounded-2 py-2 px-2.5 d-flex align-items-center gap-2.5 small"
                  onClick={() => {
                    setShowUserDropdown(false);
                    setPersonalModalTab('profile');
                    setShowPersonalModal(true);
                  }}
                >
                  <User size={16} className="text-primary" />
                  <span>Hồ sơ & Thông tin cá nhân</span>
                </button>

                <button 
                  className="list-group-item list-group-item-action border-0 rounded-2 py-2 px-2.5 d-flex align-items-center gap-2.5 small"
                  onClick={() => {
                    setShowUserDropdown(false);
                    setPersonalModalTab('password');
                    setShowPersonalModal(true);
                  }}
                >
                  <KeyRound size={16} className="text-warning" />
                  <span>Đổi mật khẩu</span>
                </button>

                <button 
                  className="list-group-item list-group-item-action border-0 rounded-2 py-2 px-2.5 d-flex align-items-center gap-2.5 small"
                  onClick={() => {
                    setShowUserDropdown(false);
                    setPersonalModalTab('permissions');
                    setShowPersonalModal(true);
                  }}
                >
                  <Shield size={16} className="text-success" />
                  <span>Quyền hạn của tôi</span>
                </button>

                <button 
                  className="list-group-item list-group-item-action border-0 rounded-2 py-2 px-2.5 d-flex align-items-center gap-2.5 small"
                  onClick={() => {
                    setShowUserDropdown(false);
                    setPersonalModalTab('preferences');
                    setShowPersonalModal(true);
                  }}
                >
                  <Sliders size={16} className="text-info" />
                  <span>Tùy chọn trải nghiệm</span>
                </button>

                <hr className="my-1 border-secondary opacity-15" />

                <button 
                  className="list-group-item list-group-item-action border-0 rounded-2 py-2 px-2.5 d-flex align-items-center gap-2.5 small text-danger"
                  onClick={() => {
                    setShowUserDropdown(false);
                    logout();
                    navigate('/login');
                  }}
                >
                  <LogOut size={16} />
                  <span className="fw-semibold">Đăng xuất tài khoản</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Cài đặt cá nhân */}
      <ModalCaiDatCaNhan 
        show={showPersonalModal}
        onClose={() => setShowPersonalModal(false)}
        initialTab={personalModalTab}
      />
    </header>
  );
}

