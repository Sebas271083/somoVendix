import { useState, useEffect } from 'react';
import {
  Archive, Plus, Minus, Lock, Printer, X, History,
  ChevronDown, ChevronUp, Users, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { cashRegisterApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
const fmtShort = (n) => `$${Number(n ?? 0).toLocaleString('es-AR')}`;

const METHOD_COLOR = {
  efectivo: 'text-green-700',
  debito: 'text-brand',
  credito: 'text-purple-700',
  transferencia: 'text-indigo-700',
  cuenta_corriente: 'text-orange-700',
  cuotas: 'text-pink-700',
  mixto: 'text-gray-700',
};

const BILLS = [20000, 10000, 5000, 2000, 1000, 500, 200, 100];

// ─── Arqueo + Close Modal ────────────────────────────────────────────────────
function CloseModal({ register, onClose, onConfirm }) {
  const [counts, setCounts] = useState(Object.fromEntries(BILLS.map(b => [b, ''])));
  const [coins, setCoins] = useState('');
  const [notes, setNotes] = useState('');

  const physicalTotal =
    BILLS.reduce((s, b) => s + (Number(counts[b]) || 0) * b, 0) + (Number(coins) || 0);

  const expectedCash = register
    ? Number(register.opening_amount) + Number(register.cash_sales ?? 0) +
      Number(register.income ?? 0) - Number(register.expenses ?? 0)
    : 0;

  const diff = physicalTotal - expectedCash;

  const byMethod = register?.sales_by_method || [];
  const movements = register?.movements || [];

  const handlePrint = () => {
    const billRows = BILLS.filter(b => Number(counts[b]) > 0)
      .map(b => `<tr><td>$${b.toLocaleString('es-AR')}</td><td>${counts[b]}</td><td style="text-align:right">$${(b * Number(counts[b])).toLocaleString('es-AR')}</td></tr>`)
      .join('');

    const methodRows = byMethod
      .map(m => `<tr><td>${m.label}</td><td>${m.count} ventas</td><td style="text-align:right">$${m.total.toLocaleString('es-AR')}</td></tr>`)
      .join('');

    const movRows = movements
      .map(m => `<tr><td>${m.type === 'income' ? 'Ingreso' : 'Egreso'}</td><td>${m.description}</td><td style="text-align:right">${m.type === 'income' ? '+' : '-'}$${Number(m.amount).toLocaleString('es-AR')}</td></tr>`)
      .join('');

    const win = window.open('', '_blank', 'width=420,height=700');
    win.document.write(`<!DOCTYPE html><html><head><title>Cierre de caja</title>
      <style>
        body{font-family:monospace;font-size:12px;padding:10px;margin:0}
        h2{text-align:center;margin:0 0 4px;font-size:15px}
        .center{text-align:center} .right{text-align:right} .bold{font-weight:bold}
        hr{border:none;border-top:1px dashed #000;margin:6px 0}
        table{width:100%;border-collapse:collapse}td{padding:2px 1px;vertical-align:top}
        .diff-ok{color:green} .diff-bad{color:red} .diff-zero{color:#666}
      </style></head><body>
      <h2>CIERRE DE CAJA</h2>
      <div class="center">${new Date().toLocaleString('es-AR')}</div>
      <div>Cajero: ${register?.user_name || ''}</div>
      ${register?.register_name ? `<div>Caja: ${register.register_name}</div>` : ''}
      <hr/>
      <div class="bold">RESUMEN DE VENTAS</div>
      <table>${methodRows || '<tr><td colspan="3">Sin ventas</td></tr>'}</table>
      <div class="bold">Total ventas: $${(register?.sales ?? 0).toLocaleString('es-AR')}</div>
      <hr/>
      ${movements.length ? `<div class="bold">MOVIMIENTOS</div><table>${movRows}</table><hr/>` : ''}
      <div class="bold">ARQUEO DE EFECTIVO</div>
      <div>Apertura: $${Number(register?.opening_amount || 0).toLocaleString('es-AR')}</div>
      <div>Ventas efectivo: $${Number(register?.cash_sales || 0).toLocaleString('es-AR')}</div>
      ${movements.filter(m=>m.type==='income').length ? `<div>Ingresos extra: +$${Number(register?.income||0).toLocaleString('es-AR')}</div>` : ''}
      ${movements.filter(m=>m.type==='expense').length ? `<div>Egresos: -$${Number(register?.expenses||0).toLocaleString('es-AR')}</div>` : ''}
      <div class="bold">Efectivo esperado: $${expectedCash.toLocaleString('es-AR')}</div>
      <hr/>
      <div class="bold">CONTEO DE BILLETES</div>
      <table>${billRows || '<tr><td colspan="3">Sin conteo registrado</td></tr>'}</table>
      ${Number(coins) > 0 ? `<div>Monedas: $${Number(coins).toLocaleString('es-AR')}</div>` : ''}
      <div class="bold">Total físico: $${physicalTotal.toLocaleString('es-AR')}</div>
      <hr/>
      <div class="bold ${diff === 0 ? 'diff-zero' : diff > 0 ? 'diff-ok' : 'diff-bad'}">
        Diferencia: ${diff >= 0 ? '+' : ''}$${diff.toLocaleString('es-AR')} ${diff > 0 ? '(SOBRANTE)' : diff < 0 ? '(FALTANTE)' : '(EXACTO)'}
      </div>
      ${notes ? `<hr/><div>Observaciones: ${notes}</div>` : ''}
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const handleSubmit = () => {
    onConfirm({ counted_amount: physicalTotal, notes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-lg">Arqueo y cierre de caja</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Ventas por método */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Ventas por método de pago</p>
            {byMethod.length === 0
              ? <p className="text-sm text-gray-400">Sin ventas en esta caja</p>
              : (
                <div className="space-y-1">
                  {byMethod.map(m => (
                    <div key={m.method} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                      <span className={`font-medium ${METHOD_COLOR[m.method] || 'text-gray-700'}`}>{m.label}</span>
                      <span className="text-gray-400 text-xs">{m.count} venta{m.count !== 1 ? 's' : ''}</span>
                      <span className="font-semibold">{fmtShort(m.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-sm pt-1">
                    <span>Total ventas</span>
                    <span>{fmtShort(register?.sales)}</span>
                  </div>
                </div>
              )
            }
          </div>

          {/* Movimientos */}
          {movements.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Movimientos de caja</p>
              <div className="space-y-1">
                {movements.map(m => (
                  <div key={m.id} className="flex items-start justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="text-gray-700">{m.description}</span>
                      <span className="text-xs text-gray-400 ml-2">{m.user_name}</span>
                    </div>
                    <span className={`font-medium ml-2 shrink-0 ${m.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.type === 'income' ? '+' : '-'}{fmtShort(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expected cash summary */}
          <div className="rounded-xl p-4 space-y-1.5" style={{ backgroundColor: 'var(--brand-soft)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>Efectivo esperado en caja</p>
            <div className="flex justify-between text-sm" style={{ color: 'var(--brand)' }}>
              <span>Apertura</span><span>{fmt(register?.opening_amount)}</span>
            </div>
            <div className="flex justify-between text-sm" style={{ color: 'var(--brand)' }}>
              <span>Ventas efectivo</span><span>+{fmt(register?.cash_sales)}</span>
            </div>
            {Number(register?.income) > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Ingresos extra</span><span>+{fmt(register?.income)}</span>
              </div>
            )}
            {Number(register?.expenses) > 0 && (
              <div className="flex justify-between text-sm text-red-700">
                <span>Egresos / retiros</span><span>-{fmt(register?.expenses)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-1.5" style={{ borderColor: 'var(--brand)', color: 'var(--ink)' }}>
              <span>Total esperado</span><span>{fmt(expectedCash)}</span>
            </div>
          </div>

          {/* Bill counter */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Conteo de billetes</p>
            <div className="space-y-1.5">
              {BILLS.map(b => (
                <div key={b} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-gray-600 font-mono">{fmtShort(b)}</span>
                  <input
                    type="number" min="0" value={counts[b]}
                    onChange={e => setCounts(p => ({ ...p, [b]: e.target.value }))}
                    className="input w-20 text-center py-1 text-sm"
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-400 w-28 text-right">
                    {Number(counts[b]) > 0 ? fmtShort(b * Number(counts[b])) : ''}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-1 border-t">
                <span className="w-28 text-sm text-gray-600">Monedas</span>
                <input type="number" min="0" value={coins} onChange={e => setCoins(e.target.value)}
                  className="input w-20 text-center py-1 text-sm" placeholder="0" />
              </div>
            </div>
          </div>

          {/* Diff */}
          <div className={`rounded-xl p-4 space-y-1 ${diff === 0 ? 'bg-green-50' : diff > 0 ? 'bg-brand-soft' : 'bg-red-50'}`}>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total físico contado</span>
              <span className="font-bold text-lg">{fmt(physicalTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Efectivo esperado</span>
              <span className="font-medium">{fmt(expectedCash)}</span>
            </div>
            <div className={`flex justify-between font-bold text-base pt-1 border-t ${diff === 0 ? 'text-green-700 border-green-200' : diff > 0 ? 'text-brand border-brand/30' : 'text-red-700 border-red-200'}`}>
              <span className="flex items-center gap-1.5">
                {diff === 0 ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                Diferencia
              </span>
              <span>{diff >= 0 ? '+' : ''}{fmt(diff)}</span>
            </div>
            {diff !== 0 && (
              <p className="text-xs text-gray-500">
                {diff > 0 ? 'Sobrante en caja' : 'Faltante en caja'}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Observaciones del cierre</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="input resize-none" placeholder="Notas..." />
          </div>
        </div>

        <div className="p-5 border-t flex gap-2">
          <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5">
            <Printer size={14} /> Imprimir arqueo
          </button>
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={handleSubmit} className="btn-danger flex-1 justify-center">
            <Lock size={14} /> Cerrar caja
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── History Section ─────────────────────────────────────────────────────────
function HistorySection() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    cashRegisterApi.history().then(setRecords).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const printRecord = (r) => {
    const methodRows = (r.sales_by_method || [])
      .map(m => `<tr><td>${m.label}</td><td>${m.count} ventas</td><td style="text-align:right">$${m.total.toLocaleString('es-AR')}</td></tr>`)
      .join('');
    const diff = r.diff;
    const win = window.open('', '_blank', 'width=420,height=600');
    win.document.write(`<!DOCTYPE html><html><head><title>Cierre de caja</title>
      <style>body{font-family:monospace;font-size:12px;padding:10px}h2{text-align:center;font-size:15px;margin:0 0 4px}
      hr{border:none;border-top:1px dashed #000;margin:6px 0}table{width:100%;border-collapse:collapse}td{padding:2px 1px}
      .bold{font-weight:bold}.center{text-align:center}.green{color:green}.red{color:red}</style></head><body>
      <h2>CIERRE DE CAJA</h2>
      <div class="center">${new Date(r.closed_at).toLocaleString('es-AR')}</div>
      <div>Cajero: ${r.user_name}</div>
      ${r.register_name ? `<div>Caja: ${r.register_name}</div>` : ''}
      <hr/>
      <div class="bold">VENTAS POR MÉTODO</div>
      <table>${methodRows || '<tr><td>Sin ventas</td></tr>'}</table>
      <div class="bold">Total ventas: $${Number(r.sales_total).toLocaleString('es-AR')} (${r.sales_count} tickets)</div>
      <hr/>
      <div>Apertura: $${Number(r.opening_amount).toLocaleString('es-AR')}</div>
      <div>Ventas efectivo: $${Number(r.cash_sales).toLocaleString('es-AR')}</div>
      ${r.income > 0 ? `<div>Ingresos extra: +$${Number(r.income).toLocaleString('es-AR')}</div>` : ''}
      ${r.expenses > 0 ? `<div>Egresos: -$${Number(r.expenses).toLocaleString('es-AR')}</div>` : ''}
      <div class="bold">Efectivo esperado: $${Number(r.expected_cash).toLocaleString('es-AR')}</div>
      ${r.counted_amount !== null ? `<div class="bold">Efectivo contado: $${Number(r.counted_amount).toLocaleString('es-AR')}</div>` : ''}
      ${diff !== null ? `<div class="bold ${diff >= 0 ? 'green' : 'red'}">Diferencia: ${diff >= 0 ? '+' : ''}$${Number(diff).toLocaleString('es-AR')}</div>` : ''}
      ${r.notes ? `<hr/><div>Obs: ${r.notes}</div>` : ''}
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  if (loading) return <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />;
  if (!records.length) return (
    <div className="card p-6 text-center text-gray-400 text-sm">
      <History size={24} className="mx-auto mb-2 opacity-30" />
      Sin cajas cerradas aún
    </div>
  );

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-2">
        <History size={15} className="text-gray-500" />
        <span className="font-medium text-gray-700 text-sm">Historial de cajas</span>
      </div>
      <div className="divide-y divide-gray-50">
        {records.map(r => {
          const isOpen = expanded === r.id;
          const diff = r.diff;
          return (
            <div key={r.id}>
              <button onClick={() => setExpanded(isOpen ? null : r.id)}
                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(r.closed_at).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' })}
                    <span className="ml-2 text-xs font-normal text-gray-400">{r.user_name}</span>
                    {r.register_name && <span className="ml-1 text-xs font-normal" style={{ color: 'var(--brand)' }}>{r.register_name}</span>}
                  </p>
                  <p className="text-xs text-gray-400">{r.sales_count} ventas · {fmtShort(r.sales_total)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{fmtShort(r.counted_amount ?? r.expected_cash)}</p>
                  {diff !== null && (
                    <p className={`text-xs font-medium ${diff === 0 ? 'text-gray-400' : diff < 0 ? 'text-red-500' : ''}`}
                       style={diff > 0 ? { color: 'var(--brand)' } : {}}>
                      {diff >= 0 ? '+' : ''}{fmtShort(diff)}
                    </p>
                  )}
                </div>
                {isOpen ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-5 pb-4 pt-2 bg-gray-50 border-t border-gray-100 space-y-3">
                  {/* Method breakdown */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Ventas por método</p>
                    <div className="space-y-0.5">
                      {(r.sales_by_method || []).map(m => (
                        <div key={m.method} className="flex justify-between text-xs text-gray-600">
                          <span className={METHOD_COLOR[m.method]}>{m.label} ({m.count})</span>
                          <span className="font-medium">{fmtShort(m.total)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-semibold border-t pt-0.5">
                        <span>Total</span><span>{fmtShort(r.sales_total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-gray-400">Apertura</p><p className="font-medium">{fmtShort(r.opening_amount)}</p></div>
                    <div><p className="text-xs text-gray-400">Efectivo esperado</p><p className="font-medium">{fmtShort(r.expected_cash)}</p></div>
                    {r.counted_amount !== null && (
                      <div><p className="text-xs text-gray-400">Efectivo contado</p><p className="font-medium">{fmtShort(r.counted_amount)}</p></div>
                    )}
                    {diff !== null && (
                      <div>
                        <p className="text-xs text-gray-400">Diferencia</p>
                        <p className={`font-semibold ${diff === 0 ? 'text-gray-600' : diff > 0 ? 'text-brand' : 'text-red-500'}`}>
                          {diff >= 0 ? '+' : ''}{fmtShort(diff)} {diff > 0 ? '(sobrante)' : diff < 0 ? '(faltante)' : '(exacto)'}
                        </p>
                      </div>
                    )}
                    {r.income > 0 && <div><p className="text-xs text-gray-400">Ingresos extra</p><p className="font-medium text-green-600">+{fmtShort(r.income)}</p></div>}
                    {r.expenses > 0 && <div><p className="text-xs text-gray-400">Egresos</p><p className="font-medium text-red-600">-{fmtShort(r.expenses)}</p></div>}
                    {r.notes && <div className="col-span-2"><p className="text-xs text-gray-400">Obs.</p><p className="text-sm text-gray-600">{r.notes}</p></div>}
                  </div>

                  <button onClick={() => printRecord(r)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border rounded-lg px-3 py-1.5 hover:bg-white">
                    <Printer size={12} /> Imprimir resumen
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── All-open panel (admin only) ─────────────────────────────────────────────
function AllOpenPanel({ onSelect }) {
  const [registers, setRegisters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cashRegisterApi.allOpen().then(setRegisters).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !registers.length) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b bg-amber-50 flex items-center gap-2">
        <Users size={15} className="text-amber-600" />
        <span className="font-medium text-amber-700 text-sm">Cajas abiertas ({registers.length})</span>
      </div>
      <div className="divide-y divide-gray-50">
        {registers.map(r => (
          <div key={r.id} className="flex items-center gap-4 px-5 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{r.user_name}
                {r.register_name && <span className="ml-1 text-xs" style={{ color: 'var(--brand)' }}>· {r.register_name}</span>}
              </p>
              <p className="text-xs text-gray-400">Apertura {new Date(r.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · {r.sales_count || 0} ventas</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-green-700">{fmtShort(r.running_total)}</p>
              <p className="text-xs text-gray-400">ventas</p>
            </div>
            <button onClick={() => onSelect(r)} className="btn-secondary text-xs py-1 px-2">Ver</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CashRegister() {
  const { isAdmin } = useAuth();
  const [register, setRegister] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [movement, setMovement] = useState({ type: 'income', amount: '', description: '' });
  const [showClose, setShowClose] = useState(false);
  const [viewingRegister, setViewingRegister] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setRegister(await cashRegisterApi.current()); }
    catch { setRegister(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleOpen = async (e) => {
    e.preventDefault();
    try {
      const r = await cashRegisterApi.open({
        opening_amount: parseFloat(openingAmount) || 0,
        register_name: registerName.trim() || null,
      });
      setRegister(r);
      setOpeningAmount('');
      setRegisterName('');
      toast.success('Caja abierta');
    } catch (err) { toast.error(err?.error || 'Error al abrir la caja'); }
  };

  const handleMovement = async (e) => {
    e.preventDefault();
    try {
      const summary = await cashRegisterApi.addMovement({ ...movement, amount: parseFloat(movement.amount) });
      setRegister(prev => prev ? { ...prev, ...summary } : prev);
      setMovement({ type: 'income', amount: '', description: '' });
      toast.success(movement.type === 'income' ? 'Ingreso registrado' : 'Egreso/retiro registrado');
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  const handleClose = async ({ counted_amount, notes }) => {
    try {
      await cashRegisterApi.close(register.id, { counted_amount, notes });
      toast.success('Caja cerrada correctamente');
      setShowClose(false);
      setRegister(null);
      load();
    } catch (err) { toast.error(err?.error || 'Error al cerrar la caja'); }
  };

  // Admin viewing another cashier's register
  const loadViewingRegister = async (r) => {
    try {
      const full = await cashRegisterApi.summary(r.id);
      setViewingRegister(full);
    } catch { toast.error('Error al cargar caja'); }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Cargando...</div>;

  const activeRegister = viewingRegister || register;
  const isViewing = !!viewingRegister;
  const byMethod = activeRegister?.sales_by_method || [];
  const movements = activeRegister?.movements || [];
  const expectedCash = activeRegister
    ? Number(activeRegister.opening_amount) + Number(activeRegister.cash_sales ?? 0) +
      Number(activeRegister.income ?? 0) - Number(activeRegister.expenses ?? 0)
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Caja diaria</h1>
          {isViewing && (
            <p className="text-sm text-amber-600">Viendo caja de: {viewingRegister.user_name}</p>
          )}
        </div>
        <div className="flex gap-2">
          {isViewing && (
            <button onClick={() => setViewingRegister(null)} className="btn-secondary text-sm">
              ← Volver a mi caja
            </button>
          )}
          {activeRegister && !isViewing && (
            <button onClick={() => setShowClose(true)}
              className="btn border-2 border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 focus:ring-amber-400">
              <Lock size={15} /> Cerrar caja
            </button>
          )}
        </div>
      </div>

      {/* Admin: all open registers */}
      {isAdmin && !isViewing && (
        <AllOpenPanel onSelect={loadViewingRegister} />
      )}

      {!activeRegister && !isViewing ? (
        <div className="card p-8 max-w-sm mx-auto text-center">
          <Archive size={40} className="text-gray-300 mx-auto mb-3" />
          <h2 className="font-semibold text-gray-700 mb-1">No hay caja abierta</h2>
          <p className="text-sm text-gray-400 mb-5">Abrí la caja para empezar a operar</p>
          <form onSubmit={handleOpen} className="space-y-3 text-left">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nombre de caja (opcional)</label>
              <input value={registerName} onChange={e => setRegisterName(e.target.value)} placeholder="Ej: Caja 1" className="input" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Monto inicial en efectivo</label>
              <input required type="number" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)}
                placeholder="$ 0" className="input text-center" />
            </div>
            <button type="submit" className="btn-primary w-full justify-center">Abrir caja</button>
          </form>
        </div>
      ) : activeRegister && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 overflow-auto">
          {/* Left: register info */}
          <div className="space-y-4">
            {/* Header info */}
            <div className="card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400">Cajero</p>
                  <p className="font-semibold">{activeRegister.user_name}</p>
                  {activeRegister.register_name && <p className="text-xs" style={{ color: 'var(--brand)' }}>{activeRegister.register_name}</p>}
                  <p className="text-xs text-gray-400">{new Date(activeRegister.opened_at).toLocaleString('es-AR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Apertura</p>
                  <p className="text-lg font-bold text-green-700">{fmtShort(activeRegister.opening_amount)}</p>
                </div>
              </div>

              {/* Sales by method */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Ventas por método de pago</p>
                {byMethod.length === 0
                  ? <p className="text-sm text-gray-400">Sin ventas aún</p>
                  : (
                    <div className="space-y-1">
                      {byMethod.map(m => (
                        <div key={m.method} className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${METHOD_COLOR[m.method] || 'text-gray-700'}`}>{m.label}</span>
                          <span className="text-xs text-gray-400">{m.count} venta{m.count !== 1 ? 's' : ''}</span>
                          <span className="font-semibold">{fmtShort(m.total)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-sm border-t pt-1">
                        <span>Total ventas</span>
                        <span style={{ color: 'var(--brand)' }}>{fmtShort(activeRegister.sales)}</span>
                      </div>
                    </div>
                  )
                }
              </div>

              {/* Efectivo esperado */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-xs font-medium text-gray-500 mb-1">Efectivo en caja</p>
                <div className="flex justify-between text-gray-600">
                  <span>Apertura + ventas efectivo</span>
                  <span>{fmtShort(Number(activeRegister.opening_amount) + Number(activeRegister.cash_sales ?? 0))}</span>
                </div>
                {Number(activeRegister.income) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>+ Ingresos</span><span>{fmtShort(activeRegister.income)}</span>
                  </div>
                )}
                {Number(activeRegister.expenses) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>- Egresos</span><span>{fmtShort(activeRegister.expenses)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-1 mt-1">
                  <span>Total esperado</span>
                  <span style={{ color: 'var(--brand)' }}>{fmtShort(expectedCash)}</span>
                </div>
              </div>
            </div>

            {/* Movements list */}
            {movements.length > 0 && (
              <div className="card p-5">
                <p className="text-sm font-medium text-gray-700 mb-2">Movimientos de caja</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {movements.map(m => (
                    <div key={m.id} className="flex items-start justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-700">{m.description}</span>
                        <span className="text-xs text-gray-400 ml-1">{m.user_name}</span>
                      </div>
                      <span className={`font-medium ml-2 shrink-0 ${m.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.type === 'income' ? '+' : '-'}{fmtShort(m.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: add movement */}
          {!isViewing && (
            <div className="card p-5 self-start">
              <h3 className="font-medium text-gray-800 mb-4">Registrar movimiento</h3>
              <form onSubmit={handleMovement} className="space-y-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMovement(p => ({ ...p, type: 'income' }))}
                    className={`flex-1 btn gap-2 justify-center ${movement.type === 'income' ? 'bg-green-100 text-green-700 border border-green-300' : 'btn-secondary'}`}>
                    <Plus size={15} /> Ingreso
                  </button>
                  <button type="button" onClick={() => setMovement(p => ({ ...p, type: 'expense' }))}
                    className={`flex-1 btn gap-2 justify-center ${movement.type === 'expense' ? 'bg-red-100 text-red-700 border border-red-300' : 'btn-secondary'}`}>
                    <Minus size={15} /> Egreso / retiro
                  </button>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Monto</label>
                  <input required type="number" value={movement.amount}
                    onChange={e => setMovement(p => ({ ...p, amount: e.target.value }))}
                    placeholder="$ 0" className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
                  <input required value={movement.description}
                    onChange={e => setMovement(p => ({ ...p, description: e.target.value }))}
                    placeholder={movement.type === 'income' ? 'Ej: Fondo de cambio adicional' : 'Ej: Retiro para depósito bancario'}
                    className="input" />
                </div>
                <button type="submit" className="btn-primary w-full justify-center">Registrar</button>
              </form>
            </div>
          )}
        </div>
      )}

      {showClose && register && (
        <CloseModal register={register} onClose={() => setShowClose(false)} onConfirm={handleClose} />
      )}

      <div className="mt-2">
        <HistorySection />
      </div>
    </div>
  );
}
