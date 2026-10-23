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
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <Shield size={18} />
          </div>
          <span>FraudGuard</span>
        </div>
        <div className="live-badge">
          <span className="live-dot"></span>
          LIVE SCAN
        </div>
      </div>

      <nav className="sidebar-nav">
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

      <div className="sidebar-footer">
        <div className="model-status">
          <div className="model-status-title">Model Status</div>
          <div className="model-status-item">
            <span className="model-name">RF</span>
            <span className="model-dot"></span>
          </div>
          <div className="model-status-item">
            <span className="model-name">XGB</span>
            <span className="model-dot"></span>
          </div>
          <div className="model-status-item">
            <span className="model-name">NN</span>
            <span className="model-dot"></span>
          </div>
          <div className="model-status-item">
            <span className="model-name">META</span>
            <span className="model-dot"></span>
          </div>
        </div>
      </div>
    </aside>
  )
}
