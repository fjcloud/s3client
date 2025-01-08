import CryptoJS from 'crypto-js';

export class S3Client {
    constructor() {
        this.client = null;
        this.config = null;
        this.encryptionKey = null;
    }

    // Helper function to convert Uint8Array to base64
    uint8ArrayToBase64(uint8Array) {
        let binary = '';
        const len = uint8Array.length;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        return window.btoa(binary);
    }

    // Helper function to convert base64 to Uint8Array
    base64ToUint8Array(base64) {
        const binary = window.atob(base64);
        const len = binary.length;
        const array = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            array[i] = binary.charCodeAt(i);
        }
        return array;
    }

    initialize(config) {
        this.config = config;
        
        // Generate or load SSE-C key
        if (!localStorage.getItem('sseKey')) {
            this.generateSSEKey();
        } else {
            this.loadSSEKey();
        }
        
        let endpointUrl = config.bucketUrl;
        if (!endpointUrl.startsWith('http://') && !endpointUrl.startsWith('https://')) {
            endpointUrl = 'https://' + endpointUrl;
        }
        
        try {
            const parsedUrl = new URL(endpointUrl);
            
            AWS.config.update({
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
                region: 'eu-central-1',
                s3ForcePathStyle: true,
                signatureVersion: 'v4',
                endpoint: parsedUrl.origin,
                sslEnabled: true,
                httpOptions: {
                    timeout: 0,
                    xhrAsync: true,
                    withCredentials: false
                }
            });

            this.client = new AWS.S3({
                params: { Bucket: config.bucketName },
                signatureVersion: 'v4',
                s3ForcePathStyle: true,
                computeChecksums: true,
                correctClockSkew: true
            });
        } catch (error) {
            console.error('Invalid endpoint URL:', error);
            throw new Error('Invalid S3 endpoint URL');
        }
    }

    generateSSEKey() {
        // Generate 32 random bytes
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        
        // Store the binary key directly
        this.encryptionKey = randomBytes;
        
        // Convert binary key to base64 for persistence
        const base64Key = this.uint8ArrayToBase64(randomBytes);
        localStorage.setItem('sseKey', base64Key);
        
        console.log('Debug - Generated SSE-C key:', {
            keyLength: randomBytes.length,        // Should be 32
            base64Length: base64Key.length,       // Should be ~44
            keyPrefix: base64Key.substring(0, 4) + '...'
        });
        
        return base64Key;
    }

    loadSSEKey() {
        const base64Key = localStorage.getItem('sseKey');
        if (!base64Key) throw new Error('No SSE key found');
        
        // Convert base64 back to binary
        this.encryptionKey = this.base64ToUint8Array(base64Key);
        
        console.log('Debug - Loaded SSE-C key:', {
            keyLength: this.encryptionKey.length,  // Should be 32
            base64Length: base64Key.length,        // Should be ~44
            keyPrefix: base64Key.substring(0, 4) + '...'
        });
        
        return base64Key;
    }

    async uploadFile(file) {
        if (!this.client) throw new Error('S3 client not initialized');
        if (!this.encryptionKey) throw new Error('SSE key not initialized');

        const timestamp = Date.now();
        const fileName = encodeURIComponent(file.name);
        const key = `${timestamp}-${fileName}`;

        const arrayBuffer = await file.arrayBuffer();
        
        // Convert binary key to base64 for transmission
        const base64Key = this.uint8ArrayToBase64(this.encryptionKey);
        
        // Calculate MD5 of the binary key
        const keyWordArray = CryptoJS.lib.WordArray.create(this.encryptionKey);
        const keyMD5 = CryptoJS.MD5(keyWordArray).toString(CryptoJS.enc.Base64);

        const params = {
            Bucket: this.config.bucketName,
            Key: key,
            Body: arrayBuffer,
            ContentType: file.type,
            SSECustomerAlgorithm: 'AES256',
            SSECustomerKey: base64Key,
            SSECustomerKeyMD5: keyMD5
        };

        console.log('Debug - Upload params:', {
            algorithm: params.SSECustomerAlgorithm,
            keyLength: this.encryptionKey.length,
            base64KeyLength: params.SSECustomerKey.length,
            md5Length: params.SSECustomerKeyMD5.length,
            base64KeyPrefix: params.SSECustomerKey.substring(0, 4) + '...',
            md5Prefix: params.SSECustomerKeyMD5.substring(0, 4) + '...'
        });

        return new Promise((resolve, reject) => {
            this.client.upload(params, (err, data) => {
                if (err) {
                    console.error('Upload error:', err);
                    reject(err);
                } else {
                    console.log('Upload success:', {
                        ETag: data.ETag,
                        SSECustomerAlgorithm: data.SSECustomerAlgorithm,
                        SSECustomerKeyMD5: data.SSECustomerKeyMD5
                    });
                    resolve(data);
                }
            });
        });
    }

    async getObject(key) {
        if (!this.encryptionKey) throw new Error('SSE key not initialized');

        const base64Key = this.uint8ArrayToBase64(this.encryptionKey);
        const keyWordArray = CryptoJS.lib.WordArray.create(this.encryptionKey);
        const keyMD5 = CryptoJS.MD5(keyWordArray).toString(CryptoJS.enc.Base64);

        const params = {
            Bucket: this.config.bucketName,
            Key: key,
            SSECustomerAlgorithm: 'AES256',
            SSECustomerKey: base64Key,
            SSECustomerKeyMD5: keyMD5
        };

        console.log('Debug - GetObject params:', {
            algorithm: params.SSECustomerAlgorithm,
            keyLength: this.encryptionKey.length,
            base64KeyLength: params.SSECustomerKey.length,
            md5Length: params.SSECustomerKeyMD5.length,
            base64KeyPrefix: params.SSECustomerKey.substring(0, 4) + '...',
            md5Prefix: params.SSECustomerKeyMD5.substring(0, 4) + '...'
        });

        return new Promise((resolve, reject) => {
            this.client.getObject(params, (err, data) => {
                if (err) {
                    console.error('GetObject error:', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async deleteFile(key) {
        if (!this.client) throw new Error('S3 client not initialized');
        if (!this.encryptionKey) throw new Error('SSE key not initialized');

        const base64Key = this.uint8ArrayToBase64(this.encryptionKey);
        const keyWordArray = CryptoJS.lib.WordArray.create(this.encryptionKey);
        const keyMD5 = CryptoJS.MD5(keyWordArray).toString(CryptoJS.enc.Base64);

        const params = {
            Bucket: this.config.bucketName,
            Key: key,
            SSECustomerAlgorithm: 'AES256',
            SSECustomerKey: base64Key,
            SSECustomerKeyMD5: keyMD5
        };

        return new Promise((resolve, reject) => {
            this.client.deleteObject(params, (err, data) => {
                if (err) {
                    console.error('DeleteObject error:', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async listPhotos() {
        if (!this.client) throw new Error('S3 client not initialized');

        const params = {
            Bucket: this.config.bucketName
        };

        return new Promise((resolve, reject) => {
            this.client.listObjects(params, (err, data) => {
                if (err) reject(err);
                else resolve(data.Contents.sort((a, b) => b.LastModified - a.LastModified));
            });
        });
    }

    getFileName(key) {
        return decodeURIComponent(key.split('-').slice(1).join('-'));
    }
}

export const s3Client = new S3Client(); 