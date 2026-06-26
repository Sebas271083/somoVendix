import { useState, useEffect } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { productsApi } from '../../services/api.js';
import toast from 'react-hot-toast';

export default function VariantPicker({ product, onSelect, onClose }) {
  const [data, setData] = useState(null);
  const [selections, setSelections] = useState({});

  useEffect(() => {
    productsApi.getVariants(product.id)
      .then((d) => {
        setData(d);
        const initial = {};
        d.attributes.forEach((attr) => {
          if (attr.values.length) initial[attr.id] = attr.values[0].id;
        });
        setSelections(initial);
      })
      .catch(() => toast.error('Error al cargar variantes'));
  }, [product.id]);

  const selectedVariant = data?.variants.find((v) => {
    const selIds = Object.values(selections);
    return (
      selIds.length === v.attr_value_ids.length &&
      selIds.every((id) => v.attr_value_ids.includes(id))
    );
  }) ?? null;

  const label = data?.attributes
    .map((attr) => attr.values.find((v) => v.id === selections[attr.id])?.value ?? '')
    .filter(Boolean)
    .join(' / ') ?? '';

  const effectivePrice = selectedVariant?.price != null
    ? Number(selectedVariant.price)
    : Number(product.price);

  const handleAdd = () => {
    if (!selectedVariant) {
      toast.error('Combinación no disponible');
      return;
    }
    onSelect({
      ...product,
      price: effectivePrice,
      stock: selectedVariant.stock,
      name: `${product.name} — ${label}`,
      code: selectedVariant.sku || product.code,
      _variant_id: selectedVariant.id,
      _variant_label: label,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900 truncate">{product.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Seleccioná la variante</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-3">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!data ? (
            <div className="text-center py-4 text-gray-400 text-sm">Cargando...</div>
          ) : data.attributes.length === 0 ? (
            <p className="text-center py-4 text-gray-400 text-sm">Sin variantes configuradas</p>
          ) : (
            <>
              {data.attributes.map((attr) => (
                <div key={attr.id}>
                  <p className="text-sm font-medium text-gray-700 mb-2">{attr.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelections((s) => ({ ...s, [attr.id]: v.id }))}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                          selections[attr.id] === v.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {v.value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {selectedVariant ? (
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-blue-700">
                      $ {effectivePrice.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <span className={`badge text-xs ${
                    selectedVariant.stock <= selectedVariant.min_stock
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    Stock: {selectedVariant.stock}
                  </span>
                </div>
              ) : (
                <div className="bg-red-50 rounded-xl px-4 py-3 text-sm text-red-600 text-center">
                  Combinación no disponible
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedVariant || selectedVariant.stock === 0}
            className="btn-primary flex-1 justify-center disabled:opacity-50"
          >
            <ShoppingCart size={15} />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
