/* ==========================================
   VARIABLES GLOBALES E INICIALIZACIÓN
   ========================================== */
let patientModal;
let desactivarModal;
let historyModal;
let idPacienteParaDesactivar = null;
let currentHistoryPatientId = null;
let historyPaginationUrls = {next: null, prev: null};

// --- Loaders ---
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
    // Inicialización segura de componentes Bootstrap
    const mPatient = document.getElementById('modalPatient');
    const mDelete = document.getElementById('deleteModal');
    const mHistory = document.getElementById('modalHistory');

    if (mPatient) patientModal = bootstrap.Modal.getOrCreateInstance(mPatient);
    if (mDelete) desactivarModal = bootstrap.Modal.getOrCreateInstance(mDelete);
    if (mHistory) historyModal = bootstrap.Modal.getOrCreateInstance(mHistory);

    initPatientsPage();

    // Filtros y Eventos
    document.getElementById('patient-search')?.addEventListener('input', debounce(() => applyFilters(), 500));
    document.getElementById('patient-form')?.addEventListener('submit', savePatient);
    document.getElementById('confirmDelete')?.addEventListener('click', executeDesactivatePatient);

    // Paginación del historial
    document.getElementById('btn-history-next')?.addEventListener('click', () => {
        if (historyPaginationUrls.next) viewHistory(currentHistoryPatientId, historyPaginationUrls.next);
    });
    document.getElementById('btn-history-prev')?.addEventListener('click', () => {
        if (historyPaginationUrls.prev) viewHistory(currentHistoryPatientId, historyPaginationUrls.prev);
    });

    // Resetear formulario para nuevo paciente
    document.querySelector('[data-bs-target="#modalPatient"]')?.addEventListener('click', () => {
        const form = document.getElementById('patient-form');
        if (form) {
            form.reset();
            form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            document.getElementById('patient-id').value = '';
            document.getElementById('form-title-patient').innerText = 'Registrar Paciente';
        }
    });
});

const initPatientsPage = async () => {
    showGlobalLoader();
    try {
        await Promise.all([fetchPatients(), loadTypeDocuments()]);
    } finally {
        hideGlobalLoader();
    }
};

/* ==========================================
   API: LISTADO Y FILTROS
   ========================================== */
const fetchPatients = async (url = '/api/patients/') => {
    try {
        const response = await fetch(url);
        const data = await response.json();
        renderPatientTable(data.results);
        setupPagination(data);
    } catch (error) {
        console.error('Error:', error);
    }
};

const applyFilters = async () => {
    showTableLoading();
    const query = document.getElementById('patient-search').value;
    await fetchPatients(`/api/patients/?search=${query}`);
    hideTableLoading();
};

const renderPatientTable = (patients) => {
    const tableBody = document.getElementById('patient-table-body');
    if (!patients?.length) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No se encontraron pacientes</td></tr>`;
        return;
    }

    tableBody.innerHTML = patients.map(p => {
        // Lógica para el botón de estado (Activar/Desactivar)
        const btnStatus = p.is_active
            ? `<button class="btn btn-sm btn-outline-danger" onclick="desactivatePatient(${p.id}, '${p.full_name}', true)" title="Desactivar">
                <i class="fas fa-user-slash"></i>
               </button>`
            : `<button class="btn btn-sm btn-outline-success" onclick="desactivatePatient(${p.id}, '${p.full_name}', false)" title="Activar">
                <i class="fas fa-user-check"></i>
               </button>`;

        return `
            <tr ${!p.is_active ? 'style="opacity: 0.6; background-color: #f8f9fa;"' : ''}>
                <td class="ps-4">
                    <span class="badge bg-light text-dark border">${p.document_number}</span>
                </td>
                <td>
                    <div class="fw-bold text-dark">${p.full_name}</div>
                    <div class="x-small text-muted">${p.email || 'Sin correo'}</div>
                </td>
                <td>
                    <div class="small"><i class="fas fa-phone me-1 text-muted"></i> ${p.phone_or_cellular || '-'}</div>
                </td>
                <td>${p.gender === 'M' ? 'Masc' : 'Fem'}</td>
                <td class="text-center">
                    <span class="badge ${p.is_active ? 'bg-success' : 'bg-secondary'} rounded-pill x-small">
                        ${p.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-dark" onclick="editPatient(${p.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        
                        ${btnStatus}

                        <button class="btn btn-sm btn-outline-info" onclick="viewHistory(${p.id})" title="Ver Historia">
                            <i class="fas fa-file-medical"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');
};

const renderHistoryRecipes = (recipes) => {
    const body = document.getElementById('history-table-body');
    if (!recipes || recipes.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted italic">No registra recetas anteriores.</td></tr>';
        return;
    }

    body.innerHTML = recipes.map(r => `
        <tr>
            <td class="ps-3">${r.date_of_issue}</td>
            <td class="fw-bold text-danger">${r.prescription_number}</td>
            <td>${r.right_eye_spherical_distance_far || '0.00'} / ${r.right_eye_cylinder_distance_far || '0.00'}</td>
            <td>${r.left_eye_spherical_distance_far || '0.00'} / ${r.left_eye_cylinder_distance_far || '0.00'}</td>
            <td class="text-end pe-3">
                <button class="btn btn-sm btn-dark" onclick="showRecipeDetail(${r.id})">
                    <i class="fas fa-search-plus"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

/* ==========================================
   GESTIÓN DE PACIENTES (SAVE / EDIT)
   ========================================== */
const savePatient = async (e) => {
    e.preventDefault();
    showGlobalLoader();

    const patientId = document.getElementById('patient-id').value;
    const url = patientId ? `/api/patients/${patientId}/` : '/api/patients/';
    const method = patientId ? 'PUT' : 'POST';

    const patientData = {
        type_document: document.getElementById('type_document').value,
        document_number: document.getElementById('document_number').value,
        first_name: document.getElementById('first_name').value,
        surname: document.getElementById('surname').value,
        second_surname: document.getElementById('second_surname').value,
        date_of_birth: document.getElementById('date_of_birth').value || null,
        gender: document.getElementById('gender').value,
        phone_or_cellular: document.getElementById('phone_or_cellular').value,
        email: document.getElementById('email').value,
        direction: document.getElementById('direction').value,
        is_active: document.getElementById('is_active').checked
    };

    try {
        const response = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify(patientData)
        });

        if (response.ok) {
            patientModal.hide();
            await fetchPatients();
            showNotify(patientId ? '¡Actualizado!' : '¡Registrado!');
        } else {
            showNotify('Error al guardar los datos', 'danger');
        }
    } finally {
        hideGlobalLoader();
    }
};

const editPatient = async (id) => {
    showGlobalLoader();
    try {
        const res = await fetch(`/api/patients/${id}/`);
        const p = await res.json();

        document.getElementById('form-title-patient').innerText = 'Editar Paciente';
        document.getElementById('patient-id').value = p.id;
        document.getElementById('type_document').value = p.type_document;
        document.getElementById('document_number').value = p.document_number;
        document.getElementById('first_name').value = p.first_name;
        document.getElementById('surname').value = p.surname;
        document.getElementById('second_surname').value = p.second_surname || '';
        document.getElementById('date_of_birth').value = p.date_of_birth;
        document.getElementById('gender').value = p.gender;
        document.getElementById('phone_or_cellular').value = p.phone_or_cellular;
        document.getElementById('email').value = p.email;
        document.getElementById('direction').value = p.direction;
        document.getElementById('is_active').checked = p.is_active;

        patientModal.show();
    } finally {
        hideGlobalLoader();
    }
};

/* ==========================================
   HISTORIA CLÍNICA (PAGINADA)
   ========================================== */
const viewHistory = async (patientId, url = null) => {
    currentHistoryPatientId = patientId;
    const finalUrl = url || `/api/patients/${patientId}/history/`;

    const hTableBody = document.getElementById('history-table-body');
    hTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border spinner-border-sm text-danger"></div></td></tr>';

    const existingDetail = document.getElementById('recipe-quick-view');
    if (existingDetail) existingDetail.remove();

    // Solo mostramos el modal si no es un cambio de página interno
    if (!url && historyModal) historyModal.show();

    try {
        const response = await fetch(finalUrl);
        const data = await response.json();

        document.getElementById('history-patient-name').innerText = data.full_name;
        document.getElementById('hist-dni').innerText = data.document_number;
        document.getElementById('hist-phone').innerText = data.phone_or_cellular || '---';
        document.getElementById('hist-last-visit').innerText = data.last_visit || 'Sin visitas';

        const recipes = data.recipes.results || [];
        if (recipes.length > 0) {
            hTableBody.innerHTML = recipes.map(r => `
                <tr>
                    <td>${r.date_of_issue}</td>
                    <td class="fw-bold text-danger">${r.prescription_number}</td>
                    <td>${r.right_eye_spherical_distance_far || '0.00'} / ${r.right_eye_cylinder_distance_far || '0.00'}</td>
                    <td>${r.left_eye_spherical_distance_far || '0.00'} / ${r.left_eye_cylinder_distance_far || '0.00'}</td>
                    <td class="text-end pe-3">
                        <button class="btn btn-sm btn-dark" onclick="showRecipeDetail('${r.id}')"><i class="fas fa-search-plus"></i></button>
                    </td>
                </tr>`).join('');
        } else {
            hTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">No tiene recetas registradas.</td></tr>';
        }

        historyPaginationUrls.next = data.recipes.next;
        historyPaginationUrls.prev = data.recipes.previous;
        document.getElementById('btn-history-next').disabled = !data.recipes.next;
        document.getElementById('btn-history-prev').disabled = !data.recipes.previous;

    } catch (error) {
        console.error("Error historial:", error);
        hTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar datos.</td></tr>';
    }
};

const showRecipeDetail = async (recipeId) => {
    try {
        // Bloqueamos un segundo el botón para evitar doble clic
        const response = await fetch(`/api/recipes/${recipeId}/`);
        if (!response.ok) throw new Error("No se pudo obtener el detalle");

        const r = await response.json();

        // Buscamos el contenedor que pusimos en el HTML
        const container = document.getElementById('recipe-quick-view-container');

        container.innerHTML = `
            <div id="recipe-quick-view" class="card border-0 shadow-sm rounded-4 bg-white p-3 mb-3 animate__animated animate__fadeInUp" style="border-left: 4px solid #dc3545 !important;">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="fw-bold m-0 text-danger"><i class="fas fa-info-circle me-2"></i>Detalle Receta ${r.prescription_number}</h6>
                    <button type="button" class="btn-close small" onclick="this.parentElement.parentElement.remove()"></button>
                </div>
                <div class="row g-2">
                    <div class="col-6">
                        <small class="text-muted d-block">Distancia Pupilar</small>
                        <span class="fw-bold">${r.pupillary_distance_far || '---'}</span>
                    </div>
                    <div class="col-6">
                        <small class="text-muted d-block">Fecha de Emisión</small>
                        <span class="fw-bold">${r.date_of_issue}</span>
                    </div>
                    <div class="col-12 mt-2">
                        <small class="text-muted d-block">Observaciones / Receta</small>
                        <p class="small mb-0 text-dark italic">${r.observation || 'Sin notas adicionales.'}</p>
                    </div>
                </div>
            </div>
        `;

        // Scroll suave hacia el detalle para que el usuario lo vea
        container.scrollIntoView({behavior: 'smooth', block: 'nearest'});

    } catch (error) {
        console.error("Error al cargar detalle:", error);
        showNotify("No se pudo cargar el detalle de la receta", "danger");
    }
};

/* ==========================================
   UTILIDADES
   ========================================== */
const executeDesactivatePatient = async () => {
    // Lógica para activar/desactivar paciente si se requiere
};

const loadTypeDocuments = async () => {
    const res = await fetch('/api/type-documents/');
    const data = await res.json();
    const select = document.getElementById('type_document');
    if (select) select.innerHTML = '<option value="">Seleccione...</option>' + data.map(d => `<option value="${d.id}">${d.short_name}</option>`).join('');
};

const setupPagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    if (nextBtn) {
        nextBtn.onclick = () => data.next && fetchPatients(data.next);
        nextBtn.disabled = !data.next;
    }
    if (prevBtn) {
        prevBtn.onclick = () => data.previous && fetchPatients(data.previous);
        prevBtn.disabled = !data.previous;
    }
    const totalCount = document.getElementById('total-count');
    const currentCount = document.getElementById('current-count');
    if (totalCount) totalCount.innerText = data.count || 0;
    if (currentCount) currentCount.innerText = data.results?.length || 0;
};

const showNotify = (message, type = 'success') => {
    const toastEl = document.getElementById('liveToast');
    const toastMsg = document.getElementById('toast-message');
    if (toastEl && toastMsg) {
        toastEl.classList.remove('bg-success', 'bg-danger');
        toastEl.classList.add(type === 'success' ? 'bg-success' : 'bg-danger');
        toastMsg.innerText = message;
        bootstrap.Toast.getOrCreateInstance(toastEl).show();
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
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
}