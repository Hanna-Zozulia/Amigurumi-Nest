let isSearchMode = false;
let searchQuery = '';

function normalizeImageSrc(value) {
    const raw = String(value || '').trim();

    if (!raw) {
        return '';
    }

    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) {
        return raw;
    }

    if (raw.startsWith('/')) {
        return raw;
    }

    if (raw.startsWith('img/')) {
        return `/${raw}`;
    }

    return `/img/${raw.replace(/^\/+/, '')}`;
}

document.addEventListener('DOMContentLoaded', function () {
    const slider = document.querySelector('.vertical-slider');
    const track = document.querySelector('.slider-track');

    if (track && slider) {
            async function loadSliderImages() {
                try {
                    const res = await fetch('/api/products');
                    const products = await res.json();

                    if (!Array.isArray(products)) return;

                    // очищаем текущий контент
                    track.innerHTML = '';

                    // добавляем картинки
                    products.forEach(product => {
                        if (!product.image) return;

                        const div = document.createElement('div');
                        div.className = 'toys-item';

                        div.innerHTML = `
                            <img src="${normalizeImageSrc(product.image)}" alt="${product.name}">
                        `;

                        track.appendChild(div);
                    });

                    // дублируем для бесконечной анимации
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

                } catch (err) {
                    console.error('Slider load error:', err);
                }
            }

            loadSliderImages();
        }

    const searchInput = document.getElementById('searchInput');
    const productsContainer = document.getElementById('productsContainer');
    const categoryForm = document.querySelector('form[action="/catalog"]');
    const categorySelect = categoryForm ? categoryForm.querySelector('select[name="filter"]') : null;

    if (!searchInput || !productsContainer) {
        return;
    }

    const defaultProductsHtml = productsContainer.innerHTML;

    searchInput.addEventListener('input', async () => {
        const query = String(searchInput.value || '').trim();
        searchQuery = query;
        isSearchMode = query.length > 0;

        if (!isSearchMode) {
            productsContainer.innerHTML = defaultProductsHtml;
            return;
        }

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const products = await response.json();

            if (!Array.isArray(products) || products.length === 0) {
                productsContainer.textContent = 'Ничего не найдено';
                return;
            }

            const rawHtml = products.map((product) => `
                <div class="col-12 col-sm-6 col-lg-4">
                    <div class="card h-100 shadow-sm">
                        <div class="position-relative">
                            ${product.isNew ? `
                                <span class="position-absolute top-0 start-0 m-2 badge bg-danger px-3 py-2 shadow">
                                    ✨ Новинка
                                </span>
                            ` : ''}
                            <a href="/product/${product.id}" class="catalog-image-link">
                                <img src="${normalizeImageSrc(product.image)}" class="card-img-top catalog-card-img" alt="${product.name}">
                            </a>
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${product.name}</h5>
                            <p class="text-muted mb-1"><b>Категория:</b> ${product.category?.name || ''}</p>
                            <p class="small text-muted flex-grow-1"><b>Описание:</b> ${product.desc || ''}</p>
                            <div class="d-flex justify-content-between align-items-center mt-auto">
                                <span class="fw-bold">${Number(product.price).toFixed(2)} €</span>
                                <a href="/product/${product.id}" class="btn btn-primary btn-sm">Смотреть</a>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            const safeHtml = (typeof DOMPurify !== 'undefined' && DOMPurify && DOMPurify.sanitize)
                ? DOMPurify.sanitize(rawHtml)
                : rawHtml;

            productsContainer.innerHTML = safeHtml;
        } catch (error) {
            console.error('Search error:', error);
        }
    });

    if (categoryForm) {
        categoryForm.addEventListener('submit', () => {
            searchInput.value = '';
            searchQuery = '';
            isSearchMode = false;
        });
    }

    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            searchInput.value = '';
            searchQuery = '';
            isSearchMode = false;

            const selected = String(categorySelect.value || '').trim();
            const nextUrl = selected
                ? `/catalog?filter=${encodeURIComponent(selected)}`
                : '/catalog';

            window.location.assign(nextUrl);
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

function bindImagePreview(fileInputId, previewImageId) {
    const fileInput = document.getElementById(fileInputId);
    const previewImage = document.getElementById(previewImageId);

    if (!fileInput || !previewImage) {
        return;
    }

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            previewImage.src = event.target.result;
            previewImage.classList.add('is-loaded');
        };
        reader.readAsDataURL(file);
    });
}

// Обработка основного изображения в форме продукта
bindImagePreview('image', 'imagePreview');

// Обработка дополнительного изображения в форме продукта
bindImagePreview('image2', 'imagePreview2');
