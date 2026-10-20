import { TrendingUp } from 'lucide-react'

/**
 * Horizontal bar chart for feature importances.
 * Expects two parallel arrays: features (strings) and importances (numbers).
 * Sorts by importance descending and renders bars using CSS custom properties.
 */
export default function FeatureImportanceBar({
  features = [],
  importances = [],
  title = 'Feature Importance',
  subtitle,
  maxBars = 17,
  color = 'var(--primary)',
  unit = '',
}) {
  // Zip, filter nulls, sort descending
  const data = features
    .map((f, i) => ({ feature: f, importance: importances[i] }))
    .filter(d => d.feature != null && d.importance != null)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, maxBars)

  if (data.length === 0) {
    return (
      <div className="card">
        <h2>{title}</h2>
        {subtitle && <p className="text-dim">{subtitle}</p>}
        <p className="muted">No importance data available.</p>
      </div>
    )
  }

  const maxImp = Math.max(...data.map(d => d.importance))
  const widthPx = 100 // percentage

  return (
    <div className="card">
      <h2>{title}</h2>
      {subtitle && <p className="text-dim">{subtitle}</p>}
      <div className="importance-bars" style={{ maxWidth: '520px' }}>
        {data.map((d, i) => (
          <div key={d.feature} className="importance-row" style={{ '--bar-color': color }}>
            <span className="imp-rank">{i + 1}</span>
            <span className="imp-name" title={d.feature}>{d.feature}</span>
            <div className="imp-bar-wrap">
              <div
                className="imp-bar"
                style={{
                  width: `${(d.importance / maxImp) * widthPx}%`,
                  backgroundColor: 'var(--bar-color)',
                }}
              />
            </div>
            <span className="imp-value">
              {d.importance.toFixed(4)}{unit && ` ${unit}`}
            </span>
          </div>
        ))}
      </div>
      <div className="importance-legend">
        <TrendingUp size={14} /> Longer bar = stronger signal for fraud detection
      </div>
    </div>
  )
}