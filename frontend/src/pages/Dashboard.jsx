import { useEffect, useState } from 'react'
import {
  ShieldCheck, Activity, Database, AlertTriangle,
  Search, Zap, Layers, BarChart3, Cpu, ArrowRight, Brain, Eye,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { getHealth, getReadiness, getDatasetStats, getMetrics } from '../services/api'
import Modal from '../components/Modal'
import ModelDetail from '../components/ModelDetail'

function StatCard({ label, value, sub, variant }) {
  return (
    <div className={`stat-card ${variant || ''}`}>
      <span className="stat-card-value mono">{value}</span>
      <div className="stat-card-meta">
        <span className="stat-card-label">{label}</span>
        {sub && <span className="stat-card-sub"> &bull; {sub}</span>}
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: Zap, title: 'Real-time Detection', desc: 'Score every ad click in milliseconds using a stacked ensemble of four ML models.' },
  { icon: Layers, title: 'Stacking Ensemble', desc: 'Random Forest + XGBoost + Neural Network feed a Logistic Regression meta-learner for higher accuracy than any single model.' },
  { icon: Brain, title: 'Explainable AI', desc: 'Every prediction comes with per-feature importance scores and base-model breakdowns so you understand why a click was flagged.' },
  { icon: Search, title: 'Interactive Demo', desc: 'Test the system yourself with the Ad Click Demo or run live predictions on your own click data.' },
]

const STATS = [
  { value: '4', label: 'Ensemble Models', sub: '3 base + 1 meta-learner' },
  { value: '50K', label: 'Training Samples', sub: '38.4% fraudulent' },
  { value: '77.5%', label: 'Best Accuracy', sub: 'Meta-learner model' },
  { value: '<10ms', label: 'Prediction Latency', sub: 'Real-time ready' },
]

const MODEL_DESC = {
  random_forest: {
    summary: 'An ensemble of 200 decision trees that independently evaluate each click across all 17 features.',
    strengths: ['Robust to overfitting via bagging', 'Captures non-linear feature interactions', 'Handles mixed categorical + numerical features natively'],
    metrics: 'Accuracy: 77.11% | F1: 0.510 | AUC: 0.763',
  },
  xgboost: {
    summary: 'Gradient-boosted tree ensemble (200 estimators) that sequentially corrects errors from previous trees.',
    strengths: ['Optimised for speed and accuracy', 'Built-in regularisation prevents overfitting', 'Excels at ranking and sparse data patterns'],
    metrics: 'Accuracy: 74.89% | F1: 0.501 | AUC: 0.746',
  },
  neural_network: {
    summary: 'A 3-layer MLP (128→64→32 hidden units) with ReLU activations trained via backpropagation.',
    strengths: ['learns complex feature interactions automatically', 'Fast inference once trained', 'Sensitive to feature scaling and normalisation'],
    metrics: 'Accuracy: 77.15% | F1: 0.438 | AUC: 0.764',
  },
  meta_learner: {
    summary: 'Logistic regression trained on the binary predictions and fraud probabilities from all three base models — the final arbiter.',
    strengths: ['Combines diverse base-model opinions', 'Calibrated probability output', 'Interpretable coefficients show which base model to trust when'],
    metrics: 'Accuracy: 77.53% | F1: 0.451 | AUC: 0.766',
  },
}

export default function Dashboard() {
  const [health, setHealth]   = useState(null)
  const [ready, setReady]     = useState(null)
  const [stats, setStats]     = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [err, setErr]         = useState(null)
  const [selectedModel, setSelectedModel] = useState(null)
  const [loaded, setLoaded]   = useState(false)

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
      setLoaded(true)
    }).catch(() => setErr('Failed to load dashboard data'))
  }, [])

  const ds = stats?.data?.training_data || {}
  const ts = stats?.data?.test_data || {}
  let best = null
  if (metrics?.data) {
    best = metrics.data.reduce((a, b) => (parseFloat(b.f1_score) > parseFloat(a.f1_score) ? b : a), metrics.data[0])
  }

  return (
    <div className="page">
      <Helmet>
        <title>FraudGuard - Real-Time Ad Click Fraud Detection</title>
        <meta name="description" content="FraudGuard uses a stacked ensemble of ML models to detect fraudulent ad clicks in real-time. Learn how click fraud costs advertisers billions and how our system fights back." />
        <link rel="canonical" href="https://fraudguard.farazkiqbal.com/" />
        <meta property="og:title" content="FraudGuard - Click Fraud Detection" />
        <meta property="og:description" content="Real-time ad click fraud detection powered by a stacked ensemble of Random Forest, XGBoost, Neural Networks, and Logistic Regression." />
        <meta property="og:url" content="https://fraudguard.farazkiqbal.com/" />
      </Helmet>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-badge">
          <Activity size={14} /> Stacked Ensemble ML System
        </div>
        <h1 className="hero-title">
          Stop <span className="text-accent">Click Fraud</span> Before It Costs You
        </h1>
        <p className="hero-desc">
          Ad click fraud costs the industry <strong>$22 billion annually</strong>. Fraudulent bots and fake accounts inflate ad budgets, skew analytics, and waste marketing spend. FraudGuard analyses every click in real-time using a stacked ensemble of four machine-learning models to separate humans from bots — before the budget burns.
        </p>
        <div className="hero-actions">
          <a href="/predict" className="btn btn-primary btn-lg">
            <Search size={18} />
            Analyze a Click
          </a>
          <a href="/ad-demo" className="btn btn-outline btn-lg">
            <Eye size={18} />
            Try the Demo
          </a>
        </div>
      </section>

      {/* ── Why It Matters ── */}
      <section className="card mt-2">
        <div className="section-heading">
          <div>
            <h2><AlertTriangle size={20} /> Why Click Fraud Detection Matters</h2>
            <p className="text-dim text-sm">Every invalid click drains budget and contaminates the data used to make marketing decisions.</p>
          </div>
          <span className="section-kicker">Protect spend. Trust data.</span>
        </div>
        <div className="why-grid">
          <div className="why-col">
            <h4>The Problem</h4>
            <p className="why-col-intro">Fraud scales faster than manual review can keep up.</p>
            <ul className="kv-list">
              <li><span>Global cost</span><strong>$22B / year</strong></li>
              <li><span>Average business loss</span><strong>10–20% of ad spend</strong></li>
              <li><span>Bot-driven clicks</span><strong>up 330% since 2020</strong></li>
              <li><span>Manual review feasibility</span><strong>impossible at scale</strong></li>
            </ul>
          </div>
          <div className="why-col">
            <h4>Our Approach</h4>
            <p className="why-col-intro">FraudGuard turns noisy click signals into a fast, explainable decision.</p>
            <ul className="kv-list">
              <li><span>Base models</span><strong>RF + XGB + NN in parallel</strong></li>
              <li><span>Meta-learner</span><strong>Logistic regression stacks outputs</strong></li>
              <li><span>Latency</span><strong>&lt;10 ms per click</strong></li>
              <li><span>Explainability</span><strong>Feature importance per prediction</strong></li>
            </ul>
          </div>
        </div>
        <div className="why-outcomes" aria-label="Click fraud detection outcomes">
          <div><ShieldCheck size={18} /><span><strong>Stop wasted spend</strong><small>Flag suspicious traffic before it consumes budget.</small></span></div>
          <div><BarChart3 size={18} /><span><strong>Improve attribution</strong><small>Keep campaign reports focused on real users.</small></span></div>
          <div><Zap size={18} /><span><strong>Respond in real time</strong><small>Score every click in milliseconds, not days later.</small></span></div>
        </div>
      </section>

      {/* ── Key Stats ── */}
      <div className="stat-grid mt-2">
        {STATS.map((s, i) => (
          <StatCard key={i} label={s.label} value={s.value} sub={s.sub} variant={i === 2 ? 'primary' : ''} />
        ))}
      </div>

      {/* ── System Features ── */}
      <section className="card mt-2">
        <h2><Zap size={20} /> What FraudGuard Does</h2>
        <div className="feature-cols">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-col-card">
              <div className="feature-col-icon"><f.icon size={24} /></div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Model Overview (clickable) ── */}
      {loaded && metrics?.data && (
        <section className="card mt-2">
          <div className="flex-between">
            <h2><BarChart3 size={20} /> Ensemble Model Performance</h2>
            <a href="/models" className="text-sm" style={{ color: 'var(--accent)' }}>
              View Details <ArrowRight size={14} />
            </a>
          </div>
          <p className="text-dim text-sm mb-1">Click any model card below for a detailed breakdown.</p>
          <div className="model-grid">
            {Object.values(metrics.data.reduce((byModel, m) => {
              byModel[m.model] = m
              return byModel
            }, {})).map(m => {
              const key = m.model
              const desc = MODEL_DESC[key]
              return (
                <div
                  key={key}
                  className="model-card clickable"
                  onClick={() => setSelectedModel(key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelectedModel(key)}
                >
                  <div className="model-icon">
                    {key === 'random_forest' && <Layers size={28} />}
                    {key === 'xgboost' && <BarChart3 size={28} />}
                    {key === 'neural_network' && <Cpu size={28} />}
                    {key === 'meta_learner' && <Layers size={28} />}
                  </div>
                  <h3>{key.replace(/_/g, ' ')}</h3>
                  <ul className="kv-list compact">
                    <li><span>Accuracy</span><strong>{parseFloat(m.accuracy).toFixed(4)}</strong></li>
                    <li><span>F1 Score</span><strong>{parseFloat(m.f1_score).toFixed(4)}</strong></li>
                    <li><span>ROC AUC</span><strong>{parseFloat(m.roc_auc).toFixed(4)}</strong></li>
                  </ul>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Dataset Overview ── */}
      {loaded && stats?.data && (
        <div className="card-row mt-2">
          <div className="card flex-1">
            <h3><Database size={18} /> Training Set</h3>
            <ul className="kv-list">
              <li><span>Total samples</span><strong>{ds.total_samples?.toLocaleString()}</strong></li>
              <li><span>Fraudulent</span><strong>{ds.fraud_count?.toLocaleString()}</strong></li>
              <li><span>Legitimate</span><strong>{ds.legitimate_count?.toLocaleString()}</strong></li>
              <li><span>Fraud %</span><strong>{ds.fraud_percentage}%</strong></li>
              <li><span>Features</span><strong>{ds.num_features}</strong></li>
            </ul>
          </div>
          <div className="card flex-1">
            <h3><Activity size={18} /> Test Set</h3>
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

      {/* ── Model Detail Modal ── */}
      {selectedModel && (
        <Modal onClose={() => setSelectedModel(null)} title={`${selectedModel.replace(/_/g, ' ')} Details`}>
          <ModelDetail modelKey={selectedModel} modelInfo={MODEL_DESC[selectedModel]} metrics={metrics?.data?.find(m => m.model === selectedModel)} />
        </Modal>
      )}
    </div>
  )
}
