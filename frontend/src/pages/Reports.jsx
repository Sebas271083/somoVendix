import { useState, useEffect, useCallback, useRef } from 'react';
import { reportsApi } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Area, Line, ReferenceLine,
} from 'recharts';
import {
  Download, TrendingUp, TrendingDown, Package, Users, DollarSign, RotateCcw,
  FileText, Printer, BarChart2, LineChartIcon, Settings, RefreshCw,
  ShoppingCart, AlertTriangle, CreditCard, Minus, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const fmt   = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
const fmtK  = (n) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : fmt(n);
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;
const COLORS = ['#1F6E5A','#3b82f6','#10b981','#f59e0b','#f97316','#ec4899','#8b5cf6','#14b8a6'];
const PAYMENT_LABELS = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  transferencia: 'Transferencia', cuenta_corriente: 'Cta. Cte.', cuotas: 'Cuotas', mixto: 'Mixto',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function GrowthBadge({ pct, size = 'sm' }) {
  if (pct === null || pct === undefined) return <span className="text-gray-400 text-xs">—</span>;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const cls = up ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      <Icon size={11} /> {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function DateRangePicker({ from, to, onChange }) {
  const presets = [
    { label: 'Hoy',      fn: () => { const d = new Date().toISOString().split('T')[0]; return { from: d, to: d }; } },
    { label: 'Est. mes', fn: () => { const d = new Date(); const f = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]; return { from: f, to: d.toISOString().split('T')[0] }; } },
    { label: 'Últ. 30d', fn: () => { const to = new Date().toISOString().split('T')[0]; return { from: new Date(Date.now()-30*86400000).toISOString().split('T')[0], to }; } },
    { label: 'Últ. 90d', fn: () => { const to = new Date().toISOString().split('T')[0]; return { from: new Date(Date.now()-90*86400000).toISOString().split('T')[0], to }; } },
    { label: 'Est. año', fn: () => { const d = new Date(); return { from: new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0], to: d.toISOString().split('T')[0] }; } },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map(p => (
        <button key={p.label} onClick={() => onChange(p.fn())}
          className="text-xs border rounded-lg px-2 py-1 transition-colors" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='var(--brand)'; e.currentTarget.style.color='var(--brand)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--muted)'; }}>
          {p.label}
        </button>
      ))}
      <input type="date" value={from} onChange={e => onChange({ from: e.target.value, to })}
        className="input text-sm" />
      <span className="text-sm" style={{ color: 'var(--muted)' }}>→</span>
      <input type="date" value={to} onChange={e => onChange({ from, to: e.target.value })}
        className="input text-sm" />
    </div>
  );
}

function exportCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function printReport(title, htmlContent, range) {
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${title}</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px}
h1{font-size:18px;margin-bottom:4px}.subtitle{color:#666;font-size:11px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f4f4f4;text-align:left;padding:7px 10px;font-size:11px;color:#444}
td{padding:6px 10px;border-bottom:1px solid #eee;font-size:11px}.right{text-align:right}.bold{font-weight:700}
.green{color:#059669}.red{color:#dc2626}.section{margin-top:20px}.section-title{font-size:13px;font-weight:700;margin-bottom:6px;border-bottom:2px solid #6366f1;padding-bottom:4px}
.row-total{background:#f0f9ff;font-weight:700}.row-result{background:#ecfdf5;font-weight:700;font-size:13px}.row-loss{background:#fff1f2;font-weight:700;font-size:13px}
@page{margin:15mm}
</style></head><body>
<h1>${title}</h1>
<div class="subtitle">Período: ${range?.from || ''} → ${range?.to || ''} &nbsp;·&nbsp; Generado: ${new Date().toLocaleDateString('es-AR')}</div>
${htmlContent}
<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
</body></html>`);
  win.document.close();
}

function buildTableHTML(headers, rows) {
  const ths = headers.map(h => `<th class="${h.right?'right':''}">${h.label}</th>`).join('');
  const trs = rows.map(r => `<tr>${r.map((v,i) => `<td class="${headers[i]?.right?'right':''}">${v??''}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function buildIncomeStatementHTML(p) {
  const row = (l, v, cls='') => `<tr class="${cls}"><td>${l}</td><td class="right bold">${fmt(v)}</td></tr>`;
  const rowPct = (l, v, pct, cls='') => `<tr class="${cls}"><td>${l}</td><td class="right bold">${fmt(v)} <span style="color:#666;font-weight:400">(${fmtPct(pct)})</span></td></tr>`;
  let expCats = (p.expenses_by_category||[]).map(e => `<tr><td style="padding-left:20px">• ${e.category}</td><td class="right">(${fmt(e.total)})</td></tr>`).join('');
  return `
    <div class="section"><div class="section-title">Ingresos</div><table>
      ${row('(+) Ventas brutas', p.revenue)}
      ${p.discounts>0?row('(-) Descuentos',-p.discounts,''):''}
      ${p.returns>0?row('(-) Devoluciones',-p.returns,''):''}
      ${row('= Ingresos netos', p.net_revenue, 'row-total')}
    </table></div>
    <div class="section"><div class="section-title">CMV</div><table>
      ${row('(-) CMV', -p.cogs)}
      ${rowPct('= GANANCIA BRUTA', p.gross_profit, p.gross_margin, p.gross_profit>=0?'row-result':'row-loss')}
    </table></div>
    <div class="section"><div class="section-title">Gastos Operativos</div><table>
      ${expCats||'<tr><td colspan="2" style="color:#999;text-align:center">Sin gastos</td></tr>'}
      ${row('(-) Total gastos', -p.expenses, 'row-total')}
    </table></div>
    <div class="section"><table>${rowPct('= RESULTADO OPERATIVO', p.operating_profit, p.operating_margin, p.operating_profit>=0?'row-result':'row-loss')}</table></div>`;
}

// ── KPI Definitions for Executive Dashboard ───────────────────────────────────

const ALL_KPIS = [
  { id: 'ventas_hoy',      label: 'Ventas hoy',        icon: TrendingUp,    color: 'blue',   fmt: fmt,    dataKey: (s) => s?.today?.sales_total },
  { id: 'count_hoy',       label: '# Ventas hoy',      icon: ShoppingCart,  color: 'blue',   fmt: (v)=>v, dataKey: (s) => s?.today?.sales_count },
  { id: 'ganancia_hoy',    label: 'Ganancia hoy',       icon: DollarSign,    color: 'green',  fmt: fmt,    dataKey: (s) => s?.today?.profit },
  { id: 'ventas_mes',      label: 'Ventas este mes',    icon: TrendingUp,    color: 'indigo', fmt: fmt,    dataKey: (s) => s?.month?.sales_total },
  { id: 'count_mes',       label: '# Ventas mes',       icon: ShoppingCart,  color: 'indigo', fmt: (v)=>v, dataKey: (s) => s?.month?.sales_count },
  { id: 'ticket_prom',     label: 'Ticket promedio',    icon: ShoppingCart,  color: 'purple', fmt: fmt,    dataKey: (s) => s?.today?.avg_ticket },
  { id: 'gastos_mes',      label: 'Gastos este mes',    icon: CreditCard,    color: 'orange', fmt: fmt,    dataKey: (s) => s?.expenses_month },
  { id: 'cuentas_cobrar',  label: 'Cuentas por cobrar', icon: AlertTriangle, color: 'amber',  fmt: fmt,    dataKey: (s) => s?.receivables_total },
  { id: 'stock_critico',   label: 'Stock crítico',      icon: Package,       color: 'red',    fmt: (v)=>v, dataKey: (s) => s?.low_stock_count },
  { id: 'caja_apertura',   label: 'Apertura de caja',   icon: DollarSign,    color: 'teal',   fmt: fmt,    dataKey: (s) => s?.open_register?.opening_amount },
];

const COLOR_MAP = {
  blue:   'bg-brand-soft text-brand border-brand/20',
  green:  'bg-green-50 text-green-600 border-green-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
  amber:  'bg-amber-50 text-amber-600 border-amber-100',
  red:    'bg-red-50 text-red-600 border-red-100',
  teal:   'bg-teal-50 text-teal-600 border-teal-100',
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function Reports() {
  const today      = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [range,     setRange]     = useState({ from: monthStart, to: today });
  const [tab,       setTab]       = useState('sales');
  const [chartType, setChartType] = useState('bar');
  const [loading,   setLoading]   = useState(false);
  const [dashLoading, setDashLoading] = useState(false);

  // Dashboard config
  const [enabledKpis, setEnabledKpis] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gestix_kpis') || 'null') || ALL_KPIS.map(k => k.id); } catch { return ALL_KPIS.map(k => k.id); }
  });
  const [showKpiConfig, setShowKpiConfig] = useState(false);
  const [autoRefresh,   setAutoRefresh]   = useState(false);
  const [countdown,     setCountdown]     = useState(60);
  const refreshInterval = useRef(null);
  const countdownInterval = useRef(null);

  const [data, setData] = useState({
    salesByPeriod: [], paymentMethods: [], topProducts: [],
    topCustomers: [], salesBySeller: [], salesByCategory: [],
    inventoryValue: null, returnsSummary: null, incomeStatement: null,
    comparison: null, projection: null, dashboard: null,
  });

  // ── Load range-based data ───────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = range;
      const [period, methods, products, customers, sellers, categories, inventory, returns, income, comparison] = await Promise.all([
        reportsApi.salesByPeriod(params),
        reportsApi.salesByPaymentMethod(params),
        reportsApi.topProducts(params),
        reportsApi.topCustomers(params),
        reportsApi.salesBySeller(params),
        reportsApi.salesByCategory(params),
        reportsApi.inventoryValue(),
        reportsApi.returnsSummary(params),
        reportsApi.incomeStatement(params),
        reportsApi.comparison(params),
      ]);
      setData(d => ({
        ...d,
        salesByPeriod: period.map(r => ({ ...r, date: new Date(r.date).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit'}), total: parseFloat(r.total), profit: parseFloat(r.profit||0), cost: parseFloat(r.cost||0) })),
        paymentMethods: methods.map(m => ({ ...m, name: PAYMENT_LABELS[m.payment_method]||m.payment_method, total: parseFloat(m.total) })),
        topProducts: products.map(p => ({ ...p, profit: parseFloat(p.profit||0), total_revenue: parseFloat(p.total_revenue||0), margin: p.total_revenue>0?(parseFloat(p.profit||0)/parseFloat(p.total_revenue)*100):0 })),
        topCustomers: customers,
        salesBySeller: sellers,
        salesByCategory: categories.map(c => ({ ...c, profit: parseFloat(c.profit||0), total_revenue: parseFloat(c.total_revenue||0), margin: c.total_revenue>0?(parseFloat(c.profit||0)/parseFloat(c.total_revenue)*100):0 })),
        inventoryValue: inventory,
        returnsSummary: returns,
        incomeStatement: income,
        comparison,
      }));
    } catch { toast.error('Error al cargar reportes'); }
    finally { setLoading(false); }
  }, [range]);

  // ── Load dashboard + projection ─────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const [dashboard, projection] = await Promise.all([
        reportsApi.dashboard(),
        reportsApi.projection(),
      ]);
      setData(d => ({ ...d, dashboard, projection }));
    } catch { toast.error('Error al cargar dashboard'); }
    finally { setDashLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'dashboard' || tab === 'projection') loadDashboard(); }, [tab, loadDashboard]);

  // ── Auto-refresh ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoRefresh) {
      setCountdown(60);
      countdownInterval.current = setInterval(() => setCountdown(c => { if (c <= 1) { loadDashboard(); return 60; } return c - 1; }), 1000);
      refreshInterval.current = setInterval(loadDashboard, 60000);
    } else {
      clearInterval(refreshInterval.current);
      clearInterval(countdownInterval.current);
    }
    return () => { clearInterval(refreshInterval.current); clearInterval(countdownInterval.current); };
  }, [autoRefresh, loadDashboard]);

  const toggleKpi = (id) => {
    setEnabledKpis(prev => {
      const next = prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id];
      localStorage.setItem('gestix_kpis', JSON.stringify(next));
      return next;
    });
  };

  const TABS = [
    { id: 'dashboard',   label: 'Dashboard',     icon: BarChart2 },
    { id: 'sales',       label: 'Ventas',         icon: TrendingUp },
    { id: 'comparison',  label: 'Comparativa',    icon: ArrowUpRight },
    { id: 'projection',  label: 'Proyección',     icon: LineChartIcon },
    { id: 'resultado',   label: 'Resultado',      icon: FileText },
    { id: 'products',    label: 'Productos',      icon: Package },
    { id: 'customers',   label: 'Clientes',       icon: Users },
    { id: 'categories',  label: 'Categorías',     icon: BarChart2 },
    { id: 'inventory',   label: 'Inventario',     icon: DollarSign },
    { id: 'returns',     label: 'Devoluciones',   icon: RotateCcw },
  ];

  const needsRange = !['dashboard', 'projection'].includes(tab);
  const p   = data.incomeStatement;
  const cmp = data.comparison;
  const prj = data.projection;
  const db  = data.dashboard;

  // Combined projection chart data
  const projChart = prj ? [
    ...prj.daily.map(d => ({ day: `D${d.day}`, actual: d.revenue })),
    ...prj.projection.map(d => ({ day: `D${d.day}`, projected: d.projected })),
  ] : [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm mt-1">Análisis de ventas, productos y clientes</p>
        </div>
        {needsRange && <DateRangePicker from={range.from} to={range.to} onChange={setRange} />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {(loading || dashLoading) && <div className="text-center py-16 text-gray-400">Cargando...</div>}

      {/* ══ DASHBOARD EJECUTIVO ══════════════════════════════════════════════ */}
      {!loading && !dashLoading && tab === 'dashboard' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setAutoRefresh(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
              style={autoRefresh
                ? { backgroundColor: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }
                : { color: 'var(--muted)', borderColor: 'var(--border)' }
              }>
                <RefreshCw size={14} className={autoRefresh ? 'animate-spin' : ''} />
                {autoRefresh ? `Auto-refresh (${countdown}s)` : 'Auto-refresh'}
              </button>
              {autoRefresh && (
                <button onClick={loadDashboard} className="text-xs hover:underline flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                  <RefreshCw size={11} /> Actualizar ahora
                </button>
              )}
            </div>
            <button onClick={() => setShowKpiConfig(v => !v)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-2 hover:bg-gray-50">
              <Settings size={14} /> Configurar KPIs
            </button>
          </div>

          {/* KPI Config Panel */}
          {showKpiConfig && (
            <div className="bg-white border rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Activar / desactivar KPIs</p>
              <div className="flex flex-wrap gap-2">
                {ALL_KPIS.map(k => (
                  <button key={k.id} onClick={() => toggleKpi(k.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                    style={enabledKpis.includes(k.id)
                      ? { backgroundColor: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }
                      : { color: 'var(--muted)', borderColor: 'var(--border)' }
                    }>
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* KPI Cards */}
          {db && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ALL_KPIS.filter(k => enabledKpis.includes(k.id)).map(kpi => {
                const val = kpi.dataKey(db);
                const Icon = kpi.icon;
                const colorCls = COLOR_MAP[kpi.color] || COLOR_MAP.blue;
                return (
                  <div key={kpi.id} className="bg-white border rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 border ${colorCls}`}>
                      <Icon size={16} />
                    </div>
                    <p className="text-xs text-gray-400">{kpi.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5 leading-tight">
                      {val !== undefined && val !== null ? kpi.fmt(val) : '—'}
                    </p>
                  </div>
                );
              })}
              {/* Growth vs last month from comparison */}
              {enabledKpis.includes('ventas_mes') && cmp && (
                <div className="bg-white border rounded-xl p-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 border bg-green-50 text-green-600 border-green-100">
                    <TrendingUp size={16} />
                  </div>
                  <p className="text-xs text-gray-400">Crecim. vs período ant.</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">
                    <GrowthBadge pct={cmp.growth.revenue} size="lg" />
                  </p>
                  <p className="text-xs text-gray-400 mt-1">en ingresos</p>
                </div>
              )}
            </div>
          )}

          {/* Payment methods today */}
          {db?.payment_methods?.length > 0 && (
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Métodos de pago hoy</h3>
              <div className="grid grid-cols-2 gap-3">
                {db.payment_methods.map(m => (
                  <div key={m.payment_method} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span className="text-sm text-gray-700">{PAYMENT_LABELS[m.payment_method] || m.payment_method}</span>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-sm">{fmt(m.total)}</p>
                      <p className="text-xs text-gray-400">{m.count} venta{m.count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent sales */}
          {db?.recent_sales?.length > 0 && (
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Últimas ventas</h3>
              <div className="space-y-2">
                {db.recent_sales.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.customer_name || 'Consumidor Final'}</p>
                      <p className="text-xs text-gray-400">
                        {PAYMENT_LABELS[s.payment_method] || s.payment_method} · {new Date(s.created_at).toLocaleTimeString('es-AR', {hour:'2-digit',minute:'2-digit'})}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">{fmt(s.total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ VENTAS ══════════════════════════════════════════════════════════ */}
      {!loading && tab === 'sales' && (
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Ventas por día</h2>
              <div className="flex gap-2">
                <button onClick={() => setChartType(t => t === 'bar' ? 'line' : 'bar')}
                  className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700">
                  {chartType === 'bar' ? <LineChartIcon size={13} /> : <BarChart2 size={13} />}
                  {chartType === 'bar' ? 'Línea' : 'Barras'}
                </button>
                <button onClick={() => {
                  const html = buildTableHTML(
                    [{label:'Fecha'},{label:'Ventas',right:true},{label:'Ingresos',right:true},{label:'Costo',right:true},{label:'Ganancia',right:true}],
                    data.salesByPeriod.map(d => [d.date, d.count, fmt(d.total), fmt(d.cost), fmt(d.profit)])
                  ); printReport('Ventas por día', html, range);
                }} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700">
                  <Printer size={13} /> PDF
                </button>
                <button onClick={() => exportCSV(data.salesByPeriod, 'ventas_por_dia.csv')}
                  className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700">
                  <Download size={13} /> CSV
                </button>
              </div>
            </div>
            {data.salesByPeriod.length === 0 ? <p className="text-gray-400 text-center py-8">Sin ventas en el período</p> : (
              <ResponsiveContainer width="100%" height={260}>
                {chartType === 'bar' ? (
                  <BarChart data={data.salesByPeriod}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtK(v)} />
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend />
                    <Bar dataKey="total" name="Ingresos" fill="#1F6E5A" radius={[4,4,0,0]} />
                    <Bar dataKey="profit" name="Ganancia" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                ) : (
                  <ComposedChart data={data.salesByPeriod}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtK(v)} />
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="total" name="Ingresos" fill="#eef2ff" stroke="#1F6E5A" strokeWidth={2} />
                    <Line type="monotone" dataKey="profit" name="Ganancia" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Por método de pago</h2>
              {data.paymentMethods.length === 0 ? <p className="text-gray-400 text-center py-8">Sin datos</p> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.paymentMethods} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false}>
                      {data.paymentMethods.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Por vendedor</h2>
              {data.salesBySeller.length === 0 ? <p className="text-gray-400 text-center py-8">Sin datos</p> : (
                <div className="space-y-3">
                  {data.salesBySeller.map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                           style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }}>{s.name.charAt(0)}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-900">{s.name}</span>
                          <span className="text-gray-500">{s.total_sales} ventas</span>
                        </div>
                        <p className="text-xs text-gray-400">{fmt(s.total_amount)} · Ticket: {fmt(s.avg_ticket)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ COMPARATIVA ══════════════════════════════════════════════════════ */}
      {!loading && tab === 'comparison' && cmp && (
        <div className="space-y-5">
          <div className="text-xs rounded-lg p-3" style={{ color: 'var(--muted)', backgroundColor: 'var(--brand-soft)', border: '1px solid var(--border)' }}>
            Comparando <strong>{cmp.current.from} → {cmp.current.to}</strong> con período anterior <strong>{cmp.previous.from} → {cmp.previous.to}</strong>
          </div>

          {/* KPI Comparison Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Ingresos',       cur: cmp.current.revenue,    prev: cmp.previous.revenue,    pct: cmp.growth.revenue,    f: fmt },
              { label: '# Ventas',       cur: cmp.current.count,      prev: cmp.previous.count,      pct: cmp.growth.count,      f: v=>v },
              { label: 'Ticket promedio',cur: cmp.current.avg_ticket, prev: cmp.previous.avg_ticket, pct: cmp.growth.avg_ticket, f: fmt },
              { label: 'Ganancia',       cur: cmp.current.profit,     prev: cmp.previous.profit,     pct: cmp.growth.profit,     f: fmt },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white border rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">{kpi.label}</p>
                <p className="text-xl font-bold text-gray-900">{kpi.f(kpi.cur)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <GrowthBadge pct={kpi.pct} />
                  <span className="text-xs text-gray-400">vs {kpi.f(kpi.prev)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Daily comparison chart */}
          {cmp.chart.length > 0 && (
            <div className="bg-white border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Ingresos por día: período actual vs anterior</h2>
                <button onClick={() => {
                  const html = buildTableHTML(
                    [{label:'Día'},{label:'Actual',right:true},{label:'Anterior',right:true},{label:'Diferencia',right:true}],
                    cmp.chart.map(d => [d.day, fmt(d.actual), fmt(d.anterior), fmt(d.actual - d.anterior)])
                  ); printReport('Comparativa de períodos', html, range);
                }} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700">
                  <Printer size={13} /> PDF
                </button>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cmp.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={Math.floor(cmp.chart.length/10)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtK(v)} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend />
                  <Bar dataKey="actual"   name="Período actual"   fill="#1F6E5A" radius={[4,4,0,0]} />
                  <Bar dataKey="anterior" name="Período anterior" fill="#d1d5db" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Comparison table */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">Resumen comparativo</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500">Métrica</th>
                  <th className="text-right px-5 py-3 text-gray-500">Período actual</th>
                  <th className="text-right px-5 py-3 text-gray-500">Período anterior</th>
                  <th className="text-right px-5 py-3 text-gray-500">Variación</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Ingresos totales', cur: fmt(cmp.current.revenue), prev: fmt(cmp.previous.revenue), pct: cmp.growth.revenue },
                  { label: '# de ventas',      cur: cmp.current.count,        prev: cmp.previous.count,        pct: cmp.growth.count },
                  { label: 'Ticket promedio',  cur: fmt(cmp.current.avg_ticket), prev: fmt(cmp.previous.avg_ticket), pct: cmp.growth.avg_ticket },
                  { label: 'Ganancia bruta',   cur: fmt(cmp.current.profit),   prev: fmt(cmp.previous.profit),   pct: cmp.growth.profit },
                ].map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-5 py-3 font-medium text-gray-800">{row.label}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{row.cur}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{row.prev}</td>
                    <td className="px-5 py-3 text-right"><GrowthBadge pct={row.pct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ PROYECCIÓN ════════════════════════════════════════════════════════ */}
      {!loading && !dashLoading && tab === 'projection' && prj && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--brand-soft)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--brand)' }}>Acumulado mes</p>
              <p className="text-xl font-bold mt-1" style={{ color: 'var(--brand)' }}>{fmt(prj.actual_to_date)}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{prj.days_elapsed} días transcurridos</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-medium text-indigo-600">Promedio diario</p>
              <p className="text-xl font-bold text-indigo-700 mt-1">{fmt(prj.daily_avg)}</p>
              <p className="text-xs text-indigo-500 mt-0.5">por día vendido</p>
            </div>
            <div className={`border rounded-xl p-4 ${prj.trend==='up' ? 'bg-green-50 border-green-100' : prj.trend==='down' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-xs font-medium ${prj.trend==='up'?'text-green-600':prj.trend==='down'?'text-red-600':'text-gray-600'}`}>Tendencia</p>
              <p className={`text-xl font-bold mt-1 flex items-center gap-1 ${prj.trend==='up'?'text-green-700':prj.trend==='down'?'text-red-700':'text-gray-700'}`}>
                {prj.trend==='up' ? <><TrendingUp size={18}/> Subiendo</> : prj.trend==='down' ? <><TrendingDown size={18}/> Bajando</> : <><Minus size={18}/> Estable</>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{prj.days_remaining} días restantes</p>
            </div>
            <div className={`border rounded-xl p-4 ${prj.projected_total > prj.actual_to_date ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <p className={`text-xs font-medium ${prj.projected_total > prj.actual_to_date ? 'text-emerald-600' : 'text-amber-600'}`}>Proyección mes</p>
              <p className={`text-xl font-bold mt-1 ${prj.projected_total > prj.actual_to_date ? 'text-emerald-700' : 'text-amber-700'}`}>{fmt(prj.projected_total)}</p>
              <p className="text-xs text-gray-400 mt-0.5">basado en tendencia lineal</p>
            </div>
          </div>

          {/* Projection chart */}
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-1">Ventas del mes + proyección</h2>
            <p className="text-xs text-gray-400 mb-4">Azul = real · Verde punteado = proyectado</p>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={projChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtK(v)} />
                <Tooltip formatter={v => fmt(v)} />
                <Legend />
                <ReferenceLine x={`D${prj.days_elapsed}`} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: 'Hoy', position: 'top', fontSize: 10 }} />
                <Area type="monotone" dataKey="actual" name="Real" fill="#E7F1ED" stroke="#1F6E5A" strokeWidth={2} connectNulls={false} />
                <Line type="monotone" dataKey="projected" name="Proyectado" stroke="#10b981" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly context */}
          {prj.monthly_context?.length > 1 && (
            <div className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Contexto: últimos 3 meses</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={prj.monthly_context}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtK(v)} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="revenue" name="Ingresos" fill="#1F6E5A" radius={[4,4,0,0]}>
                    {prj.monthly_context.map((_, i) => <Cell key={i} fill={i === prj.monthly_context.length - 1 ? '#16493D' : '#1F6E5A'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ══ ESTADO DE RESULTADOS ════════════════════════════════════════════ */}
      {!loading && tab === 'resultado' && p && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--brand-soft)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--brand)' }}>Ingresos netos</p>
              <p className="text-xl font-bold mt-1" style={{ color: 'var(--brand)' }}>{fmt(p.net_revenue)}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{p.sales_count} ventas</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <p className="text-xs font-medium text-orange-600">CMV</p>
              <p className="text-xl font-bold text-orange-700 mt-1">{fmt(p.cogs)}</p>
            </div>
            <div className={`border rounded-xl p-4 ${p.gross_profit>=0?'bg-green-50 border-green-100':'bg-red-50 border-red-100'}`}>
              <p className={`text-xs font-medium ${p.gross_profit>=0?'text-green-600':'text-red-600'}`}>Ganancia bruta</p>
              <p className={`text-xl font-bold mt-1 ${p.gross_profit>=0?'text-green-700':'text-red-700'}`}>{fmt(p.gross_profit)}</p>
              <p className={`text-xs mt-0.5 ${p.gross_profit>=0?'text-green-500':'text-red-500'}`}>Margen: {fmtPct(p.gross_margin)}</p>
            </div>
            <div className={`border rounded-xl p-4 ${p.operating_profit>=0?'bg-emerald-50 border-emerald-100':'bg-red-50 border-red-100'}`}>
              <p className={`text-xs font-medium ${p.operating_profit>=0?'text-emerald-600':'text-red-600'}`}>Resultado operativo</p>
              <p className={`text-xl font-bold mt-1 ${p.operating_profit>=0?'text-emerald-700':'text-red-700'}`}>{fmt(p.operating_profit)}</p>
              <p className={`text-xs mt-0.5 ${p.operating_profit>=0?'text-emerald-500':'text-red-500'}`}>Margen: {fmtPct(p.operating_margin)}</p>
            </div>
          </div>
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="font-semibold text-gray-900">Estado de Resultados</h2>
              <button onClick={() => printReport('Estado de Resultados', buildIncomeStatementHTML(p), range)}
                className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700">
                <Printer size={13} /> PDF
              </button>
            </div>
            <table className="w-full text-sm mt-4">
              <tbody>
                <tr className="bg-gray-50"><td colSpan={2} className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ingresos</td></tr>
                <tr className="border-t"><td className="px-5 py-2.5 text-gray-700">(+) Ventas brutas</td><td className="px-5 py-2.5 text-right font-semibold text-gray-900">{fmt(p.revenue)}</td></tr>
                {p.discounts>0 && <tr className="border-t"><td className="px-5 py-2.5 text-gray-500 pl-8">(-) Descuentos</td><td className="px-5 py-2.5 text-right text-red-600">({fmt(p.discounts)})</td></tr>}
                {p.returns>0   && <tr className="border-t"><td className="px-5 py-2.5 text-gray-500 pl-8">(-) Devoluciones</td><td className="px-5 py-2.5 text-right text-red-600">({fmt(p.returns)})</td></tr>}
                <tr className="border-t" style={{ backgroundColor: 'var(--brand-soft)' }}><td className="px-5 py-2.5 font-semibold" style={{ color: 'var(--ink)' }}>(=) Ingresos netos</td><td className="px-5 py-2.5 text-right font-bold" style={{ color: 'var(--brand)' }}>{fmt(p.net_revenue)}</td></tr>
                <tr className="bg-gray-50 border-t-2"><td colSpan={2} className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Costo de Mercadería Vendida</td></tr>
                <tr className="border-t"><td className="px-5 py-2.5 text-gray-700">(-) CMV</td><td className="px-5 py-2.5 text-right text-red-600">({fmt(p.cogs)})</td></tr>
                <tr className="border-t bg-green-50"><td className="px-5 py-2.5 font-semibold text-green-800">(=) GANANCIA BRUTA</td><td className="px-5 py-2.5 text-right font-bold text-green-800">{fmt(p.gross_profit)} <span className="ml-2 text-xs font-normal text-green-600">({fmtPct(p.gross_margin)})</span></td></tr>
                <tr className="bg-gray-50 border-t-2"><td colSpan={2} className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gastos Operativos</td></tr>
                {(p.expenses_by_category||[]).map((e,i) => (
                  <tr key={i} className="border-t"><td className="px-5 py-2.5 text-gray-500 pl-8">{e.category}</td><td className="px-5 py-2.5 text-right text-red-600">({fmt(e.total)})</td></tr>
                ))}
                {!p.expenses_by_category?.length && <tr className="border-t"><td colSpan={2} className="px-5 py-2.5 text-gray-400 text-center text-xs italic">Sin gastos en el período</td></tr>}
                <tr className="border-t"><td className="px-5 py-2.5 text-gray-700 font-medium">(-) Total gastos</td><td className="px-5 py-2.5 text-right font-semibold text-red-600">({fmt(p.expenses)})</td></tr>
                <tr className={`border-t-2 ${p.operating_profit>=0?'bg-emerald-50':'bg-red-50'}`}>
                  <td className={`px-5 py-3 font-bold text-lg ${p.operating_profit>=0?'text-emerald-800':'text-red-800'}`}>(=) {p.operating_profit>=0?'UTILIDAD':'PÉRDIDA'} OPERATIVA</td>
                  <td className={`px-5 py-3 text-right font-bold text-lg ${p.operating_profit>=0?'text-emerald-800':'text-red-800'}`}>{fmt(p.operating_profit)} <span className="ml-2 text-sm font-normal">({fmtPct(p.operating_margin)})</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          {p.by_category?.length>0 && (
            <div className="bg-white border rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Ganancia bruta por categoría</h2>
              <div className="grid grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={p.by_category} dataKey="gross_profit" nameKey="category_name" cx="50%" cy="50%" outerRadius={80}>
                      {p.by_category.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} /><Legend />
                  </PieChart>
                </ResponsiveContainer>
                <table className="text-sm self-start">
                  <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2 text-gray-500">Categoría</th><th className="text-right px-3 py-2 text-gray-500">Ingresos</th><th className="text-right px-3 py-2 text-gray-500">Ganancia</th><th className="text-right px-3 py-2 text-gray-500">Margen</th></tr></thead>
                  <tbody>
                    {p.by_category.map((c,i) => {
                      const m = c.revenue>0?(c.gross_profit/c.revenue*100).toFixed(1):'0';
                      return (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{background:COLORS[i%COLORS.length]}} />{c.category_name}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{fmt(c.revenue)}</td>
                          <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{fmt(c.gross_profit)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{m}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ PRODUCTOS ════════════════════════════════════════════════════════ */}
      {!loading && tab === 'products' && (
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top productos más vendidos</h2>
            <div className="flex gap-2">
              <button onClick={() => { const html = buildTableHTML([{label:'#'},{label:'Producto'},{label:'Categoría'},{label:'Unidades',right:true},{label:'Ingresos',right:true},{label:'Ganancia',right:true},{label:'Margen',right:true}], data.topProducts.map((p,i)=>[i+1,p.name,p.category_name,p.total_qty,fmt(p.total_revenue),fmt(p.profit),fmtPct(p.margin)])); printReport('Top Productos', html, range); }} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700"><Printer size={13}/> PDF</button>
              <button onClick={() => exportCSV(data.topProducts, 'top_productos.csv')} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700"><Download size={13}/> CSV</button>
            </div>
          </div>
          {data.topProducts.length===0 ? <p className="text-gray-400 text-center py-8">Sin ventas en el período</p> : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.topProducts.slice(0,10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{fontSize:11}} tickFormatter={v=>fmtK(v)} />
                  <YAxis dataKey="name" type="category" tick={{fontSize:11}} width={150} />
                  <Tooltip formatter={v=>fmt(v)} /><Legend />
                  <Bar dataKey="total_revenue" name="Ingresos" fill="#1F6E5A" radius={[0,4,4,0]} />
                  <Bar dataKey="profit" name="Ganancia" fill="#10b981" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
              <table className="w-full text-sm mt-4">
                <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2 text-gray-500">#</th><th className="text-left px-3 py-2 text-gray-500">Producto</th><th className="text-left px-3 py-2 text-gray-500">Categoría</th><th className="text-right px-3 py-2 text-gray-500">Unidades</th><th className="text-right px-3 py-2 text-gray-500">Ingresos</th><th className="text-right px-3 py-2 text-gray-500">Ganancia</th><th className="text-right px-3 py-2 text-gray-500">Margen</th></tr></thead>
                <tbody>
                  {data.topProducts.map((prod,i) => (
                    <tr key={prod.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{i+1}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{prod.name}</td>
                      <td className="px-3 py-2 text-gray-500">{prod.category_name}</td>
                      <td className="px-3 py-2 text-right">{prod.total_qty}</td>
                      <td className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--brand)' }}>{fmt(prod.total_revenue)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-600">{fmt(prod.profit)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${prod.margin>=30?'bg-green-100 text-green-700':prod.margin>=15?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-600'}`}>{fmtPct(prod.margin)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* ══ CLIENTES ═════════════════════════════════════════════════════════ */}
      {!loading && tab === 'customers' && (
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top 10 mejores clientes</h2>
            <div className="flex gap-2">
              <button onClick={() => { const html = buildTableHTML([{label:'#'},{label:'Cliente'},{label:'Teléfono'},{label:'Compras',right:true},{label:'Total',right:true},{label:'Ticket prom.',right:true}],data.topCustomers.map((c,i)=>[i+1,c.name,c.phone||'',c.total_sales,fmt(c.total_spent),fmt(c.avg_ticket)])); printReport('Top Clientes', html, range); }} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700"><Printer size={13}/> PDF</button>
              <button onClick={() => exportCSV(data.topCustomers, 'top_clientes.csv')} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700"><Download size={13}/> CSV</button>
            </div>
          </div>
          {data.topCustomers.length===0 ? <p className="text-gray-400 text-center py-8">Sin datos</p> : (
            <div className="space-y-3">
              {data.topCustomers.map((c,i) => (
                <div key={c.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'var(--brand)', color: '#fff' }}>{i+1}</span>
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">{c.name.charAt(0)}</div>
                  <div className="flex-1"><p className="font-medium text-gray-900">{c.name}</p><p className="text-xs text-gray-400">{c.phone} · {c.total_sales} compras</p></div>
                  <div className="text-right"><p className="font-bold text-gray-900">{fmt(c.total_spent)}</p><p className="text-xs text-gray-400">Ticket: {fmt(c.avg_ticket)}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ CATEGORÍAS ════════════════════════════════════════════════════════ */}
      {!loading && tab === 'categories' && (
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Ventas por categoría</h2>
            <div className="flex gap-2">
              <button onClick={() => { const html = buildTableHTML([{label:'Categoría'},{label:'Unidades',right:true},{label:'Ingresos',right:true},{label:'Ganancia',right:true},{label:'Margen',right:true}],data.salesByCategory.map(c=>[c.category_name||'Sin cat.',c.total_qty,fmt(c.total_revenue),fmt(c.profit),fmtPct(c.margin)])); printReport('Ventas por Categoría', html, range); }} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700"><Printer size={13}/> PDF</button>
              <button onClick={() => exportCSV(data.salesByCategory, 'ventas_por_categoria.csv')} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-700"><Download size={13}/> CSV</button>
            </div>
          </div>
          {data.salesByCategory.length===0 ? <p className="text-gray-400 text-center py-8">Sin ventas</p> : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.salesByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category_name" tick={{fontSize:11}} />
                  <YAxis tick={{fontSize:11}} tickFormatter={v=>fmtK(v)} />
                  <Tooltip formatter={v=>fmt(v)} /><Legend />
                  <Bar dataKey="total_revenue" name="Ingresos" fill="#1F6E5A" radius={[4,4,0,0]} />
                  <Bar dataKey="profit" name="Ganancia" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <table className="w-full text-sm mt-4">
                <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2 text-gray-500">Categoría</th><th className="text-right px-3 py-2 text-gray-500">Unidades</th><th className="text-right px-3 py-2 text-gray-500">Ingresos</th><th className="text-right px-3 py-2 text-gray-500">Ganancia</th><th className="text-right px-3 py-2 text-gray-500">Margen</th></tr></thead>
                <tbody>
                  {data.salesByCategory.map((c,i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{c.category_name||'Sin categoría'}</td>
                      <td className="px-3 py-2 text-right">{c.total_qty}</td>
                      <td className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--brand)' }}>{fmt(c.total_revenue)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-600">{fmt(c.profit)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.margin>=30?'bg-green-100 text-green-700':c.margin>=15?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-600'}`}>{fmtPct(c.margin)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* ══ DEVOLUCIONES ══════════════════════════════════════════════════════ */}
      {!loading && tab === 'returns' && (
        <div className="space-y-4">
          {!data.returnsSummary || data.returnsSummary.summary?.count==='0' ? (
            <div className="bg-white border rounded-xl p-10 text-center text-gray-400"><RotateCcw size={32} className="mx-auto mb-2 opacity-30" /><p>Sin devoluciones en el período</p></div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4"><p className="text-xs font-medium text-orange-600">Total devoluciones</p><p className="text-2xl font-bold text-orange-700 mt-1">{data.returnsSummary.summary?.count||0}</p></div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="text-xs font-medium text-red-600">Monto devuelto</p><p className="text-2xl font-bold text-red-700 mt-1">{fmt(data.returnsSummary.summary?.total)}</p></div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--brand-soft)', border: '1px solid var(--border)' }}><p className="text-xs font-medium" style={{ color: 'var(--brand)' }}>Cambios</p><p className="text-2xl font-bold mt-1" style={{ color: 'var(--brand)' }}>{data.returnsSummary.by_method?.reduce((s,r)=>s+parseInt(r.exchanges||0),0)||0}</p></div>
              </div>
              {data.returnsSummary.by_method?.length>0 && (
                <div className="bg-white border rounded-xl p-5">
                  <h2 className="font-semibold text-gray-900 mb-4">Por método de devolución</h2>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2 text-gray-500">Método</th><th className="text-right px-3 py-2 text-gray-500">Cantidad</th><th className="text-right px-3 py-2 text-gray-500">Monto</th></tr></thead>
                    <tbody>
                      {data.returnsSummary.by_method.map(r => (
                        <tr key={r.refund_method} className="border-t"><td className="px-3 py-2">{PAYMENT_LABELS[r.refund_method]||r.refund_method}</td><td className="px-3 py-2 text-right">{r.count}</td><td className="px-3 py-2 text-right font-semibold text-red-600">{fmt(r.total)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ INVENTARIO ════════════════════════════════════════════════════════ */}
      {!loading && tab === 'inventory' && data.inventoryValue && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--brand-soft)', border: '1px solid var(--border)' }}><p className="text-xs font-medium" style={{ color: 'var(--brand)' }}>Productos activos</p><p className="text-2xl font-bold mt-1" style={{ color: 'var(--brand)' }}>{data.inventoryValue.total_products}</p></div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4"><p className="text-xs font-medium text-indigo-600">Total unidades</p><p className="text-2xl font-bold text-indigo-700 mt-1">{data.inventoryValue.total_units}</p></div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4"><p className="text-xs font-medium text-orange-600">Valor al costo</p><p className="text-2xl font-bold text-orange-700 mt-1">{fmt(data.inventoryValue.inventory_cost)}</p></div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4"><p className="text-xs font-medium text-green-600">Ganancia potencial</p><p className="text-2xl font-bold text-green-700 mt-1">{fmt(data.inventoryValue.potential_profit)}</p></div>
          </div>
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-2">Valor de inventario al precio de venta</h2>
            <p className="text-3xl font-bold text-gray-900">{fmt(data.inventoryValue.inventory_value)}</p>
            <p className="text-sm text-gray-400 mt-1">Margen bruto potencial: {fmt(data.inventoryValue.potential_profit)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
