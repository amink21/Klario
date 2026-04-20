# PDF text extraction service (Python)

Extracts text from a PDF for the Klovio app’s “Import from statement” flow. The app sends a base64-encoded PDF and receives plain text.

## API

- **POST /extract**  
  Body: `{ "base64": "<base64-encoded-pdf>" }`  
  Response: `{ "text": "extracted text" }` or `{ "error": "message" }`

- **GET /health**  
  Returns `{ "status": "ok" }` for liveness checks.

## Run locally

```bash
cd services/pdf-extract
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
flask --app app run -p 5000
```

Then in the app `.env` set:

```env
EXPO_PUBLIC_PDF_EXTRACT_URL=http://YOUR_LOCAL_IP:5000
```

Use your machine’s LAN IP (e.g. `192.168.1.x`) so the device/emulator can reach it.

## Deploy

- **Railway / Render / Fly.io**: Use `gunicorn -w 1 -b 0.0.0.0:$PORT app:app` and set `EXPO_PUBLIC_PDF_EXTRACT_URL` to the deployed URL (e.g. `https://your-app.railway.app`).
- **Google Cloud Run / AWS Lambda**: Wrap `app` in an ASGI adapter (e.g. `gunicorn` with a WSGI server) and expose the `/extract` and `/health` routes.

After deployment, set `EXPO_PUBLIC_PDF_EXTRACT_URL` in the app’s `.env` to the service URL (with no trailing slash). PDF import in the Spend tab will use this endpoint.
