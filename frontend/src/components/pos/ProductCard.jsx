import { Plus, Layers, BookOpen, Pen, FileText, Pencil, Folder, Palette, ShoppingBag, Paperclip, Package, GraduationCap } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';

const CATEGORY_MAP = {
  cuadernos:  { Icon: BookOpen,       color: '#1F6E5A' },
  lapiceras:  { Icon: Pen,            color: '#6366f1' },
  boligrafos: { Icon: Pen,            color: '#6366f1' },
  escritura:  { Icon: Pencil,         color: '#8b5cf6' },
  papel:      { Icon: FileText,       color: '#f59e0b' },
  utiles:     { Icon: Pencil,         color: '#f97316' },
  carpetas:   { Icon: Folder,         color: '#3b82f6' },
  arte:       { Icon: Palette,        color: '#a855f7' },
  mochilas:   { Icon: ShoppingBag,    color: '#ec4899' },
  oficina:    { Icon: Paperclip,      color: '#64748b' },
  escolar:    { Icon: GraduationCap,  color: '#14b8a6' },
};

function normalize(str) {
  return str?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '') || '';
}

export default function ProductCard({ product, onAdd }) {
  const { items } = useCart();
  const cartQty = items.reduce((sum, i) => i.product_id === product.id ? sum + i.quantity : sum, 0);

  const isLowStock = product.stock !== null && product.stock <= product.min_stock;
  const catKey = normalize(product.category_name);
  const { Icon = Package, color = '#8A988F' } = CATEGORY_MAP[catKey] || {};
  const accent = product.category_color || color;

  return (
    <div
      className="card cursor-pointer transition-all group relative select-none"
      style={{ padding: 0, borderTop: `3px solid ${accent}` }}
      onClick={() => onAdd(product)}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
    >
      <div className="flex items-center gap-2.5 p-2.5 pr-2">
        {/* Thumbnail / icon */}
        <div
          className="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: `${accent}18` }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt=""
              className="w-11 h-11 object-cover"
              onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.innerHTML = ''; }}
            />
          ) : (
            <Icon size={20} strokeWidth={1.3} style={{ color: accent, opacity: 0.8 }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[11px] font-semibold leading-snug line-clamp-2" style={{ color: 'var(--ink)' }}>
            {product.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-sm font-bold" style={{ color: accent }}>
              ${Number(product.price).toLocaleString('es-AR')}
            </span>
            {isLowStock && (
              <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-orange-100 text-orange-600">
                ↓ stock
              </span>
            )}
            {!!product.has_variants && (
              <span className="flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded"
                    style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)' }}>
                <Layers size={8} /> var.
              </span>
            )}
          </div>
        </div>

        {/* Cart qty / add button */}
        <button
          className="w-7 h-7 rounded-full text-white flex items-center justify-center flex-shrink-0 transition-transform"
          style={{ backgroundColor: cartQty > 0 ? 'var(--brand)' : accent, opacity: cartQty > 0 ? 1 : 0.75 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = cartQty > 0 ? '1' : '0.75'; e.currentTarget.style.transform = 'scale(1)'; }}
          onClick={e => { e.stopPropagation(); onAdd(product); }}
        >
          {cartQty > 0
            ? <span className="text-[10px] font-bold">{cartQty}</span>
            : <Plus size={13} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}
