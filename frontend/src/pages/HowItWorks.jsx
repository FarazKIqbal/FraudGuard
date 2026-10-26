import { useEffect, useState } from 'react'
import { Shield, ArrowRight, Layers, BarChart3, Cpu, Zap, Brain, Info, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import Modal from '../components/Modal'
import FeatureImportanceBar from '../components/FeatureImportanceBar'
import { getModels, getFeatures } from '../services/api'

const ARCH_STEPS = [
  {
    id: 'features',
    icon: Layers,
    title: 'Feature Engineering',
    short: '17 features extracted: 5 categorical, 7 behavioural numerics, 3 time-based, 2 binary flags.',
    detail: 'Each click is transformed into 17 numeric features the models can score: device type, browser, OS, ad position, IP reputation, click duration, scroll depth, mouse movement, keystrokes, click frequency, time since last click, bot likelihood score, hour of day, day of week, weekend flag, VPN usage, and proxy usage.',
  },
  {
    id: 'base-models',
    icon: BarChart3,
    title: 'Base Models (Parallel)',
    short: 'Three models score each click independently — Random Forest, XGBoost, and Neural Network.',
    detail: 'Random Forest (200 trees) uses bagging to average many decision trees. XGBoost (200 estimators) uses gradient boosting to sequentially correct errors. Neural Network (128→64→32 hidden units) learns complex non-linear patterns via backpropagation. Each outputs both a binary prediction (fraud/legit) and a fraud probability (0–1).',
  },
  {
    id: 'meta-features',
    icon: Cpu,
    title: 'Meta-Features (Stacking)',
    short: 'Each base model contributes 2 features: its binary prediction + its fraud probability.',
    detail: 'The meta-learner receives 6 meta-features total (2 per base model). This captures both the decision and the confidence of each base model, giving the meta-learner richer signal than probabilities alone. For example, a high fraud probability from Random Forest plus a low one from XGBoost sends a very different signal than both agreeing.',
  },
  {
    id: 'meta-learner',
    icon: Brain,
    title: 'Meta-Learner (Logistic Regression)',
    short: 'A logistic regression trained via 5-fold CV on the meta-features.',
    detail: 'The meta-learner learns which base model to trust in which situations by assigning weighted coefficients to each meta-feature. Positive coefficients increase fraud probability; negative coefficients decrease it. The output is a final fraud probability between 0 and 1.',
  },
  {
    id: 'threshold',
    icon: Shield,
    title: 'Threshold Decision',
    short: 'If probability ≥ threshold (~0.35), flag as FRAUD. Lower = more sensitive.',
    detail: 'The optimal threshold was determined during training by sweeping candidate values and selecting the one that maximised F1 score on the held-out test set. Currently set to ~0.35, meaning any click with a 35%+ fraud probability is flagged. Adjusting this threshold trades false positives against false negatives.',
  },
]

const FEATURE_COLS = [
  {
    title: 'Context Signals',
    icon: Shield,
    items: ['device_type', 'browser', 'operating_system', 'ad_position', 'device_ip_reputation', 'VPN_usage', 'proxy_usage'],
  },
  {
    title: 'Behavioral Metrics',
    icon: Zap,
    items: ['click_duration', 'scroll_depth', 'mouse_movement', 'keystrokes_detected', 'click_frequency', 'time_since_last_click', 'bot_likelihood_score'],
  },
  {
    title: 'Time-Based Signals',
    icon: ArrowRight,
    items: ['hour', 'day_of_week', 'is_weekend'],
  },
]

export default function HowItWorks() {
  const [modelsInfo, setModelsInfo] = useState(null)
  const [featuresInfo, setFeaturesInfo] = useState(null)
  const [rfImportance, setRfImportance] = useState(null)
  const [xgbImportance, setXgbImportance] = useState(null)
  const [metaImportance, setMetaImportance] = useState(null)
  const [error, setError] = useState(null)
  const [activeStep, setActiveStep] = useState(null)
  const [expandedFaq, setExpandedFaq] = useState(null)

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

  const faqs = [
    { q: 'Why use stacking instead of a single model?', a: 'No single model captures all the patterns in click fraud data. Stacking lets each model play to its strengths — RF handles non-linear interactions, XGBoost catches sequential patterns, and the NN learns complex feature combinations. The meta-learner then decides which opinion to trust in each situation.' },
    { q: 'How does the meta-learner avoid overfitting?', a: 'The meta-features are generated via 5-fold cross-validation on the training set, meaning each base model\'s prediction for a sample comes from a model that never saw that sample during training. This prevents the meta-learner from learning trivial shortcuts.' },
    { q: 'What makes a click "suspicious"?', a: 'The strongest predictors are bot_likelihood_score (near 1.0), very short click_duration (< 0.5s), low mouse_movement (< 50), high click_frequency (> 10/min), poor IP reputation, and VPN/proxy usage. Late-night clicks (2–5 AM) also carry higher risk.' },
    { q: 'Can I adjust the fraud threshold?', a: 'Yes — the default threshold is ~0.35, optimised for F1 score. Lowering it catches more fraud but increases false positives. Raising it reduces false alarms but may miss sophisticated fraud. The Predict page lets you experiment with different thresholds in real time.' },
  ]

  if (error) return <p className="error-text">{error}</p>
  if (!modelsInfo) return <div className="loading-center"><span className="spinner" /> Loading model data...</div>

  const toggleFaq = (i) => setExpandedFaq(expandedFaq === i ? null : i)

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

      <header className="page-header">
        <h1 className="page-title">How the Model Works</h1>
        <p className="subtitle">Understand the signals, the ensemble, and the decision logic behind FraudGuard</p>
      </header>

      {/* ── Architecture Steps (clickable) ── */}
      <section className="card mt-1">
        <h2><Brain size={20} /> Stacking Ensemble Architecture</h2>
        <p className="text-dim text-sm mb-1">Click any step below to learn more about how it works.</p>
        <div className="architecture-flow">
          {ARCH_STEPS.map((step, i) => {
            const Icon = step.icon
            const isActive = activeStep === step.id
            return (
              <div
                key={step.id}
                className={`arch-step ${isActive ? 'active' : ''}`}
                onClick={() => setActiveStep(isActive ? null : step.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setActiveStep(isActive ? null : step.id)}
              >
                <div className="arch-icon"><Icon size={22} /></div>
                <div className="arch-content">
                  <h3>{step.title}</h3>
                  <p className="arch-desc">{step.short}</p>
                  <span className="arch-toggle">{isActive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                </div>
                {i < ARCH_STEPS.length - 1 && <ArrowRight className="arch-arrow" size={20} />}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Detail Modal ── */}
      {activeStep && (
        <Modal
          onClose={() => setActiveStep(null)}
          title={ARCH_STEPS.find(s => s.id === activeStep)?.title}
        >
          {(() => {
            const step = ARCH_STEPS.find(s => s.id === activeStep)
            if (!step) return null
            return (
              <div className="step-detail">
                <p>{step.detail}</p>
                {step.id === 'features' && featuresInfo && (
                  <div className="mt-2">
                    <h4>Input Features ({Object.values(featuresInfo).flat().length} total)</h4>
                    <div className="feature-cols mt-1">
                      {Object.entries(featuresInfo).map(([group, list]) => (
                        <div key={group}>
                          <h5>{group.replace(/_/g, ' ')}</h5>
                          <ul className="feature-list">
                            {(Array.isArray(list) ? list : [list]).map(f => <li key={f}>{f}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {step.id === 'base-models' && (
                  <div className="mt-2">
                    <h4>Available Base Models</h4>
                    <ul className="kv-list mt-1">
                      <li><span>Random Forest</span><strong>200 trees, bagging ensemble</strong></li>
                      <li><span>XGBoost</span><strong>200 estimators, gradient boosting</strong></li>
                      <li><span>Neural Network</span><strong>128 → 64 → 32 hidden units</strong></li>
                    </ul>
                  </div>
                )}
                {step.id === 'meta-features' && (
                  <div className="mt-2">
                    <h4>Meta-Feature Structure</h4>
                    <p className="text-dim text-sm mb-1">Each base model contributes 2 features to the meta-learner:</p>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Base Model</th><th>Meta Feature 1</th><th>Meta Feature 2</th></tr></thead>
                        <tbody>
                          <tr><td>Random Forest</td><td className="mono">rf_prediction (0/1)</td><td className="mono">rf_fraud_probability (0–1)</td></tr>
                          <tr><td>XGBoost</td><td className="mono">xgb_prediction (0/1)</td><td className="mono">xgb_fraud_probability (0–1)</td></tr>
                          <tr><td>Neural Network</td><td className="mono">nn_prediction (0/1)</td><td className="mono">nn_fraud_probability (0–1)</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {step.id === 'meta-learner' && metaImportance && (
                  <div className="mt-2">
                    <h4>Meta-Learner Coefficients</h4>
                    <p className="text-dim text-sm mb-1">Positive = increases fraud probability. Negative = decreases it.</p>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Meta-Feature</th><th>Coefficient</th><th>Effect</th></tr></thead>
                        <tbody>
                          {metaImportance.meta_features?.map((name, i) => (
                            <tr key={name}>
                              <td>{name}</td>
                              <td className={metaImportance.coefficients[i] > 0 ? 'text-danger' : 'text-success'}>
                                {metaImportance.coefficients[i].toFixed(4)}
                              </td>
                              <td>
                                <span className={`badge ${metaImportance.coefficients[i] > 0 ? 'badge-danger' : 'badge-success'}`}>
                                  {metaImportance.coefficients[i] > 0 ? 'Fraud signal' : 'Legit signal'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {step.id === 'threshold' && (
                  <div className="mt-2">
                    <h4>Threshold Tuning</h4>
                    <p className="text-dim text-sm mb-1">
                      The default threshold of <strong>0.35</strong> was selected to maximise F1 score on the test set. Lower thresholds catch more fraud but produce more false positives; higher thresholds reduce false alarms but may miss subtle fraud patterns.
                    </p>
                    <a href="/predict" className="btn btn-outline btn-sm mt-1">
                      Adjust Threshold →
                    </a>
                  </div>
                )}
              </div>
            )
          })()}
        </Modal>
      )}

      {/* ── Feature Importance ── */}
      {(rfImportance || xgbImportance) && (
        <div className="card-row mt-2">
          {rfImportance && (
            <div className="card flex-1">
              <FeatureImportanceBar
                features={rfImportance.features}
                importances={rfImportance.importances}
                title="Random Forest — Feature Importance (Gini)"
                subtitle="Higher = more often used to split fraudulent vs legitimate clicks"
                color="var(--gold)"
              />
            </div>
          )}
          {xgbImportance && (
            <div className="card flex-1">
              <FeatureImportanceBar
                features={xgbImportance.features}
                importances={xgbImportance.importances}
                title="XGBoost — Feature Importance (Gain)"
                subtitle="Higher = more contribution to loss reduction (fraud separation)"
                color="var(--accent)"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Feature Categories ── */}
      <section className="card mt-2">
        <h2><Zap size={20} /> Input Features</h2>
        <p className="text-dim text-sm mb-1">17 features fed into every model, grouped by signal type.</p>
        <div className="feature-cols">
          {FEATURE_COLS.map(col => {
            const Icon = col.icon
            return (
              <div key={col.title} className="feature-col-card">
                <div className="feature-col-icon"><Icon size={20} /></div>
                <h4>{col.title}</h4>
                <ul className="feature-list">
                  {col.items.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Top Fraud Indicators ── */}
      <section className="card mt-2">
        <h2><AlertTriangle size={20} /> Top Fraud Indicators</h2>
        <div className="feature-cols">
          <div>
            <h4><Zap size={16} /> Behavioral Anomalies</h4>
            <ul className="feature-list">
              <li><strong>bot_likelihood_score</strong> — Highest single predictor. Values near 1.0 strongly indicate automation.</li>
              <li><strong>click_duration</strong> — Suspiciously short (&lt;0.5s) suggests scripted clicking.</li>
              <li><strong>click_frequency</strong> — Bursts &gt;10 clicks/min are non-human.</li>
              <li><strong>mouse_movement</strong> — Near-zero values = no human interaction.</li>
            </ul>
          </div>
          <div>
            <h4><Shield size={16} /> Context Signals</h4>
            <ul className="feature-list">
              <li><strong>device_ip_reputation</strong> — "Poor" or "Suspicious" IPs are high-risk.</li>
              <li><strong>VPN_usage / proxy_usage</strong> — Anonymising traffic elevates risk.</li>
              <li><strong>ad_position</strong> — "Bottom" and "Side" positions attract more bot clicks.</li>
              <li><strong>time_since_last_click</strong> — Very short intervals suggest scripting.</li>
            </ul>
          </div>
          <div>
            <h4><ArrowRight size={16} /> Time-Based</h4>
            <ul className="feature-list">
              <li><strong>hour</strong> — Late night / early morning (2–5 AM) has higher fraud rates.</li>
              <li><strong>is_weekend</strong> — Bots often run 24/7, unlike human traffic.</li>
              <li><strong>day_of_week</strong> — Certain weekdays see more botnet activity.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="card mt-2">
        <h2><Info size={20} /> Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className={`faq-item ${expandedFaq === i ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(i)}>
                <span>{faq.q}</span>
                {expandedFaq === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedFaq === i && <p className="faq-answer">{faq.a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
