export default function CategoryFilter({ categories, selected, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      <button
        onClick={() => onChange(null)}
        className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
        style={!selected
          ? { backgroundColor: 'var(--brand)', color: '#fff' }
          : { backgroundColor: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }
        }
        onMouseEnter={e => { if (selected) e.currentTarget.style.borderColor = 'var(--brand)'; }}
        onMouseLeave={e => { if (selected) e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        Todos
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={selected === cat.id
            ? { backgroundColor: cat.color || 'var(--brand)', color: '#fff' }
            : { backgroundColor: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }
          }
          onMouseEnter={e => {
            if (selected !== cat.id) e.currentTarget.style.borderColor = cat.color || 'var(--brand)';
          }}
          onMouseLeave={e => {
            if (selected !== cat.id) e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          {selected !== cat.id && cat.color && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color }}
            />
          )}
          {cat.name}
        </button>
      ))}
    </div>
  );
}
