const express = require('express');
const router = express.Router();

// Generic "Coming Soon" page generator
function createComingSoonPage(title, icon, description) {
  return (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f5f5f7;
            color: #1d1d1f;
            padding: 40px;
        }
        .container { max-width: 800px; margin: 0 auto; text-align: center; }
        .back-link { display: inline-block; margin-bottom: 40px; color: #007aff; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
        .icon { font-size: 80px; margin-bottom: 24px; }
        h1 { font-size: 36px; font-weight: 600; color: #1d1d1f; margin-bottom: 16px; }
        p { font-size: 18px; color: #86868b; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/admin/dashboard" class="back-link">← Back to Dashboard</a>
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${description}</p>
        <p style="margin-top: 24px; font-size: 16px; color: #86868b;">This section is coming soon</p>
    </div>
</body>
</html>
    `);
  };
}

// Coming soon pages
router.get('/play', createComingSoonPage('Play', '🎮', 'Gaming and entertainment'));
router.get('/fitness', createComingSoonPage('Fitness', '💪', 'Fitness and wellness'));
router.get('/transit', createComingSoonPage('Transit', '🚌', 'Transportation services'));
router.get('/notifications', createComingSoonPage('Notifications', '🔔', 'Manage system notifications'));
router.get('/updates', createComingSoonPage('Updates', '📢', 'System updates and announcements'));
router.get('/enquiries', createComingSoonPage('Enquiries', '📧', 'Customer enquiries and support requests'));

module.exports = router;
