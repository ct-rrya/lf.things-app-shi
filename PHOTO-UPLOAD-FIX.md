# Photo Upload Fix Guide

## Error: "Network request failed" when uploading photos

### Root Cause
The error occurs when trying to upload photos to Supabase Storage. This can happen due to:
1. Supabase storage bucket doesn't exist
2. Storage bucket permissions not configured
3. Network connectivity issues
4. File reading issues on React Native

---

## Fix Steps

### Step 1: Create Storage Bucket in Supabase

1. Go to your Supabase Dashboard: https://rmxhkbytedkamqpeurga.supabase.co
2. Click "Storage" in the left sidebar
3. Click "New bucket"
4. Create a bucket named: `item-photos`
5. Make it **PUBLIC** (check the "Public bucket" option)
6. Click "Create bucket"

### Step 2: Set Bucket Policies

After creating the bucket, set these policies:

```sql
-- Allow anyone to upload to item-photos bucket
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'item-photos');

-- Allow anyone to read from item-photos bucket
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'item-photos');
```

Run this in Supabase SQL Editor.

### Step 3: Verify Bucket Configuration

1. Go to Storage > item-photos
2. Click the settings icon
3. Verify:
   - Bucket is PUBLIC
   - File size limit is reasonable (e.g., 5MB)
   - Allowed MIME types include: `image/jpeg`, `image/jpg`, `image/png`

### Step 4: Test Upload

1. Restart your app completely
2. Try uploading a photo again
3. Check the console for detailed error messages

---

## Alternative: Use Base64 Upload (If Above Doesn't Work)

If the storage bucket approach still fails, you can store photos as base64 in the database instead:

### Update register.js:

Replace the `uploadPhoto` function with:

```javascript
async function uploadPhoto(asset) {
  setUploadingPhoto(true);
  setPhotoError('');
  try {
    // Just store the local URI - we'll upload on submit
    setPhotos([...photos, { uri: asset.uri, url: asset.uri }]);
  } catch (error) {
    console.error('Photo error:', error);
    Alert.alert('Error', 'Failed to add photo');
  } finally {
    setUploadingPhoto(false);
  }
}
```

Then update `handleRegister` to upload all photos at once:

```javascript
// Before inserting item, upload all photos
const photoUrls = [];
for (const photo of photos) {
  try {
    const uri = photo.uri;
    const fileExt = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `items/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    const { data, error } = await supabase.storage
      .from('item-photos')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${fileExt}`,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('item-photos')
      .getPublicUrl(fileName);

    photoUrls.push(urlData.publicUrl);
  } catch (err) {
    console.error('Upload error:', err);
    // Continue with other photos
  }
}

if (photoUrls.length === 0) {
  Alert.alert('Error', 'Failed to upload photos. Please try again.');
  setLoading(false);
  return;
}

// Then use photoUrls in the insert...
```

---

## Debugging Tips

### Check Console Logs

Look for these error patterns:

1. **"Bucket not found"** → Create the `item-photos` bucket
2. **"Permission denied"** → Fix bucket policies
3. **"Network request failed"** → Check internet connection
4. **"Invalid file type"** → Check allowed MIME types

### Test Storage Directly

Try uploading a file manually in Supabase Dashboard:
1. Go to Storage > item-photos
2. Click "Upload file"
3. Try uploading a test image
4. If this fails, the bucket configuration is wrong

### Check Supabase URL

Verify your `.env` file has the correct Supabase URL:
```
EXPO_PUBLIC_SUPABASE_URL=https://rmxhkbytedkamqpeurga.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Current Code Changes

The upload function now:
1. Converts image to ArrayBuffer (works better on React Native)
2. Provides more detailed error messages
3. Shows helpful troubleshooting hints based on error type

---

## If Nothing Works

As a last resort, you can:
1. Skip photo uploads temporarily (make photos optional)
2. Use a different storage service (Cloudinary, AWS S3)
3. Store base64 images directly in database (not recommended for production)

---

## Testing Checklist

- [ ] Storage bucket `item-photos` exists
- [ ] Bucket is set to PUBLIC
- [ ] Bucket policies allow INSERT and SELECT
- [ ] App has internet connection
- [ ] App has photo library permissions
- [ ] Supabase URL and key are correct in `.env`
- [ ] App restarted after changes
- [ ] Test with a small image (< 1MB)
