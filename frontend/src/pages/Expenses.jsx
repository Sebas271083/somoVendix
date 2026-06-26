import { useState, useEffect, useCallback, useRef } from 'react';
import { expensesApi, suppliersApi } from '../services/api';
import {
  Plus, X, CheckCircle, Clock, AlertCircle, Search,
  Paperclip, Eye, RefreshCw, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const STATUS_CONFIG = {
  pending:  { label: 'Pendiente', color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',  icon: Clock },
  paid:     { label: 'Pagado',    color: 'bg-green-100 text-green-700',  dot: 'bg-green-500', icon: CheckCircle },
  overdue:  { label: 'Vencido',   color: 'bg-red-100 text-red-600',      dot: 'bg-red-500',   icon: AlertCircle },
};

const APPROVAL_CONFIG = {
  awaiting_approval: { label: 'Esperando aprobación', color: 'bg-yellow-100 text-yellow-700' },
  approved:          { label: 'Aprobado',              color: 'bg-green-100 text-green-700' },
  rejected:          { label: 'Rechazado',             color: 'bg-red-100 text-red-600' },
};

const CATEGORIES = ['Alquiler', 'Servicios', 'Sueldos', 'Mercadería', 'Impuestos', 'Marketing', 'Mantenimiento', 'Transporte', 'General', 'Otro'];
const PERIODS = { weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' };

function RejectModal({ expense, onClose, onSuccess }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    setLoading(true);
    try {
      await expensesApi.reject(expense.id, notes);
      toast.success('Gasto rechazado');
      onSuccess();
    } catch (err) { toast.error(err?.error || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="rounded-xl shadow-xl w-full max-w-sm p-6" style={{ backgroundColor: 'var(--surface)' }}>
        <h3 className="font-semibold mb-3" style={{ color: 'var(--ink)' }}>Rechazar gasto</h3>
        <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>{expense.description} — {fmt(expense.amount)}</p>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          rows={3} placeholder="Motivo del rechazo (opcional)"
          className="input text-sm mb-4 resize-none"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center text-sm">Cancelar</button>
          <button onClick={handleReject} disabled={loading}
            className="btn-danger flex-1 justify-center text-sm disabled:opacity-60">
            {loading ? 'Rechazando...' : 'Rechazar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpenseModal({ expense, suppliers, onClose, onSuccess }) {
  const [form, setForm] = useState({
    description: expense?.description || '',
    amount: expense?.amount || '',
    category: expense?.category || 'General',
    due_date: expense?.due_date?.split('T')[0] || '',
    supplier_id: expense?.supplier_id || '',
    is_recurring: expense?.is_recurring ? true : false,
    recurrence_period: expense?.recurrence_period || 'monthly',
    payment_method: expense?.payment_method || 'efectivo',
    notes: expense?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [receiptPath, setReceiptPath] = useState(expense?.receipt_path || null);
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return toast.error('Completá descripción y monto');
    setLoading(true);
    try {
      if (expense?.id) await expensesApi.update(expense.id, form);
      else await expensesApi.create(form);
      toast.success(expense?.id ? 'Gasto actualizado' : 'Gasto creado');
      onSuccess();
    } catch (err) { toast.error(err?.error || 'Error al guardar'); }
    finally { setLoading(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !expense?.id) return;
    setUploadLoading(true);
    try {
      const res = await expensesApi.uploadReceipt(expense.id, file);
      setReceiptPath(res.receipt_path);
      toast.success('Comprobante adjuntado');
    } catch (err) { toast.error(err?.error || 'Error al subir comprobante'); }
    finally { setUploadLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center justify-between p-5 border-b sticky top-0" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>{expense?.id ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <button onClick={onClose} style={{ color: 'var(--muted)' }} className="hover:opacity-70"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Descripción *</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              className="input mt-1"
              placeholder="Ej: Alquiler local enero" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Monto *</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
                className="input mt-1"
                placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Vencimiento</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)}
                className="input mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="input mt-1">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Método de pago</label>
              <select value={form.payment_method} onChange={e => set('payment_method', e.target.value)}
                className="input mt-1">
                <option value="efectivo">Efectivo</option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Proveedor (opcional)</label>
            <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}
              className="input mt-1">
              <option value="">Sin proveedor</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 bg-purple-50 rounded-lg p-3">
            <input type="checkbox" id="recurring" checked={form.is_recurring}
              onChange={e => set('is_recurring', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300" />
            <label htmlFor="recurring" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <RefreshCw size={14} className="text-purple-600" /> Gasto recurrente
            </label>
            {form.is_recurring && (
              <select value={form.recurrence_period} onChange={e => set('recurrence_period', e.target.value)}
                className="input ml-auto py-1 text-sm w-auto">
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            )}
          </div>
          {form.is_recurring && (
            <p className="text-xs text-purple-700 -mt-2 px-1">
              Al marcar como pagado, se creará automáticamente el próximo gasto con la fecha siguiente.
            </p>
          )}
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} className="input mt-1 text-sm resize-none"
              placeholder="Observaciones opcionales..." />
          </div>

          {/* Receipt upload — only for existing expenses */}
          {expense?.id && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Paperclip size={14} /> Comprobante / Factura
              </p>
              {receiptPath ? (
                <div className="flex items-center gap-2">
                  <a href={receiptPath} target="_blank" rel="noreferrer"
                    className="text-sm hover:underline flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                    <Eye size={14} /> Ver comprobante adjunto
                  </a>
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="text-xs text-gray-400 hover:text-gray-600 underline">Reemplazar</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="text-sm hover:underline flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                  <Paperclip size={14} /> {uploadLoading ? 'Subiendo...' : 'Adjuntar comprobante'}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
              <p className="text-xs text-gray-400 mt-1">Imágenes o PDF, máx. 10 MB</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [modal, setModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [filters, setFilters] = useState({ status: '', category: '', search: '', approval_status: '' });
  const [loading, setLoading] = useState(true);
  const [showAwaitingOnly, setShowAwaitingOnly] = useState(false);

  const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
  const isAdmin = user.role === 'admin' || user.role === 'superadmin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: filters.status, category: filters.category };
      if (showAwaitingOnly) params.approval_status = 'awaiting_approval';
      const [exp, sum, sup] = await Promise.all([
        expensesApi.list(params),
        expensesApi.summary(),
        suppliersApi.list(),
      ]);
      setExpenses(exp);
      setSummary(sum);
      setSuppliers(sup);
    } catch { toast.error('Error al cargar gastos'); }
    finally { setLoading(false); }
  }, [filters.status, filters.category, showAwaitingOnly]);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async (id) => {
    try {
      await expensesApi.markPaid(id);
      toast.success('Marcado como pagado');
      load();
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  const handleApprove = async (id) => {
    try {
      await expensesApi.approve(id);
      toast.success('Gasto aprobado');
      load();
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await expensesApi.delete(id);
      toast.success('Gasto eliminado');
      load();
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  const filtered = expenses.filter(e =>
    e.description.toLowerCase().includes(filters.search.toLowerCase()) ||
    (e.supplier_name || '').toLowerCase().includes(filters.search.toLowerCase())
  );

  const awaitingCount = summary?.awaiting_count || 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-gray-500 text-sm mt-1">Control de egresos y vencimientos</p>
        </div>
        <button onClick={() => setModal({})} className="btn-primary text-sm">
          <Plus size={16} /> Nuevo gasto
        </button>
      </div>

      {/* Approval alert */}
      {isAdmin && awaitingCount > 0 && (
        <div
          onClick={() => setShowAwaitingOnly(v => !v)}
          className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 cursor-pointer hover:bg-yellow-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-yellow-600" />
            <span className="text-yellow-800 font-medium text-sm">
              {awaitingCount} gasto{awaitingCount > 1 ? 's' : ''} esperando aprobación
            </span>
          </div>
          <span className="text-yellow-700 text-xs font-medium">
            {showAwaitingOnly ? 'Ver todos' : 'Ver pendientes de aprobación'}
          </span>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-600">Pendientes</p>
            <p className="text-2xl font-bold text-gray-700 mt-1">{summary.pending_count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{fmt(summary.pending_amount)}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs font-medium text-green-600">Pagados este mes</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{summary.paid_count}</p>
            <p className="text-xs text-green-500 mt-0.5">{fmt(summary.paid_this_month)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-medium text-red-600">Vencidos</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{summary.overdue_count}</p>
            <p className="text-xs text-red-500 mt-0.5">{fmt(summary.overdue_amount)}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--brand-soft)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--brand)' }}>Total gastos</p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--brand)' }}>{summary.total}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Buscar gasto o proveedor..."
            className="input pl-9 text-sm w-full" />
        </div>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="input text-sm w-auto">
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="paid">Pagados</option>
          <option value="overdue">Vencidos</option>
        </select>
        <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
          className="input text-sm w-auto">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No hay gastos</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(expense => {
            const cfg = STATUS_CONFIG[expense.status] || STATUS_CONFIG.pending;
            const appr = APPROVAL_CONFIG[expense.approval_status];
            const isAwaiting = expense.approval_status === 'awaiting_approval';
            const isRejected = expense.approval_status === 'rejected';

            return (
              <div key={expense.id}
                className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${isAwaiting ? 'border-yellow-300 bg-yellow-50/30' : ''} ${isRejected ? 'border-red-200 bg-red-50/20' : ''}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 truncate">{expense.description}</p>
                    {expense.is_recurring && (
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <RefreshCw size={10} /> {PERIODS[expense.recurrence_period] || 'Recurrente'}
                      </span>
                    )}
                    {appr && expense.approval_status !== 'approved' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${appr.color}`}>{appr.label}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{expense.category}</span>
                    {expense.due_date && (
                      <span className="text-xs text-gray-400">
                        Vence: {new Date(expense.due_date).toLocaleDateString('es-AR')}
                      </span>
                    )}
                    {expense.supplier_name && (
                      <span className="text-xs text-gray-500 font-medium">{expense.supplier_name}</span>
                    )}
                    {expense.receipt_path && (
                      <a href={expense.receipt_path} target="_blank" rel="noreferrer"
                        className="text-xs hover:underline flex items-center gap-0.5" style={{ color: 'var(--brand)' }}>
                        <Paperclip size={11} /> Comprobante
                      </a>
                    )}
                  </div>
                  {isRejected && expense.rejection_notes && (
                    <p className="text-xs text-red-600 mt-1">Motivo: {expense.rejection_notes}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">{fmt(expense.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                </div>
                <div className="flex gap-1 ml-1 flex-shrink-0">
                  {/* Approve/Reject buttons (admin only, awaiting) */}
                  {isAdmin && isAwaiting && (
                    <>
                      <button onClick={() => handleApprove(expense.id)}
                        title="Aprobar" className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg">
                        <ThumbsUp size={15} />
                      </button>
                      <button onClick={() => setRejectModal(expense)}
                        title="Rechazar" className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg">
                        <ThumbsDown size={15} />
                      </button>
                    </>
                  )}
                  {/* Mark paid — only approved or no-approval-column expenses */}
                  {expense.status !== 'paid' && !isAwaiting && !isRejected && (
                    <button onClick={() => handleMarkPaid(expense.id)}
                      title="Marcar como pagado"
                      className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg">
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button onClick={() => setModal(expense)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1.5 rounded-lg text-xs">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(expense.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg">
                    <X size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <ExpenseModal
          expense={modal?.id ? modal : null}
          suppliers={suppliers}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); load(); }}
        />
      )}

      {rejectModal && (
        <RejectModal
          expense={rejectModal}
          onClose={() => setRejectModal(null)}
          onSuccess={() => { setRejectModal(null); load(); }}
        />
      )}
    </div>
  );
}
