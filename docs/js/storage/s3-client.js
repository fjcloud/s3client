export class S3Client {
    constructor() {
        this.client = null;
        this.config = null;
        this.encryptionKey = null;
    }

    initialize(config) {
        this.config = config;
        
        // Generate or load SSE-C key
        if (!localStorage.getItem('sseKeyHex')) {
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
                region: 'eu-central-1',  // Hetzner uses eu-central-1
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
        
        // Store base64 version for persistence
        const base64Key = btoa(String.fromCharCode(...randomBytes));
        localStorage.setItem('sseKey', base64Key);
        
        console.log('Debug - Generated SSE-C key:', {
            keyLength: randomBytes.length,  // Should be 32
            base64Length: base64Key.length  // Should be ~44
        });
        
        return base64Key;
    }

    loadSSEKey() {
        const base64Key = localStorage.getItem('sseKey');
        if (!base64Key) throw new Error('No SSE key found');
        
        // Convert base64 back to binary
        const binary = atob(base64Key);
        this.encryptionKey = new Uint8Array(
            binary.split('').map(char => char.charCodeAt(0))
        );
        
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
        const base64Key = btoa(String.fromCharCode(...this.encryptionKey));
        
        // Calculate MD5 of the binary key (not the base64 version)
        const keyMD5 = CryptoJS.MD5(
            CryptoJS.lib.WordArray.create(this.encryptionKey)
        ).toString(CryptoJS.enc.Base64);

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
            // First few chars for verification
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

    async getSignedUrl(key) {
        if (!this.client) throw new Error('S3 client not initialized');
        if (!this.encryptionKey) throw new Error('SSE key not initialized');

        try {
            const data = await this.getObject(key);
            const blob = new Blob([data.Body], { type: data.ContentType || 'image/jpeg' });
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error('Failed to get signed URL:', error);
            throw error;
        }
    }

    async getObject(key) {
        if (!this.encryptionKey) throw new Error('SSE key not initialized');

        // Convert binary key to base64 for transmission
        const base64Key = btoa(String.fromCharCode(...this.encryptionKey));
        
        // Calculate MD5 of the binary key
        const keyMD5 = CryptoJS.MD5(
            CryptoJS.lib.WordArray.create(this.encryptionKey)
        ).toString(CryptoJS.enc.Base64);

        const params = {
            Bucket: this.config.bucketName,
            Key: key,
            SSECustomerAlgorithm: 'AES256',
            SSECustomerKey: base64Key,
            SSECustomerKeyMD5: keyMD5
        };

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

    getMD5Hash(key) {
        // Convert base64-encoded key to binary string
        const binaryKey = atob(key);
        // Compute MD5 hash
        const md5 = CryptoJS.MD5(CryptoJS.enc.Latin1.parse(binaryKey));
        // Encode hash in base64
        return CryptoJS.enc.Base64.stringify(md5);
    }

    async downloadFile(key) {
        if (!this.client) throw new Error('S3 client not initialized');

        try {
            const data = await this.getObject(key);
            const blob = new Blob([data.Body], { type: data.ContentType || 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = this.getFileName(key);
            a.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download file:', error);
            throw new Error('Failed to download file');
        }
    }

    async deleteFile(key) {
        if (!this.client) throw new Error('S3 client not initialized');
        if (!this.encryptionKey) throw new Error('SSE key not initialized');

        // Convert binary key to base64 for transmission
        const base64Key = btoa(String.fromCharCode(...this.encryptionKey));
        
        // Calculate MD5 of the binary key
        const keyMD5 = CryptoJS.MD5(
            CryptoJS.lib.WordArray.create(this.encryptionKey)
        ).toString(CryptoJS.enc.Base64);

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

    async checkCORS() {
        if (!this.client) throw new Error('S3 client not initialized');

        try {
            // Try a simple listObjects request instead of headBucket
            const params = {
                Bucket: this.config.bucketName,
                MaxKeys: 1
            };

            await this.client.listObjects(params).promise();
            return true;
        } catch (error) {
            console.error('CORS check failed:', error);
            if (error.code === 'AccessDenied') {
                throw new Error('Access denied. Please check your bucket permissions and CORS configuration.');
            }
            throw error;
        }
    }

    handleCORSError(error) {
        console.error('S3 request failed:', error);
        
        if (error.code === 'NetworkingError' || error.code === 'CORSError') {
            const errorMessage = 'CORS configuration error. Please ensure:\n' +
                '1. Your bucket CORS configuration is correct\n' +
                '2. You are using the correct endpoint URL\n' +
                '3. Your credentials have sufficient permissions';
            throw new Error(errorMessage);
        }
        
        throw error;
    }
}

export const s3Client = new S3Client(); 