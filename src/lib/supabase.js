import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Supabase has been removed in favor of Firebase Storage to prevent ERR_NAME_NOT_RESOLVED
export const supabase = null;

export async function uploadReceipt(file, userId) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `receipts/${userId}/${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
}

export async function uploadAvatar(file, userId) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `avatars/${userId}/avatar_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

export const uploadFileToSupabase = async (file, bucket, folderPath = '') => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${bucket}/${folderPath}${fileName}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading file to Firebase Storage proxy:', error);
    throw error;
  }
};
