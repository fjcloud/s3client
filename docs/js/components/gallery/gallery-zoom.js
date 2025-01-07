export class GalleryZoom {
    constructor(container, image) {
        if (!container || !image) {
            return; // Don't initialize if we don't have valid elements
        }
        
        this.container = container;
        this.image = image;
        this.isZoomed = false;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.translateX = 0;
        this.translateY = 0;
        
        this.initialize();
    }

    initialize() {
        if (!this.container || !this.image) {
            return; // Skip initialization if elements are not valid
        }

        this.container.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        this.container.addEventListener('mousedown', this.startDragging.bind(this));
        this.container.addEventListener('mousemove', this.drag.bind(this));
        this.container.addEventListener('mouseup', this.stopDragging.bind(this));
        this.container.addEventListener('mouseleave', this.stopDragging.bind(this));
    }

    handleDoubleClick(e) {
        this.isZoomed = !this.isZoomed;
        this.container.classList.toggle('zoomed', this.isZoomed);
        
        if (!this.isZoomed) {
            this.resetPosition();
        } else {
            this.zoomAtPoint(e.clientX, e.clientY);
        }
    }

    zoomAtPoint(x, y) {
        const rect = this.image.getBoundingClientRect();
        const originX = x - rect.left;
        const originY = y - rect.top;
        this.container.style.transformOrigin = `${originX}px ${originY}px`;
    }

    startDragging(e) {
        if (!this.isZoomed) return;
        this.isDragging = true;
        this.startX = e.clientX - this.translateX;
        this.startY = e.clientY - this.translateY;
        this.container.style.transition = 'none';
    }

    drag(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        this.translateX = e.clientX - this.startX;
        this.translateY = e.clientY - this.startY;
        this.updatePosition();
    }

    stopDragging() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.container.style.transition = 'transform 0.3s ease';
    }

    updatePosition() {
        if (this.isZoomed) {
            this.container.style.transform = `scale(2) translate(${this.translateX}px, ${this.translateY}px)`;
        }
    }

    resetPosition() {
        this.translateX = 0;
        this.translateY = 0;
        this.container.style.transform = '';
        this.container.style.transformOrigin = 'center';
    }

    cleanup() {
        if (this.container) {
            this.container.removeEventListener('dblclick', this.handleDoubleClick);
            this.container.removeEventListener('mousedown', this.startDragging);
            this.container.removeEventListener('mousemove', this.drag);
            this.container.removeEventListener('mouseup', this.stopDragging);
            this.container.removeEventListener('mouseleave', this.stopDragging);
        }
    }
} 