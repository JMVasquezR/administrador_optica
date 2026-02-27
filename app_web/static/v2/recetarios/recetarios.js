/* ==========================================
   VARIABLES GLOBALES E INICIALIZACIÓN
   ========================================== */
let recipeModal;       // Modal para Crear
let detailRecipeModal; // Modal para Ver Detalle
let confirmAnularModal; // Modal de diseño para anulación
let idParaAnular = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Modales de Bootstrap
    const modalEl = document.getElementById('modalRecipe');
    if (modalEl) recipeModal = new bootstrap.Modal(modalEl);

    const detailEl = document.getElementById('modalRecipeDetail');
    if (detailEl) detailRecipeModal = new bootstrap.Modal(detailEl);

    const confirmEl = document.getElementById('modalConfirmAnular');
    if (confirmEl) confirmAnularModal = new bootstrap.Modal(confirmEl);

    // 2. Carga inicial de datos
    fetchRecipes();

    // 3. Eventos de Filtros y Buscador
    const searchInput = document.getElementById('recipe-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => applyRecipeFilters(), 500));
    }

    const dateInput = document.getElementById('recipe-date-filter');
    if (dateInput) {
        dateInput.addEventListener('change', () => applyRecipeFilters());
    }

    // 4. Botón Limpiar Filtros
    const btnClear = document.getElementById('btn-clear-recipes');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (dateInput) dateInput.value = '';
            fetchRecipes('/api/recipes/');
        });
    }

    // 5. Botón Ejecutar Anulación (Dentro del Modal de confirmación)
    const btnExecAnular = document.getElementById('btn-execute-anular-recipe');
    if (btnExecAnular) {
        btnExecAnular.addEventListener('click', () => {
            if (idParaAnular) ejecutarAnulacion(idParaAnular);
        });
    }

    // 6. Preparar Modal de Nueva Receta
    const btnOpenNew = document.querySelector('[data-bs-target="#modalRecipe"]');
    if (btnOpenNew) {
        btnOpenNew.addEventListener('click', () => {
            document.getElementById('recipe-form').reset();
            document.getElementById('rec-date').valueAsDate = new Date();
            loadPatientsForRecipe();
        });
    }

    // 7. Evento de Guardado
    const recipeForm = document.getElementById('recipe-form');
    if (recipeForm) {
        recipeForm.addEventListener('submit', saveRecipe);
    }
});

/* ==========================================
   LÓGICA DEL LISTADO (API)
   ========================================== */

const fetchRecipes = async (url = '/api/recipes/') => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();

        const recipes = data.results ? data.results : data;
        renderRecipeTable(recipes);
        setupRecipePagination(data);

        const counter = document.getElementById('count-recipes');
        if (counter) counter.innerText = data.count || recipes.length;

    } catch (error) {
        console.error('Error en fetchRecipes:', error);
    }
};

const applyRecipeFilters = () => {
    const searchInput = document.getElementById('recipe-search');
    const dateInput = document.getElementById('recipe-date-filter');
    let params = new URLSearchParams();
    if (searchInput && searchInput.value) params.append('search', searchInput.value);
    if (dateInput && dateInput.value) params.append('date_of_issue', dateInput.value);
    fetchRecipes(`/api/recipes/?${params.toString()}`);
};

const renderRecipeTable = (recipes) => {
    const tableBody = document.getElementById('recipe-table-body');
    if (!tableBody) return;
    let html = '';

    if (!Array.isArray(recipes) || recipes.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hay registros</td></tr>`;
        return;
    }

    recipes.forEach(r => {
        const rowStyle = r.is_active ? '' : 'style="opacity: 0.6; background-color: #f8f9fa;"';

        html += `
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
                        <button class="btn btn-sm btn-outline-dark" onclick="viewRecipeDetail(${r.id})" title="Ver Medidas">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="printRecipe(${r.id})" title="Imprimir Receta">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        ${r.is_active ? `
                        <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalAnular(${r.id}, '${r.prescription_number}')" title="Anular Receta">
                            <i class="fa-solid fa-ban"></i>
                        </button>` : ''}
                    </div>
                </td>
            </tr>`;
    });
    tableBody.innerHTML = html;
};

/* ==========================================
   LÓGICA DE CREACIÓN Y GUARDADO
   ========================================== */

const loadPatientsForRecipe = async () => {
    try {
        const response = await fetch('/api/patients/');
        const data = await response.json();
        const select = document.getElementById('rec-patient');
        if (select) {
            select.innerHTML = '<option value="">Seleccione un paciente...</option>' +
                data.results.map(p => `<option value="${p.id}">${p.full_name} (${p.document_number})</option>`).join('');
        }
    } catch (err) { console.error("Error al cargar pacientes", err); }
};

const saveRecipe = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-recipe');
    if (btn) { btn.disabled = true; btn.innerText = 'Guardando...'; }

    const recipeData = {
        patient: document.getElementById('rec-patient').value,
        date_of_issue: document.getElementById('rec-date').value,
        // Lejos
        right_eye_spherical_distance_far: document.getElementById('od_sph_far').value || null,
        right_eye_cylinder_distance_far: document.getElementById('od_cyl_far').value || null,
        right_eye_axis_distance_far: document.getElementById('od_axis_far').value || null,
        left_eye_spherical_distance_far: document.getElementById('oi_sph_far').value || null,
        left_eye_cylinder_distance_far: document.getElementById('oi_cyl_far').value || null,
        left_eye_axis_distance_far: document.getElementById('oi_axis_far').value || null,
        pupillary_distance_far: document.getElementById('dp_far').value || null,
        // Cerca
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
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify(recipeData)
        });
        if (response.ok) {
            recipeModal.hide();
            fetchRecipes();
            showNotify('Receta guardada con éxito', 'success');
        } else {
            showNotify('Error al guardar la receta', 'danger');
        }
    } catch (error) { console.error("Error:", error); }
    finally { if (btn) { btn.disabled = false; btn.innerText = 'Guardar Receta'; } }
};

/* ==========================================
   DETALLE Y ANULACIÓN (CON MODAL)
   ========================================== */

const viewRecipeDetail = async (id) => {
    try {
        const response = await fetch(`/api/recipes/${id}/`);
        const r = await response.json();

        document.getElementById('det-prescription-number').innerText = r.prescription_number;
        document.getElementById('det-patient-name').innerText = r.name_patient;
        document.getElementById('det-date').innerText = r.date_of_issue;

        // Mapeo de campos Lejos
        document.getElementById('det-od-sph-far').innerText = r.right_eye_spherical_distance_far || '0.00';
        document.getElementById('det-od-cyl-far').innerText = r.right_eye_cylinder_distance_far || '0.00';
        document.getElementById('det-od-axis-far').innerText = r.right_eye_axis_distance_far || '0';
        document.getElementById('det-oi-sph-far').innerText = r.left_eye_spherical_distance_far || '0.00';
        document.getElementById('det-oi-cyl-far').innerText = r.left_eye_cylinder_distance_far || '0.00';
        document.getElementById('det-oi-axis-far').innerText = r.left_eye_axis_distance_far || '0';
        document.getElementById('det-dp-far').innerText = r.pupillary_distance_far || '-';

        // Mapeo de campos Cerca
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
    } catch (error) { showNotify("Error al cargar el detalle", "danger"); }
};

const abrirModalAnular = (id, numero) => {
    idParaAnular = id;
    document.getElementById('text-recipe-number').innerText = numero;
    confirmAnularModal.show();
};

const ejecutarAnulacion = async (id) => {
    const btn = document.getElementById('btn-execute-anular-recipe');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        const response = await fetch(`/api/recipes/${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ is_active: false })
        });
        if (response.ok) {
            confirmAnularModal.hide();
            showNotify('Receta anulada', 'info');
            fetchRecipes();
        }
    } catch (error) { showNotify('Error al anular', 'danger'); }
    finally {
        btn.disabled = false;
        btn.innerText = 'Confirmar Anulación';
        idParaAnular = null;
    }
};

/* ==========================================
   UTILIDADES
   ========================================== */

const showNotify = (msg, type) => {
    const toastEl = document.getElementById('liveToast');
    const toastMsg = document.getElementById('toast-message');
    if (toastEl && toastMsg) {
        toastEl.classList.remove('bg-success', 'bg-danger', 'bg-info');
        toastEl.classList.add(`bg-${type}`);
        toastMsg.innerText = msg;
        new bootstrap.Toast(toastEl).show();
    }
};

const setupRecipePagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    const totalSpan = document.getElementById('total-count');
    const currentSpan = document.getElementById('current-count');

    totalSpan.innerText = data.count;
    currentSpan.innerText = data.results.length;

    // Configurar botón Siguiente
    if (data.next) {
        nextBtn.disabled = false;
        nextBtn.onclick = () => fetchRecipes(data.next);
    } else {
        nextBtn.disabled = true;
    }

    // Configurar botón Anterior
    if (data.previous) {
        prevBtn.disabled = false;
        prevBtn.onclick = () => fetchRecipes(data.previous);
    } else {
        prevBtn.disabled = true;
    }
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
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => { func.apply(this, args); }, timeout); };
}

const printRecipe = (id) => { window.print(); };