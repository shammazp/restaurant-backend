# Production Optimization

Your API is already running at `https://codecastle.store` but it's in development mode. Here's how to optimize it for production.

## Current Status

Your API shows:
- ✅ Running publicly
- ⚠️ Environment: `development` (should be `production`)
- ⚠️ HTTPS: `false` (should be `true`)

## Quick Fixes

### 1. Enable Production Mode

On your server, update your `.env` file:

```env
NODE_ENV=production
```

**Important:** The code has been updated to handle load balancers correctly. If you're behind a load balancer (like AWS ALB), the HTTPS redirect will be skipped automatically.

Then restart:
```bash
# Pull latest code
git pull origin main

# Restart
pm2 restart restaurant-api
# or if using systemd
sudo systemctl restart restaurant-api
```

### 2. Enable HTTPS (If Not Already)

If your API is accessible via `https://codecastle.store`, HTTPS is already working (probably through a reverse proxy or load balancer).

If you need to set it up:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d codecastle.store
```

### 3. Update CORS (If Needed)

Make sure CORS is set to your production domain:

```env
CORS_ORIGIN=https://codecastle.store
```

### 4. Verify Production Mode

After restarting, check:
```bash
curl https://codecastle.store/api/health
```

Should show:
```json
{
  "status": "success",
  "message": "Restaurant API is running",
  "environment": "production",  // ← Should say "production"
  "https": true                  // ← Should be true
}
```

## That's It!

Your API is already deployed. Just:
1. Set `NODE_ENV=production` in your `.env`
2. Restart the server
3. Verify it's working

---

**Note:** If you're already using HTTPS and just need to switch to production mode, that's all you need to do!
