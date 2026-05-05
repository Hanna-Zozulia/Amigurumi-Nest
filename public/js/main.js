document.addEventListener('DOMContentLoaded', function () {

    // ===== Vertical slider =====
    const slider = document.querySelector('.vertical-slider');
    const track = document.querySelector('.slider-track');

    if (track && slider) {

        const slides = Array.from(track.children);
        const firstSetHeight = track.scrollHeight;

        slides.forEach(slide => track.appendChild(slide.cloneNode(true)));

        let y = 0;
        const speed = 0.3;

        function animate() {
            y += speed;

            if (y >= firstSetHeight) {
                y = 0;
            }

            track.style.transform = `translateY(-${y}px)`;

            requestAnimationFrame(animate);
        }

        animate();
    }

    // ===== Search =====
    const searchInput = document.getElementById('searchInput');
    const productsContainer = document.getElementById('productsContainer');

    if (searchInput && productsContainer) {

        const defaultProductsHtml = productsContainer.innerHTML;

        searchInput.addEventListener('input', async () => {

            const query = searchInput.value.trim();

            if (!query) {
                productsContainer.innerHTML = defaultProductsHtml;
                return;
            }

            try {

                const response = await fetch(`/api/search?q=${query}`);
                const products = await response.json();

                if (products.length === 0) {

                    productsContainer.innerHTML = `
                        <div class="col-12">
                            <p class="text-muted text-center">
                                Ничего не найдено
                            </p>
                        </div>
                    `;

                    return;
                }

                productsContainer.innerHTML = products.map(product => `

                    <div class="col-12 col-sm-6 col-lg-4">

                        <div class="card h-100 shadow-sm">

                            <div class="position-relative">

                                ${product.isNew ? `
                                    <span class="position-absolute top-0 start-0 m-2 badge bg-danger px-3 py-2 shadow">
                                        ✨ Новинка
                                    </span>
                                ` : ''}

                                <a href="/product/${product.id}" class="catalog-image-link">

                                    <img src="${product.image}"
                                        class="card-img-top catalog-card-img"
                                        alt="${product.name}">

                                </a>

                            </div>

                            <div class="card-body d-flex flex-column">

                                <h5 class="card-title">
                                    ${product.name}
                                </h5>

                                <p class="text-muted mb-1">
                                    <b>Категория:</b>
                                    ${product.category?.name || ''}
                                </p>

                                <p class="small text-muted flex-grow-1">
                                    <b>Описание:</b>
                                    ${product.desc || ''}
                                </p>

                                <div class="d-flex justify-content-between align-items-center mt-auto">

                                    <span class="fw-bold">
                                        ${Number(product.price).toFixed(2)} €
                                    </span>

                                    <a href="/product/${product.id}"
                                    class="btn btn-primary btn-sm">
                                        Смотреть
                                    </a>

                                </div>

                            </div>

                        </div>

                    </div>

                `).join('');

            } catch (error) {

                console.error('Search error:', error);

            }

        });

    }

});

function editReview(id) {
    document.getElementById('text-' + id).classList.add('d-none');
    document.getElementById('form-' + id).classList.remove('d-none');
}

function editReply(id) {
    document.getElementById('reply-text-' + id).classList.add('d-none');
    document.getElementById('reply-form-' + id).classList.remove('d-none');
}