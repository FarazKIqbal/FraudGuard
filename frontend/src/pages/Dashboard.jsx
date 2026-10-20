import { useEffect, useState } from 'react'
import {
  ShieldCheck, Activity, Database, AlertTriangle,
} from 'lucide-react'
import { getHealth, getReadiness, getDatasetStats, getMetrics } from '../services/api'

function StatCard({ icon: Icon, label, value, sub, variant }) {
  return (
    <div className={`stat-card ${variant || ''}`}>
      <div className="stat-icon"><Icon size={22} /></div>
      <div>
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [health, setHealth]   = useState(null)
  const [ready, setReady]     = useState(null)
  const [stats, setStats]     = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [err, setErr]         = useState(null)

  useEffect(() => {
    Promise.all([
      getHealth().catch(() => null),
      getReadiness().catch(() => null),
      getDatasetStats().catch(() => null),
      getMetrics().catch(() => null),
    ]).then(([h, r, s, m]) => {
      setHealth(h)
      setReady(r)
      setStats(s)
      setMetrics(m)
    }).catch(() => setErr('Failed to load dashboard data'))
  }, [])

  if (err) return <p className="error-text">{err}</p>
  if (!health) return <div className="loading-center"><span className="spinner" /> Loading dashboard...</div>

  const ds = stats?.data?.training_data || {}
  const ts = stats?.data?.test_data || {}

  /* Pick best model from metrics */
  let best = null
  if (metrics?.data) {
    const rows = metrics.data
    best = rows.reduce((a, b) => (parseFloat(b.f1_score) > parseFloat(a.f1_score) ? b : a), rows[0])
  }

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="subtitle">FraudGuard system overview</p>

      {/* Status Cards */}
      <div className="stat-grid">
        <StatCard
          icon={ShieldCheck} label="API Status"
          value={health?.status === 'healthy' ? 'Online' : 'Offline'}
          variant={health?.status === 'healthy' ? 'success' : 'danger'}
        />
        <StatCard
          icon={Activity} label="Models Loaded"
          value={ready?.models_loaded ? `${Object.keys(ready.models_loaded).length}` : '—'}
          sub={ready?.status === 'ready' ? 'All ready' : 'Degraded'}
          variant={ready?.status === 'ready' ? 'success' : 'warn'}
        />
        <StatCard
          icon={Database} label="Training Samples"
          value={ds.total_samples?.toLocaleString() || '—'}
          sub={ds.fraud_percentage ? `${ds.fraud_percentage}% fraud` : ''}
        />
        <StatCard
          icon={AlertTriangle} label="Best Model (F1)"
          value={best ? parseFloat(best.f1_score).toFixed(4) : '—'}
          sub={best?.model || ''}
          variant="primary"
        />
      </div>

      {/* Models metrics table */}
      {metrics?.data && (
        <div className="card mt-2">
          <h2>Model Performance</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Model</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1 Score</th><th>ROC AUC</th>
                </tr>
              </thead>
              <tbody>
                {metrics.data.map(m => (
                  <tr key={m.model}>
                    <td>{m.model}</td>
                    <td>{parseFloat(m.accuracy).toFixed(4)}</td>
                    <td>{parseFloat(m.precision).toFixed(4)}</td>
                    <td>{parseFloat(m.recall).toFixed(4)}</td>
                    <td><strong>{parseFloat(m.f1_score).toFixed(4)}</strong></td>
                    <td>{parseFloat(m.roc_auc).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dataset stats */}
      {stats?.data && (
        <div className="card-row mt-2">
          <div className="card flex-1">
            <h3>Training Set</h3>
            <ul className="kv-list">
              <li><span>Total samples</span><strong>{ds.total_samples?.toLocaleString()}</strong></li>
              <li><span>Fraudulent</span><strong>{ds.fraud_count?.toLocaleString()}</strong></li>
              <li><span>Legitimate</span><strong>{ds.legitimate_count?.toLocaleString()}</strong></li>
              <li><span>Fraud %</span><strong>{ds.fraud_percentage}%</strong></li>
              <li><span>Features</span><strong>{ds.num_features}</strong></li>
            </ul>
          </div>
          <div className="card flex-1">
            <h3>Test Set</h3>
            <ul className="kv-list">
              <li><span>Total samples</span><strong>{ts.total_samples?.toLocaleString()}</strong></li>
              <li><span>Fraudulent</span><strong>{ts.fraud_count?.toLocaleString()}</strong></li>
              <li><span>Legitimate</span><strong>{ts.legitimate_count?.toLocaleString()}</strong></li>
              <li><span>Fraud %</span><strong>{ts.fraud_percentage}%</strong></li>
              <li><span>Features</span><strong>{ts.num_features}</strong></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
