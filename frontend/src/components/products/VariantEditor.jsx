import { useState, useEffect } from 'react';
import { X, Plus, Trash2, RefreshCw, Layers } from 'lucide-react';
import { productsApi } from '../../services/api.js';
import toast from 'react-hot-toast';

function cartesian(arrays) {
  if (!arrays.length) return [[]];
  const [first, ...rest] = arrays;
  const restCombos = cartesian(rest);
  return first.flatMap((v) => restCombos.map((r) => [v, ...r]));
}

export default function VariantEditor({ product, onClose }) {
  const [attributes, setAttributes] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    productsApi.getVariants(product.id)
      .then(({ variants: vs, attributes: attrs }) => {
        setAttributes(attrs.map((a) => ({
          id: a.id,
          name: a.name,
          values: a.values.map((v) => v.value),
        })));
        setVariants(vs);
      })
      .catch(() => toast.error('Error al cargar variantes'))
      .finally(() => setLoading(false));
  }, [product.id]);

  // ── Atributos ────────────────────────────────────────────
  const addAttribute = () =>
    setAttributes((prev) => [...prev, { id: null, name: '', values: [''] }]);

  const removeAttribute = (idx) =>
    setAttributes((prev) => prev.filter((_, i) => i !== idx));

  const updateAttrName = (idx, name) =>
    setAttributes((prev) => prev.map((a, i) => (i === idx ? { ...a, name } : a)));

  const addAttrValue = (idx) =>
    setAttributes((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, values: [...a.values, ''] } : a))
    );

  const removeAttrValue = (attrIdx, valIdx) =>
    setAttributes((prev) =>
      prev.map((a, i) =>
        i === attrIdx ? { ...a, values: a.values.filter((_, j) => j !== valIdx) } : a
      )
    );

  const updateAttrValue = (attrIdx, valIdx, val) =>
    setAttributes((prev) =>
      prev.map((a, i) =>
        i === attrIdx
          ? { ...a, values: a.values.map((v, j) => (j === valIdx ? val : v)) }
          : a
      )
    );

  // ── Generar combinaciones ─────────────────────────────────
  const generateVariants = () => {
    const attrValues = attributes.map((a) => a.values.filter((v) => v.trim()));
    if (attrValues.some((vs) => !vs.length)) {
      toast.error('Completá todos los atributos con al menos un valor');
      return;
    }
    const combos = cartesian(attrValues);
    const generated = combos.map((combo) => {
      const label = combo.join(' / ');
      const existing = variants.find((v) => v.label === label);
      const attrVals = combo.map((val, idx) => ({
        attr_name: attributes[idx].name,
        value: val,
      }));
      return existing
        ? { ...existing, attribute_values: attrVals }
        : {
            id: null,
            label,
            attribute_values: attrVals,
            price: '',
            cost: '',
            stock: 0,
            min_stock: 0,
            sku: '',
            barcode: '',
            active: true,
          };
    });
    setVariants(generated);
    toast.success(`${generated.length} combinaciones generadas`);
  };

  // ── Variantes ─────────────────────────────────────────────
  const updateVariant = (idx, field, val) =>
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: val } : v))
    );

  const removeVariant = (idx) =>
    setVariants((prev) => prev.filter((_, i) => i !== idx));

  // ── Guardar ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!attributes.length) {
      toast.error('Agregá al menos un atributo');
      return;
    }
    setSaving(true);
    try {
      const attrsPayload = attributes.map((a) => ({
        name: a.name.trim(),
        values: a.values.filter((v) => v.trim()),
      }));
      const variantsPayload = variants.map((v) => ({
        id: v.id || null,
        attribute_values: v.attribute_values || [],
        price: v.price !== '' && v.price != null ? parseFloat(v.price) : null,
        cost: v.cost !== '' && v.cost != null ? parseFloat(v.cost) : null,
        stock: parseInt(v.stock) || 0,
        min_stock: parseInt(v.min_stock) || 0,
        sku: v.sku || '',
        barcode: v.barcode || '',
        active: v.active !== false,
      }));
      await productsApi.saveVariants(product.id, {
        attributes: attrsPayload,
        variants: variantsPayload,
      });
      await productsApi.update(product.id, { has_variants: 1 });
      toast.success('Variantes guardadas');
      onClose(true);
    } catch (err) {
      toast.error(err?.error || 'Error al guardar variantes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-indigo-500" />
            <div>
              <h2 className="font-semibold text-gray-900">Variantes del producto</h2>
              <p className="text-xs text-gray-500">{product.name}</p>
            </div>
          </div>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="py-10 text-center text-gray-400">Cargando...</div>
          ) : (
            <>
              {/* Atributos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-800">Atributos</h3>
                  <button onClick={addAttribute} className="btn-secondary text-xs px-3 py-1.5">
                    <Plus size={13} /> Agregar atributo
                  </button>
                </div>

                {attributes.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Agregá atributos como Color, Talle, Sabor, etc.
                  </p>
                )}

                <div className="space-y-3">
                  {attributes.map((attr, ai) => (
                    <div key={ai} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          value={attr.name}
                          onChange={(e) => updateAttrName(ai, e.target.value)}
                          placeholder="Nombre (ej: Color)"
                          className="input flex-1 text-sm font-medium"
                        />
                        <button
                          onClick={() => removeAttribute(ai)}
                          className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {attr.values.map((val, vi) => (
                          <div key={vi} className="flex items-center gap-1">
                            <input
                              value={val}
                              onChange={(e) => updateAttrValue(ai, vi, e.target.value)}
                              placeholder="Valor"
                              className="input w-24 text-sm px-2 py-1"
                            />
                            {attr.values.length > 1 && (
                              <button
                                onClick={() => removeAttrValue(ai, vi)}
                                className="text-gray-300 hover:text-red-500"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addAttrValue(ai)}
                          className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1"
                        >
                          <Plus size={12} /> valor
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {attributes.length > 0 && (
                  <button
                    onClick={generateVariants}
                    className="mt-3 btn-secondary text-sm w-full justify-center"
                  >
                    <RefreshCw size={14} /> Generar combinaciones
                  </button>
                )}
              </div>

              {/* Tabla de variantes */}
              {variants.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-800 mb-3">
                    Variantes ({variants.length})
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[140px]">Variante</th>
                            <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-24">SKU</th>
                            <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-32">Código de barras</th>
                            <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-28">Precio</th>
                            <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-28">Costo</th>
                            <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-20">Stock</th>
                            <th className="text-right px-3 py-2.5 font-medium text-gray-600 w-20">Mín.</th>
                            <th className="w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {variants.map((v, vi) => (
                            <tr key={vi} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <span className="font-medium text-gray-700">{v.label}</span>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  value={v.sku || ''}
                                  onChange={(e) => updateVariant(vi, 'sku', e.target.value)}
                                  placeholder="—"
                                  className="input w-full py-1 px-2 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  value={v.barcode || ''}
                                  onChange={(e) => updateVariant(vi, 'barcode', e.target.value)}
                                  placeholder="—"
                                  className="input w-full py-1 px-2 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={v.price ?? ''}
                                  onChange={(e) => updateVariant(vi, 'price', e.target.value)}
                                  placeholder={`${product.price} (base)`}
                                  className="input w-full py-1 px-2 text-xs text-right"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={v.cost ?? ''}
                                  onChange={(e) => updateVariant(vi, 'cost', e.target.value)}
                                  placeholder="—"
                                  className="input w-full py-1 px-2 text-xs text-right"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={v.stock ?? 0}
                                  onChange={(e) => updateVariant(vi, 'stock', e.target.value)}
                                  className="input w-full py-1 px-2 text-xs text-right"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={v.min_stock ?? 0}
                                  onChange={(e) => updateVariant(vi, 'min_stock', e.target.value)}
                                  className="input w-full py-1 px-2 text-xs text-right"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <button
                                  onClick={() => removeVariant(vi)}
                                  className="text-gray-300 hover:text-red-500 transition-colors"
                                >
                                  <X size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Precio vacío → usa el precio base del producto (${Number(product.price).toLocaleString('es-AR')})
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t flex-shrink-0">
          <button onClick={() => onClose(false)} className="btn-secondary flex-1 justify-center">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="btn-primary flex-1 justify-center disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar variantes'}
          </button>
        </div>
      </div>
    </div>
  );
}
