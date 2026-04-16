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

function editReview(id) {
    document.getElementById('text-' + id).classList.add('d-none');
    document.getElementById('form-' + id).classList.remove('d-none');
}

function editReply(id) {
    document.getElementById('reply-text-' + id).classList.add('d-none');
    document.getElementById('reply-form-' + id).classList.remove('d-none');
}