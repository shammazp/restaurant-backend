# Fix S3 403 Forbidden Error for Explore Posts Media

## Problem
Images and videos uploaded to S3 are returning `403 Forbidden` errors when trying to display them in the admin dashboard.

## Solution: Make S3 Bucket Publicly Readable

### Option 1: Bucket Policy (Recommended)

1. Go to AWS S3 Console
2. Select your bucket: `kochione`
3. Go to **Permissions** tab
4. Scroll to **Bucket policy**
5. Click **Edit** and add this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::kochione/*"
        }
    ]
}
```

6. Click **Save changes**

### Option 2: Block Public Access Settings

1. In the same **Permissions** tab
2. Scroll to **Block public access (bucket settings)**
3. Click **Edit**
4. **Uncheck** "Block all public access" (or at least uncheck "Block public access to buckets and objects granted through new public bucket or access point policies")
5. Click **Save changes**
6. Type `confirm` when prompted

### Option 3: Object ACL (if enabled)

If your bucket allows ACLs, the code will automatically try to set `public-read` ACL on upload. If ACLs are disabled, you'll need to use Option 1 (Bucket Policy).

## Verify the Fix

After applying the bucket policy:

1. Try accessing an image URL directly in your browser:
   ```
   https://kochione.s3.eu-north-1.amazonaws.com/explore-posts/explore_1764840632791_mdmpgj6dgpf_1764840632791_s63yuzbvpcn.jpg
   ```

2. You should see the image instead of an XML error

3. Refresh your admin dashboard - images should now load

## Security Note

Making your S3 bucket publicly readable means anyone with the URL can access the files. This is typically fine for:
- Public website images
- Public app content
- Marketing materials

If you need private files, consider:
- Using presigned URLs (temporary access)
- CloudFront with signed URLs
- Private bucket with authentication

## For Explore Posts Specifically

The explore posts media are stored in the `explore-posts/` folder. **This is why explore post images don't load while restaurant images do** - your bucket policy only allows `restaurant-logos/*` but not `explore-posts/*`.

## Your Current Policy Issue

Your current policy only allows:
- `arn:aws:s3:::kochione/restaurant-logos/*` ✅ (works)
- CloudFront access to all objects ✅ (works via CDN)

But it's missing:
- `arn:aws:s3:::kochione/explore-posts/*` ❌ (doesn't work)

## Updated Policy (Ready to Use)

I've created `S3_BUCKET_POLICY_UPDATE.json` with your updated policy. Here's what changed:

**Updated Policy:**
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
				"arn:aws:s3:::kochione/user-profiles/*"
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

**What Changed:**
- Changed `Resource` from a single string to an array
- Added `explore-posts/*` to the public read statement
- Added `user-profiles/*` for future use
- Kept your CloudFront policy unchanged

## How to Apply

1. Go to AWS S3 Console → Select bucket `kochione`
2. Click **Permissions** tab
3. Scroll to **Bucket policy**
4. Click **Edit**
5. Copy the entire policy from `S3_BUCKET_POLICY_UPDATE.json`
6. Paste it into the policy editor
7. Click **Save changes**

After saving, your explore post images should load immediately!

## Why Restaurant Images Work But Explore Posts Don't

- **Restaurant images** upload to `restaurant-logos/` folder and work because your bucket policy allows that path ✅
- **Explore post images** upload to `explore-posts/` folder but fail because the bucket policy doesn't include that path ❌
- The code has been updated to match restaurant images (no ACL, rely on bucket policy)
- Once you update the bucket policy to include `explore-posts/*`, everything will work!

