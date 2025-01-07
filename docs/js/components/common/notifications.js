import { DOMUtils } from '../../utils/dom-utils.js';

export class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        document.body.appendChild(this.container);
    }

    createContainer() {
        const container = DOMUtils.createElement('div', 'notification-container');
        return container;
    }

    show(message, type = 'info', duration = 3000) {
        const notification = DOMUtils.createElement('div', `notification notification-${type}`);
        
        const icon = this.getIcon(type);
        const content = DOMUtils.createElement('div', 'notification-content');
        content.textContent = message;
        
        notification.appendChild(icon);
        notification.appendChild(content);
        
        const closeBtn = DOMUtils.createElement('button', 'notification-close');
        closeBtn.appendChild(DOMUtils.createIcon('close'));
        closeBtn.onclick = () => this.hide(notification);
        notification.appendChild(closeBtn);
        
        this.container.appendChild(notification);
        
        // Trigger animation
        requestAnimationFrame(() => notification.classList.add('show'));
        
        if (duration > 0) {
            setTimeout(() => this.hide(notification), duration);
        }
        
        return notification;
    }

    async hide(notification) {
        notification.classList.remove('show');
        await DOMUtils.fadeOut(notification);
        notification.remove();
    }

    getIcon(type) {
        const icons = {
            success: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>',
            error: '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>',
            info: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
            warning: '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>'
        };
        
        const span = DOMUtils.createElement('span', 'notification-icon');
        span.innerHTML = icons[type] || icons.info;
        return span;
    }
}

export const notifications = new NotificationSystem(); 