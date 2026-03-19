import { describe, it, expect } from 'vitest';
import {
    addItem,
    removeItem,
    updateItemQuantity,
    cartSubtotal,
    getDeliveryCost,
    getCartTotals,
    getFreeDeliveryHint,
    makeCartKey,
} from '../cart-service.js';

const item = (overrides = {}) => ({
    id: 'p1',
    name: 'Shirt',
    price: 1000,
    quantity: 1,
    selectedSize: '',
    selectedColor: '',
    ...overrides,
    cartKey: makeCartKey({
        id: overrides.id ?? 'p1',
        selectedSize: overrides.selectedSize ?? '',
        selectedColor: overrides.selectedColor ?? '',
    }),
});

// ── addItem ─────────────────────────────────────────────────────────

describe('addItem', () => {
    it('adds a new product to an empty cart', () => {
        const cart = addItem([], item());
        expect(cart).toHaveLength(1);
        expect(cart[0].id).toBe('p1');
        expect(cart[0].quantity).toBe(1);
    });

    it('increments quantity for existing product with same size/color', () => {
        const cart = [item({ quantity: 2 })];
        addItem(cart, item());
        expect(cart[0].quantity).toBe(3);
    });

    it('treats different sizes as separate items', () => {
        const cart = [item({ selectedSize: 'S' })];
        addItem(cart, item({ selectedSize: 'M' }));
        expect(cart).toHaveLength(2);
    });

    it('treats different colors as separate items', () => {
        const cart = [item({ selectedColor: 'red' })];
        addItem(cart, item({ selectedColor: 'blue' }));
        expect(cart).toHaveLength(2);
    });
});

// ── removeItem ──────────────────────────────────────────────────────

describe('removeItem', () => {
    it('removes item by cartKey (product+size+color)', () => {
        const cart = [item(), item({ id: 'p2' })];
        const key = makeCartKey(item());
        const result = removeItem(cart, key);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('p2');
    });

    it('returns empty array when removing last item', () => {
        const key = makeCartKey(item());
        expect(removeItem([item()], key)).toEqual([]);
    });

    it('returns cart unchanged when id not found', () => {
        const cart = [item()];
        expect(removeItem(cart, 'nope')).toHaveLength(1);
    });

    it('does not remove other variants with same id', () => {
        const cart = [item({ selectedSize: 'S' }), item({ selectedSize: 'M' })];
        const keyToRemove = makeCartKey(item({ selectedSize: 'S' }));
        const result = removeItem(cart, keyToRemove);
        expect(result).toHaveLength(1);
        expect(result[0].selectedSize).toBe('M');
    });
});

// ── updateItemQuantity ──────────────────────────────────────────────

describe('updateItemQuantity', () => {
    it('updates quantity of matching item', () => {
        const cart = [item({ quantity: 1 })];
        const key = makeCartKey(item());
        const result = updateItemQuantity(cart, key, 5);
        expect(result[0].quantity).toBe(5);
    });

    it('removes item when quantity ≤ 0', () => {
        const cart = [item()];
        const key = makeCartKey(item());
        expect(updateItemQuantity(cart, key, 0)).toEqual([]);
        expect(updateItemQuantity([item()], key, -1)).toEqual([]);
    });
});

// ── cartSubtotal ────────────────────────────────────────────────────

describe('cartSubtotal', () => {
    it('sums price × quantity for all items', () => {
        const cart = [item({ price: 1000, quantity: 2 }), item({ id: 'p2', price: 500, quantity: 3 })];
        expect(cartSubtotal(cart)).toBe(3500);
    });

    it('returns 0 for empty cart', () => {
        expect(cartSubtotal([])).toBe(0);
    });
});

// ── getDeliveryCost ─────────────────────────────────────────────────

describe('getDeliveryCost', () => {
    const prices = { cdek: 350, post: 300, courier: 600 };

    it('returns base price for cdek under threshold', () => {
        expect(getDeliveryCost('cdek', 3000, prices)).toBe(350);
    });

    it('returns 0 for cdek at/above 5000', () => {
        expect(getDeliveryCost('cdek', 5000, prices)).toBe(0);
        expect(getDeliveryCost('cdek', 10000, prices)).toBe(0);
    });

    it('returns correct price for post', () => {
        expect(getDeliveryCost('post', 1000, prices)).toBe(300);
    });

    it('returns correct price for courier', () => {
        expect(getDeliveryCost('courier', 1000, prices)).toBe(600);
    });

    it('falls back to cdek price for unknown method', () => {
        expect(getDeliveryCost('pigeon', 1000, prices)).toBe(350);
    });
});

// ── getCartTotals ───────────────────────────────────────────────────

describe('getCartTotals', () => {
    const prices = { cdek: 350, post: 300, courier: 600 };

    it('computes subtotal, delivery, total, and itemsCount', () => {
        const cart = [item({ price: 2000, quantity: 3 })];
        const t = getCartTotals(cart, 'cdek', prices);
        expect(t.subtotal).toBe(6000);
        expect(t.delivery).toBe(0); // ≥ 5000 → free cdek
        expect(t.total).toBe(6000);
        expect(t.itemsCount).toBe(3);
    });

    it('returns zeros for empty cart', () => {
        const t = getCartTotals([], 'cdek', prices);
        expect(t.subtotal).toBe(0);
        expect(t.delivery).toBe(0);
        expect(t.total).toBe(0);
        expect(t.itemsCount).toBe(0);
    });

    it('includes delivery cost when below threshold', () => {
        const cart = [item({ price: 1000, quantity: 1 })];
        const t = getCartTotals(cart, 'cdek', prices);
        expect(t.delivery).toBe(350);
        expect(t.total).toBe(1350);
    });
});

// ── getFreeDeliveryHint ─────────────────────────────────────────────

describe('getFreeDeliveryHint', () => {
    it('not eligible when subtotal ≤ 0', () => {
        const h = getFreeDeliveryHint(0);
        expect(h.eligible).toBe(false);
        expect(h.remaining).toBe(5000);
        expect(h.progress).toBe(0);
    });

    it('eligible when subtotal ≥ threshold', () => {
        const h = getFreeDeliveryHint(5000);
        expect(h.eligible).toBe(true);
        expect(h.remaining).toBe(0);
        expect(h.progress).toBe(100);
    });

    it('calculates remaining and progress for mid-range', () => {
        const h = getFreeDeliveryHint(2500);
        expect(h.eligible).toBe(false);
        expect(h.remaining).toBe(2500);
        expect(h.progress).toBe(50);
    });

    it('rounds progress to nearest integer', () => {
        const h = getFreeDeliveryHint(3333);
        expect(h.progress).toBe(Math.round((3333 / 5000) * 100));
    });
});
