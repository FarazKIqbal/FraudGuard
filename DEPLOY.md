# Deploying FraudGuard with Vercel and Render

FraudGuard is deployed as two services:

- **Vercel** hosts the React/Vite dashboard as a static site.
- **Render** hosts the Flask API and trained model files in one Docker service.

This keeps the frontend on Vercel's CDN and leaves Render responsible only for
the Python machine-learning API.

## 1. Prepare the repository

The model files under `models/` and the processed data used by analytics must
be committed. The large random-forest artifact is intentionally regenerated
from the tracked processed training data during the Docker build. Do not
commit `.env`, credentials, `node_modules/`, or raw datasets.

Test locally:

```powershell
# API (from the repository root)
.\.venv\Scripts\python.exe run.py

# Frontend (in a second terminal)
cd frontend
npm ci
npm run build
```

The local Vite proxy sends `/api` requests to `http://localhost:5000`. In
production, the frontend uses the `VITE_API_URL` environment variable instead.

## 2. Deploy the API to Render

1. Push the repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Render detects `render.yaml` and creates the `fraudguard` web service.
4. Confirm the service is on the **Free** plan.
5. After the first successful deploy, open the service's **Settings** and copy
   its public URL, for example:

   ```text
   https://fraudguard.onrender.com
   ```

6. Add this variable in Render's **Environment** section:

   | Variable | Value |
   |---|---|
   | `FRONTEND_ORIGIN` | the final Vercel URL, for example `https://fraudguard.vercel.app` |

The other production variables are provided by `render.yaml`:

```text
FLASK_ENV=production
DEFAULT_MODEL=meta_learner
WEB_CONCURRENCY=1
GUNICORN_THREADS=2
GUNICORN_TIMEOUT=120
```

Verify the API:

```powershell
curl https://YOUR-RENDER-DOMAIN.onrender.com/api/health
curl https://YOUR-RENDER-DOMAIN.onrender.com/api/health/ready
```

The readiness endpoint should report the loaded base models and meta-learner.

### Free-plan considerations

- The service can sleep after inactivity, so the first request may have a
  noticeable cold start while the models load.
- Keep `WEB_CONCURRENCY=1`; multiple workers would load another copy of the
  scikit-learn/XGBoost models and can exceed the free instance's memory.
- Two Gunicorn threads allow health checks and ordinary requests without
  multiplying model processes.
- The Docker build does not install Node.js or build the frontend.
- `.dockerignore` excludes local environments, dependencies, and raw datasets.
- Do not add Redis for this single free instance. The in-memory limiter avoids
  the cost and maintenance of another service.

## 3. Deploy the frontend to Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Use these build settings:

   - Framework preset: **Vite**
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: `dist`

4. Add this Vercel environment variable:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://YOUR-RENDER-DOMAIN.onrender.com` |

5. Redeploy Vercel.
6. Copy the Vercel production URL into Render's `FRONTEND_ORIGIN` and
   redeploy the Render service.

`frontend/vercel.json` rewrites client-side routes such as `/predict` to
`index.html`, so refreshing a dashboard page does not return a Vercel 404.

## 4. Test the complete deployment

Open the Vercel URL and test:

1. Dashboard model loading
2. A single prediction
3. A batch prediction
4. The Models and Analytics pages
5. Refreshing a nested route such as `/predict`

If the frontend reports a network error, check that `VITE_API_URL` contains the
Render URL without a trailing slash and that `FRONTEND_ORIGIN` exactly matches
the Vercel HTTPS origin.

## Optional custom domains

Add a custom domain to Vercel for the dashboard. If the domain changes, update
Render's `FRONTEND_ORIGIN` to the exact HTTPS origin without a trailing slash.
The Render domain can remain the API domain:

```text
https://fraudguard.onrender.com
https://fraudguard.example.com
```

For repeatable deployments, GitHub-connected deployments are preferred because
Render and Vercel rebuild automatically when changes are pushed to the
selected production branch.
