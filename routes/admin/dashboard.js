const express = require('express');
const router = express.Router();

// Dashboard route - shows card-based navigation
router.get('/dashboard', async (req, res) => {
  try {
    // Set content type to HTML c
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f5f5f7;
            color: #1d1d1f;
            min-height: 100vh;
            padding: 0;
            margin: 0;
        }
        
        .main-content {
            padding: 40px;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .dashboard-header {
            margin-bottom: 40px;
        }
        
        .dashboard-header h1 {
            font-size: 36px;
            font-weight: 600;
            color: #1d1d1f;
            margin-bottom: 8px;
        }
        
        .dashboard-header p {
            font-size: 18px;
            color: #86868b;
        }
        
        .dashboard-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 24px;
            margin-bottom: 40px;
        }
        
        .dashboard-card {
            background: #ffffff;
            border: 1px solid #e5e5e7;
            border-radius: 16px;
            padding: 32px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            color: inherit;
            display: block;
        }
        
        .dashboard-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            border-color: #007aff;
        }
        
        .dashboard-card-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        
        .dashboard-card h2 {
            font-size: 20px;
            font-weight: 600;
            color: #1d1d1f;
            margin-bottom: 8px;
        }
        
        .dashboard-card p {
            font-size: 14px;
            color: #86868b;
            margin: 0;
        }
        
        @media (max-width: 768px) {
            .main-content {
                padding: 20px;
            }
            
            .dashboard-cards {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="main-content">
        <div class="dashboard-header">
            <h1>Admin Dashboard</h1>
            <p>Manage your restaurant platform</p>
        </div>
        
        <div class="dashboard-cards">
            <a href="/admin/explore" class="dashboard-card">
                <div class="dashboard-card-icon">🔍</div>
                <h2>Explore Posts</h2>
                <p>Create and manage exploration update posts</p>
            </a>
            
            <a href="/admin/restaurants" class="dashboard-card">
                <div class="dashboard-card-icon">🍽️</div>
                <h2>Restaurants</h2>
                <p>Manage restaurants and dining options</p>
            </a>
            
            <a href="/admin/linktree" class="dashboard-card">
                <div class="dashboard-card-icon">🔗</div>
                <h2>Link Tree</h2>
                <p>Manage link tree accounts</p>
            </a>
            
            <a href="/admin/play" class="dashboard-card">
                <div class="dashboard-card-icon">🎮</div>
                <h2>Play</h2>
                <p>Gaming and entertainment</p>
            </a>
            
            <a href="/admin/fitness" class="dashboard-card">
                <div class="dashboard-card-icon">💪</div>
                <h2>Fitness</h2>
                <p>Fitness and wellness</p>
            </a>
            
            <a href="/admin/transit" class="dashboard-card">
                <div class="dashboard-card-icon">🚌</div>
                <h2>Transit</h2>
                <p>Transportation services</p>
            </a>
            
            <a href="/admin/notifications" class="dashboard-card">
                <div class="dashboard-card-icon">🔔</div>
                <h2>Notifications</h2>
                <p>Manage notifications</p>
            </a>
            
            <a href="/admin/updates" class="dashboard-card">
                <div class="dashboard-card-icon">📢</div>
                <h2>Updates</h2>
                <p>System updates and announcements</p>
            </a>
            
            <a href="/admin/enquiries" class="dashboard-card">
                <div class="dashboard-card-icon">📧</div>
                <h2>Enquiries</h2>
                <p>Customer enquiries and messages</p>
            </a>
        </div>
    </div>
</body>
</html>
    `);
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - Restaurant Admin</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 50px; text-align: center; }
          .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Error Loading Admin Dashboard</h1>
          <p>There was an error loading the admin dashboard. Please try again later.</p>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;
