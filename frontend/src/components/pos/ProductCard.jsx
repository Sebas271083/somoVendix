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
      className="cursor-pointer transition-all select-none rounded-2xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: 'var(--surface)',
        border: cartQty > 0 ? `2px solid ${accent}` : '1px solid var(--border)',
        borderTop: `4px solid ${accent}`,
        opacity: isOutOfStock ? 0.5 : 1,
        boxShadow: cartQty > 0 ? `0 4px 16px ${accent}35` : '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onClick={handleClick}
      onMouseEnter={e => { if (!isOutOfStock) e.currentTarget.style.boxShadow = `0 6px 20px ${accent}30`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = cartQty > 0 ? `0 4px 16px ${accent}35` : '0 1px 4px rgba(0,0,0,0.06)'; }}
    >
      {/* Imagen / ícono */}
      <div
        className="w-full flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ backgroundColor: `${accent}14`, height: '88px' }}
      >
        {product.image_url ? (
          <img
            src={imgUrl(product.image_url)}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <Icon size={36} strokeWidth={1.2} style={{ color: accent, opacity: 0.7 }} />
        )}
      </div>

      {/* Contenido */}
      <div className="flex flex-col flex-1 p-3 gap-1">
        <h3 className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: 'var(--ink)', minHeight: '2.5rem' }}>
          {product.name}
        </h3>

        <span className="text-base font-bold leading-tight" style={{ color: accent }}>
          ${Number(product.price).toLocaleString('es-AR')}
        </span>

        {/* Stock + variantes */}
        <div className="flex items-center gap-1 flex-wrap min-h-[18px]">
          {isOutOfStock ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-100 text-red-600">Sin stock</span>
          ) : isLowStock ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600">
              ↓ {product.stock} {product.unit === 'unidad' ? 'u.' : product.unit}
            </span>
          ) : tracksStock ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)' }}>
              {product.stock} {product.unit === 'unidad' ? 'u.' : product.unit}
            </span>
          ) : null}
          {!!product.has_variants && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                  style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)' }}>
              <Layers size={9} /> var.
            </span>
          )}
        </div>

        {/* Botón agregar */}
        <button
          className="mt-2 w-full py-2 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          style={{
            backgroundColor: isOutOfStock ? '#d1d5db' : cartQty > 0 ? 'var(--brand)' : accent,
            color: isOutOfStock ? '#6b7280' : '#fff',
          }}
          onMouseEnter={e => { if (!isOutOfStock) e.currentTarget.style.filter = 'brightness(0.9)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
          onClick={e => { e.stopPropagation(); handleClick(); }}
        >
          {isOutOfStock
            ? <><Ban size={13} /> Sin stock</>
            : cartQty > 0
              ? <><span className="text-sm font-bold">{cartQty}</span> en carrito</>
              : <><Plus size={13} strokeWidth={2.5} /> Agregar</>
          }
        </button>
      </div>
    </div>
  );
}
