import { useState, useEffect } from 'react';
import { Printer, Search } from 'lucide-react';
import { returnsApi, settingsApi } from '../services/api.js';

const TYPE_LABEL = { return: 'Devolución', exchange: 'Cambio' };
const REFUND_LABEL = { efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transf.', cuenta_corriente: 'Cta. Cte.' };

function PrintNote({ note, settings, onClose }) {
  const business = settings?.business_name || 'Mi Negocio';
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Nota de Crédito NC-{String(note.credit_note_number).padStart(4, '0')}</h3>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5">
              <Printer size={14} /> Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>
        <div id="cn-print" className="p-6 text-sm space-y-4">
          <div className="flex justify-between">
            <div>
              <h2 className="font-bold text-lg">{business}</h2>
            </div>
            <div className="text-right">
              <p className="font-bold text-red-600 text-lg">NOTA DE CRÉDITO</p>
              <p className="text-gray-500 text-xs">NC-{String(note.credit_note_number).padStart(4, '0')}</p>
              <p className="text-gray-500 text-xs">{new Date(note.credit_note_date).toLocaleDateString('es-AR')}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-600">Referencia: Ticket #{note.ticket_number}</p>
            {note.customer_name && <p className="font-medium">{note.customer_name}</p>}
          </div>
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-gray-500"><span>Tipo</span><span>{TYPE_LABEL[note.type] || note.type}</span></div>
            <div className="flex justify-between text-gray-500"><span>Reintegro</span><span>{REFUND_LABEL[note.refund_method] || note.refund_method}</span></div>
            {note.reason && <div className="flex justify-between text-gray-500"><span>Motivo</span><span className="text-right max-w-[60%]">{note.reason}</span></div>}
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-3">
            <span>Total nota de crédito</span>
            <span className="text-red-600">$ {Number(note.total).toLocaleString('es-AR')}</span>
          </div>
          <p className="text-center text-gray-400 text-xs mt-4">Comprobante interno — sin validez fiscal</p>
        </div>
      </div>
    </div>
  );
}

export default function CreditNotes() {
  const [notes, setNotes] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(null);
  const [filters, setFilters] = useState({
    from: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    search: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      setNotes(await returnsApi.list({ from: filters.from, to: filters.to }));
    } finally { setLoading(false); }
  };

  useEffect(() => { settingsApi.getAll().then(setSettings).catch(() => {}); }, []);
  useEffect(() => { load(); }, [filters.from, filters.to]);

  const filtered = notes.filter(n => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return n.customer_name?.toLowerCase().includes(s) ||
      String(n.ticket_number).includes(s) ||
      String(n.credit_note_number).includes(s);
  });

  const f = (key) => (e) => setFilters(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <h1 className="text-xl font-semibold">Notas de crédito</h1>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filters.search} onChange={f('search')} placeholder="Buscar por NC, ticket, cliente..." className="input pl-8 w-56" />
        </div>
        <label className="text-sm text-gray-500">Desde</label>
        <input type="date" value={filters.from} onChange={f('from')} className="input w-auto" />
        <label className="text-sm text-gray-500">Hasta</label>
        <input type="date" value={filters.to} onChange={f('to')} className="input w-auto" />
      </div>

      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              {['NC N°', 'Fecha', 'Ticket origen', 'Cliente', 'Tipo', 'Reintegro', 'Total', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={8}><div className="h-10 m-2 bg-gray-100 rounded animate-pulse" /></td></tr>)
              : filtered.map(n => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-red-600">NC-{String(n.credit_note_number).padStart(4, '0')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(n.credit_note_date).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-3 font-mono text-xs">#{n.ticket_number}</td>
                  <td className="px-4 py-3">{n.customer_name || '—'}</td>
                  <td className="px-4 py-3"><span className="badge bg-gray-100 text-gray-600">{TYPE_LABEL[n.type] || n.type}</span></td>
                  <td className="px-4 py-3 text-gray-500">{REFUND_LABEL[n.refund_method] || n.refund_method}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">-$ {Number(n.total).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setPrinting(n)} className="text-gray-400 hover:text-indigo-600" title="Imprimir nota de crédito">
                      <Printer size={15} />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">No hay notas de crédito en el período</p>
        )}
      </div>

      {printing && <PrintNote note={printing} settings={settings} onClose={() => setPrinting(null)} />}
      <style>{`@media print { body > *:not(#cn-print) { display: none; } #cn-print { display: block !important; } }`}</style>
    </div>
  );
}
