import {putSetting, getSetting} from './BaseSettingsRequests.js';

/**
 * Save rate limits for the current user
 */
export const putRateLimits = async (rateLimits) => {
    return await putSetting('rateLimits', rateLimits);
};

/**
 * Get rate limits for the current user
 */
export const getRateLimits = async () => {
    return await getSetting('rateLimits', {});
};
