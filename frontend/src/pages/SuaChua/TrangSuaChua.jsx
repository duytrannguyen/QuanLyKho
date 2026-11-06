import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Wrench, Plus, Search, CheckCircle, RotateCcw, User, Phone, 
  Laptop, Calendar, Trash2, Printer, ShieldCheck, Edit3, X, 
  History, Clock, AlertCircle, Eye, ChevronRight, Cpu
} from 'lucide-react';
import { useToast } from '../../contexts/notification/NguCanhThongBao';
import { apiSuaChua, apiLinhKien } from '../../api';
import { formatCurrency, parseCurrency, formatDate, getTodayDateString } from '../../utils/dinh_dang';

export default function TrangSuaChua() {
  const { showToast, confirm } = useToast();
  const location = useLocation();

  // Danh sách đơn sửa chữa
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Editing State (null = tạo mới, có id = đang sửa hóa đơn cũ)
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingOrderCode, setEditingOrderCode] = useState('');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [intakeCondition, setIntakeCondition] = useState('');
  const [accessoriesReceived, setAccessoriesReceived] = useState('');
  const [promisedDate, setPromisedDate] = useState('');
  const [orderStatus, setOrderStatus] = useState('RECEIVED');
  const [technicianName, setTechnicianName] = useState('');
  const [createdDate, setCreatedDate] = useState(() => getTodayDateString());
  const [note, setNote] = useState('');
  const [activeFilterStatus, setActiveFilterStatus] = useState('ALL');

  // Danh sách dịch vụ nhập tay
  const [services, setServices] = useState([
    { serviceName: '', sku: '', price: '', quantity: 1, warrantyValue: 1, warrantyUnit: 'THANG', warrantyMonths: 1, warrantyPeriod: '1 Tháng', note: '' }
  ]);

  // State kho linh kiện
  const [availableParts, setAvailableParts] = useState([]);
  const [showPartPickerModal, setShowPartPickerModal] = useState(false);
  const [partSearchTerm, setPartSearchTerm] = useState('');

  const [completedOrder, setCompletedOrder] = useState(null);

  // Modal xem chi tiết hóa đơn (khi click vào thẻ đơn hàng bên cột phải)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  useEffect(() => {
    fetchOrders();
    fetchAvailableParts();
    if (location.state?.editOrder) {
      handleEditOrder(location.state.editOrder);
    }
    const params = new URLSearchParams(location.search);
    const prefillSerial = params.get('prefillSerial') || params.get('serial');
    const prefillCustomer = params.get('prefillCustomer') || params.get('customer');
    const prefillPhone = params.get('prefillPhone') || params.get('phone');
    const prefillModel = params.get('prefillModel') || params.get('device');
    if (prefillSerial) setDeviceSerial(prefillSerial);
    if (prefillCustomer) setCustomerName(prefillCustomer);
    if (prefillPhone) setCustomerPhone(prefillPhone);
    if (prefillModel) setDeviceModel(prefillModel);
  }, [location.state, location.search]);

  const fetchAvailableParts = async () => {
    try {
      const res = await apiLinhKien.getAvailable();
      setAvailableParts(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách linh kiện kho:', err);
    }
  };

  const fetchOrders = async (keyword = '') => {
    setIsLoading(true);
    try {
      const res = await apiSuaChua.getOrders(keyword ? { keyword } : {});
      setOrders(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách đơn sửa chữa:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddServiceRow = () => {
    setServices([...services, { serviceName: '', sku: '', price: '', quantity: 1, warrantyValue: 1, warrantyUnit: 'THANG', warrantyMonths: 1, warrantyPeriod: '1 Tháng', note: '' }]);
  };

  const handlePickPart = (part) => {
    const newRow = {
      serviceName: part.name,
      sku: part.sku,
      price: part.retailPrice || 0,
      quantity: 1,
      warrantyValue: part.warrantyMonths || 1,
      warrantyUnit: 'THANG',
      warrantyMonths: part.warrantyMonths || 1,
      warrantyPeriod: part.warrantyPeriod || (part.warrantyMonths > 0 ? `${part.warrantyMonths} Tháng` : 'Không BH'),
      partStock: part.quantity,
      note: ''
    };

    // Nếu dòng đầu tiên đang trống thì ghi đè, ngược lại thêm vào
    if (services.length === 1 && !services[0].serviceName.trim() && !services[0].price) {
      setServices([newRow]);
    } else {
      setServices([...services, newRow]);
    }
    setShowPartPickerModal(false);
    showToast(`Đã thêm linh kiện: ${part.name}`, 'success');
  };

  const handleRemoveServiceRow = (index) => {
    if (services.length <= 1) {
      setServices([{ serviceName: '', price: '', quantity: 1, warrantyValue: 1, warrantyUnit: 'THANG', warrantyMonths: 1, warrantyPeriod: '1 Tháng', note: '' }]);
      return;
    }
    setServices(services.filter((_, i) => i !== index));
  };

  const handleUpdateServiceField = (index, field, value) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const resetForm = () => {
    setEditingOrderId(null);
    setEditingOrderCode('');
    setCustomerName('');
    setCustomerPhone('');
    setDeviceModel('');
    setDeviceSerial('');
    setIntakeCondition('');
    setAccessoriesReceived('');
    setPromisedDate('');
    setOrderStatus('RECEIVED');
    setTechnicianName('');
    setCreatedDate(getTodayDateString());
    setNote('');
    setServices([{ serviceName: '', price: '', quantity: 1, warrantyValue: 1, warrantyUnit: 'THANG', warrantyMonths: 1, warrantyPeriod: '1 Tháng', note: '' }]);
  };

  // Nạp dữ liệu hóa đơn cũ vào form để cập nhật lại
  const handleEditOrder = (order) => {
    setEditingOrderId(order.id);
    setEditingOrderCode(order.orderCode);
    setCustomerName(order.customerName || '');
    setCustomerPhone(order.customerPhone || '');
    setDeviceModel(order.deviceModel || '');
    setDeviceSerial(order.deviceSerial || '');
    setIntakeCondition(order.intakeCondition || '');
    setAccessoriesReceived(order.accessoriesReceived || '');
    setPromisedDate(order.promisedDate ? String(order.promisedDate).slice(0, 10) : '');
    setOrderStatus(order.status || 'RECEIVED');
    setTechnicianName(order.technicianName || '');
    setNote(order.note || '');
    
    if (order.createdDate) {
      setCreatedDate(order.createdDate.slice(0, 10));
    }

    if (order.items && order.items.length > 0) {
      setServices(order.items.map(it => {
        let val = it.warrantyMonths !== undefined ? it.warrantyMonths : 0;
        let unit = 'THANG';
        let period = it.warrantyPeriod || (val > 0 ? `${val} Tháng` : 'Không BH');

        if (it.warrantyPeriod) {
          const cleanP = it.warrantyPeriod.toLowerCase();
          const matchNum = cleanP.match(/(\d+)/);
          if (matchNum) {
            val = parseInt(matchNum[1], 10);
            if (cleanP.includes('ngày') || cleanP.includes('ngay') || cleanP.includes('day')) {
              unit = 'NGAY';
            } else if (cleanP.includes('năm') || cleanP.includes('nam') || cleanP.includes('year')) {
              unit = 'NAM';
            } else {
              unit = 'THANG';
            }
          }
        }

        return {
          serviceName: it.serviceName || '',
          sku: it.sku || '',
          price: it.price || 0,
          quantity: it.quantity || 1,
          warrantyValue: val,
          warrantyUnit: unit,
          warrantyMonths: it.warrantyMonths || 0,
          warrantyPeriod: period,
          warrantyExpiry: it.warrantyExpiry ? String(it.warrantyExpiry).slice(0, 10) : '',
          note: it.note || ''
        };
      }));
    } else {
      setServices([{ serviceName: '', price: '', quantity: 1, warrantyValue: 1, warrantyUnit: 'THANG', warrantyMonths: 1, warrantyPeriod: '1 Tháng', note: '' }]);
    }


    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Đang chỉnh sửa hóa đơn ${order.orderCode}`, 'info');
  };

  // Xem chi tiết hóa đơn qua modal
  const handleViewDetailById = async (orderId) => {
    if (!orderId) return;
    try {
      const res = await apiSuaChua.getOrderById(orderId);
      setSelectedOrderDetail(res.data?.data || res.data);
    } catch (err) {
      showToast('Lỗi xem chi tiết hóa đơn', 'danger');
    }
  };

  const handleSaveOrder = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast('Vui lòng nhập Tên khách hàng và Số điện thoại', 'danger');
      return;
    }

    if (!deviceModel.trim()) {
      showToast('Vui lòng nhập Tên máy (Ví dụ: Dell XPS 9500, Asus TUF...)', 'danger');
      return;
    }

    const validServices = services.filter(s => s.serviceName.trim().length > 0);
    if (validServices.length === 0) {
      showToast('Vui lòng nhập ít nhất 1 dịch vụ hoặc linh kiện sửa chữa', 'danger');
      return;
    }

    const confirmActionText = editingOrderId ? `cập nhật hóa đơn ${editingOrderCode}` : `lưu đơn dịch vụ sửa chữa máy ${deviceModel}`;
    const isConfirmed = await confirm(`Xác nhận ${confirmActionText} cho khách ${customerName}?`);
    if (!isConfirmed) return;

    setIsLoading(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deviceModel: deviceModel.trim(),
        deviceSerial: deviceSerial ? deviceSerial.trim() : null,
        intakeCondition: intakeCondition ? intakeCondition.trim() : null,
        accessoriesReceived: accessoriesReceived ? accessoriesReceived.trim() : null,
        promisedDate: promisedDate || null,
        status: orderStatus || 'RECEIVED',
        technicianName: technicianName.trim(),
        createdDate,
        note: note.trim(),
        services: validServices.map(s => {
          const val = parseInt(s.warrantyValue !== undefined ? s.warrantyValue : s.warrantyMonths, 10) || 0;
          const unit = s.warrantyUnit || 'THANG';
          let calculatedMonths = val;
          let periodText = 'Không BH';
          if (val > 0) {
            if (unit === 'NAM') {
              calculatedMonths = val * 12;
              periodText = `${val} Năm`;
            } else if (unit === 'NGAY') {
              calculatedMonths = Math.ceil(val / 30);
              periodText = `${val} Ngày`;
            } else {
              calculatedMonths = val;
              periodText = `${val} Tháng`;
            }
          } else if (s.warrantyPeriod && s.warrantyPeriod !== 'Không BH') {
            periodText = s.warrantyPeriod;
          }

          return {
            serviceName: s.serviceName.trim(),
            sku: s.sku || null,
            price: parseFloat(s.price) || 0,
            quantity: parseInt(s.quantity) || 1,
            warrantyMonths: calculatedMonths,
            warrantyPeriod: periodText,
            note: s.note ? s.note.trim() : ''
          };
        })
      };

      let res;
      if (editingOrderId) {
        res = await apiSuaChua.updateOrder(editingOrderId, payload);
        showToast(`Cập nhật hóa đơn ${editingOrderCode} thành công!`, 'success');
      } else {
        res = await apiSuaChua.createOrder(payload);
        showToast('Đã lưu đơn dịch vụ sửa chữa thành công!', 'success');
      }

      const orderData = res.data?.data || res.data;
      setCompletedOrder(orderData);
      resetForm();
      fetchOrders();
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi khi lưu đơn dịch vụ sửa chữa', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStatusChange = async (orderId, newStatus) => {
    if (!orderId || !newStatus) return;
    try {
      await apiSuaChua.updateOrderStatus(orderId, newStatus);
      showToast(`Đã chuyển trạng thái đơn sang: ${newStatus}`, 'success');
      fetchOrders();
      if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
        setSelectedOrderDetail({ ...selectedOrderDetail, status: newStatus });
      }
    } catch (err) {
      showToast(err.userMessage || err.message || 'Lỗi cập nhật trạng thái đơn', 'danger');
    }
  };

  const printIntakeTicket = (order) => {
    const win = window.open('', '_blank', 'width=850,height=750');
    if (!win || !order) return;
    const servicesText = (order.items || []).map((it, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><strong>${it.serviceName || ''}</strong>${it.note ? `<br/><small style="color:#64748b;">${it.note}</small>` : ''}</td>
        <td style="text-align:center;">${it.quantity || 1}</td>
        <td style="text-align:right;">${it.price ? formatCurrency(it.price) + ' đ' : 'Chờ báo giá'}</td>
      </tr>
    `).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>Phiếu Tiếp Nhận Máy - ${order.orderCode}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
          body { padding: 30px; color: #1e293b; font-size: 13px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
          .logo { font-size: 22px; font-weight: 800; color: #2563eb; }
          .title { text-align: center; margin: 15px 0; }
          .title h2 { font-size: 18px; font-weight: 700; text-transform: uppercase; color: #0f172a; }
          .title p { font-size: 11px; color: #64748b; margin-top: 2px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
          .row-info { display: flex; font-size: 13px; }
          .lbl { width: 140px; color: #64748b; font-weight: 500; }
          .val { flex: 1; font-weight: 600; color: #0f172a; }
          .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; }
          .table th { background: #f1f5f9; text-transform: uppercase; font-weight: 600; }
          .condition-box { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 10px; margin-top: 12px; }
          .terms { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-top: 15px; font-size: 11px; color: #475569; }
          .signatures { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
          .sign-col { width: 220px; }
          .sign-title { font-weight: 600; margin-bottom: 50px; font-size: 12px; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">QKSHOP.VN</div>
            <div style="font-size: 11px; color: #64748b;">Dịch vụ Tiếp nhận Sửa Chữa & Bảo Hành Laptop</div>
            <div style="font-size: 11px; color: #64748b;">Hotline: 0939.xxx.xxx</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 700; color: #2563eb;">Mã phiếu: ${order.orderCode}</div>
            <div style="font-size: 11px; color: #64748b;">Ngày nhận: ${formatDate(order.createdDate)}</div>
            ${order.promisedDate ? `<div style="font-size: 11px; color: #dc2626; font-weight: 600;">Hẹn trả máy: ${formatDate(order.promisedDate)}</div>` : ''}
          </div>
        </div>

        <div class="title">
          <h2>PHIẾU TIẾP NHẬN MÁY SỬA CHỮA / BẢO HÀNH</h2>
          <p>(Quý khách vui lòng giữ phiếu này để đối chiếu khi nhận lại máy)</p>
        </div>

        <div class="grid">
          <div class="row-info"><span class="lbl">Khách hàng:</span><span class="val">${order.customerName || '—'}</span></div>
          <div class="row-info"><span class="lbl">Số điện thoại:</span><span class="val font-monospace">${order.customerPhone || '—'}</span></div>
          <div class="row-info"><span class="lbl">Dòng máy:</span><span class="val">${order.deviceModel || '—'}</span></div>
          <div class="row-info"><span class="lbl">Số Serial:</span><span class="val font-monospace">${order.deviceSerial || '—'}</span></div>
          <div class="row-info"><span class="lbl">KTV tiếp nhận:</span><span class="val">${order.technicianName || 'QKShop'}</span></div>
          <div class="row-info"><span class="lbl">Trạng thái:</span><span class="val" style="color: #d97706;">${order.status === 'RECEIVED' ? 'Mới tiếp nhận máy' : (order.status || 'Chờ xử lý')}</span></div>
        </div>

        <div class="condition-box">
          <div style="font-weight: 700; color: #b45309; margin-bottom: 4px;">TÌNH TRẠNG TIẾP NHẬN & PHỤ KIỆN GỬI KÈM:</div>
          <div><strong>• Tình trạng máy lúc nhận:</strong> ${order.intakeCondition || order.note || 'Bình thường / Chưa ghi chú'}</div>
          <div><strong>• Phụ kiện gửi kèm:</strong> ${order.accessoriesReceived || 'Chỉ thân máy (Không có phụ kiện)'}</div>
        </div>

        <div style="margin-top: 14px;">
          <div style="font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 6px;">Hạng mục dịch vụ / Linh kiện yêu cầu kiểm tra:</div>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">STT</th>
                <th>Dịch vụ / Linh kiện</th>
                <th style="width: 15%; text-align: center;">Số lượng</th>
                <th style="width: 25%; text-align: right;">Đơn giá dự kiến</th>
              </tr>
            </thead>
            <tbody>
              ${servicesText || '<tr><td colspan="4" style="text-align:center;color:#64748b;">Kiểm tra tổng quát theo tình trạng máy</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="terms">
          <strong>LƯU Ý QUAN TRỌNG:</strong>
          <p>1. QKShop không chịu trách nhiệm về dữ liệu cá nhân trong máy. Quý khách vui lòng sao lưu trước khi bàn giao.</p>
          <p>2. Vui lòng kiểm tra lại tình trạng máy và phụ kiện được ghi trên phiếu trước khi rời cửa hàng.</p>
          <p>3. Khi đến nhận máy, quý khách vui lòng mang theo phiếu này hoặc số điện thoại đăng ký.</p>
        </div>

        <div class="signatures">
          <div class="sign-col">
            <div class="sign-title">KHÁCH HÀNG BÀN GIAO MÁY<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div>
          </div>
          <div class="sign-col">
            <div class="sign-title">KỸ THUẬT VIÊN TIẾP NHẬN<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div>
            <div style="font-weight: 600; font-size: 13px;">${order.technicianName || 'QKShop'}</div>
          </div>
        </div>

        <script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const printPaymentInvoice = (order) => {
    const win = window.open('', '_blank', 'width=850,height=750');
    if (!win || !order) return;
    const rowsHtml = (order.items || []).map((it, idx) => `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td><strong>${it.serviceName || ''}</strong>${it.note ? `<br/><small style="color:#64748b;">${it.note}</small>` : ''}</td>
        <td style="text-align:center;">${it.quantity || 1}</td>
        <td style="text-align:right;">${formatCurrency(it.price)} đ</td>
        <td style="text-align:center;">${it.warrantyPeriod || (it.warrantyMonths > 0 ? it.warrantyMonths + ' Tháng' : 'Không BH')}</td>
        <td style="text-align:center;">${it.warrantyExpiry || '---'}</td>
      </tr>
    `).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>Hóa Đơn & Bảo Hành Dịch Vụ - ${order.orderCode}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
          body { padding: 30px; color: #1e293b; font-size: 13px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16a34a; padding-bottom: 12px; margin-bottom: 16px; }
          .logo { font-size: 22px; font-weight: 800; color: #16a34a; }
          .title { text-align: center; margin: 15px 0; }
          .title h2 { font-size: 18px; font-weight: 700; text-transform: uppercase; color: #0f172a; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
          .row-info { display: flex; font-size: 13px; }
          .lbl { width: 140px; color: #64748b; font-weight: 500; }
          .val { flex: 1; font-weight: 600; color: #0f172a; }
          .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .table th, .table td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; }
          .table th { background: #f1f5f9; text-transform: uppercase; font-weight: 600; }
          .total-box { margin-top: 14px; text-align: right; }
          .total-price { font-size: 18px; font-weight: 800; color: #16a34a; }
          .terms { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-top: 15px; font-size: 11px; color: #475569; }
          .signatures { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
          .sign-col { width: 220px; }
          .sign-title { font-weight: 600; margin-bottom: 50px; font-size: 12px; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">QKSHOP.VN</div>
            <div style="font-size: 11px; color: #64748b;">Hóa Đơn Dịch Vụ Sửa Chữa & Bảo Hành Linh Kiện</div>
            <div style="font-size: 11px; color: #64748b;">Hotline: 0939.xxx.xxx</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 700; color: #16a34a;">Hóa đơn: ${order.orderCode}</div>
            <div style="font-size: 11px; color: #64748b;">Ngày thanh toán: ${formatDate(order.createdDate)}</div>
          </div>
        </div>

        <div class="title">
          <h2>PHIẾU THANH TOÁN & BẢO HÀNH DỊCH VỤ</h2>
        </div>

        <div class="grid">
          <div class="row-info"><span class="lbl">Khách hàng:</span><span class="val">${order.customerName || '—'}</span></div>
          <div class="row-info"><span class="lbl">Số điện thoại:</span><span class="val font-monospace">${order.customerPhone || '—'}</span></div>
          <div class="row-info"><span class="lbl">Dòng máy:</span><span class="val">${order.deviceModel || '—'}</span></div>
          <div class="row-info"><span class="lbl">Số Serial:</span><span class="val font-monospace">${order.deviceSerial || '—'}</span></div>
          <div class="row-info"><span class="lbl">KTV thực hiện:</span><span class="val">${order.technicianName || 'QKShop'}</span></div>
          <div class="row-info"><span class="lbl">Trạng thái:</span><span class="val" style="color: #16a34a;">Đã hoàn tất & Giao khách</span></div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th style="width: 6%; text-align: center;">STT</th>
              <th>Dịch vụ / Linh kiện</th>
              <th style="width: 10%; text-align: center;">Số lượng</th>
              <th style="width: 20%; text-align: right;">Đơn giá</th>
              <th style="width: 18%; text-align: center;">Gói bảo hành</th>
              <th style="width: 18%; text-align: center;">Hạn bảo hành</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="total-box">
          <div style="font-size: 14px; color: #64748b;">Tổng tiền thanh toán: <span class="total-price">${formatCurrency(order.totalAmount)} đ</span></div>
        </div>

        <div class="terms">
          <strong>ĐIỀU KHOẢN BẢO HÀNH:</strong>
          <p>1. Các linh kiện thay thế được bảo hành theo thời hạn ghi trên phiếu, tem niêm phong phải còn nguyên vẹn.</p>
          <p>2. Không bảo hành các hư hỏng do rơi vỡ, vào nước, chập cháy nguồn điện, hoặc can thiệp phần cứng trái phép.</p>
        </div>

        <div class="signatures">
          <div class="sign-col">
            <div class="sign-title">KHÁCH HÀNG THANH TOÁN<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div>
          </div>
          <div class="sign-col">
            <div class="sign-title">KỸ THUẬT VIÊN / THU NGÂN<br/><small style="font-weight:normal;color:#94a3b8;">(Ký và ghi rõ họ tên)</small></div>
            <div style="font-weight: 600; font-size: 13px;">${order.technicianName || 'QKShop'}</div>
          </div>
        </div>

        <script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const getItemExpiryStatus = (expiryDate) => {
    if (!expiryDate) {
      return {
        text: 'Không bảo hành',
        badge: 'bg-secondary-subtle text-secondary',
        icon: AlertCircle
      };
    }
    const now = new Date();
    const end = new Date(expiryDate);
    end.setHours(23, 59, 59, 999);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Hết hạn (${Math.abs(diffDays)} ngày trước)`,
        badge: 'bg-danger-subtle text-danger',
        icon: AlertCircle
      };
    }
    return {
      text: `Còn hạn (${diffDays} ngày)`,
      badge: 'bg-success-subtle text-success',
      icon: ShieldCheck
    };
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">Mới tiếp nhận</span>;
      case 'IN_REPAIR':
        return <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle">Đang sửa chữa</span>;
      case 'COMPLETED':
        return <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle">Đã hoàn tất</span>;
      case 'CANCELLED':
        return <span className="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">Hủy / Trả về</span>;
      default:
        return <span className="badge bg-secondary-subtle text-secondary border">{status || 'Chờ xử lý'}</span>;
    }
  };

  const totalAmount = services.reduce((sum, s) => sum + (parseFloat(s.price) || 0) * (parseInt(s.quantity) || 1), 0);

  const filteredOrders = orders.filter(ord => {
    if (activeFilterStatus === 'ALL') return true;
    return (ord.status || 'RECEIVED') === activeFilterStatus;
  });

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="m-0 fw-bold text-dark d-flex align-items-center">
            <Wrench className="me-2 text-warning-emphasis" size={28}/> Dịch Vụ Sửa Chữa & Nâng Cấp
          </h2>
          <p className="text-secondary mb-0 small mt-1">
            Ghi nhận thông tin, cập nhật hóa đơn cũ, nhập tay các dịch vụ với giá và thời hạn bảo hành độc lập
          </p>
        </div>
      </div>

      {/* FORM TẠO MỚI / SỬA HÓA ĐƠN + DANH SÁCH RÚT GỌN BÊN PHẢI */}
      <div className="row g-4">
          {/* Cột trái: Form nhập/sửa đơn */}
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h5 className="card-title fw-bold m-0 d-flex align-items-center text-primary">
                  {editingOrderId ? (
                    <>
                      <Edit3 className="me-2 text-warning" size={20}/>
                      Đang Cập Nhật Hóa Đơn: <span className="text-danger ms-2">{editingOrderCode}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="me-2" size={20}/>
                      Tạo Đơn Dịch Vụ Sửa Chữa Mới
                    </>
                  )}
                </h5>
                {editingOrderId && (
                  <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center" onClick={resetForm}>
                    <X size={14} className="me-1"/> Hủy sửa (Về tạo mới)
                  </button>
                )}
              </div>
              <div className="card-body p-4">
                {editingOrderId && (
                  <div className="alert alert-warning border-warning-subtle bg-warning-subtle text-warning-emphasis rounded-3 mb-4 py-2 small d-flex align-items-center justify-content-between">
                    <span>Bạn đang chỉnh sửa lại các thông tin của hóa đơn <strong>{editingOrderCode}</strong>. Mọi thay đổi sẽ được cập nhật đồng bộ.</span>
                    <button type="button" className="btn btn-xs btn-outline-dark ms-2" onClick={resetForm}>Tạo đơn mới</button>
                  </div>
                )}

                {/* Thông tin máy & khách */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Tên khách hàng <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><User size={16}/></span>
                      <input className="form-control border-start-0 ps-0" placeholder="Nguyễn Văn A..." value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Số điện thoại <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><Phone size={16}/></span>
                      <input className="form-control border-start-0 ps-0" placeholder="0987654321..." value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Tên máy của khách <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0"><Laptop size={16}/></span>
                      <input className="form-control border-start-0 ps-0" placeholder="VD: Dell Latitude 7490, Macbook Air M1..." value={deviceModel} onChange={e => setDeviceModel(e.target.value)} />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Số Serial máy</label>
                    <input className="form-control font-monospace" placeholder="Serial máy khách (nếu có)..." value={deviceSerial} onChange={e => setDeviceSerial(e.target.value)} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Tình trạng máy lúc nhận</label>
                    <input className="form-control" placeholder="Trầy xước, nứt vỡ, mất nguồn, sập nguồn..." value={intakeCondition} onChange={e => setIntakeCondition(e.target.value)} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Phụ kiện khách gửi kèm</label>
                    <input className="form-control" placeholder="Sạc theo máy, chuột, túi chống sốc..." value={accessoriesReceived} onChange={e => setAccessoriesReceived(e.target.value)} />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label text-muted fw-semibold small">Trạng thái xử lý</label>
                    <select className="form-select fw-semibold" value={orderStatus} onChange={e => setOrderStatus(e.target.value)}>
                      <option value="RECEIVED">1. Mới tiếp nhận (RECEIVED)</option>
                      <option value="IN_REPAIR">2. Đang sửa chữa (IN_REPAIR)</option>
                      <option value="COMPLETED">3. Hoàn tất & Giao khách (COMPLETED)</option>
                      <option value="CANCELLED">4. Hủy phiếu / Khách không sửa (CANCELLED)</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label text-muted fw-semibold small">Ngày hẹn giao máy</label>
                    <input type="date" className="form-control" value={promisedDate} onChange={e => setPromisedDate(e.target.value)} />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label text-muted fw-semibold small">Kỹ thuật viên thực hiện</label>
                    <input className="form-control" placeholder="Tên thợ..." value={technicianName} onChange={e => setTechnicianName(e.target.value)} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Ngày tiếp nhận / Tạo đơn</label>
                    <input type="date" className="form-control" value={createdDate} onChange={e => setCreatedDate(e.target.value)} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-muted fw-semibold small">Ghi chú chung</label>
                    <input className="form-control" placeholder="Lưu ý thêm của khách hàng..." value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                </div>

                {/* Bảng nhập danh sách dịch vụ / linh kiện */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold m-0 text-dark">Danh sách dịch vụ / linh kiện thực hiện:</h6>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline-success d-flex align-items-center rounded-pill px-3 shadow-sm" onClick={() => setShowPartPickerModal(true)}>
                      <Cpu size={14} className="me-1 text-success"/> Chọn từ kho linh kiện
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-primary d-flex align-items-center rounded-pill px-3 shadow-sm" onClick={handleAddServiceRow}>
                      <Plus size={14} className="me-1"/> Thêm dòng tự do
                    </button>
                  </div>
                </div>

                <div className="table-responsive border rounded bg-white mb-3">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-secondary small text-uppercase">
                      <tr>
                        <th className="ps-3 py-2" style={{minWidth: '220px'}}>Tên dịch vụ / Linh kiện</th>
                        <th className="py-2 text-center" style={{width: '70px'}}>SL</th>
                        <th className="py-2 text-end" style={{width: '130px'}}>Đơn giá</th>
                        <th className="py-2 text-center" style={{minWidth: '130px'}}>Bảo hành</th>
                        <th className="py-2" style={{minWidth: '120px'}}>Ghi chú</th>
                        <th className="pe-3 py-2 text-center" style={{width: '40px'}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((row, idx) => (
                        <tr key={idx}>
                          <td className="ps-3">
                            <input 
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="VD: Cài Win, Thay Pin, Vệ sinh..."
                              value={row.serviceName}
                              onChange={e => handleUpdateServiceField(idx, 'serviceName', e.target.value)}
                            />
                            {row.sku && (
                              <div className="d-flex align-items-center gap-1 mt-1">
                                <span className="badge bg-light text-primary font-monospace border" style={{ fontSize: '10px' }}>
                                  SKU: {row.sku}
                                </span>
                                {row.partStock !== undefined && (
                                  <span className="badge bg-success-subtle text-success" style={{ fontSize: '10px' }}>
                                    Kho tồn: {row.partStock}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-link btn-xs text-danger p-0 ms-1 text-decoration-none"
                                  title="Gỡ liên kết kho (chuyển thành nhập tay)"
                                  onClick={() => handleUpdateServiceField(idx, 'sku', '')}
                                >
                                  &times; gỡ mã
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="text-center">
                            <input 
                              type="number"
                              min="1"
                              className="form-control form-control-sm text-center px-1"
                              value={row.quantity}
                              onChange={e => handleUpdateServiceField(idx, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          </td>
                          <td className="text-end">
                            <input 
                              type="text"
                              inputMode="numeric"
                              className="form-control form-control-sm text-end fw-semibold text-danger"
                              placeholder="0"
                              value={formatCurrency(row.price)}
                              onChange={e => handleUpdateServiceField(idx, 'price', parseCurrency(e.target.value))}
                            />
                          </td>
                          <td className="text-center">
                            <div className="input-group input-group-sm mx-auto shadow-sm" style={{ maxWidth: '140px' }}>
                              <input 
                                type="number"
                                min="0"
                                className="form-control text-center fw-semibold px-2"
                                placeholder="0"
                                value={row.warrantyValue === 0 ? '0' : (row.warrantyValue ?? row.warrantyMonths ?? '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  const num = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
                                  const unit = row.warrantyUnit || 'THANG';
                                  let calcMonths = num === '' ? 0 : num;
                                  if (unit === 'NAM') calcMonths = num * 12;
                                  else if (unit === 'NGAY') calcMonths = Math.ceil(num / 30);

                                  const updated = [...services];
                                  updated[idx] = { ...updated[idx], warrantyValue: num, warrantyMonths: calcMonths };
                                  setServices(updated);
                                }}
                              />
                              <select 
                                className="form-select px-2 bg-light text-dark fw-medium border-start-0"
                                style={{ flex: 'none', width: '75px', cursor: 'pointer' }}
                                value={row.warrantyUnit || 'THANG'}
                                onChange={e => {
                                  const newUnit = e.target.value;
                                  const num = parseInt(row.warrantyValue !== undefined ? row.warrantyValue : row.warrantyMonths, 10) || 0;
                                  let calcMonths = num;
                                  if (newUnit === 'NAM') calcMonths = num * 12;
                                  else if (newUnit === 'NGAY') calcMonths = Math.ceil(num / 30);

                                  const updated = [...services];
                                  updated[idx] = { ...updated[idx], warrantyUnit: newUnit, warrantyMonths: calcMonths };
                                  setServices(updated);
                                }}
                              >
                                <option value="NGAY">Ngày</option>
                                <option value="THANG">Tháng</option>
                                <option value="NAM">Năm</option>
                              </select>
                            </div>
                          </td>

                          <td>
                            <input 
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Ghi chú tem..."
                              value={row.note}
                              onChange={e => handleUpdateServiceField(idx, 'note', e.target.value)}
                            />
                          </td>
                          <td className="pe-3 text-center">
                            <button 
                              type="button" 
                              className="btn btn-sm btn-outline-danger p-1"
                              onClick={() => handleRemoveServiceRow(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr>
                        <td colSpan="2" className="text-end fw-bold py-2 text-secondary">Tổng thanh toán:</td>
                        <td className="text-end fw-bold text-danger fs-6 py-2">{formatCurrency(totalAmount)} đ</td>
                        <td colSpan="3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <button type="button" className="btn btn-outline-secondary d-flex align-items-center" onClick={resetForm}>
                    <RotateCcw size={16} className="me-1"/> {editingOrderId ? 'Hủy bỏ' : 'Làm mới'}
                  </button>
                  <button 
                    type="button" 
                    className={`btn fw-bold px-4 d-flex align-items-center shadow-sm ${editingOrderId ? 'btn-warning text-dark' : 'btn-primary'}`}
                    onClick={handleSaveOrder}
                    disabled={isLoading}
                  >
                    <CheckCircle size={18} className="me-1"/> {editingOrderId ? 'Cập Nhật Hóa Đơn' : 'Lưu Đơn Dịch Vụ'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: DANH SÁCH RÚT GỌN CÁC ĐƠN GẦN ĐÂY - CLICK ĐỂ XEM CHI TIẾT */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title fw-bold m-0 text-dark">Đơn Sửa Chữa Gần Đây</h5>
                  <small className="text-muted" style={{ fontSize: '0.78rem' }}>Click để xem chi tiết đầy đủ</small>
                </div>
                <div className="input-group" style={{maxWidth: '160px'}}>
                  <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    placeholder="Tìm SĐT, tên..." 
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      fetchOrders(e.target.value);
                    }}
                  />
                </div>
              </div>

              {/* Tabs Lọc Trạng Thái Đơn */}
              <div className="px-2 pt-2 bg-light border-bottom">
                <ul className="nav nav-pills nav-fill small gap-1 pb-2">
                  <li className="nav-item">
                    <button 
                      type="button" 
                      className={`nav-link py-1 px-2 ${activeFilterStatus === 'ALL' ? 'active fw-bold' : 'text-secondary'}`}
                      style={{ fontSize: '11px' }}
                      onClick={() => setActiveFilterStatus('ALL')}
                    >
                      Tất cả ({orders.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button 
                      type="button" 
                      className={`nav-link py-1 px-2 ${activeFilterStatus === 'RECEIVED' ? 'active bg-warning text-dark fw-bold' : 'text-secondary'}`}
                      style={{ fontSize: '11px' }}
                      onClick={() => setActiveFilterStatus('RECEIVED')}
                    >
                      Nhận ({orders.filter(o => o.status === 'RECEIVED' || !o.status).length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button 
                      type="button" 
                      className={`nav-link py-1 px-2 ${activeFilterStatus === 'IN_REPAIR' ? 'active bg-info text-dark fw-bold' : 'text-secondary'}`}
                      style={{ fontSize: '11px' }}
                      onClick={() => setActiveFilterStatus('IN_REPAIR')}
                    >
                      Sửa ({orders.filter(o => o.status === 'IN_REPAIR').length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button 
                      type="button" 
                      className={`nav-link py-1 px-2 ${activeFilterStatus === 'COMPLETED' ? 'active bg-success text-white fw-bold' : 'text-secondary'}`}
                      style={{ fontSize: '11px' }}
                      onClick={() => setActiveFilterStatus('COMPLETED')}
                    >
                      Xong ({orders.filter(o => o.status === 'COMPLETED').length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button 
                      type="button" 
                      className={`nav-link py-1 px-2 ${activeFilterStatus === 'CANCELLED' ? 'active bg-danger text-white fw-bold' : 'text-secondary'}`}
                      style={{ fontSize: '11px' }}
                      onClick={() => setActiveFilterStatus('CANCELLED')}
                    >
                      Hủy ({orders.filter(o => o.status === 'CANCELLED').length})
                    </button>
                  </li>
                </ul>
              </div>

              <div className="card-body p-3" style={{maxHeight: '650px', overflowY: 'auto'}}>
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <Wrench size={36} className="opacity-25 mb-2" />
                    <p className="mb-0">Không có đơn nào theo bộ lọc</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {filteredOrders.map(ord => (
                      <div 
                        key={ord.id} 
                        className={`p-3 border rounded-3 bg-white shadow-xs transition-all position-relative ${editingOrderId === ord.id ? 'border-warning shadow-sm bg-warning bg-opacity-10' : 'hover-shadow'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedOrderDetail(ord)}
                      >
                        {/* Header rút gọn & Trạng thái */}
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div className="d-flex align-items-center gap-1 flex-wrap">
                            <span className="badge bg-primary-subtle text-primary fw-bold">{ord.orderCode}</span>
                            {renderStatusBadge(ord.status)}
                          </div>
                          <span className="text-danger fw-bold">{formatCurrency(ord.totalAmount)} đ</span>
                        </div>

                        {/* Thông tin thiết bị */}
                        <div className="fw-bold text-dark text-truncate mb-1" title={ord.deviceModel}>
                          {ord.deviceModel}
                          {ord.deviceSerial && (
                            <span className="badge bg-light text-secondary font-monospace border ms-1" style={{ fontSize: '10px' }}>
                              SN: {ord.deviceSerial}
                            </span>
                          )}
                        </div>

                        <div className="d-flex justify-content-between align-items-center small text-secondary">
                          <span>Khách: <strong>{ord.customerName}</strong></span>
                          <span>SĐT: <strong className="text-dark">{ord.customerPhone}</strong></span>
                        </div>

                        {ord.intakeCondition && (
                          <div className="small text-muted text-truncate mt-1">
                            <span className="fw-semibold">Tình trạng:</span> {ord.intakeCondition}
                          </div>
                        )}

                        <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                          <span className="small text-muted" style={{ fontSize: '11px' }}>
                            {ord.items ? `${ord.items.length} mục` : ''} • {formatDate(ord.createdDate)}
                            {ord.promisedDate && (
                              <span className="text-danger ms-1 fw-medium">• Hẹn: {formatDate(ord.promisedDate)}</span>
                            )}
                          </span>

                          <div className="d-flex gap-1" onClick={e => e.stopPropagation()}>
                            <button 
                              type="button" 
                              className="btn btn-xs btn-outline-primary py-0 px-2"
                              title="Chỉnh sửa hóa đơn"
                              onClick={() => handleEditOrder(ord)}
                            >
                              <Edit3 size={12} className="me-1"/> Sửa
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-xs btn-light border py-0 px-2 text-dark"
                              title="Xem chi tiết"
                              onClick={() => setSelectedOrderDetail(ord)}
                            >
                              <Eye size={12} className="me-1"/> Xem
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* MODAL XEM CHI TIẾT ĐẦY ĐỦ KHI CLICK VÀO HÓA ĐƠN HOẶC DÒNG DỊCH VỤ */}
      {selectedOrderDetail && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-dark text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center">
                  <Wrench className="me-2 text-warning" size={22} />
                  Chi Tiết Đơn Dịch Vụ: {selectedOrderDetail.orderCode}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedOrderDetail(null)}></button>
              </div>
              <div className="modal-body p-4">
                {/* Khối thông tin chung */}
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="row g-2 small">
                    <div className="col-sm-6"><strong>Mã hóa đơn:</strong> <span className="badge bg-primary">{selectedOrderDetail.orderCode}</span></div>
                    <div className="col-sm-6"><strong>Ngày nhận:</strong> {formatDate(selectedOrderDetail.createdDate)}</div>
                    <div className="col-sm-6"><strong>Khách hàng:</strong> {selectedOrderDetail.customerName}</div>
                    <div className="col-sm-6"><strong>Số điện thoại:</strong> <span className="text-dark fw-bold">{selectedOrderDetail.customerPhone}</span></div>
                    <div className="col-sm-6"><strong>Dòng máy:</strong> <span className="text-primary fw-bold">{selectedOrderDetail.deviceModel}</span></div>
                    <div className="col-sm-6"><strong>Số Serial:</strong> <span className="font-monospace fw-bold">{selectedOrderDetail.deviceSerial || '—'}</span></div>
                    <div className="col-sm-6"><strong>Tình trạng lúc nhận:</strong> {selectedOrderDetail.intakeCondition || '—'}</div>
                    <div className="col-sm-6"><strong>Phụ kiện kèm:</strong> {selectedOrderDetail.accessoriesReceived || '—'}</div>
                    <div className="col-sm-6"><strong>Kỹ thuật viên:</strong> {selectedOrderDetail.technicianName || '—'}</div>
                    <div className="col-sm-6"><strong>Hẹn trả máy:</strong> <span className="text-danger fw-bold">{formatDate(selectedOrderDetail.promisedDate) || '—'}</span></div>
                    {selectedOrderDetail.note && (
                      <div className="col-12 mt-1"><strong>Ghi chú:</strong> <span className="text-muted">{selectedOrderDetail.note}</span></div>
                    )}
                    
                    <div className="col-12 mt-2 pt-2 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold text-secondary">Trạng thái phiếu:</span>
                        <select 
                          className="form-select form-select-sm fw-bold border-primary shadow-sm"
                          style={{ width: 'auto' }}
                          value={selectedOrderDetail.status || 'RECEIVED'}
                          onChange={(e) => handleQuickStatusChange(selectedOrderDetail.id, e.target.value)}
                        >
                          <option value="RECEIVED">1. Mới tiếp nhận (RECEIVED)</option>
                          <option value="IN_REPAIR">2. Đang sửa chữa (IN_REPAIR)</option>
                          <option value="COMPLETED">3. Hoàn tất & Giao khách (COMPLETED)</option>
                          <option value="CANCELLED">4. Hủy phiếu / Không sửa (CANCELLED)</option>
                        </select>
                      </div>
                      <div>
                        <strong className="fs-6 me-2">Tổng tiền:</strong>
                        <span className="text-danger fw-bold fs-5">{formatCurrency(selectedOrderDetail.totalAmount)} đ</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danh sách các dịch vụ & thời hạn bảo hành */}
                <h6 className="fw-bold mb-2 text-dark">Danh sách dịch vụ & Linh kiện bảo hành:</h6>
                <div className="table-responsive border rounded">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th className="ps-3 py-2">Dịch vụ / Linh kiện</th>
                        <th className="py-2 text-center" style={{ width: '70px' }}>SL</th>
                        <th className="py-2 text-end" style={{ width: '130px' }}>Đơn giá</th>
                        <th className="py-2 text-center" style={{ width: '120px' }}>Bảo hành</th>
                        <th className="py-2 text-center" style={{ width: '130px' }}>Hạn bảo hành</th>
                        <th className="pe-3 py-2 text-end" style={{ width: '130px' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrderDetail.items?.map((it, idx) => {
                        const itExp = getItemExpiryStatus(it.warrantyExpiry);
                        const ItExpIcon = itExp.icon;

                        return (
                          <tr key={idx}>
                            <td className="ps-3 py-2">
                              <strong>{it.serviceName}</strong>
                              {it.note && <div className="small text-muted">Tem/ghi chú: {it.note}</div>}
                            </td>
                            <td className="text-center">{it.quantity}</td>
                            <td className="text-end fw-medium">{formatCurrency(it.price)} đ</td>
                            <td className="text-center">
                              {it.warrantyPeriod ? (
                                <span className="badge bg-light text-dark border">{it.warrantyPeriod}</span>
                              ) : it.warrantyMonths > 0 ? (
                                <span className="badge bg-light text-dark border">{it.warrantyMonths} Tháng</span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary">Không BH</span>
                              )}
                            </td>

                            <td className="text-center fw-bold text-dark">{it.warrantyExpiry || '—'}</td>
                            <td className="pe-3 text-end">
                              <span className={`badge rounded-pill px-2 py-1 small ${itExp.badge}`}>
                                <ItExpIcon size={12} className="me-1 mb-1 d-inline" />
                                {itExp.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer bg-light d-flex flex-wrap justify-content-between gap-2">
                <div className="d-flex flex-wrap gap-2">
                  <button 
                    type="button" 
                    className="btn btn-warning fw-medium d-flex align-items-center"
                    onClick={() => {
                      const ord = selectedOrderDetail;
                      setSelectedOrderDetail(null);
                      handleEditOrder(ord);
                    }}
                  >
                    <Edit3 size={16} className="me-1" /> Sửa đơn
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary d-flex align-items-center shadow-sm"
                    onClick={() => printIntakeTicket(selectedOrderDetail)}
                  >
                    <Printer size={16} className="me-1" /> In Phiếu Tiếp Nhận Máy
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-success d-flex align-items-center shadow-sm"
                    onClick={() => printPaymentInvoice(selectedOrderDetail)}
                  >
                    <Printer size={16} className="me-1" /> In Phiếu Thanh Toán & BH
                  </button>
                </div>
                <button type="button" className="btn btn-secondary px-4" onClick={() => setSelectedOrderDetail(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal thông báo sau khi lưu hóa đơn */}
      {completedOrder && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-success text-white py-3">
                <h5 className="modal-title fw-bold d-flex align-items-center">
                  <CheckCircle className="me-2" size={22} />
                  Hóa Đơn Dịch Vụ - Mã: {completedOrder.orderCode}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setCompletedOrder(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-success border-success-subtle bg-success-subtle text-success-emphasis rounded-3 mb-3 small">
                  Hóa đơn dịch vụ sửa chữa đã được cập nhật đồng bộ lên hệ thống. Khách hàng có thể tra cứu bảo hành các dịch vụ bằng số điện thoại <strong>{completedOrder.customerPhone}</strong>.
                </div>

                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="row g-2 small">
                    <div className="col-sm-6"><strong>Khách hàng:</strong> {completedOrder.customerName}</div>
                    <div className="col-sm-6"><strong>Số điện thoại:</strong> {completedOrder.customerPhone}</div>
                    <div className="col-sm-6"><strong>Máy sửa:</strong> {completedOrder.deviceModel}</div>
                    <div className="col-sm-6"><strong>Số Serial:</strong> <span className="font-monospace fw-bold">{completedOrder.deviceSerial || '—'}</span></div>
                    {completedOrder.intakeCondition && (
                      <div className="col-sm-6"><strong>Tình trạng lúc nhận:</strong> {completedOrder.intakeCondition}</div>
                    )}
                    {completedOrder.promisedDate && (
                      <div className="col-sm-6"><strong>Hẹn trả máy:</strong> <span className="text-danger fw-bold">{formatDate(completedOrder.promisedDate)}</span></div>
                    )}
                    <div className="col-12 mt-1"><strong>Tổng tiền:</strong> <span className="text-danger fw-bold fs-6">{formatCurrency(completedOrder.totalAmount)} đ</span></div>
                  </div>
                </div>

                <h6 className="fw-bold mb-2">Hạng mục dịch vụ & Bảo hành:</h6>
                <div className="table-responsive border rounded">
                  <table className="table table-sm mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th>Dịch vụ / Linh kiện</th>
                        <th className="text-center">Số lượng</th>
                        <th className="text-end">Đơn giá</th>
                        <th className="text-center">Bảo hành</th>
                        <th className="text-center">Hạn bảo hành</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedOrder.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td><strong>{it.serviceName}</strong></td>
                          <td className="text-center">{it.quantity}</td>
                          <td className="text-end">{formatCurrency(it.price)} đ</td>
                          <td className="text-center">
                            {it.warrantyMonths > 0 ? (
                              <span className="badge bg-success-subtle text-success">{it.warrantyMonths} Tháng</span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary">Không BH</span>
                            )}
                          </td>
                          <td className="text-center text-primary fw-bold">{it.warrantyExpiry || '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer bg-light d-flex flex-wrap justify-content-between gap-2">
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary d-flex align-items-center shadow-sm"
                    onClick={() => printIntakeTicket(completedOrder)}
                  >
                    <Printer size={16} className="me-1" /> In Phiếu Tiếp Nhận Máy
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-success d-flex align-items-center shadow-sm"
                    onClick={() => printPaymentInvoice(completedOrder)}
                  >
                    <Printer size={16} className="me-1" /> In Phiếu Thanh Toán & BH
                  </button>
                </div>
                <button type="button" className="btn btn-primary px-4" onClick={() => setCompletedOrder(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHỌN LINH KIỆN TỪ KHO */}
      {showPartPickerModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-white border-bottom py-3">
                <div>
                  <h5 className="modal-title fw-bold text-dark d-flex align-items-center">
                    <Cpu size={20} className="me-2 text-primary" />
                    Chọn Linh Kiện Từ Kho
                  </h5>
                  <small className="text-muted">Chọn linh kiện để tự động điền đơn giá bán lẻ, thời hạn bảo hành và trừ tồn kho khi lưu đơn</small>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowPartPickerModal(false)}></button>
              </div>

              <div className="p-3 bg-light border-bottom">
                <div className="position-relative">
                  <Search size={18} className="position-absolute text-muted ms-3 top-50 translate-middle-y" />
                  <input
                    type="text"
                    className="form-control ps-5 rounded-pill bg-white"
                    placeholder="Tìm theo tên linh kiện, mã SKU, loại..."
                    value={partSearchTerm}
                    onChange={e => setPartSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-body p-0 overflow-y-auto" style={{ maxHeight: '450px' }}>
                {availableParts.filter(p => {
                  if (!partSearchTerm.trim()) return true;
                  const q = partSearchTerm.toLowerCase();
                  return (p.name || '').toLowerCase().includes(q) ||
                         (p.sku || '').toLowerCase().includes(q) ||
                         (p.category || '').toLowerCase().includes(q) ||
                         (p.note || '').toLowerCase().includes(q);
                }).length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <Cpu size={36} className="text-secondary opacity-50 mb-2" />
                    <div>Không tìm thấy linh kiện nào còn hàng phù hợp.</div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light small text-uppercase">
                        <tr>
                          <th className="ps-4">Mã SKU</th>
                          <th>Tên linh kiện & Thông số</th>
                          <th className="text-center">Loại</th>
                          <th className="text-center">Tồn kho</th>
                          <th className="text-end">Giá bán lẻ</th>
                          <th className="text-center">Bảo hành</th>
                          <th className="pe-4 text-end"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableParts.filter(p => {
                          if (!partSearchTerm.trim()) return true;
                          const q = partSearchTerm.toLowerCase();
                          return (p.name || '').toLowerCase().includes(q) ||
                                 (p.sku || '').toLowerCase().includes(q) ||
                                 (p.category || '').toLowerCase().includes(q) ||
                                 (p.note || '').toLowerCase().includes(q);
                        }).map(part => (
                          <tr key={part.id} style={{ cursor: 'pointer' }} onClick={() => handlePickPart(part)}>
                            <td className="ps-4">
                              <span className="badge bg-light text-dark font-monospace border px-2 py-1">
                                {part.sku}
                              </span>
                            </td>
                            <td>
                              <div className="fw-bold text-dark">{part.name}</div>
                              {part.note && <small className="text-muted d-block">{part.note}</small>}
                            </td>
                            <td className="text-center">
                              <span className="badge bg-info-subtle text-info border border-info-subtle">
                                {part.category}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`badge rounded-pill px-2 py-1 ${part.quantity > 5 ? 'bg-success' : 'bg-warning text-dark'}`}>
                                Còn {part.quantity}
                              </span>
                            </td>
                            <td className="text-end fw-bold text-primary">
                              {part.retailPrice ? formatCurrency(part.retailPrice) + 'đ' : '0đ'}
                            </td>
                            <td className="text-center">
                              <span className="badge bg-light text-secondary border">
                                {part.warrantyPeriod || (part.warrantyMonths ? `${part.warrantyMonths}T` : 'Không BH')}
                              </span>
                            </td>
                            <td className="pe-4 text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-primary rounded-pill px-3 fw-medium shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePickPart(part);
                                }}
                              >
                                Chọn món này
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light py-2">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowPartPickerModal(false)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
