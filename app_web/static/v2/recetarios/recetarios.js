/* ==========================================
   VARIABLES GLOBALES E INICIALIZACIÓN
   ========================================== */
let recipeModal;
let detailRecipeModal;
let confirmAnularModal;
let idParaAnular = null;

// --- 1. Loader Global (Bloqueo Total) ---
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

// --- 2. Loader Local (Opacidad en Tabla para Filtros) ---
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

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Modales
    const modalEl = document.getElementById('modalRecipe');
    if (modalEl) recipeModal = new bootstrap.Modal(modalEl);

    const detailEl = document.getElementById('modalRecipeDetail');
    if (detailEl) detailRecipeModal = new bootstrap.Modal(detailEl);

    const confirmEl = document.getElementById('modalConfirmAnular');
    if (confirmEl) confirmAnularModal = new bootstrap.Modal(confirmEl);

    // Carga inicial pesada
    initRecipesPage();

    // Eventos de Filtros y Buscador (Carga Ligera)
    const searchInput = document.getElementById('recipe-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => applyRecipeFilters(), 500));
    }

    const dateInput = document.getElementById('recipe-date-filter');
    if (dateInput) {
        dateInput.addEventListener('change', () => applyRecipeFilters());
    }

    // Botón Limpiar Filtros
    document.getElementById('btn-clear-recipes')?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (dateInput) dateInput.value = '';
        applyRecipeFilters();
    });

    // Botón Ejecutar Anulación
    document.getElementById('btn-execute-anular-recipe')?.addEventListener('click', () => {
        if (idParaAnular) ejecutarAnulacion(idParaAnular);
    });

    // Preparar Modal de Nueva Receta
    document.querySelector('[data-bs-target="#modalRecipe"]')?.addEventListener('click', () => {
        document.getElementById('recipe-form').reset();
        document.getElementById('rec-date').valueAsDate = new Date();
        $('#rec-patient').val(null).trigger('change');
        initPatientSearch();
    });

    // Evento de Guardado
    document.getElementById('recipe-form')?.addEventListener('submit', saveRecipe);
});

const initRecipesPage = async () => {
    showGlobalLoader();
    try {
        await fetchRecipes();
    } finally {
        hideGlobalLoader();
    }
};

/* ==========================================
   LÓGICA DEL BUSCADOR DINÁMICO (SELECT2)
   ========================================== */
const initPatientSearch = async () => {
    let initialPatients = [];
    try {
        const res = await fetch('/api/patients/?limit=5');
        const data = await res.json();
        const results = data.results ? data.results : data;
        initialPatients = results.map(p => ({id: p.id, text: `${p.full_name} (${p.document_number})`}));
    } catch (err) {
        console.error(err);
    }

    $('#rec-patient').select2({
        theme: 'default',
        width: '100%',
        dropdownParent: $('#modalRecipe'),
        placeholder: 'Escriba nombre o documento del paciente...',
        data: initialPatients,
        minimumInputLength: 0,
        ajax: {
            url: '/api/patients/',
            dataType: 'json',
            delay: 300,
            data: (params) => ({search: params.term, page: params.page || 1}),
            processResults: (data) => ({
                results: data.results.map(p => ({id: p.id, text: `${p.full_name} (${p.document_number})`})),
                pagination: {more: !!data.next}
            }),
            cache: true
        }
    });
};

/* ==========================================
   LÓGICA DEL LISTADO Y FILTROS
   ========================================== */
const fetchRecipes = async (url = '/api/recipes/') => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();
        const recipes = data.results ? data.results : data;
        renderRecipeTable(recipes);
        setupRecipePagination(data);
    } catch (error) {
        console.error('Error en fetchRecipes:', error);
    }
};

const applyRecipeFilters = async () => {
    showTableLoading(); // Solo efecto en la tabla
    const searchInput = document.getElementById('recipe-search');
    const dateInput = document.getElementById('recipe-date-filter');
    let params = new URLSearchParams();
    if (searchInput?.value) params.append('search', searchInput.value);
    if (dateInput?.value) params.append('date_of_issue', dateInput.value);

    await fetchRecipes(`/api/recipes/?${params.toString()}`);
    hideTableLoading();
};

const renderRecipeTable = (recipes) => {
    const tableBody = document.getElementById('recipe-table-body');
    if (!tableBody) return;

    if (!recipes?.length) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hay registros</td></tr>`;
        return;
    }

    tableBody.innerHTML = recipes.map(r => {
        const rowStyle = r.is_active ? '' : 'style="opacity: 0.6; background-color: #f8f9fa;"';
        return `
            <tr ${rowStyle}>
                <td class="ps-4"><span class="prescription-code">${r.prescription_number}</span></td>
                <td class="small text-muted">${r.date_of_issue}</td>
                <td><div class="fw-bold text-dark">${r.name_patient || 'Sin nombre'}</div></td>
                <td><span class="badge bg-light text-dark border eye-badge">OD</span> <small>${r.right_eye_spherical_distance_far || '0.00'}</small></td>
                <td><span class="badge bg-light text-dark border eye-badge">OI</span> <small>${r.left_eye_spherical_distance_far || '0.00'}</small></td>
                <td class="text-center">
                    <span class="badge ${r.is_active ? 'bg-success' : 'bg-secondary'} rounded-pill" style="font-size: 0.7rem;">
                        ${r.is_active ? 'Vigente' : 'Anulada'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-success" onclick="#" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
                        <button class="btn btn-sm btn-outline-dark" onclick="viewRecipeDetail(${r.id})" title="Ver Medidas"><i class="fa-solid fa-eye"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="printRecipe(${r.id})" title="Imprimir"><i class="fa-solid fa-print"></i></button>
                        ${r.is_active ? `<button class="btn btn-sm btn-outline-secondary" onclick="abrirModalAnular(${r.id}, '${r.prescription_number}')" title="Anular"><i class="fa-solid fa-ban"></i></button>` : ''}
                    </div>
                </td>
            </tr>`;
    }).join('');
};

/* ==========================================
   LÓGICA DE CREACIÓN Y GUARDADO
   ========================================== */
const saveRecipe = async (e) => {
    e.preventDefault();
    showGlobalLoader();

    const recipeData = {
        patient: document.getElementById('rec-patient').value,
        date_of_issue: document.getElementById('rec-date').value,
        right_eye_spherical_distance_far: document.getElementById('od_sph_far').value || null,
        right_eye_cylinder_distance_far: document.getElementById('od_cyl_far').value || null,
        right_eye_axis_distance_far: document.getElementById('od_axis_far').value || null,
        left_eye_spherical_distance_far: document.getElementById('oi_sph_far').value || null,
        left_eye_cylinder_distance_far: document.getElementById('oi_cyl_far').value || null,
        left_eye_axis_distance_far: document.getElementById('oi_axis_far').value || null,
        pupillary_distance_far: document.getElementById('dp_far').value || null,
        right_eye_spherical_distance_near: document.getElementById('od_sph_near').value || null,
        right_eye_cylinder_distance_near: document.getElementById('od_cyl_near').value || null,
        right_eye_axis_distance_near: document.getElementById('od_axis_near').value || null,
        left_eye_spherical_distance_near: document.getElementById('oi_sph_near').value || null,
        left_eye_cylinder_distance_near: document.getElementById('oi_cyl_near').value || null,
        left_eye_axis_distance_near: document.getElementById('oi_axis_near').value || null,
        pupillary_distance_near: document.getElementById('dp_near').value || null,
        observation: document.getElementById('rec-obs').value,
        instruction: document.getElementById('rec-ins').value,
        is_active: true
    };

    try {
        const response = await fetch('/api/recipes/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify(recipeData)
        });
        if (response.ok) {
            recipeModal.hide();
            await fetchRecipes();
            showNotify('Receta guardada con éxito', 'success');
        } else {
            showNotify('Error al guardar', 'danger');
        }
    } finally {
        hideGlobalLoader();
    }
};

/* ==========================================
   DETALLE Y ANULACIÓN
   ========================================== */
const viewRecipeDetail = async (id) => {
    showGlobalLoader();
    try {
        const response = await fetch(`/api/recipes/${id}/`);
        const r = await response.json();

        document.getElementById('det-prescription-number').innerText = r.prescription_number;
        document.getElementById('det-patient-name').innerText = r.name_patient;
        document.getElementById('det-date').innerText = r.date_of_issue;

        document.getElementById('det-od-sph-far').innerText = r.right_eye_spherical_distance_far || '0.00';
        document.getElementById('det-od-cyl-far').innerText = r.right_eye_cylinder_distance_far || '0.00';
        document.getElementById('det-od-axis-far').innerText = r.right_eye_axis_distance_far || '0';
        document.getElementById('det-oi-sph-far').innerText = r.left_eye_spherical_distance_far || '0.00';
        document.getElementById('det-oi-cyl-far').innerText = r.left_eye_cylinder_distance_far || '0.00';
        document.getElementById('det-oi-axis-far').innerText = r.left_eye_axis_distance_far || '0';
        document.getElementById('det-dp-far').innerText = r.pupillary_distance_far || '-';

        document.getElementById('det-od-sph-near').innerText = r.right_eye_spherical_distance_near || '0.00';
        document.getElementById('det-od-cyl-near').innerText = r.right_eye_cylinder_distance_near || '0.00';
        document.getElementById('det-od-axis-near').innerText = r.right_eye_axis_distance_near || '0';
        document.getElementById('det-oi-sph-near').innerText = r.left_eye_spherical_distance_near || '0.00';
        document.getElementById('det-oi-cyl-near').innerText = r.left_eye_cylinder_distance_near || '0.00';
        document.getElementById('det-oi-axis-near').innerText = r.left_eye_axis_distance_near || '0';
        document.getElementById('det-dp-near').innerText = r.pupillary_distance_near || '-';

        document.getElementById('det-observations').innerText = r.observation || 'Sin observaciones.';
        document.getElementById('det-instructions').innerText = r.instruction || 'Ninguna.';

        detailRecipeModal.show();
    } finally {
        hideGlobalLoader();
    }
};

const ejecutarAnulacion = async (id) => {
    showGlobalLoader();
    try {
        const response = await fetch(`/api/recipes/${id}/`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify({is_active: false})
        });
        if (response.ok) {
            confirmAnularModal.hide();
            showNotify('Receta anulada', 'info');
            await fetchRecipes();
        }
    } finally {
        idParaAnular = null;
        hideGlobalLoader();
    }
};

/* ==========================================
   UTILIDADES
   ========================================== */
const setupRecipePagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    document.getElementById('total-count').innerText = data.count || 0;
    document.getElementById('current-count').innerText = data.results ? data.results.length : 0;

    nextBtn.onclick = async () => {
        if (data.next) {
            showTableLoading();
            await fetchRecipes(data.next);
            hideTableLoading();
        }
    };
    prevBtn.onclick = async () => {
        if (data.previous) {
            showTableLoading();
            await fetchRecipes(data.previous);
            hideTableLoading();
        }
    };
    nextBtn.disabled = !data.next;
    prevBtn.disabled = !data.previous;
};

const abrirModalAnular = (id, numero) => {
    idParaAnular = id;
    document.getElementById('text-recipe-number').innerText = numero;
    confirmAnularModal.show();
};

const showNotify = (msg, type) => {
    const toastEl = document.getElementById('liveToast');
    const toastMsg = document.getElementById('toast-message');
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-info');
    toastEl.classList.add(`bg-${type}`);
    toastMsg.innerText = msg;
    new bootstrap.Toast(toastEl).show();
};

function getCookie(n) {
    let v = null;
    if (document.cookie && document.cookie !== '') {
        const c = document.cookie.split(';');
        for (let i = 0; i < c.length; i++) {
            const k = c[i].trim();
            if (k.substring(0, n.length + 1) === (n + '=')) {
                v = decodeURIComponent(k.substring(n.length + 1));
                break;
            }
        }
    }
    return v;
}

function debounce(f, t = 300) {
    let m;
    return (...a) => {
        clearTimeout(m);
        m = setTimeout(() => f.apply(this, a), t);
    };
}

const printRecipe = (id) => window.print();