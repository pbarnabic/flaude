import {ensureAuthenticated} from '../Auth/UserSessionManager.js';
import {defaultErrorHandler, defaultSuccessHandler} from './BaseStorageRequests.js';
import {getRateLimits, putRateLimits} from './RateLimitsRequests.js';
import {getUserPreferences, putUserPreferences} from './UserPreferencesRequests.js';
import {getModelSettings, putModelSettings} from './ModelSettingsRequests.js';
import {getChatPreferences, putChatPreferences} from './ChatPreferencesRequests.js';

/**
 * Export all settings for backup
 */
export const exportAllSettings = async () => {
    try {
        ensureAuthenticated();

        const [rateLimits, userPreferences, defaultModelSettings, chatPreferences] = await Promise.all([
            getRateLimits(),
            getUserPreferences(),
            getModelSettings(),
            getChatPreferences()
        ]);

        // Note: We intentionally don't export the API key for security reasons
        const settings = {
            rateLimits,
            userPreferences,
            defaultModelSettings,
            chatPreferences,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        return defaultSuccessHandler(settings);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Import settings from backup (excluding API key)
 */
export const importSettings = async (settingsData) => {
    try {
        ensureAuthenticated();

        if (!settingsData || typeof settingsData !== 'object') {
            throw new Error('Invalid settings data');
        }

        const promises = [];

        if (settingsData.rateLimits) {
            promises.push(putRateLimits(settingsData.rateLimits));
        }

        if (settingsData.userPreferences) {
            promises.push(putUserPreferences(settingsData.userPreferences));
        }

        if (settingsData.defaultModelSettings) {
            promises.push(putModelSettings(settingsData.defaultModelSettings));
        }

        if (settingsData.chatPreferences) {
            promises.push(putChatPreferences(settingsData.chatPreferences));
        }

        await Promise.all(promises);

        return defaultSuccessHandler(true);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};
