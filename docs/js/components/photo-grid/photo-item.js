import { galleryView } from '../gallery/gallery-view.js';
import { s3Client } from '../../storage/s3-client.js';

export class PhotoItem {
    constructor(photo, photos) {
        this.photo = photo;
        this.photos = photos;
        this.element = null;
        this.isLoading = true;
    }

    async render() {
        this.element = document.createElement('div');
        this.element.className = 'photo-item';
        this.element.dataset.key = this.photo.Key;

        const container = document.createElement('div');
        container.className = 'photo-container';

        if (!this.photo.url) {
            console.error('No URL available for photo:', this.photo.Key);
            container.appendChild(this.createErrorState());
        } else {
            try {
                // Ajouter le spinner de chargement
                const spinner = document.createElement('div');
                spinner.className = 'loading-spinner';
                container.appendChild(spinner);

                const img = await this.createImage(this.photo.url);
                container.innerHTML = ''; // Supprimer le spinner
                container.appendChild(img);
                container.appendChild(this.createOverlay());
                this.setupEventListeners();
                
                // Marquer comme chargé après un court délai pour l'animation
                setTimeout(() => {
                    this.element.classList.add('loaded');
                }, 50);
            } catch (error) {
                console.error('Failed to load photo:', error);
                container.innerHTML = ''; // Nettoyer le container
                container.appendChild(this.createErrorState());
            }
        }

        this.element.appendChild(container);
        return this.element;
    }

    createImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                img.alt = this.getFileName();
                resolve(img);
            };
            
            img.onerror = () => {
                console.error(`Image failed to load: ${url}`);
                reject(new Error('Image load error'));
            };

            img.src = url;
        });
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'photo-overlay';
        
        const actions = document.createElement('div');
        actions.className = 'photo-actions';
        
        actions.appendChild(this.createButton('download', '⬇️', this.handleDownload.bind(this)));
        actions.appendChild(this.createButton('delete', '🗑️', this.handleDelete.bind(this)));
        
        overlay.appendChild(actions);
        return overlay;
    }

    createButton(action, icon, handler) {
        const button = document.createElement('button');
        button.innerHTML = icon;
        button.title = action.charAt(0).toUpperCase() + action.slice(1);
        button.onclick = (e) => {
            e.stopPropagation();
            handler();
        };
        return button;
    }

    createErrorState() {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'Failed to load image';
        
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry';
        retryButton.onclick = () => this.handleRetry();
        
        errorDiv.appendChild(retryButton);
        return errorDiv;
    }

    setupEventListeners() {
        this.element.addEventListener('click', () => {
            if (galleryView) {
                galleryView.open(this.photo, this.photos);
            }
        });
    }

    async handleDownload() {
        try {
            await s3Client.downloadFile(this.photo.Key);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download photo');
        }
    }

    async handleDelete() {
        if (confirm('Delete this photo?')) {
            try {
                await s3Client.deleteFile(this.photo.Key);
                this.photos.splice(this.photos.findIndex(p => p.Key === this.photo.Key), 1);
                this.element.remove();
                // Optionally, notify the GalleryView to update
                // For example, if the deleted photo is currently displayed
                if (galleryView && galleryView.currentIndex >= this.photos.length) {
                    galleryView.currentIndex = this.photos.length - 1;
                    if (this.photos.length > 0) {
                        galleryView.displayPhoto();
                    } else {
                        galleryView.close();
                    }
                }
            } catch (error) {
                console.error('Delete failed:', error);
                alert('Failed to delete photo');
            }
        }
    }

    async handleRetry() {
        this.element.classList.add('loading');
        try {
            // Try to get a fresh URL
            this.photo.url = await s3Client.getSignedUrl(this.photo.Key);
            
            const img = await this.createImage(this.photo.url);
            const container = this.element.querySelector('.photo-container');
            container.innerHTML = ''; // Remove existing content
            container.appendChild(img);
            container.appendChild(this.createOverlay());
            this.setupEventListeners();
        } catch (error) {
            console.error('Retry failed:', error);
            const container = this.element.querySelector('.photo-container');
            container.innerHTML = this.createErrorState().outerHTML;
        }
    }

    getFileName() {
        return decodeURIComponent(this.photo.Key.split('-').slice(1).join('-'));
    }
} 