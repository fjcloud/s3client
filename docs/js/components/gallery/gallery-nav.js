export class GalleryNav {
    constructor(gallery) {
        this.gallery = gallery;
        this.currentIndex = 0;
        this.totalPhotos = 0;
    }

    initialize(currentIndex, totalPhotos) {
        this.currentIndex = currentIndex;
        this.totalPhotos = totalPhotos;
        this.updateNavigation();
    }

    createNavButtons() {
        return `
            <button class="gallery-nav prev" ${this.currentIndex === 0 ? 'disabled' : ''}>‹</button>
            <button class="gallery-nav next" ${this.currentIndex === this.totalPhotos - 1 ? 'disabled' : ''}>›</button>
        `;
    }

    updateNavigation() {
        const prevButton = this.gallery.element.querySelector('.gallery-nav.prev');
        const nextButton = this.gallery.element.querySelector('.gallery-nav.next');
        
        if (prevButton) prevButton.disabled = this.currentIndex === 0;
        if (nextButton) nextButton.disabled = this.currentIndex === this.totalPhotos - 1;
    }

    handleKeyPress(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.navigate(-1);
                break;
            case 'ArrowRight':
                this.navigate(1);
                break;
        }
    }

    navigate(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.totalPhotos) {
            this.currentIndex = newIndex;
            this.gallery.showPhoto(newIndex);
            this.updateNavigation();
        }
    }
} 