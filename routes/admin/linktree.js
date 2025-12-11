const express = require('express');
const router = express.Router();
const LinkTree = require('../../models/LinkTree');
const { uploadBannerAndButtonIcons, processAndUploadBannerImage, processAndUploadButtonIcons, handleUploadError } = require('../../middleware/upload');
const { deleteFromS3 } = require('../../config/s3');

// Link Tree HTML page
router.get('/linktree', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    const accounts = await LinkTree.find().sort({ createdAt: -1 });
    
    const accountsHTML = accounts.map(account => {
      const hasBanner = account.bannerImage && account.bannerImage.url;
      const bannerStatus = hasBanner 
        ? (account.isBannerHidden ? '<span style="color: #86868b; font-size: 12px;">🔗 Hidden</span>' : '<span style="color: #00a86b; font-size: 12px;">🔗 Visible</span>')
        : '<span style="color: #86868b; font-size: 12px;">No banner</span>';
      const ltnDisplay = account.LTN 
        ? `<span style="font-weight: 500; color: #007aff;">${account.LTN}</span>`
        : '<span style="color: #86868b; font-size: 12px;">Not set</span>';
      
      return `
        <tr>
          <td><strong>${(account.accountName || 'N/A').replace(/'/g, "&#39;")}</strong></td>
          <td>${(account.email || 'N/A').replace(/'/g, "&#39;")}</td>
          <td>${ltnDisplay}</td>
          <td>${bannerStatus}</td>
          <td><span class="status ${account.isActive ? 'active' : 'inactive'}">${account.isActive ? 'Active' : 'Inactive'}</span></td>
          <td>${new Date(account.createdAt).toLocaleDateString()}</td>
          <td>
            <a href="/admin/linktree/${account._id}/edit" class="btn" style="background: #007aff; margin-right: 8px; text-decoration: none; display: inline-block; padding: 8px 16px;">Edit</a>
            <button onclick="deleteLinkTreeAccount('${account._id}', '${(account.accountName || 'Unknown').replace(/'/g, "\\'")}')" class="btn" style="background: #dc3545;">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Tree - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f5f5f7;
            color: #1d1d1f;
            padding: 40px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { margin-bottom: 40px; }
        .header h1 { font-size: 36px; font-weight: 600; color: #1d1d1f; margin-bottom: 8px; }
        .header p { font-size: 18px; color: #86868b; }
        .back-link { display: inline-block; margin-bottom: 24px; color: #007aff; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
        .btn { background: #007aff; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background-color 0.2s; }
        .btn:hover { background: #0056b3; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); }
        th, td { padding: 16px; text-align: left; border-bottom: 1px solid #e5e5e7; }
        th { background: #f5f5f7; font-weight: 600; color: #1d1d1f; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; }
        .status.active { background: #d1f2eb; color: #00a86b; }
        .status.inactive { background: #f8d7da; color: #dc3545; }
        .form-section { background: white; border: 1px solid #e5e5e7; border-radius: 12px; padding: 32px; margin-bottom: 40px; max-width: 600px; }
        .form-group { margin-bottom: 24px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 500; color: #1d1d1f; font-size: 14px; }
        .form-group input, .form-group textarea { width: 100%; padding: 12px 16px; border: 1px solid #e5e5e7; border-radius: 8px; font-size: 16px; }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #007aff; }
        .btn-secondary { background: #86868b; margin-right: 12px; }
        .message { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .message.success { background: #d1f2eb; color: #00a86b; }
        .message.error { background: #f8d7da; color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/admin/dashboard" class="back-link">← Back to Dashboard</a>
        <div class="header">
            <h1>Link Tree</h1>
            <p>Manage link tree accounts</p>
        </div>
        
        <div style="margin-bottom: 24px;">
            <button class="btn" onclick="showCreateForm()">➕ Create New Account</button>
        </div>
        
        <!-- Create/Edit Form (hidden by default) -->
        <div id="linkTreeFormContainer" style="display: none; margin-bottom: 40px;">
            <div class="form-section">
                <h2 id="linkTreeFormTitle" style="font-size: 24px; font-weight: 600; color: #1d1d1f; margin-bottom: 24px;">Create Link Tree Account</h2>
                <div id="linkTreeFormMessage"></div>
                <form id="linkTreeForm">
                    <input type="hidden" id="linkTreeId" name="linkTreeId">
                    
                    <div class="form-group">
                        <label for="accountName">Account Name *</label>
                        <input type="text" id="accountName" name="accountName" required maxlength="100" placeholder="Enter account name">
                    </div>
                    
                    <div class="form-group">
                        <label for="linkTreeEmail">Email *</label>
                        <input type="email" id="linkTreeEmail" name="email" required placeholder="Enter email address">
                    </div>
                    
                    <div class="form-group">
                        <label for="linkTreePassword">Password *</label>
                        <input type="password" id="linkTreePassword" name="password" required minlength="6" placeholder="Enter password (min 6 characters)">
                        <small style="color: #86868b; display: block; margin-top: 4px;">Password must be at least 6 characters long</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="linkTreeLTN">LTN (Link Tree Number)</label>
                        <input type="number" id="linkTreeLTN" name="LTN" min="1" placeholder="Enter LTN (e.g., 1, 2, 3...)">
                        <small style="color: #86868b; display: block; margin-top: 4px;">Unique number used to access this link tree at /linktree?LTN=X</small>
                    </div>
                    
                    
                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                        <button type="submit" class="btn" id="linkTreeSubmitBtn">Create Account</button>
                        <button type="button" class="btn btn-secondary" onclick="hideLinkTreeForm()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
        
        ${accounts.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Account Name</th>
                    <th>Email</th>
                    <th>LTN</th>
                    <th>Banner</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${accountsHTML}
            </tbody>
        </table>
        ` : `
        <div style="text-align: center; padding: 60px 20px; color: #86868b;">
            <div style="font-size: 48px; margin-bottom: 16px;">🔗</div>
            <h3>No link tree accounts yet</h3>
            <p>Create your first link tree account to get started</p>
        </div>
        `}
    </div>
    
    <script>
        function showCreateForm() {
            document.getElementById('linkTreeFormContainer').style.display = 'block';
            document.getElementById('linkTreeForm').reset();
            document.getElementById('linkTreeFormContainer').scrollIntoView({ behavior: 'smooth' });
        }
        
        function hideLinkTreeForm() {
            document.getElementById('linkTreeFormContainer').style.display = 'none';
            document.getElementById('linkTreeForm').reset();
        }
        
        // Handle form submission (create only)
        document.getElementById('linkTreeForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const password = document.getElementById('linkTreePassword').value;
            const messageDiv = document.getElementById('linkTreeFormMessage');
            const submitBtn = document.getElementById('linkTreeSubmitBtn');
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';
            
            try {
                const formData = {
                    accountName: document.getElementById('accountName').value,
                    email: document.getElementById('linkTreeEmail').value,
                    password: password
                };
                
                const ltnValue = document.getElementById('linkTreeLTN').value;
                if (ltnValue) {
                    formData.LTN = parseInt(ltnValue);
                }
                
                const response = await fetch('/admin/api/linktree', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    messageDiv.innerHTML = '<div class="message success">Account created successfully!</div>';
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } else {
                    let errorMessage = result.message || 'Unknown error';
                    if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
                        errorMessage = result.errors.map(err => err.msg || err.message || err).join(', ');
                    }
                    messageDiv.innerHTML = '<div class="message error"><strong>Error:</strong> ' + errorMessage + '</div>';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                }
            } catch (error) {
                messageDiv.innerHTML = '<div class="message error">Error: ' + error.message + '</div>';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        });
        
        async function deleteLinkTreeAccount(accountId, accountName) {
            if (confirm('Are you sure you want to delete "' + accountName + '"? This action cannot be undone.')) {
                try {
                    const response = await fetch('/admin/api/linktree/' + accountId, { method: 'DELETE' });
                    if (response.ok) {
                        alert('Account deleted successfully!');
                        location.reload();
                    } else {
                        const result = await response.json();
                        alert('Error: ' + (result.message || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            }
        }
    </script>
</body>
</html>
    `);
  } catch (error) {
    console.error('Error loading linktree page:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send('<h1>Error loading page</h1>');
  }
});

// Link Tree Edit Page
router.get('/linktree/:id/edit', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    const account = await LinkTree.findById(req.params.id);
    if (!account) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Not Found - Link Tree</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 50px; text-align: center; }
            .error { color: #dc3545; background: #f8d7da; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Account Not Found</h1>
            <p>The link tree account you're looking for doesn't exist.</p>
            <a href="/admin/linktree" style="color: #007aff; text-decoration: none;">← Back to Link Tree</a>
          </div>
        </body>
        </html>
      `);
    }
    
    const bannerUrl = account.bannerImage && account.bannerImage.url ? account.bannerImage.url : '';
    const hasBanner = bannerUrl && bannerUrl.trim() !== '' && (bannerUrl.startsWith('http://') || bannerUrl.startsWith('https://') || bannerUrl.startsWith('data:'));
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Link Tree - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f5f5f7;
            color: #1d1d1f;
            padding: 40px;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .back-link { display: inline-block; margin-bottom: 24px; color: #007aff; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
        .header { margin-bottom: 40px; }
        .header h1 { font-size: 36px; font-weight: 600; color: #1d1d1f; margin-bottom: 8px; }
        .header p { font-size: 18px; color: #86868b; }
        .form-section { background: white; border: 1px solid #e5e5e7; border-radius: 12px; padding: 32px; }
        .form-group { margin-bottom: 24px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 500; color: #1d1d1f; font-size: 14px; }
        .form-group input, .form-group textarea { width: 100%; padding: 12px 16px; border: 1px solid #e5e5e7; border-radius: 8px; font-size: 16px; }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #007aff; }
        .btn { background: #007aff; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background-color 0.2s; }
        .btn:hover { background: #0056b3; }
        .btn-secondary { background: #86868b; margin-right: 12px; }
        .message { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .message.success { background: #d1f2eb; color: #00a86b; }
        .message.error { background: #f8d7da; color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/admin/linktree" class="back-link">← Back to Link Tree</a>
        <div class="header">
            <h1>Edit Link Tree Account</h1>
            <p>Update account details and settings</p>
        </div>
        
        <div class="form-section">
            <div id="linkTreeFormMessage"></div>
            <form id="linkTreeForm">
                <input type="hidden" id="linkTreeId" name="linkTreeId" value="${account._id}">
                
                <div class="form-group">
                    <label for="accountName">Account Name *</label>
                    <input type="text" id="accountName" name="accountName" required maxlength="100" value="${(account.accountName || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" placeholder="Enter account name">
                </div>
                
                <div class="form-group">
                    <label for="linkTreeEmail">Email *</label>
                    <input type="email" id="linkTreeEmail" name="email" required value="${(account.email || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" placeholder="Enter email address">
                </div>
                
                <div class="form-group">
                    <label for="linkTreePassword">Password</label>
                    <input type="password" id="linkTreePassword" name="password" minlength="6" placeholder="Leave blank to keep current password">
                    <small style="color: #86868b; display: block; margin-top: 4px;">Leave blank to keep current password. Enter new password (min 6 characters) to change it.</small>
                </div>
                
                <div class="form-group">
                    <label for="linkTreeLTN">LTN (Link Tree Number)</label>
                    <input type="number" id="linkTreeLTN" name="LTN" min="1" value="${account.LTN || ''}" placeholder="Enter LTN (e.g., 1, 2, 3...)">
                    <small style="color: #86868b; display: block; margin-top: 4px;">Unique number used to access this link tree at /linktree?LTN=X</small>
                </div>
                
                <!-- Banner Image Section -->
                <div id="bannerImageSection">
                    <div class="form-group">
                        <label>Banner Image</label>
                        <input type="file" id="bannerImageInput" name="bannerImage" accept="image/jpeg,image/jpg,image/png,image/webp">
                        <small style="color: #86868b; display: block; margin-top: 4px;">Supported formats: JPEG, PNG, WebP. Max size: 5MB</small>
                        
                        <!-- Current Banner Preview -->
                        <div id="currentBannerPreview" style="margin-top: 16px; ${hasBanner ? 'display: block;' : 'display: none;'}">
                            <p style="font-size: 14px; color: #1d1d1f; margin-bottom: 8px; font-weight: 500;">Current Banner:</p>
                            <div style="position: relative; display: inline-block; border: 1px solid #e5e5e7; border-radius: 8px; overflow: hidden; max-width: 100%;">
                                <img id="currentBannerImage" src="${hasBanner ? bannerUrl.replace(/"/g, '&quot;').replace(/'/g, '&#39;') : ''}" alt="Current banner" style="max-width: 100%; height: auto; display: block;" crossorigin="anonymous" onerror="console.error('Failed to load banner image:', this.src); this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27 width=%27400%27 height=%27200%27%3E%3Crect fill=%27%23f5f5f7%27 width=%27400%27 height=%27200%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%2386868b%27 font-family=%27system-ui%27 font-size=%2714%27%3EImage not available%3C/text%3E%3C/svg%3E';">
                            </div>
                            <button type="button" onclick="deleteBannerImage()" class="btn" style="background: #dc3545; margin-top: 8px; font-size: 14px; padding: 8px 16px;">🗑️ Delete Banner</button>
                        </div>
                        
                        <!-- New Banner Preview -->
                        <div id="newBannerPreview" style="margin-top: 16px; display: none;">
                            <p style="font-size: 14px; color: #1d1d1f; margin-bottom: 8px; font-weight: 500;">New Banner Preview:</p>
                            <div style="position: relative; display: inline-block; border: 1px solid #e5e5e7; border-radius: 8px; overflow: hidden; max-width: 100%;">
                                <img id="newBannerImagePreview" src="" alt="New banner preview" style="max-width: 100%; height: auto; display: block;">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="hideBannerCheckbox" name="isBannerHidden" style="width: auto; cursor: pointer;" ${account.isBannerHidden ? 'checked' : ''}>
                            <span>Hide Banner Image</span>
                        </label>
                        <small style="color: #86868b; display: block; margin-top: 4px;">When checked, the banner image will be hidden from display</small>
                    </div>
                </div>
                
                <!-- Buttons Section -->
                <div id="buttonsSection" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e5e5e7;">
                    <h3 style="font-size: 20px; font-weight: 600; color: #1d1d1f; margin-bottom: 24px;">Link Buttons</h3>
                    <p style="color: #86868b; margin-bottom: 24px; font-size: 14px;">Add buttons that will appear on your link tree page. Each button can have an icon, label, and link.</p>
                    
                    <div id="buttonsList">
                        ${(account.buttons || []).map((button, index) => {
                            const iconUrl = button.icon && button.icon.url ? button.icon.url : '';
                            const hasIcon = iconUrl && iconUrl.trim() !== '' && (iconUrl.startsWith('http://') || iconUrl.startsWith('https://') || iconUrl.startsWith('data:'));
                            return `
                                <div class="button-item" data-index="${index}" style="background: #f5f5f7; border: 1px solid #e5e5e7; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                                        <h4 style="font-size: 16px; font-weight: 600; color: #1d1d1f;">Button ${index + 1}</h4>
                                        <button type="button" onclick="removeButton(${index})" class="btn" style="background: #dc3545; font-size: 14px; padding: 6px 12px;">Remove</button>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Icon (PNG, SVG, JPG)</label>
                                        <input type="file" class="button-icon-input" data-index="${index}" accept="image/png,image/svg+xml,image/jpeg,image/jpg" onchange="previewButtonIcon(${index}, this)">
                                        <small style="color: #86868b; display: block; margin-top: 4px;">Upload an icon for this button</small>
                                        
                                        ${hasIcon ? `
                                            <div style="margin-top: 12px;">
                                                <p style="font-size: 14px; color: #1d1d1f; margin-bottom: 8px; font-weight: 500;">Current Icon:</p>
                                                <img src="${iconUrl.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" alt="Button icon" class="button-icon-preview" data-index="${index}" style="max-width: 80px; max-height: 80px; border-radius: 8px; border: 1px solid #e5e5e7; padding: 4px;">
                                            </div>
                                        ` : ''}
                                        
                                        <div class="new-icon-preview" data-index="${index}" style="margin-top: 12px; display: none;">
                                            <p style="font-size: 14px; color: #1d1d1f; margin-bottom: 8px; font-weight: 500;">New Icon Preview:</p>
                                            <img class="new-button-icon-preview" data-index="${index}" src="" alt="New icon preview" style="max-width: 80px; max-height: 80px; border-radius: 8px; border: 1px solid #e5e5e7; padding: 4px;">
                                        </div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Label *</label>
                                        <input type="text" class="button-label-input" data-index="${index}" required maxlength="100" value="${(button.label || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" placeholder="Enter button label">
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Link *</label>
                                        <input type="url" class="button-link-input" data-index="${index}" required maxlength="500" value="${(button.link || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" placeholder="https://example.com">
                                    </div>
                                    
                                    <input type="hidden" class="button-order-input" data-index="${index}" value="${button.order || index}">
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <button type="button" onclick="addButton()" class="btn" style="background: #00a86b; margin-top: 16px;">➕ Add Button</button>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="submit" class="btn" id="linkTreeSubmitBtn">Update Account</button>
                    <a href="/admin/linktree" class="btn btn-secondary" style="text-decoration: none; display: inline-block;">Cancel</a>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        // Preview new banner image
        document.getElementById('bannerImageInput')?.addEventListener('change', function(e) {
            const file = this.files[0];
            const preview = document.getElementById('newBannerPreview');
            const previewImg = document.getElementById('newBannerImagePreview');
            
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                preview.style.display = 'none';
            }
        });
        
        // Delete banner image
        async function deleteBannerImage() {
            const linkTreeId = document.getElementById('linkTreeId').value;
            if (!linkTreeId) {
                alert('No account selected');
                return;
            }
            
            if (confirm('Are you sure you want to delete the banner image? This action cannot be undone.')) {
                try {
                    const response = await fetch('/admin/api/linktree/' + linkTreeId + '/banner', {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        document.getElementById('currentBannerPreview').style.display = 'none';
                        document.getElementById('currentBannerImage').src = '';
                        alert('Banner image deleted successfully!');
                    } else {
                        const result = await response.json();
                        alert('Error deleting banner: ' + (result.message || 'Unknown error'));
                    }
                } catch (error) {
                    alert('Error deleting banner: ' + error.message);
                }
            }
        }
        
        // Button management functions
        let buttonCounter = ${(account.buttons || []).length};
        
        function addButton() {
            const buttonsList = document.getElementById('buttonsList');
            const buttonIndex = buttonCounter++;
            
            const buttonHTML = \`
                <div class="button-item" data-index="\${buttonIndex}" style="background: #f5f5f7; border: 1px solid #e5e5e7; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                        <h4 style="font-size: 16px; font-weight: 600; color: #1d1d1f;">Button \${buttonIndex + 1}</h4>
                        <button type="button" onclick="removeButton(\${buttonIndex})" class="btn" style="background: #dc3545; font-size: 14px; padding: 6px 12px;">Remove</button>
                    </div>
                    
                    <div class="form-group">
                        <label>Icon (PNG, SVG, JPG)</label>
                        <input type="file" class="button-icon-input" data-index="\${buttonIndex}" accept="image/png,image/svg+xml,image/jpeg,image/jpg" onchange="previewButtonIcon(\${buttonIndex}, this)">
                        <small style="color: #86868b; display: block; margin-top: 4px;">Upload an icon for this button</small>
                        
                        <div class="new-icon-preview" data-index="\${buttonIndex}" style="margin-top: 12px; display: none;">
                            <p style="font-size: 14px; color: #1d1d1f; margin-bottom: 8px; font-weight: 500;">New Icon Preview:</p>
                            <img class="new-button-icon-preview" data-index="\${buttonIndex}" src="" alt="New icon preview" style="max-width: 80px; max-height: 80px; border-radius: 8px; border: 1px solid #e5e5e7; padding: 4px;">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Label *</label>
                        <input type="text" class="button-label-input" data-index="\${buttonIndex}" required maxlength="100" placeholder="Enter button label">
                    </div>
                    
                    <div class="form-group">
                        <label>Link *</label>
                        <input type="url" class="button-link-input" data-index="\${buttonIndex}" required maxlength="500" placeholder="https://example.com">
                    </div>
                    
                    <input type="hidden" class="button-order-input" data-index="\${buttonIndex}" value="\${buttonIndex}">
                </div>
            \`;
            
            buttonsList.insertAdjacentHTML('beforeend', buttonHTML);
            buttonsList.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
        
        function removeButton(index) {
            const buttonItem = document.querySelector(\`.button-item[data-index="\${index}"]\`);
            if (buttonItem && confirm('Are you sure you want to remove this button?')) {
                buttonItem.remove();
                updateButtonNumbers();
            }
        }
        
        function updateButtonNumbers() {
            const buttonItems = document.querySelectorAll('.button-item');
            buttonItems.forEach((item, idx) => {
                const h4 = item.querySelector('h4');
                if (h4) {
                    h4.textContent = \`Button \${idx + 1}\`;
                }
            });
        }
        
        function previewButtonIcon(index, input) {
            const file = input.files[0];
            const previewDiv = document.querySelector(\`.new-icon-preview[data-index="\${index}"]\`);
            const previewImg = document.querySelector(\`.new-button-icon-preview[data-index="\${index}"]\`);
            
            if (file && previewDiv && previewImg) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    previewDiv.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else if (previewDiv) {
                previewDiv.style.display = 'none';
            }
        }
        
        // Handle form submission
        document.getElementById('linkTreeForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const linkTreeId = document.getElementById('linkTreeId').value;
            const password = document.getElementById('linkTreePassword').value;
            const bannerFile = document.getElementById('bannerImageInput').files[0];
            const isBannerHidden = document.getElementById('hideBannerCheckbox').checked;
            
            const messageDiv = document.getElementById('linkTreeFormMessage');
            const submitBtn = document.getElementById('linkTreeSubmitBtn');
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
            
            try {
                const url = '/admin/api/linktree/' + linkTreeId;
                const method = 'PUT';
                
                // Collect button data
                const buttonItems = document.querySelectorAll('.button-item');
                const buttons = [];
                const buttonIconFiles = [];
                
                buttonItems.forEach((item, idx) => {
                    const label = item.querySelector(\`.button-label-input[data-index="\${item.dataset.index}"]\`)?.value;
                    const link = item.querySelector(\`.button-link-input[data-index="\${item.dataset.index}"]\`)?.value;
                    const iconInput = item.querySelector(\`.button-icon-input[data-index="\${item.dataset.index}"]\`);
                    const orderInput = item.querySelector(\`.button-order-input[data-index="\${item.dataset.index}"]\`);
                    
                    if (label && link) {
                        const buttonData = {
                            label: label.trim(),
                            link: link.trim(),
                            order: orderInput ? parseInt(orderInput.value) || idx : idx
                        };
                        
                        // Check if there's a new icon file
                        if (iconInput && iconInput.files && iconInput.files[0]) {
                            buttonIconFiles.push({
                                index: buttons.length,
                                file: iconInput.files[0]
                            });
                        } else {
                            // Keep existing icon if no new file
                            const existingIcon = item.querySelector('.button-icon-preview');
                            if (existingIcon && existingIcon.src) {
                                // We'll need to preserve existing icons on the server side
                                buttonData._preserveIcon = true;
                                buttonData._iconIndex = item.dataset.index;
                            }
                        }
                        
                        buttons.push(buttonData);
                    }
                });
                
                // Use FormData if there's a file upload (banner or button icons), otherwise use JSON
                let requestBody;
                let headers = {};
                
                const ltnValue = document.getElementById('linkTreeLTN').value;
                const hasFileUpload = bannerFile || buttonIconFiles.length > 0;
                
                if (hasFileUpload) {
                    // Use FormData for file uploads
                    const formData = new FormData();
                    formData.append('accountName', document.getElementById('accountName').value);
                    formData.append('email', document.getElementById('linkTreeEmail').value);
                    
                    // Only include password if it's provided
                    if (password) {
                        formData.append('password', password);
                    }
                    
                    // Add LTN if provided
                    if (ltnValue) {
                        formData.append('LTN', ltnValue);
                    }
                    
                    // Add banner file if provided
                    if (bannerFile) {
                        formData.append('bannerImage', bannerFile);
                    }
                    
                    // Add banner hide status
                    formData.append('isBannerHidden', isBannerHidden ? 'true' : 'false');
                    
                    // Add buttons data as JSON string
                    formData.append('buttons', JSON.stringify(buttons));
                    
                    // Add button icon files with their indexes
                    // Store indexes as JSON array to ensure proper handling
                    const iconIndexes = [];
                    buttonIconFiles.forEach(({ index, file }) => {
                        formData.append('buttonIcons', file);
                        iconIndexes.push(index);
                    });
                    // Send indexes as JSON string to avoid FormData array issues
                    if (iconIndexes.length > 0) {
                        formData.append('buttonIconIndexes', JSON.stringify(iconIndexes));
                    }
                    
                    requestBody = formData;
                } else {
                    // Use JSON for non-file updates
                    const formData = {
                        accountName: document.getElementById('accountName').value,
                        email: document.getElementById('linkTreeEmail').value,
                        buttons: buttons
                    };
                    
                    // Only include password if it's provided
                    if (password) {
                        formData.password = password;
                    }
                    
                    // Add LTN if provided
                    if (ltnValue) {
                        formData.LTN = parseInt(ltnValue);
                    }
                    
                    // Add banner hide status
                    formData.isBannerHidden = isBannerHidden;
                    
                    requestBody = JSON.stringify(formData);
                    headers['Content-Type'] = 'application/json';
                }
                
                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: requestBody
                });
                
                let result;
                try {
                    result = await response.json();
                } catch (jsonError) {
                    const text = await response.text();
                    console.error('Response text:', text);
                    messageDiv.innerHTML = '<div class="message error"><strong>Error:</strong> Invalid response from server. Status: ' + response.status + '</div>';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Update Account';
                    return;
                }
                
                if (response.ok) {
                    messageDiv.innerHTML = '<div class="message success">Account updated successfully!</div>';
                    setTimeout(() => {
                        window.location.href = '/admin/linktree';
                    }, 1500);
                } else {
                    let errorMessage = result.message || 'Unknown error';
                    if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
                        errorMessage = result.errors.map(err => err.msg || err.message || err).join(', ');
                    } else if (result.error) {
                        errorMessage = result.error;
                    }
                    console.error('Update error:', result);
                    messageDiv.innerHTML = '<div class="message error"><strong>Error:</strong> ' + errorMessage + '</div>';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Update Account';
                }
            } catch (error) {
                console.error('Form submission error:', error);
                messageDiv.innerHTML = '<div class="message error">Error: ' + error.message + '</div>';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Update Account';
            }
        });
    </script>
</body>
</html>
    `);
  } catch (error) {
    console.error('Error loading linktree edit page:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send('<h1>Error loading page</h1>');
  }
});

// Link Tree API Routes
router.get('/api/linktree', async (req, res) => {
  try {
    const accounts = await LinkTree.find().sort({ createdAt: -1 });
    res.json({
      status: 'success',
      data: {
        accounts
      }
    });
  } catch (error) {
    console.error('Error fetching link tree accounts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch link tree accounts',
      error: error.message
    });
  }
});

// Get single link tree account
router.get('/api/linktree/:id', async (req, res) => {
  try {
    const account = await LinkTree.findById(req.params.id);
    if (!account) {
      return res.status(404).json({
        status: 'error',
        message: 'Link tree account not found'
      });
    }
    res.json({
      status: 'success',
      data: {
        account
      }
    });
  } catch (error) {
    console.error('Error fetching link tree account:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch link tree account',
      error: error.message
    });
  }
});

// Create link tree account
router.post('/api/linktree', async (req, res) => {
  try {
    const { accountName, email, password, LTN } = req.body;
    
    // Validate required fields
    if (!accountName || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Account name, email, and password are required'
      });
    }
    
    // Check if email already exists
    const existingAccount = await LinkTree.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email already exists'
      });
    }
    
    // Check if LTN already exists (if provided)
    if (LTN) {
      const existingLTN = await LinkTree.findOne({ LTN: parseInt(LTN) });
      if (existingLTN) {
        return res.status(400).json({
          status: 'error',
          message: 'An account with this LTN already exists'
        });
      }
    }
    
    const newAccount = new LinkTree({
      accountName,
      email: email.toLowerCase(),
      password,
      LTN: LTN ? parseInt(LTN) : undefined
    });
    
    await newAccount.save();
    
    res.status(201).json({
      status: 'success',
      message: 'Link tree account created successfully',
      data: {
        account: newAccount
      }
    });
  } catch (error) {
    console.error('Error creating link tree account:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        msg: err.message,
        field: err.path
      }));
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors
      });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email already exists'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create link tree account',
      error: error.message
    });
  }
});

// Update link tree account
router.put('/api/linktree/:id', uploadBannerAndButtonIcons, processAndUploadBannerImage, processAndUploadButtonIcons, handleUploadError, async (req, res) => {
  try {
    const account = await LinkTree.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        status: 'error',
        message: 'Link tree account not found'
      });
    }
    
    // Get data from form or JSON body
    const accountName = req.body.accountName;
    const email = req.body.email;
    const password = req.body.password;
    const LTN = req.body.LTN;
    const isBannerHidden = req.body.isBannerHidden === 'true' || req.body.isBannerHidden === true;
    
    // Update fields if provided
    if (accountName) account.accountName = accountName;
    if (email) {
      // Check if new email already exists (excluding current account)
      const existingAccount = await LinkTree.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existingAccount) {
        return res.status(400).json({
          status: 'error',
          message: 'An account with this email already exists'
        });
      }
      account.email = email.toLowerCase();
    }
    if (password) {
      account.password = password; // Will be hashed by pre-save hook
    }
    if (LTN !== undefined && LTN !== null && LTN !== '') {
      const ltnValue = parseInt(LTN);
      // Check if LTN already exists (excluding current account)
      const existingLTN = await LinkTree.findOne({ 
        LTN: ltnValue,
        _id: { $ne: req.params.id }
      });
      if (existingLTN) {
        return res.status(400).json({
          status: 'error',
          message: 'An account with this LTN already exists'
        });
      }
      account.LTN = ltnValue;
    } else if (LTN === '' || LTN === null) {
      // Allow clearing LTN by setting it to undefined
      account.LTN = undefined;
    }
    
    // Handle banner image upload
    if (req.body.bannerImage) {
      // Delete old banner image from S3 if it exists
      if (account.bannerImage && account.bannerImage.key) {
        try {
          await deleteFromS3(account.bannerImage.key);
          console.log('Deleted old banner image from S3:', account.bannerImage.key);
        } catch (deleteError) {
          console.error('Error deleting old banner image from S3:', deleteError);
          // Continue even if deletion fails
        }
      }
      
      // Set new banner image
      account.bannerImage = req.body.bannerImage;
    }
    
    // Update banner hide status
    if (req.body.isBannerHidden !== undefined) {
      account.isBannerHidden = isBannerHidden;
    }
    
    // Handle buttons
    if (req.body.buttons) {
      let buttonsData;
      
      // Parse buttons if it's a JSON string (from FormData)
      if (typeof req.body.buttons === 'string') {
        try {
          buttonsData = JSON.parse(req.body.buttons);
        } catch (e) {
          console.error('Error parsing buttons JSON:', e);
          return res.status(400).json({
            status: 'error',
            message: 'Invalid buttons data format',
            error: e.message
          });
        }
      } else {
        buttonsData = req.body.buttons;
      }
      
      // Validate buttons data
      if (!Array.isArray(buttonsData)) {
        return res.status(400).json({
          status: 'error',
          message: 'Buttons must be an array'
        });
      }
      
      // Process button icons if uploaded
      const buttonIcons = req.body.buttonIcons || [];
      
      // Handle buttonIconIndexes - can be JSON string or array
      let buttonIconIndexes = [];
      if (req.body.buttonIconIndexes) {
        if (typeof req.body.buttonIconIndexes === 'string') {
          try {
            buttonIconIndexes = JSON.parse(req.body.buttonIconIndexes);
          } catch (e) {
            console.error('Error parsing buttonIconIndexes JSON:', e);
            // Fallback: try to parse as single value or array
            if (Array.isArray(req.body.buttonIconIndexes)) {
              buttonIconIndexes = req.body.buttonIconIndexes;
            } else {
              buttonIconIndexes = [req.body.buttonIconIndexes];
            }
          }
        } else if (Array.isArray(req.body.buttonIconIndexes)) {
          buttonIconIndexes = req.body.buttonIconIndexes;
        } else {
          buttonIconIndexes = [req.body.buttonIconIndexes];
        }
      }
      
      console.log('Button icons received:', buttonIcons.length);
      console.log('Button icon indexes received:', buttonIconIndexes);
      console.log('Button icons data:', JSON.stringify(buttonIcons, null, 2));
      
      // Create a map of button index to icon
      // The order of buttonIconIndexes should match the order of buttonIcons
      const iconMap = {};
      if (buttonIcons.length > 0 && buttonIconIndexes.length === buttonIcons.length) {
        buttonIconIndexes.forEach((indexStr, iconIdx) => {
          const buttonIndex = parseInt(indexStr);
          if (!isNaN(buttonIndex) && buttonIcons[iconIdx]) {
            iconMap[buttonIndex] = buttonIcons[iconIdx];
          }
        });
      } else if (buttonIcons.length > 0) {
        // If indexes don't match, assume sequential order (0, 1, 2, ...)
        console.warn('Button icon indexes count does not match icons count, using sequential order');
        buttonIcons.forEach((icon, idx) => {
          iconMap[idx] = icon;
        });
      }
      
      // Delete old button icons from S3 that are being replaced
      if (account.buttons && account.buttons.length > 0 && Object.keys(iconMap).length > 0) {
        Object.keys(iconMap).forEach(buttonIdxStr => {
          const buttonIdx = parseInt(buttonIdxStr);
          if (!isNaN(buttonIdx) && account.buttons[buttonIdx] && account.buttons[buttonIdx].icon && account.buttons[buttonIdx].icon.key) {
            // Delete old icon if new one is being uploaded
            try {
              deleteFromS3(account.buttons[buttonIdx].icon.key).catch(err => 
                console.error('Error deleting old button icon:', err)
              );
            } catch (err) {
              console.error('Error deleting old button icon:', err);
            }
          }
        });
      }
      
      // Map buttons with icons
      const updatedButtons = buttonsData.map((button, idx) => {
        const buttonData = {
          label: button.label,
          link: button.link,
          order: button.order !== undefined ? button.order : idx
        };
        
        // Check if there's a new icon for this button index
        if (iconMap[idx]) {
          // Use new uploaded icon
          buttonData.icon = iconMap[idx];
          console.log(`Button ${idx} - Using new icon:`, buttonData.icon.url);
        } else if (button._preserveIcon && account.buttons && account.buttons[button._iconIndex]) {
          // Preserve existing icon (from client-side flag)
          buttonData.icon = account.buttons[button._iconIndex].icon;
          console.log(`Button ${idx} - Preserving existing icon from index ${button._iconIndex}:`, buttonData.icon?.url);
        } else if (account.buttons && account.buttons[idx] && account.buttons[idx].icon) {
          // Keep existing icon if no new one provided
          buttonData.icon = account.buttons[idx].icon;
          console.log(`Button ${idx} - Keeping existing icon:`, buttonData.icon?.url);
        } else {
          console.log(`Button ${idx} - No icon assigned`);
        }
        
        return buttonData;
      });
      
      console.log('Updated buttons with icons:', JSON.stringify(updatedButtons.map(b => ({ label: b.label, iconUrl: b.icon?.url })), null, 2));
      account.buttons = updatedButtons;
    }
    
    await account.save();
    
    res.json({
      status: 'success',
      message: 'Link tree account updated successfully',
      data: {
        account
      }
    });
  } catch (error) {
    console.error('Error updating link tree account:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        msg: err.message,
        field: err.path
      }));
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors
      });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email already exists'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update link tree account',
      error: error.message
    });
  }
});

// Delete banner image
router.delete('/api/linktree/:id/banner', async (req, res) => {
  try {
    const account = await LinkTree.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        status: 'error',
        message: 'Link tree account not found'
      });
    }
    
    // Delete banner image from S3 if it exists
    if (account.bannerImage && account.bannerImage.key) {
      try {
        await deleteFromS3(account.bannerImage.key);
        console.log('Deleted banner image from S3:', account.bannerImage.key);
      } catch (deleteError) {
        console.error('Error deleting banner image from S3:', deleteError);
        // Continue even if deletion fails
      }
    }
    
    // Remove banner image from account
    account.bannerImage = undefined;
    await account.save();
    
    res.json({
      status: 'success',
      message: 'Banner image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting banner image:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete banner image',
      error: error.message
    });
  }
});

// Delete link tree account
router.delete('/api/linktree/:id', async (req, res) => {
  try {
    const account = await LinkTree.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        status: 'error',
        message: 'Link tree account not found'
      });
    }
    
    // Delete banner image from S3 if it exists
    if (account.bannerImage && account.bannerImage.key) {
      try {
        await deleteFromS3(account.bannerImage.key);
        console.log('Deleted banner image from S3:', account.bannerImage.key);
      } catch (deleteError) {
        console.error('Error deleting banner image from S3:', deleteError);
        // Continue even if deletion fails
      }
    }
    
    // Delete the account
    await LinkTree.findByIdAndDelete(req.params.id);
    
    res.json({
      status: 'success',
      message: 'Link tree account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting link tree account:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete link tree account',
      error: error.message
    });
  }
});

module.exports = router;
