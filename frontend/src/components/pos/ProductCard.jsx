import { Plus, Layers, BookOpen, Pen, FileText, Pencil, Folder, Palette, ShoppingBag, Paperclip, Package, GraduationCap, Ban } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import { imgUrl } from '../../services/api.js';
import toast from 'react-hot-toast';

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

  const tracksStock = !product.has_variants && product.stock !== null;
  const isOutOfStock = tracksStock && product.stock <= 0;
  const isLowStock   = tracksStock && product.stock > 0 && product.stock <= product.min_stock;

  const catKey = normalize(product.category_name);
  const { Icon = Package, color = '#8A988F' } = CATEGORY_MAP[catKey] || {};
  const accent = product.category_color || color;

  const handleClick = () => {
    if (isOutOfStock) {
      toast(`Sin stock: ${product.name}`, { icon: '⚠️', duration: 1800 });
      return;
    }
    onAdd(product);
  };

  return (
    <div
      className="cursor-pointer transition-all group relative select-none rounded-2xl"
      style={{
        padding: 0,
        backgroundColor: 'var(--surface)',
        border: cartQty > 0 ? `2px solid ${accent}` : '1px solid var(--border)',
        borderTop: `3px solid ${accent}`,
        opacity: isOutOfStock ? 0.55 : 1,
        boxShadow: cartQty > 0 ? `0 2px 12px ${accent}28` : '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onClick={handleClick}
      onMouseEnter={e => {
        if (!isOutOfStock) e.currentTarget.style.boxShadow = `0 4px 16px ${accent}30`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = cartQty > 0
          ? `0 2px 12px ${accent}28`
          : '0 1px 3px rgba(0,0,0,0.04)';
      }}
    >
      <div className="flex items-center gap-2.5 p-2.5 pr-2">
        {/* Thumbnail / icon */}
        <div
          className="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: `${accent}18` }}
        >
          {product.image_url ? (
            <img
              src={imgUrl(product.image_url)}
              alt=""
              className="w-11 h-11 object-cover"
              onError={e => { e.currentTarget.style.display = 'none'; }}
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
          <span className="text-sm font-bold" style={{ color: accent }}>
            ${Number(product.price).toLocaleString('es-AR')}
          </span>
          {/* Stock + badges */}
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {isOutOfStock ? (
              <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-red-100 text-red-600">Sin stock</span>
            ) : isLowStock ? (
              <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-orange-100 text-orange-600">
                ↓ {product.stock} {product.unit === 'unidad' ? 'u.' : product.unit}
              </span>
            ) : tracksStock && product.stock <= 30 ? (
              <span className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)' }}>
                {product.stock} {product.unit === 'unidad' ? 'u.' : product.unit}
              </span>
            ) : null}
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
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform"
          style={{
            backgroundColor: isOutOfStock ? '#e5e7eb' : cartQty > 0 ? 'var(--brand)' : accent,
            color: isOutOfStock ? '#9ca3af' : '#fff',
            opacity: isOutOfStock ? 1 : cartQty > 0 ? 1 : 0.8,
          }}
          onMouseEnter={e => { if (!isOutOfStock) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.12)'; } }}
          onMouseLeave={e => { e.currentTarget.style.opacity = isOutOfStock ? '1' : cartQty > 0 ? '1' : '0.8'; e.currentTarget.style.transform = 'scale(1)'; }}
          onClick={e => { e.stopPropagation(); handleClick(); }}
        >
          {isOutOfStock
            ? <Ban size={12} strokeWidth={2} />
            : cartQty > 0
              ? <span className="text-[10px] font-bold">{cartQty}</span>
              : <Plus size={13} strokeWidth={2.5} />
          }
        </button>
      </div>
    </div>
  );
}
