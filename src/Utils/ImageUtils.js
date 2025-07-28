// ImageUtils.js - Simplified for API contract only

export const ImageUtils = {
    /**
     * Convert file to base64 string
     * @param {File} file - Image file
     * @returns {Promise<string>} - Base64 encoded string (without data URL prefix)
     */
    fileToBase64: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove data:image/...;base64, prefix for API
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Get media type from file
     * @param {File} file - Image file
     * @returns {string} - Media type (e.g., 'image/jpeg')
     */
    getMediaType: (file) => {
        return file.type || 'image/jpeg';
    },

    /**
     * Validate if file is an image
     * @param {File} file - File to validate
     * @returns {boolean} - True if file is an image
     */
    isValidImage: (file) => {
        return file && file.type && file.type.startsWith('image/');
    },

    /**
     * Create data URL from base64 for display
     * @param {string} base64 - Base64 encoded image
     * @param {string} mediaType - Media type
     * @returns {string} - Data URL for display
     */
    createDataURL: (base64, mediaType) => {
        return `data:${mediaType};base64,${base64}`;
    },

    /**
     * Process files into API-compatible format
     * @param {File[]} files - Array of image files
     * @returns {Promise<Array>} - Array of processed images for API
     */
    processFilesForAPI: async (files) => {
        const processedImages = [];

        for (const file of files) {
            if (ImageUtils.isValidImage(file)) {
                try {
                    const base64 = await ImageUtils.fileToBase64(file);
                    const mediaType = ImageUtils.getMediaType(file);

                    processedImages.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mediaType,
                            data: base64
                        }
                    });
                } catch (error) {
                    console.error('Error processing image:', error);
                }
            }
        }

        return processedImages;
    }
};
