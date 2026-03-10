/* ==========================================
   VARIABLES GLOBALES Y COMPONENTES
   ========================================== */
let productModal;
let deleteModal;
let idParaEliminar = null;

// --- 1. Loader Global (Bloqueo total) ---
const showGlobalLoader = () => {
    const loader = document.getElementById('page-loader');
    if (loader) loader.classList.remove('loader-hidden');
};

const hideGlobalLoader = () => {
    const loader = document.getElementById('page-loader');
    if (loader) {
        setTimeout(() => loader.classList.add('loader-hidden'), 300);
    }
};

// --- 2. Loader Local (Solo para la tabla - Filtros) ---
const showTableLoading = () => {
    const tableContainer = document.querySelector('.table-responsive');
    if (tableContainer) {
        tableContainer.style.opacity = '0.5';
        tableContainer.style.pointerEvents = 'none';
        tableContainer.style.cursor = 'wait';
    }
};

const hideTableLoading = () => {
    const tableContainer = document.querySelector('.table-responsive');
    if (tableContainer) {
        tableContainer.style.opacity = '1';
        tableContainer.style.pointerEvents = 'auto';
        tableContainer.style.cursor = 'default';
    }
};

/* ==========================================
   INICIALIZACIÓN
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    productModal = new bootstrap.Modal(document.getElementById('modalProduct'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Carga inicial pesada: usamos Loader Global
    initInventory();

    // Filtros: usamos Loader Local (Opacidad)
    document.getElementById('filter-search').addEventListener('input', debounce(() => applyFilters(), 500));
    document.getElementById('filter-category').addEventListener('change', () => applyFilters());
    document.getElementById('filter-brand').addEventListener('change', () => applyFilters());

    document.getElementById('btn-clear-filters').addEventListener('click', () => {
        document.getElementById('filter-search').value = '';
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-brand').value = '';
        applyFilters();
    });

    document.getElementById('product-form').addEventListener('submit', saveProduct);
    document.getElementById('confirmDelete').addEventListener('click', executeDelete);

    // Resetear modal
    document.querySelector('[data-bs-target="#modalProduct"]')?.addEventListener('click', () => {
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = '';
        document.getElementById('form-title').innerText = 'Registrar Producto';
        document.getElementById('code').value = 'AUTO-GENERADO';
    });
});

const initInventory = async () => {
    showGlobalLoader();
    try {
        await Promise.all([fetchProducts(), loadLookups()]);
    } finally {
        hideGlobalLoader();
    }
};

/* ==========================================
   API: PRODUCTOS
   ========================================== */
const fetchProducts = async (url = '/api/products/') => {
    try {
        const response = await fetch(url);
        const data = await response.json();
        renderTable(data.results);
        setupPagination(data);
    } catch (error) {
        console.error('Error:', error);
    }
};

const renderTable = (products) => {
    const tableBody = document.querySelector('#product-table-body');
    if (!products?.length) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron productos</td></tr>`;
        return;
    }

    tableBody.innerHTML = products.map(p => `
        <tr>
            <td class="small fw-bold text-muted">${p.code}</td>
            <td>
                <div class="fw-bold">${p.name}</div>
                <small class="text-secondary">${p.brand_name || 'Sin Marca'}</small>
            </td>
            <td class="text-center"><span class="badge bg-dark">${p.category_name}</span></td>
            <td class="text-center">${p.initial_stock}</td>
            <td class="text-center fw-bold text-danger">S/ ${parseFloat(p.unit_price).toFixed(2)}</td>
            <td class="text-center"><i class="fa-solid fa-circle ${p.status ? 'text-success' : 'text-danger'}"></i></td>
            <td class="text-end pe-3">
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-dark" onclick="editProduct(${p.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`).join('');
};

/* ==========================================
   ACCIONES CRÍTICAS (USAN GLOBAL LOADER)
   ========================================== */
const saveProduct = async (e) => {
    e.preventDefault();
    showGlobalLoader(); // Bloqueo total para guardar

    const productId = document.getElementById('product-id').value;
    const isEdit = Boolean(productId);
    const url = isEdit ? `/api/products/${productId}/` : '/api/products/';

    const productData = {
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        unit_price: parseFloat(document.getElementById('unit_price').value),
        category: document.getElementById('category').value,
        brand: document.getElementById('brand').value || null,
        unit_measure: document.getElementById('unit_measure').value,
        initial_stock: parseInt(document.getElementById('initial_stock').value),
        status: document.getElementById('status').checked
    };

    try {
        const response = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            productModal.hide();
            await fetchProducts();
        } else {
            alert('Error al guardar');
        }
    } finally {
        hideGlobalLoader();
    }
};

const executeDelete = async () => {
    if (!idParaEliminar) return;
    showGlobalLoader();
    try {
        const response = await fetch(`/api/products/${idParaEliminar}/`, {
            method: 'DELETE',
            headers: {'X-CSRFToken': getCookie('csrftoken')}
        });
        if (response.ok) {
            deleteModal.hide();
            await fetchProducts();
        }
    } finally {
        idParaEliminar = null;
        hideGlobalLoader();
    }
};

/* ==========================================
   FILTROS Y PAGINACIÓN (USAN LOCAL LOADER)
   ========================================== */
const applyFilters = async () => {
    showTableLoading(); // Solo opacidad en la tabla

    const search = document.getElementById('filter-search').value;
    const category = document.getElementById('filter-category').value;
    const brand = document.getElementById('filter-brand').value;

    let url = new URL('/api/products/', window.location.origin);
    if (search) url.searchParams.append('search', search);
    if (category) url.searchParams.append('category', category);
    if (brand) url.searchParams.append('brand', brand);

    await fetchProducts(url.toString());
    hideTableLoading();
};

const setupPagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');

    document.getElementById('total-count').innerText = data.count;
    document.getElementById('current-count').innerText = data.results.length;

    nextBtn.onclick = async () => {
        if (data.next) {
            showTableLoading();
            await fetchProducts(data.next);
            hideTableLoading();
        }
    };
    prevBtn.onclick = async () => {
        if (data.previous) {
            showTableLoading();
            await fetchProducts(data.previous);
            hideTableLoading();
        }
    };
    nextBtn.disabled = !data.next;
    prevBtn.disabled = !data.previous;
};

/* ==========================================
   UTILIDADES
   ========================================== */
const loadLookups = async () => {
    const [catRes, brandRes] = await Promise.all([fetch('/api/categories/'), fetch('/api/brands/')]);
    const categories = await catRes.json();
    const brands = await brandRes.json();

    const catSelectModal = document.getElementById('category');
    const catSelectFilter = document.getElementById('filter-category');
    let catOptions = '<option value="">Seleccione Categoría...</option>';
    categories.forEach(c => catOptions += `<option value="${c.id}">${c.name}</option>`);
    catSelectModal.innerHTML = catOptions;
    catSelectFilter.innerHTML = '<option value="">Todas las Categorías</option>' + catOptions.replace('<option value="">Seleccione Categoría...</option>', '');

    const brandSelectModal = document.getElementById('brand');
    const brandSelectFilter = document.getElementById('filter-brand');
    let brandOptions = '<option value="">Seleccione Marca...</option>';
    brands.forEach(b => brandOptions += `<option value="${b.id}">${b.name}</option>`);
    brandSelectModal.innerHTML = brandOptions;
    brandSelectFilter.innerHTML = '<option value="">Todas las Marcas</option>' + brandOptions.replace('<option value="">Seleccione Marca...</option>', '');
};

const editProduct = async (id) => {
    showGlobalLoader();
    try {
        const response = await fetch(`/api/products/${id}/`);
        const p = await response.json();
        document.getElementById('form-title').innerText = 'Editar Producto';
        document.getElementById('product-id').value = p.id;
        document.getElementById('name').value = p.name;
        document.getElementById('code').value = p.code;
        document.getElementById('unit_price').value = p.unit_price;
        document.getElementById('category').value = p.category;
        document.getElementById('brand').value = p.brand || '';
        document.getElementById('initial_stock').value = p.initial_stock;
        document.getElementById('status').checked = p.status;
        productModal.show();
    } finally {
        hideGlobalLoader();
    }
};

const deleteProduct = (id) => {
    idParaEliminar = id;
    deleteModal.show();
};

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
}