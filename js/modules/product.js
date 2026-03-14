export function initProductPage() {
    // Accordion Logic
    const accordions = document.querySelectorAll('.accordion-head');
    accordions.forEach(acc => {
        acc.addEventListener('click', function() {
            // Toggle active class on header
            this.classList.toggle('active');
            
            // Toggle open class on body
            const body = this.nextElementSibling;
            if (this.classList.contains('active')) {
                body.classList.add('open');
            } else {
                body.classList.remove('open');
            }
        });
    });

    // Color Selector UI Logic
    const colorOptions = document.querySelectorAll('.color-dot');
    const colorNameDisplay = document.getElementById('colorName');
    
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active from all
            colorOptions.forEach(btn => btn.classList.remove('active'));
            // Add active to clicked
            this.classList.add('active');
            // Update Text
            if (colorNameDisplay) {
                colorNameDisplay.textContent = this.dataset.color || '';
            }
        });
    });

    // Size Selector UI Logic
    const sizeBtns = document.querySelectorAll('.size-btn');
    sizeBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); // In case it's in a form
            // Remove active from all
            sizeBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            this.classList.add('active');
        });
    });

    // Quantity Logic
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    const qtyInput = document.getElementById('qtyInput');

    if (qtyMinus && qtyPlus && qtyInput) {
        qtyMinus.addEventListener('click', (e) => {
            e.preventDefault();
            let val = parseInt(qtyInput.value) || 1;
            if (val > 1) qtyInput.value = val - 1;
        });

        qtyPlus.addEventListener('click', (e) => {
            e.preventDefault();
            let val = parseInt(qtyInput.value) || 1;
            if (val < parseInt(qtyInput.max || 10)) qtyInput.value = val + 1;
        });
    }
}
