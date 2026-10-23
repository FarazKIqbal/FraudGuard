import { useEffect, useState } from 'react'
import {
  Brain,
  ArrowRight,
  Layers,
  BarChart3,
  Cpu,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import ClickForm from '../components/ClickForm'
import FeatureImportanceBar from '../components/FeatureImportanceBar'
import { getModels, getFeatures, predictSingle } from '../services/api'

export default function HowItWorks() {
  const [modelsInfo, setModelsInfo] = useState(null)
  const [featuresInfo, setFeaturesInfo] = useState(null)
  const [rfImportance, setRfImportance] = useState(null)
  const [xgbImportance, setXgbImportance] = useState(null)
  const [metaImportance, setMetaImportance] = useState(null)
  const [demoResult, setDemoResult] = useState(null)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState(null)

  // --- Load data on mount ---
  useEffect(() => {
    Promise.all([
      getModels().catch(() => null),
      getFeatures().catch(() => null),
      fetch('/api/models/random_forest/importance').then(r => r.json()).catch(() => null),
      fetch('/api/models/xgboost/importance').then(r => r.json()).catch(() => null),
      fetch('/api/models/meta_learner/importance').then(r => r.json()).catch(() => null),
    ]).then(([m, f, rf, xgb, ml]) => {
      setModelsInfo(m?.data)
      setFeaturesInfo(f?.data)
      setRfImportance(rf?.data)
      setXgbImportance(xgb?.data)
      setMetaImportance(ml?.data)
    }).catch(() => setError('Failed to load model explanation data'))
  }, [])

  // --- Handle live demo submission ---
  const handleDemoSubmit = async (payload) => {
    setDemoLoading(true)
    setDemoResult(null)
    setError(null)
    try {
      const res = await predictSingle(payload, 'meta_learner')
      setDemoResult(res)
    } catch (e) {
      setError(e.message || 'Demo prediction failed')
    } finally {
      setDemoLoading(false)
    }
  }

  if (error) return <div className="error-text">{error}</div>
  if (!modelsInfo) return <div className="loading-center"><span className="spinner" /> Loading model data...</div>

  const availableModels = modelsInfo.available_models || []
  const hasMetaLearner = availableModels.includes('meta_learner')

  // --- Architecture steps ---
  const architectureSteps = [
    {
      icon: <Layers size={24} />,
      title: 'Feature Engineering',
      description: '17 raw features extracted: 5 categorical (device, browser, OS, ad position, IP reputation), 7 behavioral numerics (duration, scroll, mouse, keystrokes, frequency, time since last click, bot score), 3 time-based (hour, day of week, weekend flag), 2 binary (VPN, proxy).',
    },
    {
      icon: <BarChart3 size={24} />,
      title: 'Base Models (Parallel)',
      description: 'Three models independently score the click:\n• Random Forest (200 trees) — ensemble of decision trees\n• XGBoost (200 estimators) — gradient boosting\n• Neural Network (128→64→32) — multi-layer perceptron\nEach outputs a fraud probability (0–1).',
    },
    {
      icon: <Cpu size={24} />,
      title: 'Meta-Features (Stacking)',
      description: 'The meta-learner receives 6 features: each base model\'s binary prediction (0/1) + fraud probability. These capture both the decision and the confidence of each base model.',
    },
    {
      icon: <Zap size={24} />,
      title: 'Meta-Learner (Logistic Regression)',
      description: 'A logistic regression trained on the meta-features via 5-fold CV. It learns which base model to trust in which situations. Output: final fraud probability (0–1).',
    },
    {
      icon: <Shield size={24} />,
      title: 'Threshold Decision',
      description: 'If probability ≥ threshold (default ~0.35 from training), flag as FRAUD. Lower threshold = more sensitive (catch more fraud, more false positives).',
    },
  ]

  return (
    <div className="page">
      <Helmet>
        <title>How It Works | FraudGuard - Stacking Ensemble Explained</title>
        <meta name="description" content="Learn how FraudGuard's stacking ensemble works: Random Forest, XGBoost, and Neural Network base models feed a logistic regression meta-learner." />
        <link rel="canonical" href="https://fraudguard.farazkiqbal.com/how-it-works" />
        <meta property="og:title" content="How It Works | FraudGuard" />
        <meta property="og:description" content="Stacking ensemble architecture and feature importance explained." />
        <meta property="og:url" content="https://fraudguard.farazkiqbal.com/how-it-works" />
      </Helmet>
      <h1>How the Model Works</h1>
      <p className="subtitle">Understand the signals, the ensemble, and the decision logic behind FraudGuard</p>

      {/* 1. Model Architecture */}
      <div className="card">
        <h2><Brain size={22} /> Stacking Ensemble Architecture</h2>
        <div className="architecture-flow">
          {architectureSteps.map((step, i) => (
            <div key={i} className="arch-step">
              <div className="arch-icon">{step.icon}</div>
              <div className="arch-content">
                <h3>{step.title}</h3>
                <pre className="arch-desc">{step.description}</pre>
              </div>
              {i < architectureSteps.length - 1 && (
                <ArrowRight className="arch-arrow" size={24} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Feature Importance — Random Forest */}
      {rfImportance && (
        <div className="card mt-1">
          <FeatureImportanceBar
            features={rfImportance.features}
            importances={rfImportance.importances}
            title="Random Forest — Feature Importance (Gini)"
            subtitle="Higher = more often used to split fraudulent vs legitimate clicks"
            color="var(--blue)"
          />
        </div>
      )}

      {/* 3. Feature Importance — XGBoost */}
      {xgbImportance && (
        <div className="card mt-1">
          <FeatureImportanceBar
            features={xgbImportance.features}
            importances={xgbImportance.importances}
            title="XGBoost — Feature Importance (Gain)"
            subtitle="Higher = more contribution to loss reduction (fraud separation)"
            color="var(--amber)"
          />
        </div>
      )}

      {/* 4. Meta-Learner Coefficients */}
      {metaImportance && (
        <div className="card mt-1">
          <h2><Layers size={20} /> Meta-Learner Coefficients</h2>
          <p className="text-dim text-sm mb-1">
            Logistic regression weights on the 6 meta-features. Positive = increases fraud probability; negative = decreases it.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Meta-Feature</th>
                  <th>Coefficient</th>
                  <th>Effect</th>
                </tr>
              </thead>
              <tbody>
                {metaImportance.meta_features?.map((name, i) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td className={metaImportance.coefficients[i] > 0 ? 'text-danger' : 'text-success'}>
                      {metaImportance.coefficients[i].toFixed(4)}
                    </td>
                    <td>
                      <span className={`badge ${metaImportance.coefficients[i] > 0 ? 'badge-danger' : 'badge-success'}`}>
                        {metaImportance.coefficients[i] > 0 ? 'Fraud signal' : 'Legitimate signal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-dim mt-1">
            Note: The meta-learner learns that <strong>base model fraud probabilities</strong> (positive coeffs) matter more than their binary predictions (smaller coeffs).
          </p>
        </div>
      )}

      {/* 5. What Makes a Click Suspicious */}
      <div className="card mt-1">
        <h2><AlertTriangle size={22} /> Top Fraud Indicators</h2>
        <div className="feature-cols">
          <div>
            <h4><Zap size={16} /> Behavioral Anomalies</h4>
            <ul className="feature-list">
              <li><strong>bot_likelihood_score</strong> — Highest single predictor. Bot-like patterns (fast clicks, no mouse movement) strongly indicate fraud.</li>
              <li><strong>click_duration</strong> — Suspiciously short (under 0.5 seconds) suggests automated clicking.</li>
              <li><strong>click_frequency</strong> — Bursts of rapid clicks are non-human.</li>
              <li><strong>mouse_movement / scroll_depth / keystrokes</strong> — Near-zero values = no human interaction.</li>
            </ul>
          </div>
          <div>
            <h4><Shield size={16} /> Context Signals</h4>
            <ul className="feature-list">
              <li><strong>device_ip_reputation</strong> — "Poor" or "Suspicious" IPs are high-risk.</li>
              <li><strong>VPN_usage / proxy_usage</strong> — Anonymizing traffic = elevated risk.</li>
              <li><strong>ad_position</strong> — "Bottom" or "Side" positions attract more accidental/bot clicks.</li>
              <li><strong>time_since_last_click</strong> — Very short intervals suggest scripted behavior.</li>
            </ul>
          </div>
          <div>
            <h4><Info size={16} /> Time-Based</h4>
            <ul className="feature-list">
              <li><strong>hour</strong> — Late night / early morning (2–5 AM) has higher fraud rates.</li>
              <li><strong>is_weekend</strong> — Weekend traffic patterns differ; bots often run 24/7.</li>
              <li><strong>day_of_week</strong> — Certain weekdays see more botnet activity.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 6. Live Demo */}
      <div className="card mt-1">
        <h2><Zap size={22} /> Live Demo — Test a Click</h2>
        <p className="subtitle">Modify the features below and see how the meta-learner responds</p>

        <div className="card-row mt-1" style={{ gap: '2rem', flexWrap: 'wrap' }}>
          <div className="flex-1" style={{ minWidth: '380px' }}>
            <ClickForm onSubmit={handleDemoSubmit} loading={demoLoading} />
          </div>

          <div className="flex-1" style={{ minWidth: '380px' }}>
            {demoResult && (
              <div className={`result-banner ${demoResult.prediction === 'fraudulent' ? 'fraud' : 'legit'}`}>
                {demoResult.prediction === 'fraudulent' ? <Shield size={32} /> : <Shield size={32} />}
                <div>
                  <h3>{demoResult.prediction === 'fraudulent' ? 'FRAUD DETECTED' : 'LEGITIMATE CLICK'}</h3>
                  <p>
                    Fraud Probability: <strong>{(demoResult.fraud_probability * 100).toFixed(1)}%</strong>
                    {' | '}
                    Confidence: <strong>{(demoResult.confidence * 100).toFixed(1)}%</strong>
                    {' | '}
                    Model: <strong>{demoResult.model_used}</strong>
                  </p>
                </div>
              </div>
            )}

            {demoResult && (
              <div className="card mt-1">
                <h3>Why this decision?</h3>
                <ul className="kv-list">
                  {demoResult.fraud_probability > 0.5 && <li><span>High fraud probability</span><strong>{(demoResult.fraud_probability * 100).toFixed(1)}%</strong></li>}
                  {demoResult.fraud_probability < 0.2 && <li><span>Low fraud probability</span><strong>{(demoResult.fraud_probability * 100).toFixed(1)}%</strong></li>}
                  <li><span>Threshold used</span><strong>{demoResult.fraud_threshold ?? 'auto'}</strong></li>
                  <li><span>Ensemble consensus</span><strong>{demoResult.prediction === 'fraudulent' ? 'Fraud' : 'Legitimate'}</strong></li>
                </ul>
                <p className="text-sm text-dim mt-1">
                  The final decision is made by the meta-learner (logistic regression) which weights the three base models' probabilities.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. Model Performance Summary */}
      <div className="card mt-1">
        <h2><BarChart3 size={20} /> Ensemble Performance</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Accuracy</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1</th>
                <th>ROC-AUC</th>
              </tr>
            </thead>
            <tbody>
              {['random_forest', 'xgboost', 'neural_network', 'meta_learner'].map(name => {
                const m = modelsInfo.meta_learner_info && name === 'meta_learner'
                  ? modelsInfo.meta_learner_info.metrics
                  : null
                return m ? (
                  <tr key={name}>
                    <td>{name.replace(/_/g, ' ')}</td>
                    <td>{m.accuracy.toFixed(4)}</td>
                    <td>{m.precision.toFixed(4)}</td>
                    <td>{m.recall.toFixed(4)}</td>
                    <td><strong>{m.f1_score.toFixed(4)}</strong></td>
                    <td>{m.roc_auc.toFixed(4)}</td>
                  </tr>
                ) : null
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}