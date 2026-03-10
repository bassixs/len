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
            btn.style.opacity = '0.7';

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.opacity = '';
                contactForm.reset();
            }, 3000);
        });
    }

    // ===== MODAL LOGIC =====
    const callModal = document.getElementById('callModal');
    const callModalClose = document.getElementById('callModalClose');
    const callModalOverlay = document.getElementById('callModalOverlay');

    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
        link.addEventListener('click', (e) => {
            if (window.innerWidth > 768) {
                e.preventDefault();
                if (callModal) {
                    callModal.classList.add('open');
                    document.body.style.overflow = 'hidden';
                }
            }
        });
    });

    function closeModal() {
        if (callModal) {
            callModal.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    if (callModalClose) callModalClose.addEventListener('click', closeModal);
    if (callModalOverlay) callModalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

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
    const faqQuestions = document.querySelectorAll('.faq-question');

    if (faqQuestions.length > 0) {
        faqQuestions.forEach(question => {
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                const isActive = question.classList.contains('active');

                // Close all others
                document.querySelectorAll('.faq-question').forEach(q => {
                    q.classList.remove('active');
                    q.nextElementSibling.style.maxHeight = null;
                });

                // Toggle current
                if (!isActive) {
                    question.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + "px";
                }
            });
        });
    }
}
