import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { Layers, Package, TrendingUp, TrendingDown, BarChart3, FilterX } from 'lucide-react';
import { analyticsApi, apiCatalog } from '../../api';
import { useToast } from '../../contexts/notification/NguCanhThongBao';

// Cấu hình màu sắc chuẩn Dashboard hiện đại
const CHART_COLORS = {
  in: '#198754',      // Success Green (Nhập kho)
  out: '#dc3545',     // Danger Red (Xuất kho)
  donut: ['#0d6efd', '#198754', '#0dcaf0', '#ffc107', '#fd7e14', '#6610f2'],
  grid: '#e9ecef'
};

export default function TrangThongKe() {
  const { showToast } = useToast();
  
  // Tabs: 'LAPTOP' hoặc 'ACCESSORY'
  const [activeTab, setActiveTab] = useState('LAPTOP');
  
  // Filters
  const [periodFilter, setPeriodFilter] = useState('30_days');
  const [brandFilter, setBrandFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Data Danh mục
  const [brands, setBrands] = useState([]);
  
  // Data Biểu đồ
  const [summary, setSummary] = useState(null);
  const [pieDataState, setPieDataState] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [ageData, setAgeData] = useState([]);
  const [turnoverData, setTurnoverData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load danh mục hãng
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const brandsRes = await apiCatalog.getBrands();
        setBrands(brandsRes.data || []);
      } catch (err) {
        console.error("Lỗi tải danh mục hãng", err);
      }
    };
    fetchCatalog();
  }, []);

  // Fetch Analytics Data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const filters = {
          period: periodFilter,
          productType: activeTab,
          ...(brandFilter && { brandId: brandFilter }),
          ...(segmentFilter && { segmentCode: segmentFilter }),
          ...(categoryFilter && { category: categoryFilter })
        };

        const [sumRes, pieRes, trendRes, ageRes, turnRes] = await Promise.all([
          analyticsApi.getSummary(filters),
          analyticsApi.getValueStructure(filters),
          analyticsApi.getTrend(filters),
          analyticsApi.getInventoryAge(filters),
          analyticsApi.getTurnoverRate(filters)
        ]);

        setSummary(sumRes.data);

        if (pieRes.data) {
          setPieDataState(pieRes.data.map((item, idx) => ({
            name: item.name ? item.name.replace(/Máy móc - |Phụ kiện - /g, '').trim() : '',
            value: item.percentage,
            realValue: item.value,
            color: CHART_COLORS.donut[idx % CHART_COLORS.donut.length]
          })));
        }

        setTrendData(trendRes.data || []);
        setAgeData(ageRes.data || []);
        
        if (turnRes.data) {
          setTurnoverData(turnRes.data.map(item => ({
            ...item,
            name: item.name ? item.name.replace(/Máy móc - |Phụ kiện - /g, '').trim() : ''
          })));
        } else {
          setTurnoverData([]);
        }
      } catch (err) {
        console.error(err);
        showToast('Lỗi tải dữ liệu báo cáo', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [periodFilter, activeTab, brandFilter, segmentFilter, categoryFilter, showToast]);

  // Derived values
  const importedCount = summary?.importedCount || 0;
  const exportedCount = summary?.soldCount || 0;
  const inventoryCount = summary?.inventoryCount || 0;
  const inventoryValue = summary?.inventoryValue || 0;
  
  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const compactCurrency = (val) => {
    if (val >= 1000000000) return (val / 1000000000).toFixed(1) + ' Tỷ';
    if (val >= 1000000) return (val / 1000000).toFixed(1) + ' Tr';
    return formatCurrency(val);
  };

  // Component render bộ lọc dạng Grid (Áp dụng màu hiện đại)
  const FilterGrid = ({ title, options, selected, onChange, columnCount = 2 }) => {
    const allOptions = [{ value: '', label: 'Tất cả' }, ...options];
    
    return (
      <div className="mb-4">
        <h6 className="fw-bold mb-2 text-dark" style={{ fontSize: '13px', textTransform: 'uppercase' }}>{title}</h6>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columnCount}, 1fr)`, gap: '4px' }}>
          {allOptions.map(opt => {
            const isSelected = selected === opt.value;
            return (
              <div 
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`px-2 py-1 text-center rounded-2 transition-all ${isSelected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-light text-secondary border border-light'}`}
                style={{ 
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '30px',
                  fontWeight: isSelected ? '600' : '500'
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="container-fluid bg-light min-vh-100 py-4">
      
      {/* Header Area */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h4 className="fw-bold m-0 d-flex align-items-center gap-2 text-dark">
            <div className="bg-primary bg-opacity-10 p-2 rounded text-primary">
              <BarChart3 size={24} />
            </div>
            DASHBOARD QUẢN LÝ TỒN KHO
          </h4>
        </div>
        
        {/* Custom Tabs Hiện Đại */}
        <ul className="nav nav-pills bg-white p-1 rounded-pill shadow-sm border">
          <li className="nav-item">
            <button 
              className={`nav-link rounded-pill fw-medium px-4 ${activeTab === 'LAPTOP' ? 'active shadow-sm' : 'text-secondary'}`}
              onClick={() => { setActiveTab('LAPTOP'); setCategoryFilter(''); }}
            >
              Sản Phẩm Chính
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link rounded-pill fw-medium px-4 ${activeTab === 'ACCESSORY' ? 'active shadow-sm' : 'text-secondary'}`}
              onClick={() => { setActiveTab('ACCESSORY'); setBrandFilter(''); setSegmentFilter(''); }}
            >
              Phụ Kiện
            </button>
          </li>
        </ul>
      </div>

      <div className="row g-3">
        {/* Left Sidebar (Filters) */}
        <div className="col-12 col-lg-2">
          <div className="card border-0 rounded-4 p-3 h-100 shadow-sm bg-white">
            
            <FilterGrid 
              title="Kỳ báo cáo" 
              columnCount={2}
              selected={periodFilter} 
              onChange={setPeriodFilter}
              options={[
                { value: '7_days', label: '7 Ngày' },
                { value: '30_days', label: '30 Ngày' },
                { value: '90_days', label: '90 Ngày' }
              ]} 
            />

            {activeTab === 'LAPTOP' && (
              <>
                <FilterGrid 
                  title="Hãng sản xuất" 
                  columnCount={2}
                  selected={brandFilter} 
                  onChange={setBrandFilter}
                  options={brands.map(b => ({ value: b.brandId, label: b.brandName }))} 
                />
                
                <FilterGrid 
                  title="Phân khúc" 
                  columnCount={1}
                  selected={segmentFilter} 
                  onChange={setSegmentFilter}
                  options={[
                    { value: 'GAMING', label: 'Gaming' },
                    { value: 'OFFICE', label: 'Văn phòng' },
                    { value: 'PREMIUM', label: 'Cao cấp' }
                  ]} 
                />
              </>
            )}

            {activeTab === 'ACCESSORY' && (
              <FilterGrid 
                title="Danh mục Phụ kiện" 
                columnCount={1}
                selected={categoryFilter} 
                onChange={setCategoryFilter}
                options={[
                  { value: 'CHUOT', label: 'Chuột' },
                  { value: 'BANPHIM', label: 'Bàn phím' },
                  { value: 'TAINGHE', label: 'Tai nghe' },
                  { value: 'BALO', label: 'Balo/Túi' }
                ]} 
              />
            )}

            <button 
              className="btn btn-light w-100 mt-auto rounded-3 text-danger fw-medium d-flex align-items-center justify-content-center gap-2 border" 
              style={{ fontSize: '13px' }}
              onClick={() => {
                setPeriodFilter('30_days');
                setBrandFilter('');
                setSegmentFilter('');
                setCategoryFilter('');
              }}
            >
              <FilterX size={16} /> Xóa bộ lọc
            </button>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="col-12 col-lg-10 position-relative">

          {/* Lớp phủ Loading nếu đang gọi API */}
          {isLoading && (
            <div className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center rounded-4" style={{ zIndex: 10, top: 0, left: 0, backgroundColor: 'rgba(255,255,255,0.6)' }}>
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          )}
          
          {/* Top KPIs (4 Cột Trắng) */}
          <div className="row g-3 mb-3">
            {[
              { title: 'Giá trị tồn kho', value: compactCurrency(inventoryValue), icon: Layers, color: 'primary' },
              { title: 'Số lượng tồn', value: inventoryCount, icon: Package, color: 'info' },
              { title: 'Tổng nhập (IN)', value: importedCount, icon: TrendingUp, color: 'success' },
              { title: 'Tổng xuất (OUT)', value: exportedCount, icon: TrendingDown, color: 'danger' }
            ].map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div className="col-6 col-md-3" key={i}>
                  <div className="card border-0 rounded-4 shadow-sm h-100 bg-white">
                    <div className="card-body p-3 d-flex flex-column justify-content-between">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="fw-semibold text-secondary small text-uppercase">{kpi.title}</div>
                        <div className={`bg-${kpi.color} bg-opacity-10 text-${kpi.color} p-2 rounded`}>
                          <Icon size={18} />
                        </div>
                      </div>
                      <div className="fs-4 fw-bold text-dark">{kpi.value}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Grid - Hàng 1 (5 - 4 - 3) */}
          <div className="row g-3 mb-3">
            
            {/* Chart 1: Xu hướng xuất nhập */}
            <div className="col-12 col-lg-5">
              <div className="card border-0 rounded-4 shadow-sm h-100 bg-white">
                <div className="card-body p-3">
                  <h6 className="fw-bold mb-1 text-dark">Xu hướng sản lượng xuất nhập kho</h6>
                  <p className="text-muted small mb-3" style={{ fontSize: '11px' }}>Biểu đồ thể hiện số lượng nhập vào và bán ra theo ngày. Giúp theo dõi nhịp độ kinh doanh.</p>
                  <div style={{ height: '220px', width: '100%' }}>
                    {trendData && trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                          <Legend verticalAlign="top" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px' }}/>
                          <Line type="monotone" dataKey="nhap" name="Nhập kho (IN)" stroke={CHART_COLORS.in} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          <Line type="monotone" dataKey="ban" name="Xuất kho (OUT)" stroke={CHART_COLORS.out} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-100 h-100 d-flex justify-content-center align-items-center text-muted small">Chưa có dữ liệu giao dịch</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 2: Sản lượng xuất nhập theo danh mục SP (Horizontal Bar) */}
            <div className="col-12 col-md-7 col-lg-4">
              <div className="card border-0 rounded-4 shadow-sm h-100 bg-white">
                <div className="card-body p-3">
                  <h6 className="fw-bold mb-1 text-dark">Sản lượng xuất nhập theo nhóm SP</h6>
                  <p className="text-muted small mb-3" style={{ fontSize: '11px' }}>So sánh trực tiếp lượng Nhập (IN) và Xuất (OUT) của từng danh mục.</p>
                  <div style={{ height: '220px', width: '100%' }}>
                    {turnoverData && turnoverData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={turnoverData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={CHART_COLORS.grid} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} hide />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
                          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}/>
                          <Legend verticalAlign="top" height={24} iconType="square" wrapperStyle={{ fontSize: '11px' }}/>
                          <Bar dataKey="soldCount" name="OUT" fill={CHART_COLORS.out} barSize={10} radius={[0, 2, 2, 0]} />
                          <Bar dataKey="importCount" name="IN" fill={CHART_COLORS.in} barSize={10} radius={[0, 2, 2, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-100 h-100 d-flex justify-content-center align-items-center text-muted small">Không có dữ liệu xuất nhập</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 3: Cơ cấu tồn (Donut) */}
            <div className="col-12 col-md-5 col-lg-3">
              <div className="card border-0 rounded-4 shadow-sm h-100 bg-white">
                <div className="card-body p-3 d-flex flex-column align-items-center justify-content-center">
                  <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                    {pieDataState && pieDataState.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieDataState}
                            cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" stroke="none"
                          >
                            {pieDataState.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name, props) => [`${value}% (${compactCurrency(props.payload.realValue)})`, name]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-100 h-100 d-flex justify-content-center align-items-center text-muted small">Chưa có dữ liệu tồn kho</div>
                    )}
                    {pieDataState && pieDataState.length > 0 && (
                      <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ pointerEvents: 'none' }}>
                        <div className="fw-bold text-dark" style={{ fontSize: '13px', lineHeight: '1.3' }}>Cơ cấu<br/>Giá trị tồn</div>
                      </div>
                    )}
                  </div>
                  <p className="text-muted small mt-2 mb-0 text-center" style={{ fontSize: '11px' }}>Tỷ trọng vốn đọng ở các nhóm sản phẩm.</p>
                </div>
              </div>
            </div>

          </div>

          {/* Charts Grid - Hàng 2 (5 - 4 - 3) */}
          <div className="row g-3">
            
            {/* Chart 4: Tuổi tồn kho */}
            <div className="col-12 col-lg-5">
              <div className="card border-0 rounded-4 shadow-sm h-100 bg-white">
                <div className="card-body p-3">
                  <h6 className="fw-bold mb-1 text-dark">Tuổi tồn kho theo nhóm thời gian</h6>
                  <p className="text-muted small mb-3" style={{ fontSize: '11px' }}>Phân loại dựa trên ngày khởi tạo SP. Có thể khác Tổng Nhập (IN) nếu hàng có sẵn từ đầu kỳ.</p>
                  <div style={{ height: '220px', width: '100%' }}>
                    {ageData && ageData.length > 0 && ageData.some(d => d.count > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                          <XAxis dataKey="range" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}/>
                          <Legend verticalAlign="top" height={24} iconType="square" wrapperStyle={{ fontSize: '11px' }}/>
                          <Bar dataKey="count" name="Số lượng tồn" fill="#f59e0b" barSize={20} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-100 h-100 d-flex justify-content-center align-items-center text-muted small">Không có dữ liệu tồn kho</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 5: Phân bổ sản lượng theo SP */}
            <div className="col-12 col-md-7 col-lg-4">
              <div className="card border-0 rounded-4 shadow-sm h-100 bg-white">
                <div className="card-body p-3">
                  <h6 className="fw-bold mb-1 text-dark">Phân bổ xuất nhập theo Nhóm SP</h6>
                  <p className="text-muted small mb-3" style={{ fontSize: '11px' }}>Chi tiết số lượng Nhập/Xuất giúp nhận biết mã bán chạy và xu hướng hàng hóa.</p>
                  <div style={{ height: '220px', width: '100%' }}>
                    {turnoverData && turnoverData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={turnoverData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}/>
                          <Legend verticalAlign="top" height={24} iconType="square" wrapperStyle={{ fontSize: '11px' }}/>
                          <Bar dataKey="importCount" name="IN" fill={CHART_COLORS.in} barSize={12} radius={[2, 2, 0, 0]} />
                          <Bar dataKey="soldCount" name="OUT" fill={CHART_COLORS.out} barSize={12} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-100 h-100 d-flex justify-content-center align-items-center text-muted small">Không có dữ liệu</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 6: Tốc độ luân chuyển */}
            <div className="col-12 col-md-5 col-lg-3">
              <div className="card border-0 rounded-4 shadow-sm h-100 bg-white d-flex flex-column">
                <div className="card-body p-3 d-flex flex-column">
                  <h6 className="fw-bold mb-1 text-center text-dark">Tốc độ luân chuyển Top 5</h6>
                  <p className="text-muted small mb-3 text-center" style={{ fontSize: '11px' }}>Tỷ lệ = Xuất / Nhập (Quy đổi 100% nếu có Xuất nhưng Nhập = 0).</p>
                  <div className="w-100 flex-grow-1 overflow-auto custom-scrollbar" style={{ maxHeight: '200px', padding: '0 5px' }}>
                    {turnoverData && turnoverData.slice(0, 5).map(item => (
                      <div key={item.name} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="small fw-semibold text-dark text-truncate" style={{ maxWidth: '75%' }}>{item.name}</span>
                          <span className="small text-success fw-bold">{item.rate}%</span>
                        </div>
                        <div className="progress rounded-pill bg-light" style={{ height: '6px' }}>
                          <div className="progress-bar rounded-pill" style={{ width: `${item.rate > 100 ? 100 : item.rate}%`, backgroundColor: CHART_COLORS.in }}></div>
                        </div>
                      </div>
                    ))}
                    {(!turnoverData || turnoverData.length === 0) && (
                      <div className="text-center text-muted small mt-4">Không có dữ liệu giao dịch</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}