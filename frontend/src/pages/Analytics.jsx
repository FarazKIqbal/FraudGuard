import { useState } from 'react'
import { ShieldAlert, ShieldCheck, Gauge, SlidersHorizontal } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import ClickForm from '../components/ClickForm'
import { getRiskScore } from '../services/api'

function RiskMeter({ score, level }) {
  const color = score >= 75 ? 'var(--danger)' : score >= 50 ? 'var(--warn)' : score >= 25 ? 'var(--cyan)' : 'var(--safe)'
  return (
    <div className="risk-meter">
      <div className="risk-track">
        <div className="risk-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <div className="risk-labels">
        <span style={{ color }}>{score.toFixed(1)}</span>
        <span className={`badge badge-${level === 'CRITICAL' || level === 'HIGH' ? 'danger' : level === 'MEDIUM' ? 'warn' : 'success'}`}>
          {level}
        </span>
      </div>
    </div>
  )
}

export default function Analytics() {
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [threshold, setThr]     = useState(50)

  const handleSubmit = async (payload) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await getRiskScore(payload, threshold)
      setResult(res)
    } catch (e) {
      setError(e.message || 'Risk analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const r = result
  const isFraud = r?.risk_assessment === 'HIGH_RISK'

  return (
    <div className="page">
      <Helmet>
        <title>Analytics | FraudGuard - Risk Scoring</title>
        <meta name="description" content="Deep click fraud analytics with composite risk scoring, per-model contributions, and actionable risk factors." />
        <link rel="canonical" href="https://fraudguard.farazkiqbal.com/analytics" />
        <meta property="og:title" content="Analytics | FraudGuard" />
        <meta property="og:description" content="Composite risk scoring and detailed fraud analysis." />
        <meta property="og:url" content="https://fraudguard.farazkiqbal.com/analytics" />
      </Helmet>
      <h1>Analytics</h1>
      <p className="subtitle">Composite risk scoring &amp; deep analysis</p>

      <div className="card">
        <div className="model-selector">
          <label>
            <SlidersHorizontal size={16} />
            Risk Threshold
          </label>
          <input
            type="range" min={10} max={90} value={threshold}
            onChange={e => setThr(Number(e.target.value))}
          />
          <span className="badge">{threshold}</span>
        </div>
      </div>

      {/* Form */}
      <div className="card mt-1">
        <h2>Click Data</h2>
        <ClickForm onSubmit={handleSubmit} loading={loading} />
      </div>

      {error && <div className="result-banner fraud mt-1"><ShieldAlert size={24} /><p>{error}</p></div>}

      {r && (
        <>
          {/* Risk Score */}
          <div className={`result-banner ${isFraud ? 'fraud' : 'legit'} mt-1`}>
            {isFraud ? <ShieldAlert size={32} /> : <ShieldCheck size={32} />}
            <div>
              <h3>{r.risk_assessment === 'HIGH_RISK' ? 'High Risk Click' : 'Low Risk Click'}</h3>
              <p>{r.recommendation}</p>
            </div>
          </div>

          <div className="card mt-1">
            <h2><Gauge size={20} /> Composite Risk Score</h2>
            <RiskMeter score={r.risk_score} level={r.risk_level} />
          </div>

          {/* Model contributions */}
          {r.model_contributions && (
            <div className="card mt-1">
              <h2>Model Contributions</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Model</th><th>Prediction</th><th>Confidence</th><th>Weight</th><th>Contribution</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(r.model_contributions).map(([name, info]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>
                          <span className={`badge ${info.prediction === 'fraudulent' ? 'badge-danger' : 'badge-success'}`}>
                            {info.prediction}
                          </span>
                        </td>
                        <td>{(info.confidence * 100).toFixed(1)}%</td>
                        <td>{info.weight}</td>
                        <td>{info.weighted_score?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risk factors */}
          {r.risk_factors && r.risk_factors.length > 0 && (
            <div className="card mt-1">
              <h2>Risk Factors</h2>
              <ul className="risk-factors">
                {r.risk_factors.map((f, i) => (
                  <li key={i} className="risk-factor-item">
                    <ShieldAlert size={16} /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
