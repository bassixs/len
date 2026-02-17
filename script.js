// ===== DOM ELEMENTS =====
const header = document.getElementById('header');
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
const heroSection = document.getElementById('hero');
const productsSlider = document.getElementById('productsSlider');
const sliderPrev = document.getElementById('sliderPrev');
const sliderNext = document.getElementById('sliderNext');

// ===== HEADER SCROLL BEHAVIOR =====
let lastScrollY = 0;

function handleScroll() {
    const scrollY = window.scrollY;
    const heroHeight = heroSection ? heroSection.offsetHeight : 0;

    // Add/remove scrolled class
    if (scrollY > 60) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    // Hero visible state for white text
    if (scrollY < heroHeight - 100) {
        header.classList.add('hero-visible');
    } else {
        header.classList.remove('hero-visible');
    }

    lastScrollY = scrollY;
}

window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll();

// ===== MOBILE MENU =====
burger.addEventListener('click', () => {
    burger.classList.toggle('active');
    nav.classList.toggle('mobile-open');
    document.body.style.overflow = nav.classList.contains('mobile-open') ? 'hidden' : '';
});

// Close mobile menu on link click
nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        burger.classList.remove('active');
        nav.classList.remove('mobile-open');
        document.body.style.overflow = '';
    });
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (!target) return;

        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    });
});

// ===== PRODUCTS SLIDER =====
if (productsSlider && sliderPrev && sliderNext) {
    const scrollAmount = () => {
        const card = productsSlider.querySelector('.product-card');
        if (!card) return 300;
        return card.offsetWidth + 24; // card width + gap
    };

    sliderNext.addEventListener('click', () => {
        productsSlider.scrollBy({
            left: scrollAmount(),
            behavior: 'smooth'
        });
    });

    sliderPrev.addEventListener('click', () => {
        productsSlider.scrollBy({
            left: -scrollAmount(),
            behavior: 'smooth'
        });
    });

    // Touch/drag support for slider
    let isDown = false;
    let startX;
    let scrollLeft;

    productsSlider.addEventListener('mousedown', (e) => {
        isDown = true;
        productsSlider.style.cursor = 'grabbing';
        startX = e.pageX - productsSlider.offsetLeft;
        scrollLeft = productsSlider.scrollLeft;
    });

    productsSlider.addEventListener('mouseleave', () => {
        isDown = false;
        productsSlider.style.cursor = 'grab';
    });

    productsSlider.addEventListener('mouseup', () => {
        isDown = false;
        productsSlider.style.cursor = 'grab';
    });

    productsSlider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - productsSlider.offsetLeft;
        const walk = (x - startX) * 1.5;
        productsSlider.scrollLeft = scrollLeft - walk;
    });

    productsSlider.style.cursor = 'grab';
}

// ===== INTERSECTION OBSERVER — REVEAL ANIMATIONS =====
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
});

revealElements.forEach(el => {
    revealObserver.observe(el);
});

// ===== PARALLAX HERO BACKGROUND =====
const heroBg = document.querySelector('.hero-bg');

function handleParallax() {
    if (!heroBg) return;
    const scrollY = window.scrollY;
    const heroHeight = heroSection ? heroSection.offsetHeight : 0;

    if (scrollY < heroHeight) {
        const parallaxOffset = scrollY * 0.4;
        heroBg.style.transform = `scale(1.05) translateY(${parallaxOffset}px)`;
    }
}

window.addEventListener('scroll', handleParallax, { passive: true });

// ===== COUNTER ANIMATION FOR "15+" BADGE =====
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * ease);

        element.textContent = current + '+';

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Observe the counter element
const counterEl = document.querySelector('.about-image-badge .big');
if (counterEl) {
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(counterEl, 15, 1500);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counterObserver.observe(counterEl);
}

// ===== PRELOAD IMAGES =====
function preloadImage(src) {
    const img = new Image();
    img.src = src;
}

// Preload hero and collection images after page load
window.addEventListener('load', () => {
    document.body.classList.add('loaded');

    // Preload collection images
    document.querySelectorAll('.collection-card-bg').forEach(bg => {
        const src = bg.style.backgroundImage.replace(/url\(['"]?/, '').replace(/['"]?\)/, '');
        if (src) preloadImage(src);
    });
});

// ===== KEYBOARD NAVIGATION =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        burger.classList.remove('active');
        nav.classList.remove('mobile-open');
        document.body.style.overflow = '';

        // Close mobile filter sidebar
        const sidebar = document.querySelector('.category-sidebar');
        if (sidebar) sidebar.classList.remove('mobile-open');
    }
});


// ===== PRODUCT PAGE — GALLERY =====
const mainImage = document.getElementById('mainImage');
const thumbs = document.querySelectorAll('.thumb');
const galleryPrev = document.getElementById('galleryPrev');
const galleryNext = document.getElementById('galleryNext');

if (mainImage && thumbs.length > 0) {
    let currentIndex = 0;
    const images = Array.from(thumbs).map(t => t.dataset.src);

    function setActiveThumb(index) {
        thumbs.forEach(t => t.classList.remove('active'));
        thumbs[index].classList.add('active');
        mainImage.src = images[index];
        currentIndex = index;
    }

    thumbs.forEach((thumb, i) => {
        thumb.addEventListener('click', () => setActiveThumb(i));
    });

    if (galleryPrev) {
        galleryPrev.addEventListener('click', () => {
            const prev = (currentIndex - 1 + images.length) % images.length;
            setActiveThumb(prev);
        });
    }

    if (galleryNext) {
        galleryNext.addEventListener('click', () => {
            const next = (currentIndex + 1) % images.length;
            setActiveThumb(next);
        });
    }
}


// ===== PRODUCT PAGE — TABS =====
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

if (tabBtns.length > 0) {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const panel = document.getElementById('tab-' + target);
            if (panel) panel.classList.add('active');
        });
    });
}


// ===== PRODUCT PAGE — COLOR SELECTOR =====
const colorInputs = document.querySelectorAll('.product-color input[type="radio"]');
const colorNameEl = document.getElementById('colorName');

const colorNames = {
    natural: 'Натуральный',
    olive: 'Оливковый',
    grey: 'Серый'
};

colorInputs.forEach(input => {
    input.addEventListener('change', () => {
        const label = input.closest('.product-color');
        document.querySelectorAll('.product-color').forEach(l => l.classList.remove('active'));
        if (label) label.classList.add('active');
        if (colorNameEl && colorNames[input.value]) {
            colorNameEl.textContent = colorNames[input.value];
        }
    });
});


// ===== PRODUCT PAGE — SIZE SELECTOR =====
const sizeInputs = document.querySelectorAll('.product-size input[type="radio"]');

sizeInputs.forEach(input => {
    input.addEventListener('change', () => {
        const label = input.closest('.product-size');
        document.querySelectorAll('.product-size').forEach(l => l.classList.remove('active'));
        if (label) label.classList.add('active');
    });
});


// ===== PRODUCT PAGE — QUANTITY =====
const qtyInput = document.getElementById('qtyInput');
const qtyMinus = document.getElementById('qtyMinus');
const qtyPlus = document.getElementById('qtyPlus');

if (qtyInput && qtyMinus && qtyPlus) {
    qtyMinus.addEventListener('click', () => {
        let val = parseInt(qtyInput.value) || 1;
        if (val > 1) qtyInput.value = val - 1;
    });

    qtyPlus.addEventListener('click', () => {
        let val = parseInt(qtyInput.value) || 1;
        if (val < 99) qtyInput.value = val + 1;
    });
}


// ===== CATEGORY PAGE — FILTER GROUPS =====
document.querySelectorAll('.filter-group-title').forEach(title => {
    title.addEventListener('click', () => {
        const body = title.nextElementSibling;
        if (body) body.classList.toggle('open');
        const icon = title.querySelector('i');
        if (icon) {
            icon.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
        }
    });
});

// Open first few filter groups by default
document.querySelectorAll('.filter-group-body').forEach((body, i) => {
    if (i < 3) body.classList.add('open');
});


// ===== CATEGORY PAGE — FILTER SIDEBAR MOBILE TOGGLE =====
const filterToggle = document.querySelector('.filter-toggle-btn');
const filterSidebar = document.querySelector('.category-sidebar');

if (filterToggle && filterSidebar) {
    filterToggle.addEventListener('click', () => {
        filterSidebar.classList.toggle('mobile-open');
        document.body.style.overflow = filterSidebar.classList.contains('mobile-open') ? 'hidden' : '';
    });
}


// ===== CATEGORY PAGE — VIEW TOGGLE =====
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});


// ===== CONTACT FORM HANDLER =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Отправлено!';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.style.opacity = '';
            contactForm.reset();
        }, 3000);
    });
}


// ===== ABOUT SECTION — SCROLL-DRIVEN ANIMATIONS =====
(function () {
    const aboutSection = document.querySelector('.about-scroll-container');
    const info = document.querySelector('.about-scroll-info');
    const features = document.querySelectorAll('.about-scroll-feature');

    if (!aboutSection) return;

    function handleAboutScroll() {
        const rect = aboutSection.getBoundingClientRect();
        const sectionHeight = aboutSection.offsetHeight;
        const viewportH = window.innerHeight;

        // Calculate scroll progress within the section (0 to 1)
        const scrolled = -rect.top;
        const scrollRange = sectionHeight - viewportH;
        const progress = Math.max(0, Math.min(1, scrolled / scrollRange));

        // Show info panel when entering section
        if (progress > 0.05) {
            info.classList.add('visible');
        } else {
            info.classList.remove('visible');
        }

        // Progressively show features
        features.forEach((feature, i) => {
            const threshold = 0.15 + (i * 0.2); // 0.15, 0.35, 0.55, 0.75
            if (progress > threshold) {
                feature.classList.add('visible');
                feature.style.transitionDelay = '0s';
            } else {
                feature.classList.remove('visible');
            }
        });
    }

    window.addEventListener('scroll', handleAboutScroll, { passive: true });
    handleAboutScroll(); // Initial check
})();
