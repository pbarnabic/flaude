import {putSetting, getSetting} from './BaseSettingsRequests.js';

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

    return await putSetting('apiKey', apiKey);
};

/**
 * Get decrypted API key for the current user
 */
export const getApiKey = async () => {
    return await getSetting('apiKey', null);
};
