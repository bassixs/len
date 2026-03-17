import { openLayer, closeLayer } from './ui-shell.js';
import { initAccordionGroup } from './accordion.js';

export function initForms() {
    // ===== CONTACT FORM HANDLER =====
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Отправлено!';
            btn.disabled = true;
            btn.classList.add('btn--submitting');

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.classList.remove('btn--submitting');
                contactForm.reset();
            }, 3000);
        });
    }

    // ===== MODAL LOGIC =====
    const callModal = document.getElementById('callModal');
    const callModalClose = document.getElementById('callModalClose');
    const callModalOverlay = document.getElementById('callModalOverlay');

    document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            if (window.innerWidth > 768) {
                e.preventDefault();
                if (callModal) {
                    openLayer('#callModal');
                }
            }
        });
    });

    function closeModal() {
        if (callModal) {
            closeLayer('#callModal');
        }
    }

    if (callModalClose) callModalClose.addEventListener('click', closeModal);
    if (callModalOverlay) callModalOverlay.addEventListener('click', closeModal);

    const callFormHero = document.getElementById('callFormHero');
    if (callFormHero) {
        callFormHero.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = callFormHero.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Принято!';
            btn.disabled = true;
            setTimeout(() => {
                closeModal();
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    callFormHero.reset();
                }, 300);
            }, 1500);
        });
    }

    // ===== FAQ ACCORDION =====
    initAccordionGroup({
        triggerSelector: '.faq-question',
        triggerActiveClass: 'active',
        bodyOpenClass: 'open',
        closeOthers: true,
    });
}
