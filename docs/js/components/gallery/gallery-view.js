import { s3Client } from '../../storage/s3-client.js';

export class GalleryView {
    constructor() {
        this.photos = [];
        this.currentIndex = 0;

        // Create gallery overlay elements
        this.overlay = document.createElement('div');
        this.overlay.className = 'gallery-overlay';
        this.overlay.classList.add('hidden');

        this.imageContainer = document.createElement('div');
        this.imageContainer.className = 'gallery-image-container';
        this.overlay.appendChild(this.imageContainer);

        this.image = document.createElement('img');
        this.image.className = 'gallery-image';
        this.imageContainer.appendChild(this.image);

        // Navigation buttons
        this.prevButton = document.createElement('button');
        this.prevButton.className = 'gallery-nav gallery-prev';
        this.prevButton.innerHTML = '‹';
        this.overlay.appendChild(this.prevButton);

        this.nextButton = document.createElement('button');
        this.nextButton.className = 'gallery-nav gallery-next';
        this.nextButton.innerHTML = '›';
        this.overlay.appendChild(this.nextButton);

        // Action buttons container
        this.actionsContainer = document.createElement('div');
        this.actionsContainer.className = 'gallery-actions';
        this.overlay.appendChild(this.actionsContainer);

        // Download button
        this.downloadButton = document.createElement('button');
        this.downloadButton.className = 'gallery-action';
        this.downloadButton.innerHTML = '<i>⬇️</i> Download';
        this.actionsContainer.appendChild(this.downloadButton);

        // Delete button
        this.deleteButton = document.createElement('button');
        this.deleteButton.className = 'gallery-action';
        this.deleteButton.innerHTML = '<i>🗑️</i> Delete';
        this.actionsContainer.appendChild(this.deleteButton);

        // Close button
        this.closeButton = document.createElement('button');
        this.closeButton.className = 'gallery-close';
        this.closeButton.innerHTML = '×';
        this.overlay.appendChild(this.closeButton);

        document.body.appendChild(this.overlay);

        // Event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.prevButton.addEventListener('click', () => this.showPrevious());
        this.nextButton.addEventListener('click', () => this.showNext());
        this.closeButton.addEventListener('click', () => this.close());
        this.downloadButton.addEventListener('click', () => this.downloadCurrentPhoto());
        this.deleteButton.addEventListener('click', () => this.deleteCurrentPhoto());

        // Close gallery when clicking outside the image
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.overlay.classList.contains('hidden')) {
                if (e.key === 'ArrowRight') {
                    this.showNext();
                } else if (e.key === 'ArrowLeft') {
                    this.showPrevious();
                } else if (e.key === 'Escape') {
                    this.close();
                }
            }
        });
    }

    open(photo, photos) {
        this.photos = photos;
        this.currentIndex = this.photos.findIndex(p => p.Key === photo.Key);
        if (this.currentIndex === -1) {
            console.error('Photo not found in the list.');
            return;
        }
        this.displayPhoto();
        this.overlay.classList.remove('hidden');
    }

    close() {
        this.overlay.classList.add('hidden');
    }

    showNext() {
        if (this.currentIndex < this.photos.length - 1) {
            this.currentIndex++;
            this.displayPhoto();
        }
    }

    showPrevious() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.displayPhoto();
        }
    }

    displayPhoto() {
        const photo = this.photos[this.currentIndex];
        if (!photo.url) {
            console.error(`URL not defined for photo key: ${photo.Key}`);
            this.image.src = '';
            this.image.alt = 'Image not available';
            return;
        }
        this.image.src = photo.url; // Use the decrypted Object URL
        this.image.alt = this.getFileName(photo.Key);
    }

    downloadCurrentPhoto() {
        const photo = this.photos[this.currentIndex];
        if (!photo.url) {
            console.error(`URL not defined for photo key: ${photo.Key}`);
            alert('Download failed: Photo URL is undefined.');
            return;
        }
        const a = document.createElement('a');
        a.href = photo.url;
        a.download = this.getFileName(photo.Key);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async deleteCurrentPhoto() {
        const photo = this.photos[this.currentIndex];
        if (confirm('Delete this photo?')) {
            try {
                await s3Client.deleteFile(photo.Key);
                this.photos.splice(this.currentIndex, 1);
                if (this.currentIndex >= this.photos.length) {
                    this.currentIndex = this.photos.length - 1;
                }
                if (this.photos.length > 0) {
                    this.displayPhoto();
                } else {
                    this.close();
                }
                // Remove the photo element from the grid
                const photoElement = document.querySelector(`[data-key='${photo.Key}']`);
                if (photoElement) {
                    photoElement.remove();
                }
            } catch (error) {
                console.error('Delete failed:', error);
                alert('Failed to delete photo');
            }
        }
    }

    getFileName(key) {
        return decodeURIComponent(key.split('-').slice(1).join('-'));
    }
}

export const galleryView = new GalleryView(); 