import { encryption } from './encryption.js';

export class S3Client {
    constructor() {
        this.client = null;
        this.config = null;
    }

    initialize(config) {
        this.config = config;
        AWS.config.update({
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            endpoint: new AWS.Endpoint(config.bucketUrl),
            s3ForcePathStyle: true,
            signatureVersion: 'v4'
        });
        this.client = new AWS.S3();
    }

    async uploadFile(file) {
        if (!this.client) throw new Error('S3 client not initialized');

        const timestamp = Date.now();
        const fileName = encodeURIComponent(file.name);
        const key = `${timestamp}-${fileName}`;

        // Encrypt file data
        const arrayBuffer = await file.arrayBuffer();
        const encrypted = await encryption.encrypt(arrayBuffer);

        const params = {
            Bucket: this.config.bucketName,
            Key: key,
            Body: encrypted, // Combined IV + encrypted data
            ContentType: 'application/octet-stream'
        };

        console.log(`Uploading file: ${key} with combined encrypted data (Length: ${encrypted.byteLength})`);

        return new Promise((resolve, reject) => {
            this.client.upload(params, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }

    async downloadFile(key) {
        if (!this.client) throw new Error('S3 client not initialized');

        try {
            const data = await this.getObject(key);
            const decrypted = await encryption.decrypt(data.Body);
            const blob = new Blob([decrypted], { type: 'image/jpeg' }); // Default to JPEG
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

        const params = {
            Bucket: this.config.bucketName,
            Key: key
        };

        return new Promise((resolve, reject) => {
            this.client.deleteObject(params, (err, data) => {
                if (err) reject(err);
                else resolve(data);
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

    async getSignedUrl(key) {
        if (!this.client) throw new Error('S3 client not initialized');

        try {
            const data = await this.getObject(key);
            console.log(`Downloading and decrypting file: ${key} (Length: ${data.Body.byteLength})`);

            const decrypted = await encryption.decrypt(data.Body);
            const blob = new Blob([decrypted], { type: 'image/jpeg' }); // Default to JPEG
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error('Failed to process encrypted data:', error);
            throw new Error('Failed to decrypt photo data');
        }
    }

    async getObject(key) {
        const params = {
            Bucket: this.config.bucketName,
            Key: key
        };

        return new Promise((resolve, reject) => {
            this.client.getObject(params, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }

    getFileName(key) {
        return decodeURIComponent(key.split('-').slice(1).join('-'));
    }
}

export const s3Client = new S3Client(); 