'use strict';

const vision = require('@google-cloud/vision');
const Tesseract = require('tesseract.js');

const client = new vision.ImageAnnotatorClient();

async function extractTextFromImage(imagePath) {
    try {
        // Use Google Vision API for OCR
        const [result] = await client.textDetection(imagePath);
        const detections = result.textAnnotations;

        if (detections.length > 0) {
            return detections[0].description;
        } else {
            throw new Error('No text detected');
        }
    } catch (error) {
        console.error('Google Vision API failed, trying Tesseract.js...', error);
        // Fallback to Tesseract.js
        return new Promise((resolve, reject) => {
            Tesseract.recognize(
                imagePath,
                'eng',
                { logger: (m) => console.log(m) }
            ).then(({ data: { text } }) => {
                if (text) {
                    resolve(text);
                } else {
                    reject(new Error('No text detected with Tesseract.js')); 
                }
            }).catch(reject);
        });
    }
}

module.exports = { extractTextFromImage };
