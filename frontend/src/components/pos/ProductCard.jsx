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
      className="card cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
      style={{ padding: 0, borderTop: `3px solid ${accent}` }}
      onClick={() => onAdd(product)}
    >
      {/* Cart qty badge */}
      {cartQty > 0 && (
        <span
          className="absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          {cartQty}
        </span>
      )}

      {/* Low stock badge */}
      {isLowStock && cartQty === 0 && (
        <span className="absolute top-2.5 left-2.5 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-orange-500 text-white">
          Stock bajo
        </span>
      )}

      {/* Variants badge */}
      {!!product.has_variants && (
        <span className="absolute top-2.5 right-2.5 z-10 flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)' }}>
          <Layers size={9} /> var.
        </span>
      )}

      {/* Image / icon area */}
      <div
        className="h-32 flex items-center justify-center relative"
        style={{ backgroundColor: `${accent}12` }}
      >
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-24 object-contain px-2" />
        ) : (
          <Icon size={40} strokeWidth={1.2} style={{ color: accent, opacity: 0.65 }} />
        )}

        {/* Add button — subtle at rest, bold on hover */}
        <button
          className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full text-white flex items-center justify-center shadow-sm transition-all duration-150"
          style={{ backgroundColor: accent, opacity: 0.7 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.transform = 'scale(1)'; }}
          onClick={e => { e.stopPropagation(); onAdd(product); }}
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-xs font-medium leading-snug line-clamp-2 min-h-[2.5rem]" style={{ color: 'var(--ink)' }}>
          {product.name}
        </h3>
        <p className="text-sm font-bold mt-1.5" style={{ color: accent }}>
          ${product.price.toLocaleString('es-AR')}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
          {product.stock ?? '—'} u. en stock
        </p>
      </div>
    </div>
  );
}
