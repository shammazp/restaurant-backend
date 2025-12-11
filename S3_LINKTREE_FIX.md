# Fix S3 Access for Link Tree Button Icons

## Problem
Button icons uploaded to S3 are not loading in both the edit page and public view page. This is because the S3 bucket policy doesn't include the `linktree-buttons/` and `linktree-banners/` paths.

## Solution: Update S3 Bucket Policy

### Step 1: Update Bucket Policy

1. Go to AWS S3 Console
2. Select your bucket (e.g., `kochione`)
3. Go to **Permissions** tab
4. Scroll to **Bucket policy**
5. Click **Edit**
6. Update the policy to include linktree paths:

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "PublicReadGetObject",
			"Effect": "Allow",
			"Principal": "*",
			"Action": "s3:GetObject",
			"Resource": [
				"arn:aws:s3:::kochione/restaurant-logos/*",
				"arn:aws:s3:::kochione/explore-posts/*",
				"arn:aws:s3:::kochione/user-profiles/*",
				"arn:aws:s3:::kochione/linktree-buttons/*",
				"arn:aws:s3:::kochione/linktree-banners/*"
			]
		},
		{
			"Sid": "AllowCloudFrontServicePrincipal",
			"Effect": "Allow",
			"Principal": {
				"Service": "cloudfront.amazonaws.com"
			},
			"Action": "s3:GetObject",
			"Resource": "arn:aws:s3:::kochione/*",
			"Condition": {
				"ArnLike": {
					"AWS:SourceArn": "arn:aws:cloudfront::073759315997:distribution/E3VHIPR5WM4DT4"
				}
			}
		}
	]
}
```

**Important:** Replace `kochione` with your actual bucket name and update the CloudFront distribution ARN if different.

### Step 2: Verify Block Public Access Settings

1. In the same **Permissions** tab
2. Scroll to **Block public access (bucket settings)**
3. Make sure "Block all public access" is **unchecked** (or at least uncheck "Block public access to buckets and objects granted through new public bucket or access point policies")
4. Click **Save changes** if you made changes

### Step 3: Test the Fix

1. Upload a button icon in the admin panel
2. Check the browser console for the icon URL
3. Try accessing the URL directly in your browser - it should show the image
4. Refresh the edit page - the icon should now display
5. Check the public linktree page - icons should display there too

## What Changed

The bucket policy now includes:
- `linktree-buttons/*` - for button icons
- `linktree-banners/*` - for banner images

## Debugging

If icons still don't load after updating the policy:

1. **Check the icon URL in the database:**
   - The icon URL should be accessible directly in a browser
   - If you see a 403 Forbidden error, the bucket policy isn't applied correctly

2. **Check browser console:**
   - Look for CORS errors
   - Check if the image URL is correct
   - Verify the image is loading (check Network tab)

3. **Check server logs:**
   - The server logs will show the uploaded icon URL
   - Verify the URL format matches your CDN or S3 endpoint

4. **Verify S3 upload:**
   - Go to S3 Console → Your bucket → `linktree-buttons/` folder
   - You should see the uploaded icon files
   - Try accessing one directly via S3 URL

## Security Note

Making these paths publicly readable means anyone with the URL can access the images. This is typically fine for public link tree pages, but if you need private images, consider using presigned URLs.
