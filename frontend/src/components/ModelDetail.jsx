import { ShieldCheck, AlertCircle, CheckCircle2, Info } from 'lucide-react'

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
        <span>Precision: <strong>{(precision * 100).toFixed(1)}%</strong></span>
        <span>Recall: <strong>{(recall * 100).toFixed(1)}%</strong></span>
        <span>Specificity: <strong>{(specificity * 100).toFixed(1)}%</strong></span>
        <span>Accuracy: <strong>{(accuracy * 100).toFixed(1)}%</strong></span>
      </div>
    </div>
  )
}

export default function ModelDetail({ modelKey, modelInfo, metrics }) {
  if (!modelInfo) return <p className="text-dim">No details available for this model.</p>
  return (
    <div className="model-detail">
      <p className="model-detail-summary">{modelInfo.summary}</p>

      <div className="model-detail-section">
        <h4><ShieldCheck size={16} /> Key Strengths</h4>
        <ul className="model-detail-list">
          {modelInfo.strengths.map((s, i) => (
            <li key={i}><CheckCircle2 size={14} /> {s}</li>
          ))}
        </ul>
      </div>

      {metrics && (
        <div className="model-detail-section">
          <h4><Info size={16} /> Confusion Matrix</h4>
          {metrics.true_positives !== undefined ? (
            <ConfusionMatrix
              tp={metrics.true_positives}
              fp={metrics.false_positives}
              fn={metrics.false_negatives}
              tn={metrics.true_negatives}
            />
          ) : (
            <p className="text-dim text-sm">Confusion matrix not available for this model.</p>
          )}
        </div>
      )}

      <div className="model-detail-section">
        <h4><AlertCircle size={16} /> Performance Metrics</h4>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>
              {metrics && Object.entries({
                Accuracy: metrics.accuracy,
                Precision: metrics.precision,
                Recall: metrics.recall,
                'F1 Score': metrics.f1_score,
                'ROC AUC': metrics.roc_auc,
              }).map(([k, v]) => (
                <tr key={k}><td>{k}</td><td className="mono">{parseFloat(v)?.toFixed(4)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
