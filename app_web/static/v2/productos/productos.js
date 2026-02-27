// inventory.js

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
});

const fetchProducts = async (url = '/api/products/') => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error en la red');

        const data = await response.json(); // Ahora data tiene {results, next, previous, count}

        renderTable(data.results); // Enviamos solo la lista a la tabla
        setupPagination(data);      // Configuramos los botones
    } catch (error) {
        console.error('Error al obtener productos:', error);
    }
};

const setupPagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    const totalSpan = document.getElementById('total-count');
    const currentSpan = document.getElementById('current-count');

    totalSpan.innerText = data.count;
    currentSpan.innerText = data.results.length;

    // Configurar botón Siguiente
    if (data.next) {
        nextBtn.disabled = false;
        nextBtn.onclick = () => fetchProducts(data.next);
    } else {
        nextBtn.disabled = true;
    }

    // Configurar botón Anterior
    if (data.previous) {
        prevBtn.disabled = false;
        prevBtn.onclick = () => fetchProducts(data.previous);
    } else {
        prevBtn.disabled = true;
    }
};

const renderTable = (products) => {
    const tableBody = document.querySelector('#product-table-body');
    let html = '';

    products.forEach(product => {
        html += `
            <tr>
                <td class="small fw-bold text-muted">${product.code}</td>
                <td>
                    <div class="fw-bold">${product.name}</div>
                    <small class="text-secondary">${product.brand_name || 'Sin Marca'}</small>
                </td>
                <td><span class="badge bg-dark">${product.category_name}</span></td>
                <td class="text-center">${product.initial_stock}</td>
                <td class="fw-bold text-danger">S/ ${parseFloat(product.unit_price).toFixed(2)}</td>
                <td class="text-center">
                    <i class="fa-solid fa-circle ${product.status ? 'text-success' : 'text-danger'}"></i>
                </td>
                <td class="text-end pe-3">
            <button class="btn btn-sm btn-outline-dark me-1" onclick="editProduct(${product.id})">
                <i class="fas fa-pen"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${product.id})">
                <i class="fas fa-trash"></i>
            </button>
        </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
};

// Función para cargar categorías y marcas al abrir el modal o cargar la página
const loadLookups = async () => {
    try {
        const [catRes, brandRes] = await Promise.all([
            fetch('/api/categories/'),
            fetch('/api/brands/')
        ]);

        const categories = await catRes.json();
        const brands = await brandRes.json();

        // --- POBLAR CATEGORÍAS ---
        const catSelectModal = document.getElementById('category');        // Select del Modal
        const catSelectFilter = document.getElementById('filter-category'); // Select del Filtro

        let catOptions = '<option value="">Seleccione Categoría...</option>';
        categories.forEach(cat => {
            catOptions += `<option value="${cat.id}">${cat.name}</option>`;
        });

        if (catSelectModal) catSelectModal.innerHTML = catOptions;
        if (catSelectFilter) catSelectFilter.innerHTML = '<option value="">Todas las Categorías</option>' + catOptions.replace('<option value="">Seleccione Categoría...</option>', '');

        // --- POBLAR MARCAS ---
        const brandSelectModal = document.getElementById('brand');        // Select del Modal
        const brandSelectFilter = document.getElementById('filter-brand'); // Select del Filtro

        let brandOptions = '<option value="">Seleccione Marca...</option>';
        brands.forEach(brand => {
            brandOptions += `<option value="${brand.id}">${brand.name}</option>`;
        });

        if (brandSelectModal) brandSelectModal.innerHTML = brandOptions;
        if (brandSelectFilter) brandSelectFilter.innerHTML = '<option value="">Todas las Marcas</option>' + brandOptions.replace('<option value="">Seleccione Marca...</option>', '');

    } catch (error) {
        console.error('Error cargando cat/marcas:', error);
    }
};

// Llamamos a la función cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    loadLookups();
    // ... tus otras funciones de fetchProducts ...
});

// Variable para el modal de Bootstrap
let productModal;
let deleteModal;
let idParaEliminar = null;

document.addEventListener('DOMContentLoaded', () => {
    productModal = new bootstrap.Modal(document.getElementById('modalProduct'));

    const productForm = document.getElementById('product-form');
    productForm.addEventListener('submit', saveProduct);

    // Escuchar cuando se abre el modal para "Nuevo"
    const btnNew = document.querySelector('[data-bs-target="#modalProduct"]');
    btnNew.addEventListener('click', () => {
        document.getElementById('product-form').reset();
        document.getElementById('product-id').value = ''; // Limpiar ID oculto
        document.getElementById('form-title').innerText = 'Registrar Producto';
        document.getElementById('code').value = 'AUTO-GENERADO';
    });
});

const saveProduct = async (e) => {
    e.preventDefault();

    const productId = document.getElementById('product-id').value;
    const isEdit = Boolean(productId);
    const url = isEdit ? `/api/products/${productId}/` : '/api/products/';
    const method = isEdit ? 'PUT' : 'POST';

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
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            // 1. Cerrar el modal
            productModal.hide();

            // 2. Limpiar el formulario para el siguiente registro
            document.getElementById('product-form').reset();
            document.getElementById('product-id').value = '';

            // 3. ¡LO MÁS IMPORTANTE!: Volver a cargar la lista
            // Esto dispara el GET /api/products/ y repuebla la tabla
            await fetchProducts();

            // 4. Feedback visual (Opcional: puedes usar Toast de Bootstrap)
            console.log(isEdit ? 'Producto actualizado' : 'Producto creado');
        } else {
            const errorData = await response.json();
            alert('Error al guardar: ' + JSON.stringify(errorData));
        }
    } catch (error) {
        console.error('Error en la comunicación con la API:', error);
    }
};

// Función auxiliar para obtener el token CSRF de Django
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

const editProduct = async (id) => {
    try {
        const response = await fetch(`/api/products/${id}/`);
        if (!response.ok) throw new Error('No se pudo obtener el producto');

        const product = await response.json();

        // 1. Cambiar el título del modal y el texto del botón
        document.getElementById('form-title').innerText = 'Editar Producto';
        document.getElementById('product-id').value = product.id; // ¡MUY IMPORTANTE!

        // 2. Rellenar los campos del formulario con los datos de la API
        document.getElementById('name').value = product.name;
        document.getElementById('code').value = product.code; // El código es readonly
        document.getElementById('description').value = product.description || '';
        document.getElementById('unit_price').value = product.unit_price;
        document.getElementById('category').value = product.category;
        document.getElementById('brand').value = product.brand || '';
        document.getElementById('unit_measure').value = product.unit_measure;
        document.getElementById('initial_stock').value = product.initial_stock;
        document.getElementById('status').checked = product.status;

        // 3. Abrir el modal manualmente
        productModal.show();

    } catch (error) {
        console.error('Error al cargar datos para edición:', error);
        alert('Ocurrió un error al cargar los datos del lente.');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar modales de Bootstrap
    productModal = new bootstrap.Modal(document.getElementById('modalProduct'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Escuchar el clic en el botón "Sí, eliminar" del modal de confirmación
    const btnConfirmDelete = document.getElementById('confirmDelete');
    btnConfirmDelete.addEventListener('click', executeDelete);
});

/**
 * 1. Función que abre el modal de confirmación
 */
const deleteProduct = (id) => {
    idParaEliminar = id; // Guardamos el ID temporalmente
    deleteModal.show();  // Mostramos el modal de advertencia
};

/**
 * 2. Función que ejecuta el DELETE en la API
 */
const executeDelete = async () => {
    if (!idParaEliminar) return;

    try {
        const response = await fetch(`/api/products/${idParaEliminar}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken') // Token de seguridad de Django
            }
        });

        if (response.ok) {
            deleteModal.hide(); // Cerramos el modal
            await fetchProducts(); // Recargamos la tabla automáticamente
            console.log('Producto eliminado con éxito');
        } else {
            alert('No se pudo eliminar el producto. Verifique si tiene ventas asociadas.');
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
    } finally {
        idParaEliminar = null; // Limpiamos la variable
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Escuchar cambios en los filtros para recargar la tabla automáticamente
    document.getElementById('filter-search').addEventListener('input', debounce(() => applyFilters(), 500));
    document.getElementById('filter-category').addEventListener('change', () => applyFilters());
    document.getElementById('filter-brand').addEventListener('change', () => applyFilters());

    document.getElementById('btn-clear-filters').addEventListener('click', () => {
        document.getElementById('filter-search').value = '';
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-brand').value = '';
        applyFilters();
    });
});

const applyFilters = () => {
    const search = document.getElementById('filter-search').value;
    const category = document.getElementById('filter-category').value;
    const brand = document.getElementById('filter-brand').value;

    // Construir la URL con parámetros (Query Params)
    let url = new URL('/api/products/', window.location.origin);
    if (search) url.searchParams.append('search', search);
    if (category) url.searchParams.append('category', category);
    if (brand) url.searchParams.append('brand', brand);

    // Llamar a la función que ya teníamos de fetchProducts
    fetchProducts(url.toString());
};

// Función Debounce para no saturar la API mientras el usuario escribe
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}