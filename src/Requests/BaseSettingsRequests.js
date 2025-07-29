import {ensureAuthenticated} from '../Auth/UserSessionManager.js';
import {
    defaultErrorHandler,
    defaultSuccessHandler,
    getCurrentUserDatabaseName,
    getRecord,
    putRecord
} from './BaseStorageRequests.js';
import {encryptForStorage, decryptFromStorage} from '../Auth/UserSessionManager.js';

/**
 * Save a setting value (shared helper function)
 */
export const putSetting = async (key, value) => {
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
 * Get a setting value (shared helper function)
 */
export const getSetting = async (key, defaultValue = null) => {
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
