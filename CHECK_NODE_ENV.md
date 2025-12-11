# How to Verify NODE_ENV is Set to Production

This guide shows you multiple ways to verify that `NODE_ENV=production` is set correctly in your production environment.

## Method 1: Check via Health Check API (Easiest)

The health check endpoint now shows the environment status:

```bash
# From your local machine
curl https://codecastle.store/api/health

# Or from the server itself
curl http://localhost:80/api/health
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Restaurant API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production",
  "isProduction": true,
  "https": true,
  "adminAccessible": "No (production - localhost only)"
}
```

✅ **If `environment` is `"production"` and `isProduction` is `true`**, you're good!

## Method 2: Check on the Server (SSH)

If you have SSH access to your production server:

### For EC2/Linux Server:
```bash
# SSH into your server
ssh user@your-server-ip

# Check environment variable
echo $NODE_ENV

# Or check in Node.js process
node -e "console.log(process.env.NODE_ENV)"

# Check if running as systemd service
systemctl status restaurant-api
systemctl show restaurant-api | grep Environment
```

### Check Environment File:
```bash
# Check .env.production file
cat .env.production | grep NODE_ENV

# Or check if it's loaded
cat .env.production
```

## Method 3: Check via Process Manager

### If using PM2:
```bash
pm2 list
pm2 show restaurant-api
pm2 env 0  # Check environment for process ID 0
```

### If using systemd (from deploy script):
```bash
# Check service status
sudo systemctl status restaurant-api

# Check service environment
sudo systemctl show restaurant-api | grep Environment

# View service logs
sudo journalctl -u restaurant-api -n 50 | grep NODE_ENV
```

## Method 4: Check in Application Logs

The middleware logs security warnings. Check your logs:

```bash
# If using systemd
sudo journalctl -u restaurant-api -f

# If using PM2
pm2 logs restaurant-api

# Look for these log messages:
# - "[ADMIN] Localhost access granted" (if NODE_ENV=production and accessed from localhost)
# - "[SECURITY] Admin route blocked" (if NODE_ENV=production and accessed from non-localhost)
```

## Method 5: Check AWS/Cloud Deployment

### AWS EC2:
```bash
# SSH into EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check environment
echo $NODE_ENV

# Check user data or launch configuration
cat /var/lib/cloud/instance/user-data.txt
```

### AWS Elastic Beanstalk:
1. Go to AWS Console → Elastic Beanstalk
2. Select your environment
3. Go to Configuration → Software
4. Check "Environment properties" for `NODE_ENV`

### AWS ECS/Fargate:
1. Check task definition environment variables
2. Or check container environment in ECS console

### Docker:
```bash
# If running in Docker
docker exec -it container-name env | grep NODE_ENV

# Or check docker-compose.yml
cat docker-compose.yml | grep NODE_ENV
```

## Method 6: Test Admin Route Access

The easiest way to verify is to test if the admin route is blocked:

```bash
# This should return 404 if NODE_ENV=production
curl -I https://codecastle.store/admin/dashboard

# Expected: HTTP/1.1 404 Not Found

# This should work from localhost (if you SSH into server)
curl -I http://localhost:80/admin/dashboard
# Expected: HTTP/1.1 200 OK (only from localhost)
```

## Method 7: Add Temporary Debug Endpoint (Remove After Testing)

You can temporarily add this to `server.js` for testing (REMOVE after verification):

```javascript
// TEMPORARY - Remove after testing
app.get('/api/debug-env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV === 'production',
    allEnvVars: Object.keys(process.env).filter(k => k.includes('NODE'))
  });
});
```

Then check:
```bash
curl https://codecastle.store/api/debug-env
```

**⚠️ Remember to remove this endpoint after testing!**

## Quick Verification Checklist

- [ ] Health check shows `"environment": "production"`
- [ ] Health check shows `"isProduction": true`
- [ ] Health check shows `"adminAccessible": "No (production - localhost only)"`
- [ ] Accessing `https://codecastle.store/admin/dashboard` returns 404
- [ ] Server logs show `[SECURITY] Admin route blocked` when accessing from production domain
- [ ] `echo $NODE_ENV` on server returns `production`

## Common Issues

### Issue: NODE_ENV is not set
**Solution:** Make sure your `.env.production` file has `NODE_ENV=production` or set it in your deployment configuration.

### Issue: NODE_ENV is set but admin still accessible
**Possible causes:**
1. The middleware isn't being applied (check `routes/adminRoutes.js`)
2. The server hasn't been restarted after changes
3. There's a caching issue

**Solution:**
```bash
# Restart the service
sudo systemctl restart restaurant-api

# Or if using PM2
pm2 restart restaurant-api
```

### Issue: Health check shows wrong environment
**Solution:** 
1. Check your `.env.production` file
2. Verify systemd service has `Environment=NODE_ENV=production`
3. Restart the service

## Need Help?

If `NODE_ENV` is not set to production:
1. Check your deployment script (`scripts/deploy-production.sh`)
2. Verify your `.env.production` file exists and has `NODE_ENV=production`
3. Check your process manager configuration (systemd, PM2, etc.)
4. Restart your application after setting the environment variable

