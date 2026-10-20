import { useState } from 'react'
import { ShieldAlert, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import ClickForm from '../components/ClickForm'
import { predictSingle, predictAllModels } from '../services/api'

export default function Predict() {
  const [model, setModel]       = useState('meta_learner')
  const [allModels, setAllModels] = useState(false)
  const [threshold, setThreshold] = useState(null)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const handleSubmit = async (payload) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      let res
      if (allModels) {
        res = await predictAllModels(payload, threshold)
        setResult({ type: 'all', data: res })
      } else {
        res = await predictSingle(payload, model, threshold)
        setResult({ type: 'single', data: res })
      }
    } catch (e) {
      setError(e.message || 'Prediction failed')
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

  const renderSingle = (d) => {
    const isFraud = d.prediction === 'fraudulent'
    const conf    = (d.confidence * 100).toFixed(1)
    return (
      <div className={`result-banner ${isFraud ? 'fraud' : 'legit'}`}>
        {isFraud ? <ShieldAlert size={32} /> : <ShieldCheck size={32} />}
        <div>
          <h3>{isFraud ? 'Fraudulent Click Detected' : 'Legitimate Click'}</h3>
          <p>Confidence: <strong>{conf}%</strong> &nbsp;|&nbsp; Model: <strong>{d.model_used}</strong></p>
          {d.fraud_threshold !== undefined && (
            <p className="text-dim text-sm">Threshold: {d.fraud_threshold}</p>
          )}
        </div>
      </div>
    )
  }

  const renderAll = (d) => (
    <div className="mt-1">
      <h3>All Model Predictions</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Model</th><th>Prediction</th><th>Confidence</th></tr>
          </thead>
          <tbody>
            {Object.entries(d.predictions || {}).map(([name, info]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>
                  <span className={`badge ${info.prediction === 'fraudulent' ? 'badge-danger' : 'badge-success'}`}>
                    {info.prediction}
                  </span>
                </td>
                <td>{(info.confidence * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {d.summary && (
        <div className="card mt-1">
          <p><strong>Consensus:</strong> {d.summary.consensus}</p>
          <p><strong>Avg Fraud Probability:</strong> {(d.summary.average_fraud_probability * 100).toFixed(1)}%</p>
          <p><strong>Models Agreeing Fraud:</strong> {d.summary.models_predicting_fraud} / {d.summary.total_models}</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="page">
      <h1>Predict</h1>
      <p className="subtitle">Analyse a single click for fraud</p>

      {/* Model selector + threshold */}
      <div className="card">
        <div className="model-selector">
          <label>Model</label>
          <select value={model} onChange={e => setModel(e.target.value)} disabled={allModels}>
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <label className="toggle-label">
            <input type="checkbox" checked={allModels} onChange={e => setAllModels(e.target.checked)} />
            Run all models
          </label>
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

      {/* Form */}
      <div className="card mt-1">
        <h2>Click Data</h2>
        <ClickForm onSubmit={handleSubmit} loading={loading} />
      </div>

      {/* Error */}
      {error && <div className="result-banner fraud mt-1"><ShieldAlert size={24} /><p>{error}</p></div>}

      {/* Results */}
      {result?.type === 'single' && renderSingle(result.data)}
      {result?.type === 'all'    && renderAll(result.data)}
    </div>
  )
}
