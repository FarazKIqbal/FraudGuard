import { NavLink } from 'react-router-dom'
import {
  Shield, Search, Layers, BarChart3, Activity, Brain, Eye,
} from 'lucide-react'

const links = [
  { to: '/',           label: 'Dashboard',    icon: Activity },
  { to: '/predict',    label: 'Predict',      icon: Search },
  { to: '/batch',      label: 'Batch',        icon: Layers },
  { to: '/models',     label: 'Models',       icon: BarChart3 },
  { to: '/analytics',  label: 'Analytics',    icon: Shield },
  { to: '/how-it-works', label: 'How It Works', icon: Brain },
  { to: '/ad-demo',    label: 'Ad Demo',      icon: Eye },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        <Shield size={22} /> <span>FraudGuard</span>
      </div>

      <nav>
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <l.icon size={18} />
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="status-badge">API Online</div>
    </aside>
  )
}
