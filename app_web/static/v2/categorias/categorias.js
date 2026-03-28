$(document).ready(function () {
    let currentPage = 1;
    let searchTimer;

    // --- CARGA INICIAL ---
    loadCategories();

    // --- EVENTOS DE INTERFAZ ---

    // Buscador con delay para no saturar el servidor
    $('#category-search').on('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
            currentPage = 1;
            loadCategories();
        }, 500);
    });

    // Limpiar filtros
    $('#btn-clear-filters').on('click', function () {
        $('#category-search').val('');
        currentPage = 1;
        loadCategories();
    });

    // Paginación
    $('#prev-page').on('click', function () {
        if (currentPage > 1) {
            currentPage--;
            loadCategories();
        }
    });

    $('#next-page').on('click', function () {
        currentPage++;
        loadCategories();
    });

    // --- FUNCIONES DE MODAL (NUEVO / EDITAR) ---

    // Preparar el modal para una NUEVA categoría (Limpio)
    window.prepareNewCategory = function () {
        $('#category-form')[0].reset();
        $('#category-id').val(''); // IMPORTANTE: ID vacío para que sea POST
        $('#cat-name').val('');
        $('#cat-description').val('');

        // Ajustar textos del modal
        $('#modalCategory .modal-title').html('<i class="fas fa-tag me-2 text-danger"></i> Nueva Categoría');
        $('#modalCategory button[type="submit"]').text('Guardar Categoría');

        $('#modalCategory').modal('show');
    };

    // Preparar el modal para EDITAR (Con datos)
    window.editCategory = function (id, name, description) {
        $('#category-id').val(id);
        $('#cat-name').val(name);
        $('#cat-description').val(description);

        // Ajustar textos del modal
        $('#modalCategory .modal-title').html('<i class="fas fa-edit me-2 text-warning"></i> Editar Categoría');
        $('#modalCategory button[type="submit"]').text('Actualizar Cambios');

        $('#modalCategory').modal('show');
    };

    // --- LOGICA DE PERSISTENCIA (GUARDAR) ---
    $('#category-form').on('submit', function (e) {
        e.preventDefault();

        const id = $('#category-id').val();
        const data = {
            name: $('#cat-name').val(),
            description: $('#cat-description').val()
        };

        // Si hay ID es PUT (editar), si no hay ID es POST (crear)
        const type = id ? 'PUT' : 'POST';
        const url = id ? `/api/categories/${id}/` : '/api/categories/';

        $.ajax({
            url: url,
            type: type,
            data: JSON.stringify(data),
            contentType: 'application/json',
            headers: {"X-CSRFToken": getCookie('csrftoken')},
            success: function () {
                $('#modalCategory').modal('hide');
                showToast("Categoría guardada correctamente", "bg-success");
                loadCategories();
            },
            error: function (xhr) {
                showToast("Error al procesar la solicitud", "bg-danger");
            }
        });
    });

    // --- CARGA DE DATOS ---

    function loadCategories() {
        const search = $('#category-search').val() || '';
        const url = `/api/categories/?page=${currentPage}&search=${search}`;

        $.ajax({
            url: url,
            type: 'GET',
            success: function (response) {
                // Detectar si la respuesta es paginada (.results) o lista directa
                const categories = response.results ? response.results : response;

                renderTable(categories);
                updatePagination(response);
                $('#page-loader').addClass('loader-hidden');
            },
            error: function () {
                showToast("Error al conectar con el servidor", "bg-danger");
                $('#page-loader').addClass('loader-hidden');
            }
        });
    }

    function renderTable(categories) {
        const tbody = $('#category-table-body');
        tbody.empty();

        if (!categories || categories.length === 0) {
            tbody.append('<tr><td colspan="4" class="text-center py-4 text-muted">No hay categorías registradas.</td></tr>');
            return;
        }

        categories.forEach(cat => {
            tbody.append(`
                <tr>
                    <td class="ps-4 fw-bold">${cat.name}</td>
                    <td class="text-muted small">${cat.description || 'Sin descripción'}</td>
                    <td class="text-center">
                        <span class="badge bg-success-subtle text-success border border-success-subtle px-3" style="font-size:0.7rem">ACTIVO</span>
                    </td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-dark me-1" onclick="editCategory(${cat.id}, '${cat.name}', '${cat.description || ''}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${cat.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    }

    window.deleteCategory = function (id) {
        if (confirm("¿Seguro que deseas eliminar esta categoría? Esto podría afectar a los productos asociados.")) {
            $.ajax({
                url: `/api/categories/${id}/`,
                type: 'DELETE',
                headers: {"X-CSRFToken": getCookie('csrftoken')},
                success: function () {
                    showToast("Categoría eliminada", "bg-dark");
                    loadCategories();
                }
            });
        }
    };

    // --- UTILIDADES ---

    function updatePagination(response) {
        // Manejo dinámico con o sin paginación de DRF
        if (Array.isArray(response)) {
            $('#total-count').text(response.length);
            $('#current-count').text(response.length);
            $('#prev-page').prop('disabled', true);
            $('#next-page').prop('disabled', true);
        } else {
            $('#total-count').text(response.count || 0);
            $('#current-count').text(response.results ? response.results.length : 0);
            $('#prev-page').prop('disabled', !response.previous);
            $('#next-page').prop('disabled', !response.next);
        }
    }

    function showToast(message, bgColor) {
        const toastEl = $('#liveToast');
        toastEl.removeClass('bg-success bg-danger bg-dark').addClass(bgColor);
        $('#toast-message').text(message);
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }

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
});