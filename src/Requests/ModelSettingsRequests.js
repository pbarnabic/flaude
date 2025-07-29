import {putSetting, getSetting} from './BaseSettingsRequests.js';

/**
 * Save model settings for a specific model
 */
export const putModelSettings = async (modelSettings) => {
    // Get existing settings for all models
    const allModelSettings = await getSetting('allModelSettings', {});

    // Update settings for the specific model
    const updatedSettings = {
        ...allModelSettings,
        [modelSettings.model]: {
            temperature: modelSettings.temperature,
            maxTokens: modelSettings.maxTokens
        }
    };

    return await putSetting('allModelSettings', updatedSettings);
};

/**
 * Get default model settings for a specific model, or global defaults
 */
export const getModelSettings = async (model = null) => {
    const allModelSettings = await getSetting('allModelSettings', {});

    if (model && allModelSettings[model]) {
        // Return settings for the specific model with the model name included
        return {
            model: model,
            ...allModelSettings[model]
        };
    }

    // Return global defaults if no model specified or no settings found for the model
    return {
        model: model || 'claude-sonnet-4-20250514',
        temperature: 1.0,
        maxTokens: 4000
    };
};
