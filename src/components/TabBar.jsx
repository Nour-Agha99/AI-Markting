import { ShoppingCart, Package, CreditCard } from 'lucide-react'

const tabs = [
  { id: 'sell', label: 'بيع', icon: ShoppingCart },
  { id: 'products', label: 'منتجات', icon: Package },
  { id: 'debts', label: 'ديون', icon: CreditCard },
]

function TabBar({ active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      background: '#16213e',
      borderTop: '1px solid #0f3460',
      position: 'fixed',
      bottom: 0,
      width: '100%',
      maxWidth: '480px',
    }}>
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            color: active === id ? '#e94560' : '#888',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontFamily: 'inherit',
          }}
        >
          <Icon size={22} />
          {label}
        </button>
      ))}
    </div>
  )
}

export default TabBar
