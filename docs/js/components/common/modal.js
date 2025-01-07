import { DOMUtils } from '../../utils/dom-utils.js';

export class Modal {
    constructor(options = {}) {
        this.options = {
            title: options.title || '',
            content: options.content || '',
            closable: options.closable !== false,
            onClose: options.onClose || (() => {}),
            className: options.className || ''
        };
        
        this.element = null;
        this.create();
    }

    create() {
        this.element = DOMUtils.createElement('div', `modal ${this.options.className}`);
        
        const dialog = DOMUtils.createElement('div', 'modal-dialog');
        
        const header = this.createHeader();
        const content = this.createContent();
        
        dialog.appendChild(header);
        dialog.appendChild(content);
        this.element.appendChild(dialog);
        
        if (this.options.closable) {
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) {
                    this.close();
                }
            });
        }
    }

    createHeader() {
        const header = DOMUtils.createElement('div', 'modal-header');
        
        const title = DOMUtils.createElement('h2', 'modal-title');
        title.textContent = this.options.title;
        header.appendChild(title);
        
        if (this.options.closable) {
            const closeBtn = DOMUtils.createElement('button', 'modal-close');
            closeBtn.appendChild(DOMUtils.createIcon('close'));
            closeBtn.addEventListener('click', () => this.close());
            header.appendChild(closeBtn);
        }
        
        return header;
    }

    createContent() {
        const content = DOMUtils.createElement('div', 'modal-content');
        if (typeof this.options.content === 'string') {
            content.innerHTML = this.options.content;
        } else if (this.options.content instanceof Node) {
            content.appendChild(this.options.content);
        }
        return content;
    }

    show() {
        document.body.appendChild(this.element);
        document.body.style.overflow = 'hidden';
        setTimeout(() => this.element.classList.add('show'), 10);
    }

    async close() {
        this.element.classList.remove('show');
        await DOMUtils.fadeOut(this.element);
        this.element.remove();
        document.body.style.overflow = '';
        this.options.onClose();
    }

    setContent(content) {
        const contentEl = this.element.querySelector('.modal-content');
        contentEl.innerHTML = '';
        if (typeof content === 'string') {
            contentEl.innerHTML = content;
        } else if (content instanceof Node) {
            contentEl.appendChild(content);
        }
    }
} 