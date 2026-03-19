import { describe, it, expect } from 'vitest';
import { normalizeProduct, formatPrice, resolveImageUrl, safeText } from '../product-model.js';

// ── normalizeProduct ────────────────────────────────────────────────

describe('normalizeProduct', () => {
    it('returns sensible defaults for empty input', () => {
        const p = normalizeProduct();
        expect(p.id).toBe('');
        expect(p.name).toBe('');
        expect(p.price).toBe(0);
        expect(p.oldPrice).toBeNull();
        expect(p.badges).toEqual([]);
        expect(p.sizes).toEqual([]);
        expect(p.colors).toEqual([]);
    });

    it('coerces numeric strings to numbers', () => {
        const p = normalizeProduct({ price: '1500', oldPrice: '2000' });
        expect(p.price).toBe(1500);
        expect(p.oldPrice).toBe(2000);
    });

    it('handles non-finite price gracefully', () => {
        const p = normalizeProduct({ price: 'abc', oldPrice: NaN });
        expect(p.price).toBe(0);
        expect(p.oldPrice).toBeNull();
    });

    it('stringifies id and name', () => {
        const p = normalizeProduct({ id: 42, name: 123 });
        expect(p.id).toBe('42');
        expect(p.name).toBe('123');
    });

    it('normalizes arrays of badges / sizes / colors', () => {
        const p = normalizeProduct({
            badges: ['New', 'Sale'],
            sizes: ['S', 'M'],
            colors: ['#fff', '#000'],
        });
        expect(p.badges).toEqual(['New', 'Sale']);
        expect(p.sizes).toEqual(['S', 'M']);
        expect(p.colors).toEqual(['#fff', '#000']);
    });

    it('wraps non-array badges/sizes/colors into empty arrays', () => {
        const p = normalizeProduct({ badges: 'oops', sizes: null, colors: 42 });
        expect(p.badges).toEqual([]);
        expect(p.sizes).toEqual([]);
        expect(p.colors).toEqual([]);
    });
});

// ── formatPrice ─────────────────────────────────────────────────────

describe('formatPrice', () => {
    it('formats integer with rouble sign', () => {
        expect(formatPrice(1500)).toMatch(/1[\s\u00a0]?500\s?₽/);
    });

    it('formats zero', () => {
        expect(formatPrice(0)).toMatch(/0\s?₽/);
    });

    it('treats non-finite input as 0', () => {
        expect(formatPrice('abc')).toMatch(/0\s?₽/);
        expect(formatPrice(undefined)).toMatch(/0\s?₽/);
    });

    it('handles large numbers', () => {
        const result = formatPrice(12500);
        expect(result).toMatch(/12[\s\u00a0]?500\s?₽/);
    });
});

// ── resolveImageUrl ─────────────────────────────────────────────────

describe('resolveImageUrl', () => {
    it('returns fallback for empty/falsy image', () => {
        const url = resolveImageUrl('');
        expect(url).toContain('images/product.tablecloth.webp');
    });

    it('returns absolute URLs as-is', () => {
        const abs = 'https://example.com/photo.jpg';
        expect(resolveImageUrl(abs)).toBe(abs);
    });

    it('prepends base for relative paths', () => {
        const url = resolveImageUrl('images/foo.jpg');
        expect(url).toContain('images/foo.jpg');
        expect(url).not.toContain('//images');
    });

    it('strips leading slash from relative path', () => {
        const url = resolveImageUrl('/images/bar.jpg');
        expect(url).toContain('images/bar.jpg');
    });

    it('falls back for unsafe schemes', () => {
        expect(resolveImageUrl('javascript:alert(1)')).toContain('images/product.tablecloth.webp');
        expect(resolveImageUrl('data:image/svg+xml,<svg></svg>')).toContain(
            'images/product.tablecloth.webp'
        );
    });
});

// ── safeText ────────────────────────────────────────────────────────

describe('safeText', () => {
    it('returns empty string for null/undefined', () => {
        expect(safeText(null)).toBe('');
        expect(safeText(undefined)).toBe('');
    });

    it('escapes HTML entities', () => {
        expect(safeText('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;');
    });

    it('passes plain text through unchanged', () => {
        expect(safeText('hello world')).toBe('hello world');
    });

    it('escapes ampersand and quotes', () => {
        const result = safeText('a & "b"');
        expect(result).toContain('&amp;');
    });
});
