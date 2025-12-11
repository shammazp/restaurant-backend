# Production Setup

Your API is running in production mode. Here's how to manage it.

## Change Domain to kochi.one

### Step 1: Update DNS

Point `kochi.one` to your server/load balancer:

**If using AWS ALB (Load Balancer):**
1. Go to Route 53 (or your DNS provider)
2. Create/Update A record:
   - Name: `@` (or `api` for api.kochi.one)
   - Type: A - Alias
   - Alias Target: Your ALB DNS name
   - TTL: 300

**If using direct EC2:**
1. Create A record pointing to your EC2 IP address

### Step 2: Update SSL Certificate

**If using AWS ALB:**
1. Go to AWS Certificate Manager
2. Request new certificate (or add domain to existing)
3. Add `kochi.one` and `*.kochi.one`
4. Validate via DNS
5. Update ALB listener to use new certificate

**If using Nginx with Let's Encrypt:**
```bash
sudo certbot --nginx -d kochi.one
```

### Step 3: Update Environment Variables

On your server, update `.env` file:

```env
CORS_ORIGIN=https://kochi.one
```

Or if you have multiple domains:
```env
CORS_ORIGIN=https://kochi.one,https://www.kochi.one
```

### Step 4: Restart Application

```bash
pm2 restart restaurant-api
# or
sudo systemctl restart restaurant-api
```

### Step 5: Test

```bash
curl https://kochi.one/api/health
```

## Current Status

Your API shows:
- ✅ Environment: `production`
- ✅ Running publicly

## Useful Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs restaurant-api

# Restart
pm2 restart restaurant-api

# Update code
git pull origin main
npm ci --production
pm2 restart restaurant-api
```

## Important Notes

- Never commit `.env` file to git
- Always use HTTPS in production
- Monitor logs: `pm2 logs restaurant-api`

---

**Your API is live! 🚀**
