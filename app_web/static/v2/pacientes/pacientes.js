/* ==========================================
   VARIABLES GLOBALES E INICIALIZACIÓN
   ========================================== */
let patientModal;
let desactivarModal;
let idPacienteParaDesactivar = null;

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

// --- 2. Loader Local (Opacidad en Tabla para Búsquedas) ---
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
    patientModal = new bootstrap.Modal(document.getElementById('modalPatient'));
    desactivarModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Carga inicial pesada
    initPatientsPage();

    // Filtro de búsqueda: Loader Local (Opacidad)
    const searchInput = document.getElementById('patient-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => applyFilters(), 500));
    }

    // Eventos de formulario
    document.getElementById('patient-form')?.addEventListener('submit', savePatient);

    const btnConfirmDesactivar = document.getElementById('confirmDelete');
    if (btnConfirmDesactivar) {
        btnConfirmDesactivar.addEventListener('click', executeDesactivatePatient);
    }

    // Resetear para nuevo paciente
    document.querySelector('[data-bs-target="#modalPatient"]')?.addEventListener('click', () => {
        const form = document.getElementById('patient-form');
        form.reset();
        // Limpiar estados de validación previos
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.getElementById('patient-id').value = '';
        document.getElementById('form-title-patient').innerText = 'Registrar Paciente';
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
        const btnStatus = p.is_active
            ? `<button class="btn btn-sm btn-outline-danger" onclick="desactivatePatient(${p.id}, '${p.full_name}', true)" title="Desactivar">
                <i class="fas fa-user-slash"></i>
               </button>`
            : `<button class="btn btn-sm btn-outline-success" onclick="desactivatePatient(${p.id}, '${p.full_name}', false)" title="Activar">
                <i class="fas fa-user-check"></i>
               </button>`;

        return `
            <tr ${!p.is_active ? 'style="opacity: 0.6; background-color: #f8f9fa;"' : ''}>
                <td class="ps-4"><span class="badge bg-light text-dark border">${p.full_document || p.document_number}</span></td>
                <td><div class="fw-bold text-dark">${p.full_name}</div></td>
                <td>
                    <div class="small"><i class="fas fa-phone me-1 text-muted"></i> ${p.phone_or_cellular || '-'}</div>
                </td>
                <td>${p.gender === 'M' ? 'Masc' : 'Fem'}</td>
                <td class="text-center">
                    <span class="badge ${p.is_active ? 'bg-success' : 'bg-secondary'} rounded-pill">
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

/* ==========================================
   ACCIONES (GLOBAL LOADER)
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

    // Limpiar errores previos
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(patientData)
        });

        const result = await response.json();

        if (response.ok) {
            patientModal.hide();
            await fetchPatients();
            showNotify(patientId ? '¡Paciente actualizado!' : '¡Paciente registrado con éxito!');
        } else {
            if (response.status === 400) {
                if (result.non_field_errors) {
                    showNotify(result.non_field_errors[0], 'danger');
                    document.getElementById('document_number').classList.add('is-invalid');
                }
                Object.keys(result).forEach(key => {
                    const input = document.getElementById(key);
                    if (input) input.classList.add('is-invalid');
                });
            } else {
                showNotify('Error en el servidor', 'danger');
            }
        }
    } catch (error) {
        console.error('Error:', error);
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
   ACTIVACIÓN / DESACTIVACIÓN
   ========================================== */
const desactivatePatient = (id, nombre, estadoActual) => {
    idPacienteParaDesactivar = id;
    const accion = estadoActual ? 'desactivar' : 'activar';
    const color = estadoActual ? 'text-danger' : 'text-success';

    document.getElementById('deleteModalLabel').innerText = estadoActual ? 'Desactivar Paciente' : 'Activar Paciente';
    document.getElementById('delete-modal-body').innerHTML = `
        ¿Estás seguro de que deseas <b class="${color}">${accion}</b> al paciente <b>${nombre}</b>?<br>
        <small class="text-muted">Esto afectará su visibilidad en las citas actuales.</small>
    `;

    const btnConfirm = document.getElementById('confirmDelete');
    btnConfirm.className = `btn ${estadoActual ? 'btn-danger' : 'btn-success'}`;
    btnConfirm.innerText = estadoActual ? 'Sí, desactivar' : 'Sí, activar';

    desactivarModal.show();
};

const executeDesactivatePatient = async () => {
    if (!idPacienteParaDesactivar) return;
    showGlobalLoader();

    try {
        const res = await fetch(`/api/patients/${idPacienteParaDesactivar}/`);
        const p = await res.json();
        const nuevoEstado = !p.is_active;

        const response = await fetch(`/api/patients/${idPacienteParaDesactivar}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({is_active: nuevoEstado})
        });

        if (response.ok) {
            desactivarModal.hide();
            await fetchPatients();
            showNotify(nuevoEstado ? 'Paciente activado' : 'Paciente desactivado', 'success');
        }
    } finally {
        idPacienteParaDesactivar = null;
        hideGlobalLoader();
    }
};

/* ==========================================
   UTILIDADES
   ========================================== */
const loadTypeDocuments = async () => {
    try {
        const res = await fetch('/api/type-documents/');
        const data = await res.json();
        const select = document.getElementById('type_document');
        select.innerHTML = '<option value="">Seleccione...</option>';
        data.forEach(doc => {
            select.innerHTML += `<option value="${doc.id}">${doc.short_name}</option>`;
        });
    } catch (e) {
        console.error("Error cargando documentos", e);
    }
};

const setupPagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    document.getElementById('total-count').innerText = data.count || 0;
    document.getElementById('current-count').innerText = data.results?.length || 0;

    nextBtn.onclick = async () => {
        if (data.next) {
            showTableLoading();
            await fetchPatients(data.next);
            hideTableLoading();
        }
    };
    prevBtn.onclick = async () => {
        if (data.previous) {
            showTableLoading();
            await fetchPatients(data.previous);
            hideTableLoading();
        }
    };
    nextBtn.disabled = !data.next;
    prevBtn.disabled = !data.previous;
};

const showNotify = (message, type = 'success') => {
    const toastEl = document.getElementById('liveToast');
    const toastMsg = document.getElementById('toast-message');
    toastEl.classList.remove('bg-success', 'bg-danger');
    toastEl.classList.add(type === 'success' ? 'bg-success' : 'bg-danger');
    toastMsg.innerText = message;
    new bootstrap.Toast(toastEl).show();
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

const viewHistory = (id) => { /* Implementar según sea necesario */
};