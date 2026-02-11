document.addEventListener('DOMContentLoaded', function() {
    const slider = document.querySelector('.vertical-slider');
    const track = document.querySelector('.slider-track');

    if (!track || !slider) return;

    const slides = Array.from(track.children);
    const firstSetHeight = track.scrollHeight;

    slides.forEach(slide => track.appendChild(slide.cloneNode(true)));

    let y = 0;
    const speed = 0.3;

    function animate() {
        y += speed;
        if (y >= firstSetHeight) y = 0;
        track.style.transform = `translateY(-${y}px)`;
        requestAnimationFrame(animate);
    }

    animate();
});