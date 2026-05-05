import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client using environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Robust check for valid configuration
const isConfigValid = (
  supabaseUrl && 
  supabaseUrl !== 'undefined' && 
  supabaseUrl !== '' &&
  supabaseAnonKey && 
  supabaseAnonKey !== 'undefined' &&
  supabaseAnonKey !== ''
);

if (!isConfigValid) {
  console.warn('Supabase credentials missing or invalid. Storage features will be unavailable.');
}

export const supabase = isConfigValid 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      }
    })
  : null;

/**
 * Uploads a receipt image
 * @param {File} file - The receipt image file
 * @param {string} userId - The student/user ID
 * @returns {Promise<string>} Public URL
 */
export async function uploadReceipt(file, userId) {
  if (!supabase) {
    console.error('Supabase not initialized. Cannot upload receipt.');
    throw new Error('Supabase client is not configured.');
  }
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);
      
    return publicUrl;
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
}

/**
 * Uploads a profile avatar
 * @param {File} file - The avatar image file
 * @param {string} userId - The user ID
 * @returns {Promise<string>} Public URL
 */
export async function uploadAvatar(file, userId) {
  if (!supabase) {
    console.error('Supabase not initialized. Cannot upload avatar.');
    throw new Error('Supabase client is not configured.');
  }
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true  // Overwrite existing avatar
      });

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
      
    return publicUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

/**
 * Legacy upload function for backward compatibility
 */
export const uploadFileToSupabase = async (file, bucket, folderPath = '') => {
  if (!supabase) {
    console.error('Supabase not initialized. Cannot upload file.');
    throw new Error('Supabase client is not configured.');
  }
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
