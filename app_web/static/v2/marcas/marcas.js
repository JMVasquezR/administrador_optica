$(document).ready(function () {
    let currentPage = 1;
    let searchTimer;

    // --- CARGA INICIAL ---
    loadBrands();

    // --- EVENTOS DE INTERFAZ ---

    // Buscador con delay (Debounce)
    $('#brand-search').on('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
            currentPage = 1;
            loadBrands();
        }, 500);
    });

    // Limpiar filtros
    $('#btn-clear-filters').on('click', function () {
        $('#brand-search').val('');
        currentPage = 1;
        loadBrands();
    });

    // Paginación
    $('#prev-page').on('click', function () {
        if (currentPage > 1) {
            currentPage--;
            loadBrands();
        }
    });

    $('#next-page').on('click', function () {
        currentPage++;
        loadBrands();
    });

    // --- FUNCIONES DE MODAL (NUEVO / EDITAR) ---

    // Limpia el modal para una NUEVA marca
    window.prepareNewBrand = function () {
        $('#brand-form')[0].reset();
        $('#brand-id').val(''); // Vacío para que el backend sepa que es POST
        $('#brand-name').val('');
        $('#brand-description').val('');

        // Ajustar visual del modal
        $('#modalBrand .modal-title').html('<i class="fas fa-copyright me-2 text-danger"></i> Nueva Marca');
        $('#modalBrand button[type="submit"]').text('Guardar Marca');

        $('#modalBrand').modal('show');
    };

    // Carga datos en el modal para EDITAR
    window.editBrand = function (id, name, description) {
        $('#brand-id').val(id);
        $('#brand-name').val(name);
        $('#brand-description').val(description);

        // Ajustar visual del modal
        $('#modalBrand .modal-title').html('<i class="fas fa-edit me-2 text-warning"></i> Editar Marca');
        $('#modalBrand button[type="submit"]').text('Actualizar Cambios');

        $('#modalBrand').modal('show');
    };

    // --- GUARDAR DATOS (CREATE / UPDATE) ---
    $('#brand-form').on('submit', function (e) {
        e.preventDefault();

        const id = $('#brand-id').val();
        const data = {
            name: $('#brand-name').val(),
            description: $('#brand-description').val()
        };

        const type = id ? 'PUT' : 'POST';
        const url = id ? `/api/brands/${id}/` : '/api/brands/';

        $.ajax({
            url: url,
            type: type,
            data: JSON.stringify(data),
            contentType: 'application/json',
            headers: {"X-CSRFToken": getCookie('csrftoken')},
            success: function () {
                $('#modalBrand').modal('hide');
                showToast("Marca guardada correctamente", "bg-success");
                loadBrands();
            },
            error: function (xhr) {
                const errorMsg = xhr.responseJSON ? JSON.stringify(xhr.responseJSON) : "Error al procesar";
                showToast(errorMsg, "bg-danger");
            }
        });
    });

    // --- OBTENCIÓN DE DATOS ---

    function loadBrands() {
        const search = $('#brand-search').val() || '';
        const url = `/api/brands/?page=${currentPage}&search=${search}`;

        $.ajax({
            url: url,
            type: 'GET',
            success: function (response) {
                // Manejo dinámico de respuesta con o sin paginación
                const brands = response.results ? response.results : response;

                renderTable(brands);
                updatePagination(response);
                $('#page-loader').addClass('loader-hidden');
            },
            error: function () {
                showToast("Error al cargar el listado de marcas", "bg-danger");
                $('#page-loader').addClass('loader-hidden');
            }
        });
    }

    function renderTable(brands) {
        const tbody = $('#brand-table-body');
        tbody.empty();

        if (!brands || brands.length === 0) {
            tbody.append('<tr><td colspan="4" class="text-center py-4 text-muted">No se encontraron marcas.</td></tr>');
            return;
        }

        brands.forEach(brand => {
            tbody.append(`
                <tr>
                    <td class="ps-4 fw-bold text-dark">${brand.name}</td>
                    <td class="text-muted small">${brand.description || 'Sin detalles'}</td>
                    <td class="text-center">
                        <span class="badge bg-success-subtle text-success border border-success-subtle px-3" style="font-size:0.7rem">ACTIVO</span>
                    </td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-dark me-1" onclick="editBrand(${brand.id}, '${brand.name}', '${brand.description || ''}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteBrand(${brand.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    }

    window.deleteBrand = function (id) {
        if (confirm("¿Estás seguro de eliminar esta marca? Los productos asociados podrían quedar sin marca definida.")) {
            $.ajax({
                url: `/api/brands/${id}/`,
                type: 'DELETE',
                headers: {"X-CSRFToken": getCookie('csrftoken')},
                success: function () {
                    showToast("Marca eliminada del sistema", "bg-dark");
                    loadBrands();
                }
            });
        }
    };

    // --- UTILIDADES ---

    function updatePagination(response) {
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