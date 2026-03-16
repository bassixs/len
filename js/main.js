import { initNavigation } from './modules/navigation.js';
import { initSliders } from './modules/sliders.js';
import { initAnimations } from './modules/animations.js';
import { initProductPage } from './modules/product.js';
import { initCatalog } from './modules/catalog.js';
import { initCategoryProducts } from './modules/category-products.js';
import { initForms } from './modules/forms.js';
import { initCart } from './modules/cart.js';
import { initProductCards } from './modules/product-cards.js';

// Initialize all modules when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCart();
    if (document.getElementById('productGallery')) initProductPage();
    if (document.getElementById('productsSlider')) initSliders();
    if (document.querySelector('.reveal')) initAnimations();
    if (document.querySelector('.catalog-grid')) initCatalog();
    if (document.getElementById('categoryGrid')) initCategoryProducts();
    if (document.querySelector('.product-card')) initProductCards();
    initForms();
});
