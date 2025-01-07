import { s3Client } from '../../storage/s3-client.js';
import { PhotoItem } from './photo-item.js';
import { galleryView } from '../gallery/gallery-view.js';

export class PhotoGrid {
    constructor(selector) {
        this.container = document.querySelector(selector);
        this.photos = [];
        this.masonry = null;
        this.initializeMasonry();
    }

    initializeMasonry() {
        // Réinitialiser le contenu
        this.container.innerHTML = '<div class="grid-sizer"></div>';
        
        // Initialiser Masonry avec les bonnes options
        this.masonry = new Masonry(this.container, {
            itemSelector: '.photo-item',
            columnWidth: '.grid-sizer',
            percentPosition: true,
            gutter: 8,
            transitionDuration: '0.3s',
            initLayout: false, // Important: on attend que les images soient chargées
            stagger: 30 // Ajoute un délai entre l'apparition des éléments
        });

        // Écouter les événements de redimensionnement
        window.addEventListener('resize', () => {
            this.masonry.layout();
        });
    }

    async loadPhotos() {
        try {
            this.photos = await s3Client.listPhotos();

            if (this.photos.length === 0) {
                this.container.innerHTML = '<div class="empty">No photos available.</div>';
                return;
            }

            // Charger toutes les URLs en parallèle
            await Promise.all(this.photos.map(async (photo) => {
                try {
                    photo.url = await s3Client.getSignedUrl(photo.Key);
                } catch (error) {
                    console.error(`Failed to load URL for photo ${photo.Key}:`, error);
                    photo.url = null;
                }
            }));

            // Créer et ajouter les éléments photo
            const fragment = document.createDocumentFragment();
            for (const photo of this.photos) {
                if (!photo.url) continue;
                
                const photoItem = new PhotoItem(photo, this.photos);
                const photoElement = await photoItem.render();
                fragment.appendChild(photoElement);

                // Gérer le chargement des images
                imagesLoaded(photoElement, () => {
                    photoElement.classList.add('loaded');
                    this.masonry.layout();
                });
            }

            // Ajouter tous les éléments d'un coup
            this.container.appendChild(fragment);

            // Initialiser le layout une fois que toutes les images sont ajoutées
            this.masonry.reloadItems();
            this.masonry.layout();

        } catch (error) {
            console.error('Failed to load photos:', error);
            this.container.innerHTML = '<div class="error">Failed to load photos.</div>';
        }
    }
} 