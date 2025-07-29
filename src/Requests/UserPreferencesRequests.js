import {putSetting, getSetting} from './BaseSettingsRequests.js';

/**
 * Save user preferences (theme, language, etc.)
 */
export const putUserPreferences = async (preferences) => {
    return await putSetting('userPreferences', preferences);
};

/**
 * Get user preferences
 */
export const getUserPreferences = async () => {
    return await getSetting('userPreferences', {
        theme: 'light',
        language: 'en',
        autoSave: true,
        showDebugInfo: false
    });
};
