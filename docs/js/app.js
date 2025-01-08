// Main application initialization
import { s3Client } from './storage/s3-client.js';
import { encryption } from './storage/encryption.js';
import { PhotoGrid } from './components/photo-grid/photo-grid.js';
import { ConfigManager } from './config.js';

class App {
    constructor() {
        this.photoGrid = new PhotoGrid('#photoGrid');
        this.configManager = new ConfigManager();
    }

    async initialize() {
        try {
            // Initialize ConfigManager after DOM is ready
            this.configManager.initialize();
            console.log('ConfigManager initialized.');

            try {
                // Initialize encryption and wait for it
                await encryption.initialize();
                console.log('Encryption initialized in App:', encryption.subtle);
            } catch (error) {
                console.error('Encryption initialization failed:', error);
                alert('This application requires HTTPS or localhost to work. Please use a secure connection.');
                return;
            }

            // Initialize S3 client if config exists
            const config = this.configManager.loadConfig();
            if (config && config.bucketUrl) {
                // Check if we have an encryption key
                if (!localStorage.getItem('encryptionKey')) {
                    alert('Please generate or import an encryption key before continuing.');
                    this.configManager.showModal();
                    return;
                }
                
                s3Client.initialize(config);
                console.log('S3 Client initialized.');

                // Add CORS check
                try {
                    await s3Client.checkCORS();
                    console.log('CORS check passed successfully');
                    await this.photoGrid.loadPhotos();
                    console.log('Photos loaded.');
                } catch (error) {
                    console.error('CORS check failed:', error);
                    alert('Failed to connect to S3 bucket. Please check your CORS configuration and bucket permissions.');
                    this.configManager.showModal();
                    return;
                }
            } else {
                this.configManager.showModal();
                return;
            }

            this.setupEventListeners();
        } catch (error) {
            console.error('Initialization error:', error);
            alert('Failed to initialize application. Please check your configuration.');
        }
    }

    setupEventListeners() {
        const settingsBtn = document.getElementById('settingsBtn');
        settingsBtn.addEventListener('click', () => this.configManager.showModal());

        // Add upload button handler
        const uploadBtn = document.getElementById('uploadBtn');
        const photoUpload = document.getElementById('photoUpload');
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                photoUpload.click();
            });
        }

        if (photoUpload) {
            photoUpload.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (files.length === 0) return;

                try {
                    for (const file of files) {
                        await s3Client.uploadFile(file);
                    }
                    await this.photoGrid.loadPhotos(); // Reload photos after upload
                } catch (error) {
                    console.error('Upload failed:', error);
                    alert('Failed to upload photos');
                }

                // Reset input
                photoUpload.value = '';
            });
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.initialize();
}); 