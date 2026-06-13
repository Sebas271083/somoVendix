import { useState, useEffect } from 'react';
import { Archive, Plus, Minus, Lock } from 'lucide-react';
import { cashRegisterApi } from '../services/api.js';
import toast from 'react-hot-toast';

export default function CashRegister() {
  const [register, setRegister] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState('');
  const [movement, setMovement] = useState({ type: 'income', amount: '', description: '' });
  const [closing, setClosing] = useState({ closing_amount: '', notes: '' });
  const [showClose, setShowClose] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRegister(await cashRegisterApi.current()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleOpen = async (e) => {
    e.preventDefault();
    try {
      await cashRegisterApi.open({ opening_amount: parseFloat(openingAmount) });
      toast.success('Caja abierta');
      load();
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  const handleMovement = async (e) => {
    e.preventDefault();
    try {
      await cashRegisterApi.addMovement({ ...movement, amount: parseFloat(movement.amount) });
      toast.success('Movimiento registrado');
      setMovement({ type: 'income', amount: '', description: '' });
      load();
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  const handleClose = async (e) => {
    e.preventDefault();
    try {
      await cashRegisterApi.close(register.id, { ...closing, closing_amount: parseFloat(closing.closing_amount) });
      toast.success('Caja cerrada');
      setShowClose(false);
      load();
    } catch (err) { toast.error(err?.error || 'Error'); }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400">Cargando...</div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Caja diaria</h1>
        {register && (
          <button onClick={() => setShowClose(true)} className="btn-danger">
            <Lock size={15} /> Cerrar caja
          </button>
        )}
      </div>

      {!register ? (
        <div className="card p-8 max-w-sm mx-auto text-center">
          <Archive size={40} className="text-gray-300 mx-auto mb-3" />
          <h2 className="font-semibold text-gray-700 mb-1">No hay caja abierta</h2>
          <p className="text-sm text-gray-400 mb-5">Abrí la caja para empezar a operar</p>
          <form onSubmit={handleOpen} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Monto inicial</label>
              <input required type="number" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} placeholder="$ 0" className="input text-center" />
            </div>
            <button type="submit" className="btn-primary w-full justify-center">Abrir caja</button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-auto">
          {/* Info */}
          <div className="card p-5 space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Abierta por</p>
              <p className="font-medium">{register.user_name}</p>
              <p className="text-xs text-gray-400">{new Date(register.opened_at).toLocaleString('es-AR')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Monto apertura</p>
                <p className="text-lg font-bold text-green-700">$ {Number(register.opening_amount).toLocaleString('es-AR')}</p>
              </div>
            </div>

            {/* Movements list */}
            {register.movements?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Movimientos</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {register.movements.map((m) => (
                    <div key={m.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-gray-600">{m.description}</span>
                      <span className={m.type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {m.type === 'income' ? '+' : '-'}$ {Number(m.amount).toLocaleString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Add movement */}
          <div className="card p-5">
            <h3 className="font-medium text-gray-800 mb-4">Registrar movimiento</h3>
            <form onSubmit={handleMovement} className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMovement(p => ({ ...p, type: 'income' }))}
                  className={`flex-1 btn gap-2 justify-center ${movement.type === 'income' ? 'bg-green-100 text-green-700 border border-green-300' : 'btn-secondary'}`}
                >
                  <Plus size={15} /> Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => setMovement(p => ({ ...p, type: 'expense' }))}
                  className={`flex-1 btn gap-2 justify-center ${movement.type === 'expense' ? 'bg-red-100 text-red-700 border border-red-300' : 'btn-secondary'}`}
                >
                  <Minus size={15} /> Egreso
                </button>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Monto</label>
                <input required type="number" value={movement.amount} onChange={(e) => setMovement(p => ({ ...p, amount: e.target.value }))} placeholder="$ 0" className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
                <input required value={movement.description} onChange={(e) => setMovement(p => ({ ...p, description: e.target.value }))} placeholder="Motivo del movimiento" className="input" />
              </div>
              <button type="submit" className="btn-primary w-full justify-center">Registrar</button>
            </form>
          </div>
        </div>
      )}

      {/* Close modal */}
      {showClose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-semibold text-lg mb-4">Cerrar caja</h3>
            <form onSubmit={handleClose} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Monto final en caja</label>
                <input required type="number" value={closing.closing_amount} onChange={(e) => setClosing(p => ({ ...p, closing_amount: e.target.value }))} placeholder="$ 0" className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Observaciones</label>
                <textarea value={closing.notes} onChange={(e) => setClosing(p => ({ ...p, notes: e.target.value }))} rows={2} className="input resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowClose(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" className="btn-danger flex-1 justify-center">Confirmar cierre</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
