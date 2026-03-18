import { describe, it, expect } from 'vitest';

/**
 * Smoke tests: make sure module init functions don't throw
 * on an empty / minimal DOM (no matching elements).
 */

describe('smoke – modules init on empty DOM', () => {
    it('initNavigation does not throw', async () => {
        const { initNavigation } = await import('../navigation.js');
        expect(() => initNavigation()).not.toThrow();
    });

    it('initSliders does not throw', async () => {
        const { initSliders } = await import('../sliders.js');
        expect(() => initSliders()).not.toThrow();
    });

    it('initCatalog does not throw', async () => {
        const { initCatalog } = await import('../catalog.js');
        expect(() => initCatalog()).not.toThrow();
    });

    it('initForms does not throw', async () => {
        const { initForms } = await import('../forms.js');
        expect(() => initForms()).not.toThrow();
    });

    it('initCart does not throw', async () => {
        const { initCart } = await import('../cart.js');
        expect(() => initCart()).not.toThrow();
    });

    it('initProductPage does not throw', async () => {
        const { initProductPage } = await import('../product.js');
        expect(() => initProductPage()).not.toThrow();
    });

    it('initCategoryProducts does not throw', async () => {
        const { initCategoryProducts } = await import('../category-products.js');
        expect(() => initCategoryProducts()).not.toThrow();
    });
});
