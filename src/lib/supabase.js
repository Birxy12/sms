import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client using the provided URL and Anon Key
const supabaseUrl = 'https://iqhppzndambyyskfwqyc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxaHBwem5kYW1ieXlza2Z3cXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzA4NjUsImV4cCI6MjA5MjU0Njg2NX0.B9Bc9k96i5tKzJq2upa8RUuwnOvx42l052JgAEXK0bM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to a Supabase Storage bucket
 * @param {File} file - The file to upload
 * @param {string} bucket - The storage bucket name (e.g., 'images', 'documents')
 * @param {string} folderPath - Optional folder path inside the bucket (e.g., 'avatars/')
 * @returns {Promise<string>} The public URL of the uploaded file
 */
export const uploadFileToSupabase = async (file, bucket, folderPath = '') => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folderPath}${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading file to Supabase:', error);
    throw error;
  }
};
