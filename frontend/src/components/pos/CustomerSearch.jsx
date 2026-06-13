import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { customersApi } from '../../services/api.js';

export default function CustomerSearch({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await customersApi.list(search);
        setCustomers(data);
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800">Seleccionar cliente</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-4">
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              className="input pl-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {loading ? (
              <p className="text-center text-gray-400 text-sm py-4">Buscando...</p>
            ) : customers.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">Sin resultados</p>
            ) : (
              customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.document_type} {c.document_number}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
