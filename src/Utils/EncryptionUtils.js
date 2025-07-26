class EncryptionUtils {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12; // 96 bits for GCM
        this.saltLength = 16; // 128 bits
        this.tagLength = 16; // 128 bits
        this.iterations = 100000; // PBKDF2 iterations
    }

    /**
     * Generate a random salt
     */
    generateSalt() {
        return crypto.getRandomValues(new Uint8Array(this.saltLength));
    }

    /**
     * Generate a random IV
     */
    generateIV() {
        return crypto.getRandomValues(new Uint8Array(this.ivLength));
    }

    /**
     * Derive a key from password using PBKDF2
     */
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);

        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        // Derive the actual encryption key
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data with password
     */
    async encrypt(data, password) {
        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));

            // Generate salt and IV
            const salt = this.generateSalt();
            const iv = this.generateIV();

            // Derive key from password
            const key = await this.deriveKey(password, salt);

            // Encrypt the data
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                dataBuffer
            );

            // Combine salt + iv + encrypted data
            const result = new Uint8Array(
                this.saltLength + this.ivLength + encrypted.byteLength
            );
            result.set(salt, 0);
            result.set(iv, this.saltLength);
            result.set(new Uint8Array(encrypted), this.saltLength + this.ivLength);

            // Convert to base64 for storage
            return this.arrayBufferToBase64(result);
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt data with password
     */
    async decrypt(encryptedData, password) {
        try {
            // Convert from base64
            const combined = this.base64ToArrayBuffer(encryptedData);

            // Extract salt, iv, and encrypted data
            const salt = combined.slice(0, this.saltLength);
            const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
            const encrypted = combined.slice(this.saltLength + this.ivLength);

            // Derive key from password
            const key = await this.deriveKey(password, salt);

            // Decrypt the data
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                encrypted
            );

            // Convert back to string and parse JSON
            const decoder = new TextDecoder();
            const decryptedString = decoder.decode(decrypted);
            return JSON.parse(decryptedString);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data - invalid password or corrupted data');
        }
    }

    /**
     * Convert ArrayBuffer to base64 string
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert base64 string to ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Test if a password can decrypt the given data
     */
    async testPassword(encryptedData, password) {
        try {
            await this.decrypt(encryptedData, password);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Generate a secure random password for testing
     */
    generateSecurePassword(length = 32) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => charset[byte % charset.length]).join('');
    }
}

// Export singleton instance
export const encryptionUtils = new EncryptionUtils();

// Hash a password for verification (not for encryption key derivation)
export const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
