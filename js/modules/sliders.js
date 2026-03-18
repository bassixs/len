export function initSliders() {
    const productsSlider = document.getElementById('productsSlider');
    const sliderPrev = document.getElementById('sliderPrev');
    const sliderNext = document.getElementById('sliderNext');

    if (productsSlider && sliderPrev && sliderNext) {
        const scrollAmount = () => {
            const card = productsSlider.querySelector('.product-card');
            if (!card) return 300;
            return card.offsetWidth + 24; // card width + gap
        };

        sliderNext.addEventListener('click', () => {
            productsSlider.scrollBy({
                left: scrollAmount(),
                behavior: 'smooth',
            });
        });

        sliderPrev.addEventListener('click', () => {
            productsSlider.scrollBy({
                left: -scrollAmount(),
                behavior: 'smooth',
            });
        });

        // Touch/drag support for slider
        let isDown = false;
        let startX;
        let scrollLeft;

        productsSlider.addEventListener('mousedown', (e) => {
            isDown = true;
            productsSlider.classList.replace('slider--grab', 'slider--grabbing');
            startX = e.pageX - productsSlider.offsetLeft;
            scrollLeft = productsSlider.scrollLeft;
        });

        productsSlider.addEventListener('mouseleave', () => {
            isDown = false;
            productsSlider.classList.replace('slider--grabbing', 'slider--grab');
        });

        productsSlider.addEventListener('mouseup', () => {
            isDown = false;
            productsSlider.classList.replace('slider--grabbing', 'slider--grab');
        });

        productsSlider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - productsSlider.offsetLeft;
            const walk = (x - startX) * 1.5;
            productsSlider.scrollLeft = scrollLeft - walk;
        });

        productsSlider.classList.add('slider--grab');
    }
}
