/* ==========================================
   VARIABLES GLOBALES E INICIALIZACIÓN
   ========================================== */
let appointmentModal;
let statusModal;
let idCitaParaEstado = null;
let idCitaParaEditar = null;
const API_URL = '/api/appointments/';

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
    // Inicializar Modales Bootstrap
    const modalEl = document.getElementById('modalAddAppointment');
    if (modalEl) appointmentModal = new bootstrap.Modal(modalEl);

    const statusEl = document.getElementById('modalChangeStatus');
    if (statusEl) statusModal = new bootstrap.Modal(statusEl);

    initAppointmentsPage();

    // Filtros
    document.getElementById('appointment-search')?.addEventListener('input', debounce(() => applyAppointmentFilters(), 500));
    document.getElementById('date-filter')?.addEventListener('change', () => applyAppointmentFilters());
    document.getElementById('status-filter')?.addEventListener('change', () => applyAppointmentFilters());

    document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
        document.getElementById('appointment-search').value = '';
        document.getElementById('date-filter').value = '';
        document.getElementById('status-filter').value = '';
        applyAppointmentFilters();
    });

    // Evento Botón Nueva Cita
    const btnNuevo = document.querySelector('[data-bs-target="#modalAddAppointment"]');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', () => {
            idCitaParaEditar = null;
            document.getElementById('appointment-form').reset();
            $('#appointment-patient').val(null).trigger('change');
            initPatientSearch();
        });
    }

    document.getElementById('appointment-form')?.addEventListener('submit', saveAppointment);

    document.querySelectorAll('.btn-status').forEach(btn => {
        btn.addEventListener('click', function () {
            const nuevoEstado = this.getAttribute('data-status');
            if (idCitaParaEstado && nuevoEstado) ejecutarCambioEstado(idCitaParaEstado, nuevoEstado);
        });
    });
});

const initAppointmentsPage = async () => {
    showGlobalLoader();
    try {
        await fetchAppointments();
    } finally {
        hideGlobalLoader();
    }
};

/* ==========================================
   LÓGICA DEL BUSCADOR DE PACIENTES (SELECT2)
   ========================================== */
const initPatientSearch = () => {
    $('#appointment-patient').select2({
        theme: 'default',
        width: '100%',
        dropdownParent: $('#modalAddAppointment'),
        placeholder: 'Buscar paciente...',
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
   LISTADO Y RENDERIZADO
   ========================================== */
const fetchAppointments = async (url = API_URL) => {
    try {
        const response = await fetch(url);
        const data = await response.json();
        const results = data.results ? data.results : data;
        renderAppointmentTable(results);
        renderTodaySummary(results);
        setupPagination(data);
    } catch (error) {
        console.error('Error:', error);
    }
};

const renderAppointmentTable = (appointments) => {
    const tableBody = document.querySelector('table tbody');
    if (!tableBody) return;

    if (!appointments?.length) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hay citas.</td></tr>`;
        return;
    }

    const statusBadge = {
        'pending': 'bg-warning text-dark',
        'confirmed': 'bg-success',
        'completed': 'bg-info',
        'cancelled': 'bg-danger'
    };
    const mediumIcon = {
        'whatsapp': 'fab fa-whatsapp text-success',
        'presencial': 'fas fa-walking text-primary',
        'llamada': 'fas fa-phone text-secondary',
        'otro': 'fas fa-info-circle text-muted'
    };

    tableBody.innerHTML = appointments.map(app => {
        const isCancelled = app.status === 'cancelled';
        let actionButtons = '';

        if (typeof USER_ROL !== 'undefined' && USER_ROL !== 'OPTOMETRISTA') {
            if (!isCancelled) {
                actionButtons = `
                    <button class="btn btn-sm btn-outline-info" onclick="abrirModalEstado(${app.id})"><i class="fa-solid fa-sync-alt"></i></button>
                    <button class="btn btn-sm btn-outline-dark" onclick="editAppointment(${app.id})"><i class="fa-solid fa-edit"></i></button>
                `;
            } else {
                actionButtons = `<span class="text-muted small">Anulada</span>`;
            }
        } else {
            actionButtons = `<span class="badge bg-light text-dark border">Solo lectura</span>`;
        }

        return `
            <tr ${isCancelled ? 'style="opacity: 0.6;"' : ''}>
                <td class="ps-4">${app.date.split('-').reverse().join('/')}</td>
                <td>${app.time ? app.time.substring(0, 5) : '--:--'}</td>
                <td><div class="fw-bold">${app.patient_name}</div></td>
                <td><small>${app.reason}</small></td>
                <td class="text-center"><span class="badge ${statusBadge[app.status]} rounded-pill x-small">${app.status_display}</span></td>
                <td class="text-center"><i class="${mediumIcon[app.medium] || 'fas fa-calendar'} fa-lg"></i></td>
                <td class="text-end pe-4"><div class="btn-group">${actionButtons}</div></td>
            </tr>`;
    }).join('');
};

const renderTodaySummary = (appointments) => {
    const todayContainer = document.querySelector('.list-group-flush');
    const todayCountBadge = document.getElementById('today-count-badge');

    if (!todayContainer) return;

    // 1. Filtrar las citas de hoy (que no estén canceladas)
    // Usamos el formato YYYY-MM-DD local para comparar con la API
    const today = new Date();
    const todayStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

    const todayApps = appointments.filter(app => app.date === todayStr && app.status !== 'cancelled');

    // 2. Actualizar el Badge (Burbuja Roja) dinámicamente
    if (todayCountBadge) {
        const total = todayApps.length;
        todayCountBadge.innerText = `${total} Cita${total !== 1 ? 's' : ''}`;
    }

    // 3. Renderizar el listado en el Card
    if (todayApps.length === 0) {
        todayContainer.innerHTML = `
            <div class="p-4 text-center text-muted small">
                <i class="fas fa-calendar-check d-block mb-2 opacity-50 fa-2x"></i>
                No hay citas programadas para hoy.
            </div>`;
        return;
    }

    todayContainer.innerHTML = todayApps.map(app => {
        const hora = app.time ? app.time.substring(0, 5) : '--:--';
        return `
            <div class="list-group-item list-group-item-action d-flex align-items-center py-3">
                <div class="me-4 text-center" style="width: 60px;">
                    <div class="fw-bold text-dark">${hora}</div>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-0 fw-bold small text-dark">${app.patient_name}</h6>
                    <p class="mb-0 x-small text-muted">${app.reason}</p>
                </div>
                <div class="text-end">
                    <i class="fas fa-chevron-right text-light"></i>
                </div>
            </div>`;
    }).join('');
};

/* ==========================================
   ACCIONES (CORRECCIÓN DE ÍNDICES AQUÍ)
   ========================================== */
const saveAppointment = async (e) => {
    e.preventDefault();
    if (USER_ROL === 'OPTOMETRISTA') return;

    const patientId = $('#appointment-patient').val();
    if (!patientId) {
        showNotify('Seleccione un paciente', 'danger');
        return;
    }

    showGlobalLoader();
    const form = e.target;
    const selects = form.querySelectorAll('select');

    const data = {
        patient: patientId,
        date: form.querySelector('input[type="date"]').value,
        time: form.querySelector('input[type="time"]').value || null,
        // ÍNDICES CORREGIDOS:
        reason: selects[1].value, // Toma el valor del combo "Motivo"
        medium: selects[2].value.toLowerCase(), // Toma el valor del combo "Medio"
    };

    const url = idCitaParaEditar ? `${API_URL}${idCitaParaEditar}/` : API_URL;
    const method = idCitaParaEditar ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify(data)
        });
        if (res.ok) {
            appointmentModal.hide();
            await fetchAppointments();
            showNotify('Guardado correctamente', 'success');
        } else {
            const errorData = await res.json();
            console.error(errorData);
            showNotify('Error al guardar', 'danger');
        }
    } finally {
        hideGlobalLoader();
    }
};

window.editAppointment = async (id) => {
    showGlobalLoader();
    try {
        const response = await fetch(`${API_URL}${id}/`);
        const app = await response.json();
        idCitaParaEditar = id;

        document.querySelector('#appointment-form input[type="date"]').value = app.date;
        document.querySelector('#appointment-form input[type="time"]').value = app.time || "";

        const selects = document.querySelectorAll('#appointment-form select');
        selects[1].value = app.reason;
        selects[2].value = app.medium;

        initPatientSearch();
        const newOption = new Option(app.patient_name, app.patient, true, true);
        $('#appointment-patient').append(newOption).trigger('change');

        appointmentModal.show();
    } finally {
        hideGlobalLoader();
    }
};

window.abrirModalEstado = (id) => {
    idCitaParaEstado = id;
    statusModal.show();
};

const ejecutarCambioEstado = async (id, estado) => {
    showGlobalLoader();
    try {
        await fetch(`${API_URL}${id}/`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify({status: estado})
        });
        statusModal.hide();
        await fetchAppointments();
        showNotify('Estado actualizado', 'success');
    } finally {
        hideGlobalLoader();
    }
};

/* ==========================================
   UTILIDADES
   ========================================== */
const applyAppointmentFilters = async () => {
    showTableLoading();
    const search = document.getElementById('appointment-search')?.value;
    const date = document.getElementById('date-filter')?.value;
    const status = document.getElementById('status-filter')?.value;
    let params = new URLSearchParams();
    if (search) params.append('search', search);
    if (date) params.append('date', date);
    if (status) params.append('status', status);
    await fetchAppointments(`${API_URL}?${params.toString()}`);
    hideTableLoading();
};

const setupPagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    if (nextBtn) {
        nextBtn.onclick = () => data.next && fetchAppointments(data.next);
        nextBtn.disabled = !data.next;
    }
    if (prevBtn) {
        prevBtn.onclick = () => data.previous && fetchAppointments(data.previous);
        prevBtn.disabled = !data.previous;
    }
};

const showNotify = (msg, type) => {
    const toastEl = document.getElementById('liveToast');
    const toastMsg = document.getElementById('toast-message');
    toastEl.classList.remove('bg-success', 'bg-danger');
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