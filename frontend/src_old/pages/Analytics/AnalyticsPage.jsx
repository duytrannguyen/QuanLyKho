import { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { analyticsApi } from '../../api';
import styles from './AnalyticsPage.module.css';

export default function AnalyticsPage() {
  const [dateFilter, setDateFilter] = useState('30 ngày');
  const [summary, setSummary] = useState(null);
  const [pieDataState, setPieDataState] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [ageData, setAgeData] = useState([]);
  const [turnoverData, setTurnoverData] = useState([]);

  useEffect(() => {
    const periodMap = { '7 ngày': '7_days', '30 ngày': '30_days', '90 ngày': '90_days' };
    const period = periodMap[dateFilter] || '30_days';

    const fetchData = async () => {
      try {
        const [sumRes, pieRes, trendRes, ageRes, turnRes] = await Promise.all([
          analyticsApi.getSummary({ period }),
          analyticsApi.getValueStructure({ period }),
          analyticsApi.getTrend({ period }),
          analyticsApi.getInventoryAge(),
          analyticsApi.getTurnoverRate({ period })
        ]);
        
        setSummary(sumRes.data);
        
        if (pieRes.data && pieRes.data.length > 0) {
          const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];
          setPieDataState(pieRes.data.map((item, idx) => ({
            name: item.name,
            value: item.percentage,
            realValue: item.value,
            color: colors[idx % colors.length]
          })));
        }

        setTrendData(trendRes.data || []);
        setAgeData(ageRes.data || []);
        setTurnoverData(turnRes.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [dateFilter]);

  // Derived calculations
  const importedCount = summary?.importedCount || 0;
  const soldCount = summary?.soldCount || 0;
  const inventoryCount = summary?.inventoryCount || 0;
  // Tồn đầu kỳ = Tồn cuối kỳ - Nhập + Xuất
  const beginningInventory = inventoryCount - importedCount + soldCount;
  // Sell-through = Xuất / (Tồn đầu kỳ + Nhập)
  const sellThrough = (beginningInventory + importedCount) > 0 
    ? ((soldCount / (beginningInventory + importedCount)) * 100).toFixed(1) 
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>Phân tích tồn kho</h1>
          <p>Theo dõi xu hướng, cơ cấu và tốc độ luân chuyển hàng hóa</p>
        </div>
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.dateGroup}>
          {['7 ngày', '30 ngày', '90 ngày', 'Tùy chỉnh'].map(d => (
            <button key={d} className={`${styles.dateBtn} ${dateFilter === d ? styles.active : ''}`}
                    onClick={() => setDateFilter(d)}>{d}</button>
          ))}
        </div>
        <select className={`form-select ${styles.filterSelect}`}><option>Hãng: Tất cả</option></select>
        <select className={`form-select ${styles.filterSelect}`}><option>Phân khúc: Tất cả</option></select>
        <select className={`form-select ${styles.filterSelect}`}><option>Tầm giá: Tất cả</option></select>
        <select className={`form-select ${styles.filterSelect}`}><option>Dòng máy: Tất cả</option></select>
        <button className="btn btn-outline btn-sm">Đặt lại</button>
      </div>

      <div className={styles.filterSummary}>
        Đang xem 30 ngày gần nhất - 135 máy trong phạm vi lọc
      </div>

      {/* Overview Banner exactly like the screenshot */}
      <div className={styles.overviewBanner}>
        <div className={styles.overviewSection}>
          <div className={styles.overviewLabel}>Tồn đầu kỳ</div>
          <div className={styles.overviewValue}>{beginningInventory}</div>
          <div className={styles.mathSymbol}>+</div>
        </div>
        <div className={styles.overviewSection}>
          <div className={styles.overviewLabel}>Nhập</div>
          <div className={styles.overviewValue}>{importedCount}</div>
          <div className={styles.mathSymbol}>-</div>
        </div>
        <div className={styles.overviewSection}>
          <div className={styles.overviewLabel}>Xuất</div>
          <div className={styles.overviewValue}>{soldCount}</div>
          <div className={styles.overviewSub}>Bán 152 - Khác 8</div>
          <div className={styles.mathSymbol}>=</div>
        </div>
        <div className={styles.overviewSection}>
          <div className={styles.overviewLabel}>Tồn cuối kỳ</div>
          <div className={styles.overviewValue}>{inventoryCount}</div>
          <div className={styles.mathSymbolPipe}>|</div>
        </div>
        <div className={`${styles.overviewSection} ${styles.sellThrough}`}>
          <div className={styles.overviewLabel}>Sell-through</div>
          <div className={styles.overviewValue}>{sellThrough}%</div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {/* Trend Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Xu hướng nhập — bán — tồn</div>
          <div className={styles.chartSub}>Theo 5 ngày - Bấm vào cột/điểm để xem số liệu</div>
          <div className={styles.chartContent}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} verticalAlign="top" align="right" />
                <Bar yAxisId="left" dataKey="nhap" name="Nhập" fill="#3b82f6" barSize={12} radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left" dataKey="ban" name="Bán" fill="#10b981" barSize={12} radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="ton" name="Tồn cuối kỳ" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.chartNote}>
            Chọn một cột hoặc điểm trên biểu đồ để xem chi tiết.
          </div>
        </div>

        {/* Pie Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Cơ cấu giá trị tồn</div>
          <div className={styles.chartSub}>Theo hãng - Tỷ lệ theo giá trị</div>
          <div className={styles.chartContent} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={styles.pieChartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataState}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieDataState.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.pieCenterLabel}>
                {summary ? (summary.inventoryValue / 1000000).toFixed(0) : 0} tr
              </div>
            </div>
            <div className={styles.customLegend}>
              {pieDataState.map(item => (
                <div key={item.name} className={styles.legendItem}>
                  <div className={styles.legendLeft}>
                    <div className={styles.legendDot} style={{ background: item.color }}></div>
                    <span>{item.name}</span>
                  </div>
                  <span className={styles.legendPercent}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Age Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Tuổi tồn hàng hóa</div>
          <div className={styles.chartContent} style={{ paddingTop: '20px' }}>
            {ageData.map(item => (
              <div key={item.range} className={styles.barRow}>
                <div className={styles.barLabel}>{item.range}</div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${item.percentage}%`, background: item.range === 'Trên 60 ngày' ? '#ef4444' : '#3b82f6' }}></div>
                </div>
                <div className={styles.barValue}>{item.count} máy</div>
              </div>
            ))}
          </div>
        </div>

        {/* Turnover Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Tốc độ luân chuyển theo hãng</div>
          <div className={styles.chartContent} style={{ paddingTop: '20px' }}>
            {turnoverData.map(item => (
              <div key={item.name} className={styles.barRow}>
                <div className={styles.barLabel}>{item.name}</div>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${item.rate}%`, background: '#2563eb' }}></div>
                </div>
                <div className={styles.barValue}>{item.rate}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Highlights exactly like the screenshot */}
      <div className={styles.highlightsGrid}>
        <div className={styles.highlightCard}>
          <div className={styles.hlHeader}>
            <div className={`${styles.hlIcon} ${styles.green}`}>↗</div>
            <div className={styles.hlTitle}>Bán nhanh</div>
          </div>
          <div className={styles.hlSub}>MSI - 100% sell-through</div>
          <a href="#" className={styles.hlAction}>Mở Tra cứu &rarr;</a>
        </div>
        <div className={styles.highlightCard}>
          <div className={styles.hlHeader}>
            <div className={`${styles.hlIcon} ${styles.yellow}`}>⏳</div>
            <div className={styles.hlTitle}>Tồn lâu</div>
          </div>
          <div className={styles.hlSub}>3 máy trên 60 ngày</div>
          <a href="#" className={styles.hlAction}>Mở Tra cứu &rarr;</a>
        </div>
        <div className={styles.highlightCard}>
          <div className={styles.hlHeader}>
            <div className={`${styles.hlIcon} ${styles.blue}`}>↘</div>
            <div className={styles.hlTitle}>Tồn giảm</div>
          </div>
          <div className={styles.hlSub}>-31 máy so với đầu kỳ</div>
          <a href="#" className={styles.hlAction}>Mở Tra cứu &rarr;</a>
        </div>
      </div>
    </div>
  );
}
