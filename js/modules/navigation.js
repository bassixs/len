export function initNavigation() {
    const header = document.getElementById('header');
    const burger = document.getElementById('burger');
    const nav = document.getElementById('nav');
    const heroSection = document.getElementById('hero');

    if (!header || !burger || !nav) return;

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
    // Close mega menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-item-dropdown')) {
            const dropdown = document.querySelector('.nav-item-dropdown.active');
            if (dropdown) dropdown.classList.remove('active');
        }
    });

    highlightActiveLink();
}

function highlightActiveLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav a:not(.nav-link-dropdown)');
    
    // Check main links
    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname;
        if (currentPath === linkPath || (currentPath === '/' && linkPath.endsWith('index.html'))) {
            // Check if it's explicitly not just base URL due to query params
            if (window.location.search) {
               // Ignore exact match if url has query params for category, we'll handle that differently if needed
               // but for simple top level links it's fine.
            }
            link.classList.add('active');
        }
    });

    // We can also highlight dropdown parent if we are on a category page
    if (currentPath.includes('catalog.html') || currentPath.includes('category.html') || currentPath.includes('product.html')) {
         const dropdownLink = document.querySelector('.nav-link-dropdown');
         if (dropdownLink) dropdownLink.classList.add('active');
    }
}
