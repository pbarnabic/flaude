import {putSetting, getSetting} from './BaseSettingsRequests.js';

/**
 * Save chat display preferences
 */
export const putChatPreferences = async (chatPreferences) => {
    return await putSetting('chatPreferences', chatPreferences);
};

/**
 * Get chat display preferences
 */
export const getChatPreferences = async () => {
    return await getSetting('chatPreferences', {
        showTimestamps: false,
        showWordCount: false,
        fontSize: 'medium',
        codeTheme: 'dark'
    });
};
