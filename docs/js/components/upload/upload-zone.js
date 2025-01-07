export class UploadZone {
    constructor(selector, onUpload) {
        this.element = document.querySelector(selector);
        this.onUpload = onUpload;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.element.addEventListener('dragover', this.handleDragOver.bind(this));
        this.element.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.element.addEventListener('drop', this.handleDrop.bind(this));
        
        const fileInput = this.element.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        this.element.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.element.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.element.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length) {
            this.handleFiles(files);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length) {
            this.handleFiles(files);
        }
    }

    async handleFiles(files) {
        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );

        if (imageFiles.length === 0) {
            alert('Please select image files only');
            return;
        }

        this.onUpload(imageFiles);
    }

    showProgress(progress) {
        if (!this.progressBar) {
            this.progressBar = document.createElement('div');
            this.progressBar.className = 'upload-progress';
            
            this.progressInner = document.createElement('div');
            this.progressBar.appendChild(this.progressInner);
            
            this.element.appendChild(this.progressBar);
        }

        this.progressInner.style.width = `${progress}%`;
        
        if (progress === 100) {
            setTimeout(() => this.resetProgress(), 1000);
        }
    }

    resetProgress() {
        if (this.progressBar && this.progressBar.parentNode) {
            this.progressBar.parentNode.removeChild(this.progressBar);
            this.progressBar = null;
        }
    }
} 