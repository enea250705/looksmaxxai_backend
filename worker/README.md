# LooksMaxx AI – Cloudflare Worker

Same API as the Node backend: `GET /health`, `POST /rate-face`. Runs on Cloudflare Workers (no Node, no static files).

## Deploy (Worker, not Pages)

1. **Install Wrangler** (one-time):  
   `npm install -g wrangler`  
   or run with `npx wrangler`.

2. **Log in**:  
   `npx wrangler login`

3. **Set your Gemini API key** (secret):  
   `npx wrangler secret put GEMINI_API_KEY`  
   Paste your key from [Google AI Studio](https://aistudio.google.com/apikey).

4. **Deploy from this folder**:  
   `cd worker`  
   `npx wrangler deploy`

5. Your API URL will be like:  
   `https://looksmaxxai-backend.<your-subdomain>.workers.dev`  
   Use this as `EXPO_PUBLIC_API_URL` in the app.

## Important: use Workers, not Pages

- **Pages** looks for static files (HTML/CSS/JS). This project is an API, so you get “Could not detect a directory containing static files” if you deploy as Pages.
- **Workers** run this `index.js` and handle `/health` and `/rate-face`. Deploy from the `worker` folder with `wrangler deploy` as above.

## In Cloudflare dashboard

- **Workers & Pages** → your worker → **Settings** → **Variables and Secrets**: add `GEMINI_API_KEY` if you didn’t use `wrangler secret put`.
- The worker URL is shown on the worker’s overview page.
