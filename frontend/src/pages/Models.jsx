import { useEffect, useState } from 'react'
import { Cpu, Layers, BarChart3, Table } from 'lucide-react'
import { getModels, getMetrics, getFeatures } from '../services/api'

function ConfusionMatrix({ tp, fp, fn, tn }) {
  const total = tp + fp + fn + tn
  const precision = tp / (tp + fp) || 0
  const recall = tp / (tp + fn) || 0
  const specificity = tn / (tn + fp) || 0
  const accuracy = (tp + tn) / total || 0

  return (
    <div className="confusion-matrix">
      <div className="cm-header">
        <div className="cm-cell empty" />
        <div className="cm-cell pred-label">Predicted Legit</div>
        <div className="cm-cell pred-label">Predicted Fraud</div>
      </div>
      <div className="cm-row">
        <div className="cm-cell true-label">Actual Legit</div>
        <div className="cm-cell cm-tn">
          <strong>{tn}</strong>
          <span>({(tn / (tn + fp) * 100).toFixed(1)}%)</span>
        </div>
        <div className="cm-cell cm-fp">
          <strong>{fp}</strong>
          <span>({(fp / (tn + fp) * 100).toFixed(1)}%)</span>
        </div>
      </div>
      <div className="cm-row">
        <div className="cm-cell true-label">Actual Fraud</div>
        <div className="cm-cell cm-fn">
          <strong>{fn}</strong>
          <span>({(fn / (tp + fn) * 100).toFixed(1)}%)</span>
        </div>
        <div className="cm-cell cm-tp">
          <strong>{tp}</strong>
          <span>({(tp / (tp + fn) * 100).toFixed(1)}%)</span>
        </div>
      </div>
      <div className="cm-summary">
        <span>Precision: {(precision * 100).toFixed(1)}%</span>
        <span>Recall: {(recall * 100).toFixed(1)}%</span>
        <span>Specificity: {(specificity * 100).toFixed(1)}%</span>
        <span>Accuracy: {(accuracy * 100).toFixed(1)}%</span>
      </div>
    </div>
  )
}

export default function Models() {
  const [models, setModels]     = useState(null)
  const [metrics, setMetrics]   = useState(null)
  const [features, setFeatures] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getModels().catch(() => null),
      getMetrics().catch(() => null),
      getFeatures().catch(() => null),
    ]).then(([m, met, f]) => {
      setModels(m)
      setMetrics(met)
      setFeatures(f)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="loading-center"><span className="spinner" /> Loading models...</div>

  const metricsMap = {}
  metrics?.data?.forEach(m => { metricsMap[m.model] = m })

  const modelList = models?.data?.available_models || []

  const ICONS = {
    random_forest:  <Layers size={28} />,
    xgboost:        <BarChart3 size={28} />,
    neural_network: <Cpu size={28} />,
    meta_learner:   <Layers size={28} />,
  }

  return (
    <div className="page">
      <h1>Models</h1>
      <p className="subtitle">Trained model details & performance</p>

      {/* Model cards */}
      <div className="model-grid">
        {modelList.map(name => {
          const m = metricsMap[name]
          return (
            <div className="model-card" key={name}>
              <div className="model-icon">{ICONS[name] || <Cpu size={28} />}</div>
              <h3>{name.replace(/_/g, ' ')}</h3>
              {m ? (
                <>
                  <ul className="kv-list compact">
                    <li><span>Accuracy</span><strong>{parseFloat(m.accuracy).toFixed(4)}</strong></li>
                    <li><span>Precision</span><strong>{parseFloat(m.precision).toFixed(4)}</strong></li>
                    <li><span>Recall</span><strong>{parseFloat(m.recall).toFixed(4)}</strong></li>
                    <li><span>F1 Score</span><strong>{parseFloat(m.f1_score).toFixed(4)}</strong></li>
                    <li><span>ROC AUC</span><strong>{parseFloat(m.roc_auc).toFixed(4)}</strong></li>
                  </ul>
                  {/* Confusion matrix */}
                  {m.true_positives !== undefined && (
                    <div className="mt-1">
                      <h4><Table size={16} /> Confusion Matrix</h4>
                      <ConfusionMatrix
                        tp={m.true_positives}
                        fp={m.false_positives}
                        fn={m.false_negatives}
                        tn={m.true_negatives}
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="muted">No metrics available</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Comparison table */}
      {metrics?.data && (
        <div className="card mt-2">
          <h2>Performance Comparison</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Model</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1</th><th>ROC AUC</th>
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

      {/* Features */}
      {features?.data && (
        <div className="card mt-2">
          <h2>Feature Overview</h2>
          <div className="feature-cols">
            {Object.entries(features.data).map(([group, list]) => (
              <div key={group}>
                <h4>{group.replace(/_/g, ' ')}</h4>
                <ul className="feature-list">
                  {(Array.isArray(list) ? list : [list]).map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}