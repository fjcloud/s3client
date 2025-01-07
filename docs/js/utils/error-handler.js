import { eventBus } from './event-bus.js';

export class ErrorHandler {
    static handle(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        let message = 'An error occurred';
        if (error.response) {
            message = this.handleAPIError(error);
        } else if (error instanceof TypeError) {
            message = 'Network error. Please check your connection.';
        } else if (error.message) {
            message = error.message;
        }

        eventBus.emit('error', { message, context });
        this.showErrorToast(message);
    }

    static handleAPIError(error) {
        const status = error.response.status;
        switch (status) {
            case 401:
                return 'Authentication failed. Please check your credentials.';
            case 403:
                return 'You don\'t have permission to perform this action.';
            case 404:
                return 'The requested resource was not found.';
            case 429:
                return 'Too many requests. Please try again later.';
            case 500:
                return 'Server error. Please try again later.';
            default:
                return `Error: ${error.response.data.message || 'Unknown error'}`;
        }
    }

    static showErrorToast(message) {
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 100);
    }
} 