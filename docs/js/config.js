import { encryption } from './storage/encryption.js';

export class ConfigManager {
    constructor() {
        this.modal = null;
        this.form = null;
        this.encryptionKeyInput = null;
        this.config = this.loadConfig();
    }

    initialize() {
        this.modal = document.getElementById('configModal');
        this.form = document.getElementById('s3ConfigForm');
        this.encryptionKeyInput = document.getElementById('encryptionKeyInput');
        
        if (!this.modal || !this.form) {
            console.error('Config modal elements not found');
            return;
        }

        this.populateForm();
        this.setupEventListeners();
    }

    populateForm() {
        const formElements = {
            bucketUrl: document.getElementById('bucketUrl'),
            bucketName: document.getElementById('bucketName'),
            accessKeyId: document.getElementById('accessKeyId'),
            secretAccessKey: document.getElementById('secretAccessKey')
        };

        // Remplir les champs avec les valeurs existantes
        Object.entries(formElements).forEach(([key, element]) => {
            if (element) {
                element.value = this.config[key] || '';
            }
        });

        // Afficher la clé de chiffrement si elle existe
        if (this.encryptionKeyInput) {
            this.encryptionKeyInput.value = localStorage.getItem('encryptionKey') || '';
        }
    }

    setupEventListeners() {
        // Gestionnaire de soumission du formulaire
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit(e);
        });

        // Fermeture du modal en cliquant à l'extérieur
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });

        // Boutons de gestion des clés
        const buttons = {
            generateKeyBtn: () => this.generateEncryptionKey(),
            exportKeyBtn: () => this.exportEncryptionKey(),
            importKeyBtn: () => this.importEncryptionKey(),
            copyKeyBtn: () => this.copyEncryptionKey()
        };

        Object.entries(buttons).forEach(([id, handler]) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', handler.bind(this));
            }
        });
    }

    async handleSubmit(e) {
        try {
            const formData = new FormData(this.form);
            const newConfig = {
                bucketUrl: formData.get('bucketUrl')?.trim() || '',
                bucketName: formData.get('bucketName')?.trim() || '',
                accessKeyId: formData.get('accessKeyId')?.trim() || '',
                secretAccessKey: formData.get('secretAccessKey')?.trim() || ''
            };

            if (!this.validateConfig(newConfig)) {
                throw new Error('Please fill in all required fields');
            }

            this.saveConfig(newConfig);
            this.showNotification('Configuration saved successfully', 'success');
            this.hideModal();
            
            // Recharger l'application
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            console.error('Failed to save configuration:', error);
            this.showNotification(error.message, 'error');
        }
    }

    validateConfig(config) {
        return config.bucketUrl && 
               config.bucketName && 
               config.accessKeyId && 
               config.secretAccessKey;
    }

    loadConfig() {
        try {
            const savedConfig = localStorage.getItem('storageConfig');
            return savedConfig ? JSON.parse(savedConfig) : {};
        } catch (error) {
            console.error('Failed to load config:', error);
            return {};
        }
    }

    saveConfig(config) {
        localStorage.setItem('storageConfig', JSON.stringify(config));
        this.config = config;
    }

    showModal() {
        if (!this.modal) return;
        this.populateForm();
        this.modal.classList.add('active');
    }

    hideModal() {
        if (!this.modal) return;
        this.modal.classList.remove('active');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }, 100);
    }

    async exportEncryptionKey() {
        const key = localStorage.getItem('encryptionKey');
        if (!key) {
            alert('No encryption key found');
            return;
        }

        const blob = new Blob([key], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'photo-library-key.key';
        a.click();
        URL.revokeObjectURL(url);
    }

    async importEncryptionKey() {
        const input = document.getElementById('keyImport');
        if (!input) return;

        input.click();
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                const key = await file.text();
                localStorage.setItem('encryptionKey', key);
                
                if (this.encryptionKeyInput) {
                    this.encryptionKeyInput.value = key;
                }
                
                await encryption.initialize();
                this.showNotification('Encryption key imported successfully', 'success');
                
                // Recharger les photos
                setTimeout(() => window.location.reload(), 500);
            } catch (error) {
                console.error('Failed to import key:', error);
                this.showNotification('Failed to import encryption key', 'error');
            }
        };
    }

    async generateEncryptionKey() {
        try {
            const newKey = await encryption.generateNewKey();
            if (this.encryptionKeyInput) {
                this.encryptionKeyInput.value = newKey;
                this.showNotification('New encryption key generated', 'success');
            }
        } catch (error) {
            console.error('Failed to generate key:', error);
            this.showNotification('Failed to generate encryption key', 'error');
        }
    }

    async copyEncryptionKey() {
        try {
            await navigator.clipboard.writeText(this.encryptionKeyInput.value);
            alert('Encryption key copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy key:', error);
            alert('Failed to copy encryption key');
        }
    }
} 