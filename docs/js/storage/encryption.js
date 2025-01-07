export class Encryption {
    constructor() {
        this.key = null;
        this.algorithm = {
            name: 'AES-GCM',
            length: 256
        };
        this.crypto = null;
        this.subtle = null;
    }

    async initialize() {
        // Check for secure context
        if (!window.isSecureContext) {
            throw new Error('Crypto API requires a secure context (HTTPS or localhost)');
        }

        // Check if Web Crypto API is available
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error('Web Crypto API is not supported in this browser');
        }

        this.crypto = window.crypto;
        this.subtle = this.crypto.subtle;

        if (!this.subtle) {
            throw new Error('Crypto.subtle is not available. Are you using HTTPS?');
        }

        console.log('Encryption initialized. Subtle:', this.subtle);

        // Load existing key if available
        const savedKey = localStorage.getItem('encryptionKey');
        if (savedKey) {
            try {
                const keyData = this.base64ToArrayBuffer(savedKey);
                this.key = await this.subtle.importKey(
                    'raw',
                    keyData,
                    this.algorithm,
                    true,
                    ['encrypt', 'decrypt']
                );
                console.log('Existing key loaded');
            } catch (error) {
                console.error('Failed to load existing key:', error);
                this.key = null;
            }
        }
    }

    async generateNewKey() {
        if (!this.subtle) {
            await this.initialize();
        }

        console.log('Subtle before generating key:', this.subtle);

        try {
            this.key = await this.subtle.generateKey(
                {
                    name: this.algorithm.name,
                    length: this.algorithm.length
                },
                true,
                ['encrypt', 'decrypt']
            );

            console.log('New key generated:', this.key);

            const exportedKey = await this.exportKey(this.key);
            localStorage.setItem('encryptionKey', exportedKey);
            return exportedKey;
        } catch (error) {
            console.error('Failed to generate key:', error);
            throw new Error('Key generation failed');
        }
    }

    async exportKey(key) {
        try {
            const exported = await this.subtle.exportKey('raw', key);
            console.log('Exported key:', exported);
            return this.arrayBufferToBase64(exported);
        } catch (error) {
            console.error('Failed to export key:', error);
            throw new Error('Key export failed');
        }
    }

    async encrypt(data) {
        if (!this.key) {
            throw new Error('Encryption not initialized');
        }

        const iv = this.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await this.subtle.encrypt(
            {
                name: this.algorithm.name,
                iv: iv
            },
            this.key,
            data
        );

        // Combine IV and encrypted data into a single ArrayBuffer
        const combinedLength = iv.length + encrypted.byteLength;
        const combined = new Uint8Array(combinedLength);
        combined.set(iv, 0); // Put IV at the beginning
        combined.set(new Uint8Array(encrypted), iv.length); // Put encrypted data after IV

        return combined.buffer;
    }

    async decrypt(combinedData) {
        if (!this.key) {
            throw new Error('Encryption not initialized');
        }

        try {
            // Split the combined data back into IV and encrypted data
            const combined = new Uint8Array(combinedData);
            if (combined.length < 13) { // 12 bytes IV + at least 1 byte encrypted
                throw new Error('Combined data is too short to contain IV and encrypted data');
            }

            const iv = combined.slice(0, 12); // First 12 bytes are IV
            const encryptedData = combined.slice(12); // Rest is encrypted data

            console.log('Decrypting data:', { encryptedDataLength: encryptedData.length, ivLength: iv.length });

            const decrypted = await this.subtle.decrypt(
                {
                    name: this.algorithm.name,
                    iv: iv
                },
                this.key,
                encryptedData
            );

            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        // Use URL-safe base64 encoding
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    base64ToArrayBuffer(base64) {
        try {
            // Restore standard base64 encoding
            base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
            // Add padding if necessary
            while (base64.length % 4) {
                base64 += '=';
            }

            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes.buffer;
        } catch (error) {
            console.error('Base64 decode error:', error);
            throw new Error('Invalid base64 data');
        }
    }
}

export const encryption = new Encryption(); 