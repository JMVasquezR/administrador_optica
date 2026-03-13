/* ==========================================
   VARIABLES GLOBALES E INICIALIZACIÓN
   ========================================== */
let appointmentModal;
let statusModal;
let idCitaParaEstado = null;
let idCitaParaEditar = null;
const API_URL = '/api/appointments/';

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

// --- 2. Loader Local (Efecto en Tabla para Filtros) ---
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
    const modalEl = document.getElementById('modalAddAppointment');
    if (modalEl) appointmentModal = new bootstrap.Modal(modalEl);

    const statusEl = document.getElementById('modalChangeStatus');
    if (statusEl) statusModal = new bootstrap.Modal(statusEl);

    // Carga inicial
    initAppointmentsPage();

    // Eventos de Filtros con Debounce
    const searchInput = document.getElementById('appointment-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => applyAppointmentFilters(), 500));
    }

    const dateInput = document.getElementById('date-filter');
    if (dateInput) {
        dateInput.addEventListener('change', () => applyAppointmentFilters());
    }

    const statusSelect = document.getElementById('status-filter');
    if (statusSelect) {
        statusSelect.addEventListener('change', () => applyAppointmentFilters());
    }

    // Botón Limpiar Filtros
    document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (dateInput) dateInput.value = '';
        if (statusSelect) statusSelect.value = '';
        applyAppointmentFilters();
    });

    // Preparar Modal para NUEVA Cita
    document.querySelector('[data-bs-target="#modalAddAppointment"]')?.addEventListener('click', () => {
        idCitaParaEditar = null;
        document.getElementById('appointment-form').reset();
        document.querySelector('#modalAddAppointment .modal-title').innerHTML =
            '<i class="fas fa-calendar-plus me-2 text-danger"></i>Agendar Nueva Cita';

        const today = new Date().toISOString().split('T')[0];
        document.querySelector('#appointment-form input[type="date"]').value = today;

        $('#appointment-patient').val(null).trigger('change');
        initPatientSearch();
    });

    // Botones del modal de cambio de estado
    document.querySelectorAll('.btn-status').forEach(btn => {
        btn.addEventListener('click', function () {
            const nuevoEstado = this.getAttribute('data-status');
            if (idCitaParaEstado && nuevoEstado) {
                ejecutarCambioEstado(idCitaParaEstado, nuevoEstado);
            }
        });
    });

    // Evento de Guardado
    document.getElementById('appointment-form')?.addEventListener('submit', saveAppointment);

    // Limpiar rastro al cerrar
    document.getElementById('modalAddAppointment')?.addEventListener('hidden.bs.modal', () => {
        idCitaParaEditar = null;
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
   LÓGICA DEL BUSCADOR DINÁMICO (SELECT2)
   ========================================== */
const initPatientSearch = () => {
    $('#appointment-patient').select2({
        theme: 'default',
        width: '100%',
        dropdownParent: $('#modalAddAppointment'),
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
   LÓGICA DEL LISTADO Y RESUMEN
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
        console.error('Error en fetchAppointments:', error);
    }
};

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

const renderTodaySummary = (appointments) => {
    const todayContainer = document.querySelector('.list-group-flush');
    const todayCountBadge = document.querySelector('.card-header .badge');
    if (!todayContainer) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayApps = appointments.filter(app => app.date === todayStr && app.status !== 'cancelled');

    if (todayCountBadge) todayCountBadge.innerText = `${todayApps.length} Cita${todayApps.length !== 1 ? 's' : ''}`;

    if (todayApps.length === 0) {
        todayContainer.innerHTML = `<div class="p-4 text-center text-muted small">No hay citas para hoy.</div>`;
        return;
    }

    const statusBadge = {'pending': 'bg-warning text-dark', 'confirmed': 'bg-success', 'completed': 'bg-info'};

    todayContainer.innerHTML = todayApps.map(app => {
        const hora = app.time ? app.time.substring(0, 5) : '--:--';
        const periodo = app.time && parseInt(app.time.substring(0, 2)) >= 12 ? 'PM' : 'AM';
        return `
            <div class="list-group-item list-group-item-action d-flex align-items-center py-3">
                <div class="me-4 text-center" style="width: 80px;">
                    <div class="h5 mb-0 fw-bold text-dark">${hora}</div>
                    <div class="small text-muted">${periodo}</div>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1 fw-bold text-dark">${app.patient_name}</h6>
                    <p class="mb-0 text-muted small"><i class="fas fa-search me-1 text-danger"></i>${app.reason}</p>
                </div>
                <div class="text-end">
                    <span class="badge ${statusBadge[app.status]} rounded-pill mb-2">${app.status_display}</span>
                </div>
            </div>`;
    }).join('');
};

const renderAppointmentTable = (appointments) => {
    const tableBody = document.querySelector('table tbody');
    if (!tableBody) return;

    if (!appointments?.length) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron citas.</td></tr>`;
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
        const rowStyle = isCancelled ? 'style="opacity: 0.6; background-color: #f8f9fa;"' : '';
        const fechaFormateada = app.date.split('-').reverse().join('/');
        const horaMostrada = app.time ? app.time.substring(0, 5) : '<span class="text-muted small">Sin hora</span>';

        return `
            <tr ${rowStyle}>
                <td class="ps-4">${fechaFormateada}</td>
                <td>${horaMostrada}</td>
                <td><div class="fw-bold text-dark">${app.patient_name}</div></td>
                <td><small>${app.reason}</small></td>
                <td class="text-center"><span class="badge ${statusBadge[app.status]} rounded-pill" style="font-size: 0.7rem;">${app.status_display}</span></td>
                <td class="text-center"><i class="${mediumIcon[app.medium]} fa-lg"></i></td>
                <td class="text-end pe-4">
                    <div class="btn-group">
                        ${!isCancelled ? `
                            <button class="btn btn-sm btn-outline-info" onclick="abrirModalEstado(${app.id})" title="Cambiar Estado"><i class="fa-solid fa-sync-alt"></i></button>
                            <button class="btn btn-sm btn-outline-dark" onclick="editAppointment(${app.id})" title="Editar Cita"><i class="fa-solid fa-edit"></i></button>
                        ` : `
                            <span class="text-muted small px-2"><i class="fas fa-lock me-1"></i> Anulada</span>
                        `}
                    </div>
                </td>
            </tr>`;
    }).join('');
};

/* ==========================================
   LÓGICA DE GUARDADO (CREAR / EDITAR)
   ========================================== */
const saveAppointment = async (e) => {
    e.preventDefault();
    showGlobalLoader();
    const form = e.target;
    const timeVal = form.querySelector('input[type="time"]').value;

    const appointmentData = {
        patient: document.getElementById('appointment-patient').value,
        date: form.querySelector('input[type="date"]').value,
        time: timeVal === "" ? null : timeVal,
        reason: form.querySelectorAll('select')[1].value,
        medium: form.querySelectorAll('select')[2].value.toLowerCase()
    };

    if (!idCitaParaEditar) appointmentData.status = 'pending';

    const url = idCitaParaEditar ? `${API_URL}${idCitaParaEditar}/` : API_URL;
    const method = idCitaParaEditar ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify(appointmentData)
        });
        if (response.ok) {
            appointmentModal.hide();
            idCitaParaEditar = null;
            await fetchAppointments();
            showNotify(method === 'POST' ? 'Cita agendada' : 'Cita actualizada', 'success');
        } else {
            showNotify('Error al procesar', 'danger');
        }
    } catch (err) {
        showNotify('Error de conexión', 'danger');
    } finally {
        hideGlobalLoader();
    }
};

/* ==========================================
   LÓGICA DE EDICIÓN Y ESTADO
   ========================================== */
const editAppointment = async (id) => {
    showGlobalLoader();
    try {
        const response = await fetch(`${API_URL}${id}/`);
        const app = await response.json();

        if (app.status === 'cancelled') {
            showNotify('No se puede editar una cita anulada', 'danger');
            return;
        }

        idCitaParaEditar = id;
        document.querySelector('#modalAddAppointment .modal-title').innerHTML =
            '<i class="fas fa-edit me-2 text-danger"></i>Editar Cita';

        document.querySelector('#appointment-form input[type="date"]').value = app.date;
        document.querySelector('#appointment-form input[type="time"]').value = app.time || "";

        const selects = document.querySelectorAll('#appointment-form select');
        selects[1].value = app.reason;
        selects[2].value = app.medium;

        const patientSelect = $('#appointment-patient');
        const newOption = new Option(app.patient_name, app.patient, true, true);
        patientSelect.append(newOption).trigger('change');

        appointmentModal.show();
    } catch (error) {
        showNotify('Error al cargar datos', 'danger');
    } finally {
        hideGlobalLoader();
    }
};

const abrirModalEstado = (id) => {
    idCitaParaEstado = id;
    statusModal.show();
};

const ejecutarCambioEstado = async (id, estado) => {
    showGlobalLoader();
    try {
        const response = await fetch(`${API_URL}${id}/`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify({status: estado})
        });
        if (response.ok) {
            statusModal.hide();
            showNotify('Estado actualizado', 'success');
            await fetchAppointments();
        } else {
            showNotify('Error al actualizar', 'danger');
        }
    } catch (error) {
        showNotify('Error de conexión', 'danger');
    } finally {
        idCitaParaEstado = null;
        hideGlobalLoader();
    }
};

/* ==========================================
   UTILIDADES
   ========================================== */
const setupPagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    document.getElementById('total-count').innerText = data.count || 0;
    document.getElementById('current-count').innerText = data.results ? data.results.length : 0;

    nextBtn.onclick = async () => {
        if (data.next) await fetchAppointments(data.next);
    };
    prevBtn.onclick = async () => {
        if (data.previous) await fetchAppointments(data.previous);
    };
    nextBtn.disabled = !data.next;
    prevBtn.disabled = !data.previous;
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