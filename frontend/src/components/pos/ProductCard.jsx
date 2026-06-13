import { Plus } from 'lucide-react';

const CATEGORY_ICONS = {
  cuadernos: '📓',
  lapiceras: '🖊️',
  papel: '📄',
  utiles: '📐',
  carpetas: '📁',
  arte: '🎨',
  mochilas: '🎒',
  oficina: '🖇️',
  escolar: '🏫',
};

export default function ProductCard({ product, onAdd }) {
  const isLowStock = product.stock <= product.min_stock;
  const icon = CATEGORY_ICONS[product.category_name?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '')] || '📦';

  return (
    <div
      className="card p-3 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group relative"
      onClick={() => onAdd(product)}
    >
      {isLowStock && (
        <span className="absolute top-2 left-2 badge bg-amber-100 text-amber-700 z-10">
          Stock bajo
        </span>
      )}

      {/* Image / Icon area */}
      <div
        className="rounded-lg h-28 flex items-center justify-center mb-2 text-4xl"
        style={{ backgroundColor: `${product.category_color}15` }}
      >
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-20 object-contain" />
        ) : (
          <span>{icon}</span>
        )}
      </div>

      {/* Info */}
      <h3 className="text-xs font-medium text-gray-800 leading-tight line-clamp-2 min-h-[2rem]">
        {product.name}
      </h3>
      <div className="flex items-end justify-between mt-1">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            $ {product.price.toLocaleString('es-AR')}
          </p>
          <p className="text-[11px] text-gray-400">{product.stock} u.</p>
        </div>
        <button
          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center transition-opacity hover:bg-blue-700"
          onClick={(e) => { e.stopPropagation(); onAdd(product); }}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
