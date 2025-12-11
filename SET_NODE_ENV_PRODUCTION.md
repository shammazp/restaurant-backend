# How to Set NODE_ENV=production on AWS Server

This guide shows you exactly how to change `NODE_ENV` from `development` to `production` on your AWS server.

## Method 1: Update .env.production File (Recommended)

### Step 1: SSH into your AWS server
```bash
ssh -i your-key.pem ec2-user@your-aws-server-ip
# Or
ssh user@your-aws-server-ip
```

### Step 2: Navigate to your project directory
```bash
cd /path/to/restaurant-backend
# Common locations:
# - /home/ec2-user/restaurant-backend
# - /var/www/restaurant-backend
# - ~/restaurant-backend
```

### Step 3: Edit the .env.production file
```bash
# Open the file with nano (or vi/vim)
nano .env.production

# Or if it doesn't exist, create it:
nano .env.production
```

### Step 4: Set NODE_ENV=production
Make sure the file contains:
```env
NODE_ENV=production
PORT=80
HTTPS_PORT=443

# ... your other environment variables ...
```

**Important:** Make sure there are NO spaces around the `=` sign:
- ✅ Correct: `NODE_ENV=production`
- ❌ Wrong: `NODE_ENV = production` (spaces will cause issues)

### Step 5: Save and exit
- If using `nano`: Press `Ctrl+X`, then `Y`, then `Enter`
- If using `vi/vim`: Press `Esc`, type `:wq`, then `Enter`

### Step 6: Verify the file
```bash
cat .env.production | grep NODE_ENV
# Should output: NODE_ENV=production
```

### Step 7: Restart your service

**If using systemd:**
```bash
sudo systemctl restart restaurant-api
# Or whatever your service name is
```

**If using PM2:**
```bash
pm2 restart restaurant-api
# Or
pm2 restart all
```

**If running directly with node:**
```bash
# Stop the current process (Ctrl+C or kill the process)
# Then restart:
NODE_ENV=production node server.js
# Or
NODE_ENV=production node server-https.js
```

### Step 8: Verify it's working
```bash
# Check the health endpoint
curl http://localhost:80/api/health

# Should show:
# "environment": "production"
# "isProduction": true
```

---

## Method 2: Update Systemd Service File (If using systemd)

If you're using systemd and the service file doesn't have `NODE_ENV=production`, update it:

### Step 1: Edit the service file
```bash
sudo nano /etc/systemd/system/restaurant-api.service
# Or whatever your service name is
```

### Step 2: Make sure it has these lines:
```ini
[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/restaurant-backend
Environment=NODE_ENV=production
EnvironmentFile=/path/to/restaurant-backend/.env.production
ExecStart=/usr/bin/node server-https.js
Restart=always
```

**Important points:**
- `Environment=NODE_ENV=production` - This sets it directly in the service
- `EnvironmentFile=/path/to/restaurant-backend/.env.production` - This loads from file
- Make sure the paths are correct!

### Step 3: Reload and restart
```bash
# Reload systemd to pick up changes
sudo systemctl daemon-reload

# Restart the service
sudo systemctl restart restaurant-api

# Check status
sudo systemctl status restaurant-api
```

---

## Method 3: Set Environment Variable Directly (Quick fix)

If you just need a quick fix without editing files:

### For systemd:
```bash
# Edit service file
sudo systemctl edit restaurant-api

# Add this in the editor:
[Service]
Environment=NODE_ENV=production

# Save and exit, then:
sudo systemctl daemon-reload
sudo systemctl restart restaurant-api
```

### For PM2:
```bash
# Stop the app
pm2 stop restaurant-api

# Start with environment variable
NODE_ENV=production pm2 start server.js --name restaurant-api

# Or update ecosystem file
pm2 ecosystem
# Then edit ecosystem.config.js to add:
# env: {
#   NODE_ENV: 'production'
# }
```

---

## Method 4: Update via AWS Systems Manager (If configured)

If you're using AWS Systems Manager Parameter Store:

```bash
aws ssm put-parameter \
  --name "/restaurant-api/NODE_ENV" \
  --value "production" \
  --type "String" \
  --overwrite
```

Then update your application to read from Parameter Store.

---

## Verification Steps

After making changes, verify everything is working:

### 1. Check environment variable
```bash
# On the server
echo $NODE_ENV
# Should output: production

# Or check in Node.js
node -e "console.log(process.env.NODE_ENV)"
```

### 2. Check health endpoint
```bash
curl http://localhost:80/api/health | grep -E "(environment|isProduction)"
```

**Expected output:**
```json
"environment": "production",
"isProduction": true,
"adminAccessible": "No (production - localhost only)"
```

### 3. Test admin route is blocked
```bash
# From your local machine (should return 404)
curl -I https://codecastle.store/admin/dashboard

# Should return: HTTP/1.1 404 Not Found
```

### 4. Check service logs
```bash
# For systemd
sudo journalctl -u restaurant-api -n 50 | grep NODE_ENV

# For PM2
pm2 logs restaurant-api | grep NODE_ENV
```

---

## Troubleshooting

### Issue: NODE_ENV still shows "development" after restart

**Solution:**
1. Make sure you saved the `.env.production` file
2. Check the file has no syntax errors:
   ```bash
   cat .env.production
   ```
3. Verify the service is reading the correct file:
   ```bash
   sudo systemctl show restaurant-api | grep EnvironmentFile
   ```
4. Try restarting again:
   ```bash
   sudo systemctl restart restaurant-api
   ```

### Issue: Service won't start

**Solution:**
1. Check service status:
   ```bash
   sudo systemctl status restaurant-api
   ```
2. Check logs for errors:
   ```bash
   sudo journalctl -u restaurant-api -n 100
   ```
3. Verify file paths in service file are correct
4. Check file permissions:
   ```bash
   ls -la .env.production
   # Should be readable by the service user
   ```

### Issue: Multiple .env files

**Solution:**
Make sure you're editing the right file. Check which one is being used:
```bash
# Find all .env files
find . -name ".env*"

# Check which one the service uses
sudo systemctl show restaurant-api | grep EnvironmentFile
```

---

## Quick Reference Commands

```bash
# 1. SSH into server
ssh user@your-server

# 2. Go to project directory
cd /path/to/restaurant-backend

# 3. Edit .env.production
nano .env.production
# Change: NODE_ENV=development → NODE_ENV=production

# 4. Verify
cat .env.production | grep NODE_ENV

# 5. Restart service
sudo systemctl restart restaurant-api

# 6. Verify it worked
curl http://localhost:80/api/health
```

---

## After Setting NODE_ENV=production

Once `NODE_ENV` is set to `production`:

✅ Admin dashboard will be blocked from `https://codecastle.store/admin/dashboard`
✅ Admin dashboard will only work from `http://localhost:80/admin/dashboard` (on the server)
✅ Security middleware will be active
✅ Production CORS settings will be applied
✅ Enhanced security headers will be enabled

---

## Need Help?

If you're still having issues:
1. Check your service logs: `sudo journalctl -u restaurant-api -f`
2. Verify the file exists: `ls -la .env.production`
3. Check file contents: `cat .env.production`
4. Verify service configuration: `sudo systemctl show restaurant-api`

