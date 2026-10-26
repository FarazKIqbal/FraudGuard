import { useEffect, useState } from 'react'
import { Cpu, Layers, BarChart3, Eye } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { getModels, getMetrics, getFeatures } from '../services/api'
import Modal from '../components/Modal'
import ModelDetail from '../components/ModelDetail'

const MODEL_DESC = {
  random_forest: {
    summary: 'An ensemble of 200 decision trees that independently evaluate each click across all 17 features, then aggregate their votes via bagging.',
    strengths: ['Robust to overfitting via bootstrap aggregation', 'Captures non-linear feature interactions naturally', 'Handles mixed categorical + numerical features natively'],
  },
  xgboost: {
    summary: 'Gradient-boosted tree ensemble (200 estimators) that sequentially corrects errors from previous trees using second-order Taylor approximations.',
    strengths: ['Optimised for both speed and prediction accuracy', 'Built-in L1/L2 regularisation prevents overfitting', 'Excels at ranking and sparse data patterns'],
  },
  neural_network: {
    summary: 'A 3-layer Multi-Layer Perceptron (128→64→32 hidden units) with ReLU activations, trained via mini-batch gradient descent with backpropagation.',
    strengths: ['Learns complex feature interactions automatically', 'Fast inference once trained (single forward pass)', 'Sensitive to feature scaling — requires normalised input'],
  },
  meta_learner: {
    summary: 'Logistic regression trained on the binary predictions and fraud probabilities from all three base models — the final arbiter in the stacking ensemble.',
    strengths: ['Combines diverse base-model opinions into one calibrated score', 'Produces well-calibrated probability output', 'Interpretable coefficients show which base model to trust when'],
  },
}

export default function Models() {
  const [models, setModels]     = useState(null)
  const [metrics, setMetrics]   = useState(null)
  const [features, setFeatures] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [selectedModel, setSelectedModel] = useState(null)

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
  const uniqueMetrics = Object.values(metricsMap)

  const ICONS = {
    random_forest:  <Layers size={28} />,
    xgboost:        <BarChart3 size={28} />,
    neural_network: <Cpu size={28} />,
    meta_learner:   <Layers size={28} />,
  }

  return (
    <div className="page">
      <Helmet>
        <title>Models & Performance | FraudGuard - ML Ensemble</title>
        <meta name="description" content="Random Forest, XGBoost, Neural Network, and Meta-Learner ensemble models with accuracy, precision, recall, and ROC-AUC metrics." />
        <link rel="canonical" href="https://fraudguard.farazkiqbal.com/models" />
        <meta property="og:title" content="Models & Performance | FraudGuard" />
        <meta property="og:description" content="Ensemble ML model performance and confusion matrices." />
        <meta property="og:url" content="https://fraudguard.farazkiqbal.com/models" />
      </Helmet>

      <header className="page-header">
        <h1 className="page-title">Models</h1>
        <p className="subtitle">Trained model details &amp; performance — click any card to explore</p>
      </header>

      {/* Model cards */}
      <div className="model-grid">
        {modelList.map(name => {
          const m = metricsMap[name]
          const desc = MODEL_DESC[name]
          return (
            <div
              key={name}
              className="model-card clickable"
              onClick={() => setSelectedModel(name)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setSelectedModel(name)}
            >
              <div className="model-icon">{ICONS[name] || <Cpu size={28} />}</div>
              <h3>{name.replace(/_/g, ' ')}</h3>
              {desc && <p className="model-card-desc">{desc.summary}</p>}
              {m ? (
                <>
                  <ul className="kv-list compact">
                    <li><span>Accuracy</span><strong>{parseFloat(m.accuracy).toFixed(4)}</strong></li>
                    <li><span>Recall</span><strong>{parseFloat(m.recall).toFixed(4)}</strong></li>
                    <li><span>F1 Score</span><strong>{parseFloat(m.f1_score).toFixed(4)}</strong></li>
                    <li><span>ROC AUC</span><strong>{parseFloat(m.roc_auc).toFixed(4)}</strong></li>
                  </ul>
                </>
              ) : (
                <p className="muted">No metrics available</p>
              )}
              <button
                type="button"
                className="model-card-cta"
                onClick={e => {
                  e.stopPropagation()
                  setSelectedModel(name)
                }}
              >
                <Eye size={14} /> View Full Details
              </button>
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
                {uniqueMetrics.map(m => (
                  <tr key={m.model} className="clickable" onClick={() => setSelectedModel(m.model)}>
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
          <p className="text-dim text-sm mb-1">17 features fed into every model, grouped by signal type.</p>
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

      {/* Model detail modal */}
      {selectedModel && (
        <Modal
          onClose={() => setSelectedModel(null)}
          title={`${selectedModel.replace(/_/g, ' ')} Details`}
        >
          <ModelDetail
            modelKey={selectedModel}
            modelInfo={MODEL_DESC[selectedModel]}
            metrics={metrics?.data?.find(m => m.model === selectedModel)}
          />
        </Modal>
      )}
    </div>
  )
}
