import axios from 'axios';

/**
 * Utility for parsing receipts using an OCR service.
 * This is a boilerplate implementation.
 */
export const processReceiptImage = async (imageFileOrBase64) => {
  try {
    console.log('Processing receipt image...');
    
    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Example of how you might call an actual OCR API
    /*
    const formData = new FormData();
    formData.append('image', imageFileOrBase64);
    
    const response = await axios.post('YOUR_OCR_API_ENDPOINT', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    });
    
    return response.data;
    */
    
    // Return mock data for now
    return {
      success: true,
      data: {
        date: new Date().toISOString(),
        totalAmount: 45000,
        merchantName: "First Bank of Nigeria",
        receiptNumber: "TXN-" + Math.floor(Math.random() * 1000000)
      }
    };
  } catch (error) {
    console.error('Error processing receipt:', error);
    return {
      success: false,
      error: error.message || 'Failed to process receipt'
    };
  }
};
