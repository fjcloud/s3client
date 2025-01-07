export class Spinner {
    constructor(parent, options = {}) {
        this.options = {
            size: options.size || 40,
            color: options.color || '#ffffff',
            thickness: options.thickness || 3,
            ...options
        };
        
        this.element = this.create();
        if (parent) {
            parent.appendChild(this.element);
        }
    }

    create() {
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        spinner.style.cssText = `
            width: ${this.options.size}px;
            height: ${this.options.size}px;
            border: ${this.options.thickness}px solid rgba(255, 255, 255, 0.1);
            border-top-color: ${this.options.color};
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;
        return spinner;
    }

    show() {
        this.element.style.display = 'block';
    }

    hide() {
        this.element.style.display = 'none';
    }

    remove() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
} 