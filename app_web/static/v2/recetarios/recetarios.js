/* ==========================================
   VARIABLES GLOBALES E INICIALIZACIÓN
   ========================================== */
let recipeModal;
let detailRecipeModal;
let confirmAnularModal;
let idParaAnular = null;
const API_RECIPES = '/api/recipes/';

// --- 1. Loaders ---
const showGlobalLoader = () => {
    const loader = document.getElementById('page-loader');
    if (loader) loader.classList.remove('loader-hidden');
};

const hideGlobalLoader = () => {
    const loader = document.getElementById('page-loader');
    if (loader) setTimeout(() => loader.classList.add('loader-hidden'), 300);
};

const showTableLoading = () => {
    const tableContainer = document.querySelector('.table-responsive');
    if (tableContainer) {
        tableContainer.style.opacity = '0.5';
        tableContainer.style.pointerEvents = 'none';
    }
};

const hideTableLoading = () => {
    const tableContainer = document.querySelector('.table-responsive');
    if (tableContainer) {
        tableContainer.style.opacity = '1';
        tableContainer.style.pointerEvents = 'auto';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Modales (Solo si existen para el rol actual)
    const modalEl = document.getElementById('modalRecipe');
    if (modalEl) recipeModal = new bootstrap.Modal(modalEl);

    const detailEl = document.getElementById('modalRecipeDetail');
    if (detailEl) detailRecipeModal = new bootstrap.Modal(detailEl);

    const confirmEl = document.getElementById('modalConfirmAnular');
    if (confirmEl) confirmAnularModal = new bootstrap.Modal(confirmEl);

    initRecipesPage();

    // Eventos de Filtros
    document.getElementById('recipe-search')?.addEventListener('input', debounce(() => applyRecipeFilters(), 500));
    document.getElementById('recipe-date-filter')?.addEventListener('change', () => applyRecipeFilters());

    document.getElementById('btn-clear-recipes')?.addEventListener('click', () => {
        document.getElementById('recipe-search').value = '';
        document.getElementById('recipe-date-filter').value = '';
        applyRecipeFilters();
    });

    // Guardado (Solo Admin/Optometrista)
    document.getElementById('recipe-form')?.addEventListener('submit', saveRecipe);

    document.getElementById('btn-execute-anular-recipe')?.addEventListener('click', () => {
        if (idParaAnular) ejecutarAnulacion(idParaAnular);
    });

    // Resetear modal para nueva receta
    document.querySelector('[data-bs-target="#modalRecipe"]')?.addEventListener('click', () => {
        const form = document.getElementById('recipe-form');
        if (form) {
            form.reset();
            document.getElementById('rec-date').valueAsDate = new Date();
            $('#rec-patient').val(null).trigger('change');
            initPatientSearch();
        }
    });
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
   SELECT2: BÚSQUEDA DE PACIENTES
   ========================================== */
const initPatientSearch = () => {
    $('#rec-patient').select2({
        theme: 'default',
        width: '100%',
        dropdownParent: $('#modalRecipe'),
        placeholder: 'Escriba nombre o documento...',
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
   LISTADO Y RENDERIZADO (CONTROL POR ROL)
   ========================================== */
const fetchRecipes = async (url = API_RECIPES) => {
    try {
        const response = await fetch(url);
        const data = await response.json();
        const results = data.results ? data.results : data;
        renderRecipeTable(results);
        setupRecipePagination(data);
    } catch (error) {
        console.error('Error:', error);
    }
};

const renderRecipeTable = (recipes) => {
    const tableBody = document.getElementById('recipe-table-body');
    if (!tableBody) return;

    if (!recipes?.length) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hay registros de recetas.</td></tr>`;
        return;
    }

    tableBody.innerHTML = recipes.map(r => {
        const isAnulada = !r.is_active;
        const rowStyle = isAnulada ? 'style="opacity: 0.6; background-color: #f8f9fa;"' : '';

        // --- BOTONES POR ROL ---
        // Ver detalle e Imprimir: TODOS
        let actionButtons = `
            <button class="btn btn-sm btn-outline-dark" onclick="viewRecipeDetail(${r.id})" title="Ver Medidas"><i class="fa-solid fa-eye"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="printRecipe(${r.id})" title="Imprimir"><i class="fa-solid fa-print"></i></button>
        `;

        // Anular: Solo ADMIN o OPTOMETRISTA y si no está ya anulada
        if (typeof USER_ROL !== 'undefined' && (USER_ROL === 'ADMIN' || USER_ROL === 'OPTOMETRISTA')) {
            if (!isAnulada) {
                actionButtons += `
                    <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalAnular(${r.id}, '${r.prescription_number}')" title="Anular"><i class="fa-solid fa-ban"></i></button>
                `;
            }
        }

        return `
            <tr ${rowStyle}>
                <td class="ps-4"><span class="fw-bold text-danger">${r.prescription_number}</span></td>
                <td class="small text-muted">${r.date_of_issue}</td>
                <td><div class="fw-bold text-dark">${r.name_patient || 'Sin nombre'}</div></td>
                <td><small>OD: ${r.right_eye_spherical_distance_far || '0.00'}</small></td>
                <td><small>OI: ${r.left_eye_spherical_distance_far || '0.00'}</small></td>
                <td class="text-center">
                    <span class="badge ${r.is_active ? 'bg-success' : 'bg-secondary'} rounded-pill" style="font-size: 0.7rem;">
                        ${r.is_active ? 'Vigente' : 'Anulada'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group">${actionButtons}</div>
                </td>
            </tr>`;
    }).join('');
};

/* ==========================================
   ACCIONES (GUARDAR / DETALLE / ANULAR)
   ========================================== */
const applyRecipeFilters = async () => {
    showTableLoading();
    const search = document.getElementById('recipe-search')?.value;
    const date = document.getElementById('recipe-date-filter')?.value;
    let params = new URLSearchParams();
    if (search) params.append('search', search);
    if (date) params.append('date_of_issue', date);

    await fetchRecipes(`${API_RECIPES}?${params.toString()}`);
    hideTableLoading();
};

const saveRecipe = async (e) => {
    e.preventDefault();
    if (USER_ROL === 'VENDEDOR') return;

    const patientId = $('#rec-patient').val();

    if (!patientId) {
        showNotify('Debe seleccionar un paciente', 'danger');
        return;
    }

    showGlobalLoader();

    const data = {
        patient: patientId,
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
        const response = await fetch(API_RECIPES, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify(data)
        });
        if (response.ok) {
            recipeModal.hide();
            await fetchRecipes();
            showNotify('Receta guardada con éxito', 'success');
        }
    } finally {
        hideGlobalLoader();
    }
};

window.viewRecipeDetail = async (id) => {
    showGlobalLoader();
    try {
        const response = await fetch(`${API_RECIPES}${id}/`);
        const r = await response.json();

        document.getElementById('det-prescription-number').innerText = r.prescription_number;
        document.getElementById('det-patient-name').innerText = r.name_patient;
        document.getElementById('det-date').innerText = r.date_of_issue;

        // Lejos
        document.getElementById('det-od-sph-far').innerText = r.right_eye_spherical_distance_far || '0.00';
        document.getElementById('det-od-cyl-far').innerText = r.right_eye_cylinder_distance_far || '0.00';
        document.getElementById('det-od-axis-far').innerText = r.right_eye_axis_distance_far || '0';
        document.getElementById('det-oi-sph-far').innerText = r.left_eye_spherical_distance_far || '0.00';
        document.getElementById('det-oi-cyl-far').innerText = r.left_eye_cylinder_distance_far || '0.00';
        document.getElementById('det-oi-axis-far').innerText = r.left_eye_axis_distance_far || '0';
        document.getElementById('det-dp-far').innerText = r.pupillary_distance_far || '-';

        // Cerca
        document.getElementById('det-od-sph-near').innerText = r.right_eye_spherical_distance_near || '0.00';
        document.getElementById('det-od-cyl-near').innerText = r.right_eye_cylinder_distance_near || '0.00';
        document.getElementById('det-od-axis-near').innerText = r.right_eye_axis_distance_near || '0';
        document.getElementById('det-oi-sph-near').innerText = r.left_eye_spherical_distance_near || '0.00';
        document.getElementById('det-oi-cyl-near').innerText = r.left_eye_cylinder_distance_near || '0.00';
        document.getElementById('det-oi-axis-near').innerText = r.left_eye_axis_near || '0';
        document.getElementById('det-dp-near').innerText = r.pupillary_distance_near || '-';

        document.getElementById('det-observations').innerText = r.observation || 'Sin observaciones.';
        document.getElementById('det-instructions').innerText = r.instruction || 'Ninguna.';

        detailRecipeModal.show();
    } finally {
        hideGlobalLoader();
    }
};

window.abrirModalAnular = (id, numero) => {
    idParaAnular = id;
    document.getElementById('text-recipe-number').innerText = numero;
    confirmAnularModal.show();
};

const ejecutarAnulacion = async (id) => {
    showGlobalLoader();
    try {
        const response = await fetch(`${API_RECIPES}${id}/`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify({is_active: false})
        });
        if (response.ok) {
            confirmAnularModal.hide();
            await fetchRecipes();
            showNotify('Receta anulada', 'info');
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
    if (nextBtn) {
        nextBtn.onclick = () => data.next && fetchRecipes(data.next);
        nextBtn.disabled = !data.next;
    }
    if (prevBtn) {
        prevBtn.onclick = () => data.previous && fetchRecipes(data.previous);
        prevBtn.disabled = !data.previous;
    }
    document.getElementById('total-count').innerText = data.count || 0;
    document.getElementById('current-count').innerText = data.results ? data.results.length : 0;
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

function debounce(f, t) {
    let m;
    return (...a) => {
        clearTimeout(m);
        m = setTimeout(() => f.apply(this, a), t);
    };
}

window.printRecipe = (id) => window.print();