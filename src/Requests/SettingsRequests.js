import {
    ensureAuthenticated,
    getCurrentUser,
    encryptForStorage,
    decryptFromStorage
} from '../Auth/UserSessionManager.js';
import {
    getUserDatabaseName,
    getRecord,
    putRecord,
    deleteRecord,
    defaultErrorHandler,
    defaultSuccessHandler
} from './BaseStorageRequests.js';

/**
 * Get the current user's database name
 */
const getCurrentUserDatabaseName = () => {
    const { username } = getCurrentUser();
    if (!username) {
        throw new Error('No current user set');
    }
    return getUserDatabaseName(username);
};

/**
 * Save a setting value
 */
const saveSetting = async (key, value) => {
    try {
        ensureAuthenticated();

        const encryptedData = await encryptForStorage(value);
        const settingRecord = {
            key: key,
            encrypted_data: encryptedData,
            updatedAt: new Date().toISOString()
        };

        const databaseName = getCurrentUserDatabaseName();
        await putRecord(databaseName, 'settings', settingRecord);

        return defaultSuccessHandler(value);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Get a setting value
 */
const getSetting = async (key, defaultValue = null) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        const settingRecord = await getRecord(databaseName, 'settings', key);

        if (!settingRecord) {
            return defaultSuccessHandler(defaultValue);
        }

        try {
            const decryptedValue = await decryptFromStorage(settingRecord.encrypted_data);
            return defaultSuccessHandler(decryptedValue);
        } catch (decryptError) {
            console.error(`Failed to decrypt setting ${key}:`, decryptError);
            return defaultSuccessHandler(defaultValue);
        }
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Delete a setting
 */
const deleteSetting = async (key) => {
    try {
        ensureAuthenticated();

        const databaseName = getCurrentUserDatabaseName();
        await deleteRecord(databaseName, 'settings', key);

        return defaultSuccessHandler(true);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

// Rate Limit Operations
/**
 * Save rate limits for the current user
 */
export const putRateLimits = async (rateLimits) => {
    return await saveSetting('rateLimits', rateLimits);
};

/**
 * Get rate limits for the current user
 */
export const getRateLimits = async () => {
    return await getSetting('rateLimits', {});
};

/**
 * Clear rate limits for the current user
 */
export const clearRateLimits = async () => {
    return await putRateLimits({});
};

/**
 * Update specific model rate limit
 */
export const updateModelRateLimit = async (model, rateLimitData) => {
    try {
        const currentRateLimits = await getRateLimits();
        const updatedRateLimits = {
            ...currentRateLimits,
            [model]: rateLimitData
        };

        return await putRateLimits(updatedRateLimits);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

/**
 * Get rate limit for specific model
 */
export const getModelRateLimit = async (model) => {
    try {
        const rateLimits = await getRateLimits();
        return defaultSuccessHandler(rateLimits[model] || {});
    } catch (error) {
        return defaultErrorHandler(error);
    }
};

// API Key Operations
/**
 * Save encrypted API key for the current user
 */
export const putApiKey = async (apiKey) => {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new Error('API key must be a non-empty string');
    }

    // Validate API key format (basic check for Anthropic API keys)
    if (!apiKey.startsWith('sk-ant-')) {
        throw new Error('Invalid API key format. Anthropic API keys should start with "sk-ant-"');
    }

    return await saveSetting('apiKey', apiKey);
};

/**
 * Get decrypted API key for the current user
 */
export const getApiKey = async () => {
    return await getSetting('apiKey', null);
};

/**
 * Clear API key for the current user
 */
export const clearApiKey = async () => {
    return await deleteSetting('apiKey');
};

/**
 * Check if user has an API key stored
 */
export const hasApiKey = async () => {
    try {
        const apiKey = await getApiKey();
        return defaultSuccessHandler(!!apiKey);
    } catch (error) {
        return defaultSuccessHandler(false);
    }
};

// General Settings Operations
/**
 * Save user preferences (theme, language, etc.)
 */
export const saveUserPreferences = async (preferences) => {
    return await saveSetting('userPreferences', preferences);
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

/**
 * Save model settings as default for new chats
 */
export const saveDefaultModelSettings = async (modelSettings) => {
    return await saveSetting('defaultModelSettings', modelSettings);
};

/**
 * Get default model settings
 */
export const getDefaultModelSettings = async () => {
    return await getSetting('defaultModelSettings', {
        model: 'claude-3-5-haiku-20241022',
        temperature: 1.0,
        maxTokens: 500
    });
};

/**
 * Save chat display preferences
 */
export const saveChatPreferences = async (chatPreferences) => {
    return await saveSetting('chatPreferences', chatPreferences);
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

/**
 * Export all settings for backup
 */
export const exportAllSettings = async () => {
    try {
        ensureAuthenticated();

        const [rateLimits, userPreferences, defaultModelSettings, chatPreferences] = await Promise.all([
            getRateLimits(),
            getUserPreferences(),
            getDefaultModelSettings(),
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
            promises.push(saveUserPreferences(settingsData.userPreferences));
        }

        if (settingsData.defaultModelSettings) {
            promises.push(saveDefaultModelSettings(settingsData.defaultModelSettings));
        }

        if (settingsData.chatPreferences) {
            promises.push(saveChatPreferences(settingsData.chatPreferences));
        }

        await Promise.all(promises);

        return defaultSuccessHandler(true);
    } catch (error) {
        return defaultErrorHandler(error);
    }
};
