const express = require('express');
const router = express.Router();
const ExplorePost = require('../../models/ExplorePost');

// Explore Posts page
router.get('/explore', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    const explorePosts = await ExplorePost.find({ isActive: true }).limit(20).sort({ createdAt: -1 }).lean();
    
    // Format explore posts for display
    const explorePostsHTML = explorePosts.map(post => `
      <tr>
        <td><strong>${(post.title || 'N/A').replace(/'/g, "&#39;")}</strong></td>
        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${(post.description || 'N/A').substring(0, 100)}${post.description && post.description.length > 100 ? '...' : ''}</td>
        <td>
          ${post.media && Array.isArray(post.media) && post.media.length > 0 
            ? `<div style="display: flex; gap: 4px; flex-wrap: wrap;">
                ${post.media.slice(0, 3).map(media => {
                  if (!media || !media.url) return '';
                  if (media.type === 'video') {
                    return `<span style="font-size: 12px; color: #86868b;">🎥 Video</span>`;
                  } else {
                    const safeUrl = (media.url || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                    return `<img src="${safeUrl}" alt="${(media.originalName || 'Media').replace(/"/g, '&quot;')}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e5e7;" onerror="console.error('Failed to load image:', this.src); this.style.display='none';" />`;
                  }
                }).filter(html => html !== '').join('')}
                ${post.media.length > 3 ? `<span style="font-size: 12px; color: #86868b;">+${post.media.length - 3} more</span>` : ''}
              </div>`
            : '<span style="color: #86868b; font-size: 12px;">No media</span>'
          }
        </td>
        <td><span class="status ${post.isActive ? 'active' : 'inactive'}">${post.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>${post.views || 0}</td>
        <td>
          <button onclick="editExplorePost('${post._id}')" class="btn" style="background: #007aff; margin-right: 8px;">Edit</button>
          <button onclick="deleteExplorePost('${post._id}', '${(post.title || 'Unknown').replace(/'/g, "\\'")}')" class="btn" style="background: #dc3545;">Delete</button>
        </td>
      </tr>
    `).join('');
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Explore Posts - Admin</title>
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
    </style>
</head>
<body>
    <div class="container">
        <a href="/admin/dashboard" class="back-link">← Back to Dashboard</a>
        <div class="header">
            <h1>Explore Posts</h1>
            <p>Create and manage exploration update posts</p>
        </div>
        
        <div style="margin-bottom: 24px;">
            <button class="btn" onclick="showCreateForm()">➕ Create New Post</button>
        </div>
        
        <div id="exploreFormContainer" style="display: none; margin-bottom: 40px; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
            <h2 id="formTitle">Create Explore Post</h2>
            <div id="formMessage"></div>
            <form id="explorePostForm" enctype="multipart/form-data">
                <input type="hidden" id="postId" name="postId">
                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Title *</label>
                    <input type="text" id="title" name="title" required maxlength="200" style="width: 100%; padding: 12px 16px; border: 1px solid #e5e5e7; border-radius: 8px; font-size: 16px;">
                </div>
                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Description *</label>
                    <textarea id="description" name="description" rows="4" required maxlength="2000" style="width: 100%; padding: 12px 16px; border: 1px solid #e5e5e7; border-radius: 8px; font-size: 16px;"></textarea>
                </div>
                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Media Files *</label>
                    <input type="file" id="mediaFiles" name="coverImages" multiple accept="image/*,video/*" style="width: 100%; padding: 12px 16px; border: 1px solid #e5e5e7; border-radius: 8px;">
                </div>
                <div style="display: flex; gap: 12px;">
                    <button type="submit" class="btn" id="submitBtn">Create Post</button>
                    <button type="button" class="btn" onclick="hideCreateForm()" style="background: #86868b;">Cancel</button>
                </div>
            </form>
        </div>
        
        ${explorePosts.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Media</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${explorePostsHTML}
            </tbody>
        </table>
        ` : `
        <div style="text-align: center; padding: 60px 20px; color: #86868b;">
            <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
            <h3>No explore posts yet</h3>
            <p>Create your first explore post to get started</p>
        </div>
        `}
    </div>
    
    <script>
        function showCreateForm() {
            document.getElementById('exploreFormContainer').style.display = 'block';
            document.getElementById('explorePostForm').reset();
            document.getElementById('postId').value = '';
        }
        
        function hideCreateForm() {
            document.getElementById('exploreFormContainer').style.display = 'none';
        }
        
        document.getElementById('explorePostForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const postId = document.getElementById('postId').value;
            const url = postId ? \`/api/explore/\${postId}\` : '/api/explore';
            const method = postId ? 'PUT' : 'POST';
            
            try {
                const response = await fetch(url, { method, body: formData });
                const result = await response.json();
                if (response.ok) {
                    alert('Post ' + (postId ? 'updated' : 'created') + ' successfully!');
                    location.reload();
                } else {
                    alert('Error: ' + (result.message || 'Unknown error'));
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
        
        async function editExplorePost(postId) {
            try {
                const response = await fetch(\`/api/explore/\${postId}\`);
                const result = await response.json();
                if (result.status === 'success') {
                    const post = result.data.post;
                    document.getElementById('postId').value = post._id;
                    document.getElementById('title').value = post.title;
                    document.getElementById('description').value = post.description;
                    showCreateForm();
                }
            } catch (error) {
                alert('Error loading post: ' + error.message);
            }
        }
        
        async function deleteExplorePost(postId, postTitle) {
            if (confirm('Are you sure you want to delete "' + postTitle + '"? This action cannot be undone.')) {
                try {
                    const response = await fetch(\`/api/explore/\${postId}\`, { method: 'DELETE' });
                    if (response.ok) {
                        alert('Post deleted successfully!');
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
    console.error('Error loading explore page:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send('<h1>Error loading page</h1>');
  }
});

module.exports = router;
