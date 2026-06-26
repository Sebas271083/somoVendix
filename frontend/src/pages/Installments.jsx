import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { installmentsApi } from '../services/api.js';
import toast from 'react-hot-toast';

function InstallmentRow({ inst, onPay }) {
  const isPast = !inst.paid && new Date(inst.due_date + 'T00:00:00') < new Date();
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm ${inst.paid ? 'bg-green-50' : isPast ? 'bg-red-50' : 'bg-gray-50'}`}>
      <div className="w-6 flex justify-center">
        {inst.paid
          ? <CheckCircle size={16} className="text-green-500" />
          : isPast
            ? <AlertCircle size={16} className="text-red-500" />
            : <Clock size={16} className="text-gray-400" />
        }
      </div>
      <span className="w-20 font-medium">Cuota {inst.installment_number}</span>
      <span className="w-28 text-gray-500">{new Date(inst.due_date + 'T00:00:00').toLocaleDateString('es-AR')}</span>
      <span className="flex-1 font-semibold">$ {Number(inst.amount).toLocaleString('es-AR')}</span>
      {inst.paid ? (
        <span className="text-green-600 text-xs">{inst.paid_by_name} · {new Date(inst.paid_date).toLocaleDateString('es-AR')}</span>
      ) : (
        <button onClick={() => onPay(inst)} className="btn-primary text-xs px-3 py-1.5">
          Registrar pago
        </button>
      )}
    </div>
  );
}

function PlanCard({ plan }) {
  const [open, setOpen] = useState(false);
  const [installments, setInstallments] = useState([]);
  const [loadingInst, setLoadingInst] = useState(false);
  const [paying, setPaying] = useState(null);
  const [payNotes, setPayNotes] = useState('');

  const loadInstallments = async () => {
    setLoadingInst(true);
    try { setInstallments(await installmentsApi.getInstallments(plan.id)); }
    catch { setInstallments([]); }
    finally { setLoadingInst(false); }
  };

  const toggle = () => {
    setOpen(o => !o);
    if (!open && !installments.length) loadInstallments();
  };

  const handlePay = async () => {
    try {
      await installmentsApi.markPaid(paying.id, { notes: payNotes });
      toast.success('Cuota registrada como pagada');
      setPaying(null);
      setPayNotes('');
      loadInstallments();
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  const paidCount = parseInt(plan.paid_count) || 0;
  const total = parseInt(plan.total_installments) || 0;
  const overdue = parseInt(plan.overdue_count) || 0;

  return (
    <div className="card overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 text-left">
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <p className="text-xs text-gray-500">Ticket</p>
            <p className="font-mono text-sm font-medium">#{plan.ticket_number}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cliente</p>
            <p className="text-sm font-medium">{plan.customer_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cuotas</p>
            <p className="text-sm">{paidCount}/{total} pagadas · $ {Number(plan.amount_per_installment).toLocaleString('es-AR')} c/u</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total con interés</p>
            <p className="text-sm font-semibold text-blue-700">$ {Number(plan.total_with_interest).toLocaleString('es-AR')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overdue > 0 && <span className="badge bg-red-100 text-red-600">{overdue} vencida{overdue > 1 ? 's' : ''}</span>}
          {paidCount === total && <span className="badge bg-green-100 text-green-700">Completado</span>}
          {paidCount < total && overdue === 0 && <span className="badge bg-blue-100 text-blue-700">Al día</span>}
        </div>
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-2">
          {loadingInst
            ? <div className="h-10 bg-gray-100 rounded animate-pulse" />
            : installments.map(inst => (
                <InstallmentRow key={inst.id} inst={inst} onPay={setPaying} />
              ))}
        </div>
      )}

      {paying && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="font-semibold">Registrar pago</h3>
            <p className="text-sm text-gray-600">Cuota {paying.installment_number} — $ {Number(paying.amount).toLocaleString('es-AR')}</p>
            <p className="text-xs text-gray-400">Vencimiento: {new Date(paying.due_date + 'T00:00:00').toLocaleDateString('es-AR')}</p>
            <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)}
              rows={2} placeholder="Observaciones (opcional)" className="input resize-none w-full" />
            <div className="flex gap-3">
              <button onClick={() => setPaying(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handlePay} className="btn-success flex-1 justify-center">Confirmar pago</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Installments() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try { setPlans(await installmentsApi.plans()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = plans.filter(p => {
    if (!filter) return true;
    const s = filter.toLowerCase();
    return p.customer_name?.toLowerCase().includes(s) || String(p.ticket_number).includes(s);
  });

  const pending = plans.filter(p => parseInt(p.paid_count) < parseInt(p.total_installments));
  const overduePlans = plans.filter(p => parseInt(p.overdue_count) > 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <h1 className="text-xl font-semibold">Ventas en cuotas</h1>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Planes activos</p>
          <p className="text-2xl font-bold">{pending.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Con cuotas vencidas</p>
          <p className="text-2xl font-bold text-red-500">{overduePlans.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total planes</p>
          <p className="text-2xl font-bold text-blue-700">{plans.length}</p>
        </div>
      </div>

      <input value={filter} onChange={e => setFilter(e.target.value)}
        placeholder="Buscar por cliente o ticket..." className="input w-64" />

      <div className="flex-1 overflow-y-auto space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-16 animate-pulse bg-gray-100" />)
          : filtered.length === 0
            ? <p className="text-center text-gray-400 py-16">No hay planes de cuotas registrados</p>
            : filtered.map(p => <PlanCard key={p.id} plan={p} />)
        }
      </div>
    </div>
  );
}
