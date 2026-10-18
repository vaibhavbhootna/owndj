# Cloudflare Tunnel for OwnDJ (macOS)

Run OwnDJ on your Mac and share it with guests at personal events without port forwarding or exposing your home IP.

## Architecture
```
Guests (Mobile Phones) 
       │
       ▼ (HTTPS)
Cloudflare Edge Network
       │
       ▼ (Encrypted Tunnel)
cloudflared on Mac
       │
       ▼
localhost:5173 (OwnDJ Frontend / Nginx)
       │
       ├── /api/* ──> Backend (Spring Boot :8080)
       └── /ws/*  ──> WebSockets (Spring Boot :8080)
```

---

## 1. Instant Quick Tunnel (Recommended for Personal Events)
**No Cloudflare account or domain required.**

Run the helper script:
```bash
./start-tunnel.sh
```
Or run directly:
```bash
cloudflared tunnel --url http://localhost:5173
```
Cloudflare will output a public HTTPS URL like:
```text
https://cool-party-rocks.trycloudflare.com
```

### Updating the QR Code for your Guests:
You have **3 frictionless ways** to update the QR code for your `trycloudflare.com` URL:

1. **Directly in the DJ Dashboard (Instant - No restart needed!)**:
   - In the DJ Dashboard, click the **QR Code** button in the header.
   - Click **"Set Cloudflare / Public Tunnel URL"**.
   - Paste your `https://cool-party-rocks.trycloudflare.com` link and click **"Apply"**.
   - The QR code and join link will instantly re-encode to your public tunnel URL (and sync with the projector screen)!

2. **Open OwnDJ through the Tunnel URL**:
   - Simply open `https://cool-party-rocks.trycloudflare.com` in your laptop's browser.
   - The app automatically detects that you are on the tunnel domain and generates all QR codes for that public URL automatically.

3. **In `.env` (Server Config)**:
   - Set `FRONTEND_URL=https://cool-party-rocks.trycloudflare.com` in `.env`.
   - Run `docker-compose restart backend`.
---

## 2. Custom Named Tunnel (If you have a domain on Cloudflare)

### Step 1: Install & Login
```bash
brew install cloudflared
cloudflared tunnel login
```

### Step 2: Create a Tunnel
```bash
cloudflared tunnel create owndj-party
```
Note the generated Tunnel ID (UUID).

### Step 3: Route DNS
```bash
cloudflared tunnel route dns owndj-party dj.yourdomain.com
```

### Step 4: Configure `cloudflared/config.yml`
Edit `cloudflared/config.yml`:
```yaml
tunnel: <YOUR_TUNNEL_UUID>
credentials-file: /Users/gunjan/.cloudflared/<YOUR_TUNNEL_UUID>.json

ingress:
  - hostname: dj.yourdomain.com
    service: http://localhost:5173
  - service: http_status:404
```

### Step 5: Start Tunnel
```bash
cloudflared tunnel --config cloudflared/config.yml run
```
