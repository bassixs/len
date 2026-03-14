import { initNavigation } from './modules/navigation.js';
import { initSliders } from './modules/sliders.js';
import { initAnimations } from './modules/animations.js';
import { initProductPage } from './modules/product.js';
import { initCatalog } from './modules/catalog.js';
import { initForms } from './modules/forms.js';
import { initCart } from './modules/cart.js';

// Initialize all modules when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSliders();
    initAnimations();
    initProductPage();
    initCatalog();
    initForms();
    initCart();
});
