import { useState } from 'react'
import { Upload, ShieldAlert, SlidersHorizontal } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { predictBatch } from '../services/api'

const SAMPLE = JSON.stringify([
  {
    device_type: 'Desktop', browser: 'Chrome', operating_system: 'Windows',
    ad_position: 'Top', device_ip_reputation: 'Suspicious',
    click_duration: 0.1, scroll_depth: 2, mouse_movement: 5,
    keystrokes_detected: 0, click_frequency: 20, time_since_last_click: 3,
    bot_likelihood_score: 0.92, VPN_usage: 1, proxy_usage: 1,
    timestamp: '2024-08-23 03:15:00',
  },
  {
    device_type: 'Mobile', browser: 'Safari', operating_system: 'iOS',
    ad_position: 'Side', device_ip_reputation: 'Good',
    click_duration: 3.2, scroll_depth: 70, mouse_movement: 400,
    keystrokes_detected: 18, click_frequency: 2, time_since_last_click: 300,
    bot_likelihood_score: 0.05, VPN_usage: 0, proxy_usage: 0,
    timestamp: '2024-08-23 10:45:00',
  },
], null, 2)

export default function BatchPredict() {
  const [json, setJson]       = useState('')
  const [model, setModel]     = useState('meta_learner')
  const [threshold, setThreshold] = useState(null)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const clicks = JSON.parse(json)
      if (!Array.isArray(clicks) || clicks.length === 0) throw new Error('Provide a JSON array of click objects')
      const res = await predictBatch(clicks, model, threshold)
      setResult(res)
    } catch (e) {
      setError(e.message || 'Batch prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const MODELS = [
    { value: 'meta_learner',   label: 'Meta-Learner (Ensemble)' },
    { value: 'random_forest',  label: 'Random Forest' },
    { value: 'xgboost',        label: 'XGBoost' },
    { value: 'neural_network', label: 'Neural Network' },
  ]

  return (
    <div className="page">
      <Helmet>
        <title>Batch Prediction | FraudGuard - Bulk Click Analysis</title>
        <meta name="description" content="Analyze multiple ad clicks at once with FraudGuard's batch prediction API. Get fraud rates and individual predictions for entire click datasets." />
        <link rel="canonical" href="https://fraudguard.farazkiqbal.com/batch" />
        <meta property="og:title" content="Batch Prediction | FraudGuard" />
        <meta property="og:description" content="Bulk click fraud analysis for ad networks." />
        <meta property="og:url" content="https://fraudguard.farazkiqbal.com/batch" />
      </Helmet>
      <h1>Batch Predict</h1>
      <p className="subtitle">Analyse multiple clicks at once</p>

      <div className="card">
        <div className="model-selector">
          <label>Model</label>
          <select value={model} onChange={e => setModel(e.target.value)}>
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="model-selector mt-1">
          <label>
            <SlidersHorizontal size={16} />
            Fraud Threshold
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={threshold ?? 0.5}
            onChange={e => setThreshold(e.target.value ? parseFloat(e.target.value) : null)}
          />
          <span className="badge">{threshold !== null ? threshold.toFixed(2) : 'auto'}</span>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setThreshold(null)}
            disabled={threshold === null}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="card mt-1">
        <h2>Click Data (JSON Array)</h2>
        <textarea
          className="json-input"
          rows={14}
          value={json}
          onChange={e => setJson(e.target.value)}
          placeholder='Paste a JSON array of click objects...'
        />
        <div className="btn-group mt-1">
          <button className="btn btn-primary" disabled={loading || !json.trim()} onClick={handleSubmit}>
            {loading ? <><span className="spinner" /> Processing...</> : <><Upload size={16} /> Run Batch</>}
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setJson(SAMPLE)}>
            Load Sample
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => { setJson(''); setResult(null); setError(null) }}>
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="result-banner fraud mt-1"><ShieldAlert size={24} /><p>{error}</p></div>
      )}

      {result && (
        <div className="card mt-1">
          {/* Summary */}
          <div className="stat-grid sm mb-1">
            <div className="stat-card">
              <span className="stat-value">{result.summary?.total_predictions}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-card danger">
              <span className="stat-value">{result.summary?.fraudulent_count}</span>
              <span className="stat-label">Fraudulent</span>
            </div>
            <div className="stat-card success">
              <span className="stat-value">{result.summary?.legitimate_count}</span>
              <span className="stat-label">Legitimate</span>
            </div>
            <div className="stat-card warn">
              <span className="stat-value">{(result.summary?.fraud_rate * 100).toFixed(1)}%</span>
              <span className="stat-label">Fraud Rate</span>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Prediction</th><th>Confidence</th><th>Device</th><th>Browser</th><th>IP Rep.</th></tr>
              </thead>
              <tbody>
                {result.predictions?.map((p, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      <span className={`badge ${p.prediction === 'fraudulent' ? 'badge-danger' : 'badge-success'}`}>
                        {p.prediction}
                      </span>
                    </td>
                    <td>{(p.confidence * 100).toFixed(1)}%</td>
                    <td>{p.input_data?.device_type || '—'}</td>
                    <td>{p.input_data?.browser || '—'}</td>
                    <td>{p.input_data?.device_ip_reputation || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
