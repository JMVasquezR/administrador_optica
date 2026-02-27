// pacientes.js
let patientModal;

document.addEventListener('DOMContentLoaded', () => {
    fetchPatients();

    // Escuchar el buscador
    document.getElementById('patient-search').addEventListener('input', debounce(() => {
        const query = document.getElementById('patient-search').value;
        fetchPatients(`/api/patients/?search=${query}`);
    }, 500));
});

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
        nextBtn.onclick = () => fetchPatients(data.next);
    } else {
        nextBtn.disabled = true;
    }

    // Configurar botón Anterior
    if (data.previous) {
        prevBtn.disabled = false;
        prevBtn.onclick = () => fetchPatients(data.previous);
    } else {
        prevBtn.disabled = true;
    }
};

const renderPatientTable = (patients) => {
    const tableBody = document.getElementById('patient-table-body');
    let html = '';

    patients.forEach(p => {
        // Lógica para determinar qué botón mostrar según el estado
        const btnStatus = p.is_active
            ? `<button class="btn btn-sm btn-outline-danger me-1" onclick="desactivatePatient(${p.id}, '${p.full_name}', true)" title="Desactivar">
                <i class="fas fa-user-slash"></i>
               </button>`
            : `<button class="btn btn-sm btn-outline-success me-1" onclick="desactivatePatient(${p.id}, '${p.full_name}', false)" title="Activar">
                <i class="fas fa-user-check"></i>
               </button>`;

        html += `
            <tr>
                <td class="ps-4">
                    <span class="badge badge-dni">${p.full_document}</span>
                </td>
                <td>
                    <div class="fw-bold text-dark">${p.full_name}</div>
                    <small class="text-muted">${p.email || 'Sin correo'}</small>
                </td>
                <td>
                    <i class="fas fa-phone me-1 text-muted"></i> ${p.phone_or_cellular || '-'}
                </td>
                <td>${p.gender === 'M' ? 'Masc' : 'Fem'}</td>
                <td class="text-center">
                    <span class="badge ${p.is_active ? 'bg-success' : 'bg-secondary'}">
                        ${p.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-dark me-1" onclick="editPatient(${p.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${btnStatus}
                    <button class="btn btn-sm btn-outline-info" onclick="viewHistory(${p.id})" title="Ver Historia">
                        <i class="fas fa-file-medical"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tableBody.innerHTML = html;
};

// Reutilizar función debounce
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    patientModal = new bootstrap.Modal(document.getElementById('modalPatient'));

    loadTypeDocuments();
    fetchPatients();

    const patientForm = document.getElementById('patient-form');
    patientForm.addEventListener('submit', savePatient);

    // Resetear modal al presionar "Nuevo Paciente"
    document.querySelector('[data-bs-target="#modalPatient"]').addEventListener('click', () => {
        patientForm.reset();
        document.getElementById('patient-id').value = '';
        document.getElementById('form-title-patient').innerText = 'Registrar Paciente';
    });
});

// Cargar tipos de documento (DNI, RUC, etc)
const loadTypeDocuments = async () => {
    const res = await fetch('/api/type-documents/');
    const data = await res.json();
    const select = document.getElementById('type_document');
    data.forEach(doc => {
        select.innerHTML += `<option value="${doc.id}">${doc.short_name}</option>`;
    });
};

const showNotify = (message, type = 'success') => {
    const toastEl = document.getElementById('liveToast');
    const toastMessage = document.getElementById('toast-message');

    // Cambiar color según el tipo (success o danger)
    toastEl.classList.remove('bg-success', 'bg-danger');
    toastEl.classList.add(type === 'success' ? 'bg-success' : 'bg-danger');

    toastMessage.innerText = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
};

const savePatient = async (e) => {
    e.preventDefault();

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
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(patientData)
        });

        const result = await response.json();

        if (response.ok) {
            patientModal.hide();
            fetchPatients();
            showNotify(patientId ? '¡Paciente actualizado!' : '¡Paciente registrado con éxito!');
        } else {
            // MANEJO DE ERRORES ESPECÍFICOS (Duplicados, validaciones de Django)
            if (response.status === 400) {
                // Si el error es el UniqueTogetherValidator (duplicado)
                if (result.non_field_errors) {
                    showNotify(result.non_field_errors[0], 'danger');
                    document.getElementById('document_number').classList.add('is-invalid');
                }

                // Errores por campos individuales (ej: email inválido)
                Object.keys(result).forEach(key => {
                    const input = document.getElementById(key);
                    if (input) {
                        input.classList.add('is-invalid');
                    }
                });
            } else {
                showNotify('Ocurrió un error inesperado en el servidor', 'danger');
            }
        }
    } catch (error) {
        console.error('Error al guardar paciente:', error);
    }
};

// Función para editar (se llama desde el botón de la tabla)
const editPatient = async (id) => {
    const res = await fetch(`/api/patients/${id}/`);
    const p = await res.json();

    document.getElementById('form-title-patient').innerText = 'Editar Paciente';
    document.getElementById('patient-id').value = p.id;

    document.getElementById('type_document').value = p.type_document;
    document.getElementById('document_number').value = p.document_number;
    document.getElementById('first_name').value = p.first_name;
    document.getElementById('surname').value = p.surname;
    document.getElementById('second_surname').value = p.second_surname;
    document.getElementById('date_of_birth').value = p.date_of_birth;
    document.getElementById('gender').value = p.gender;
    document.getElementById('phone_or_cellular').value = p.phone_or_cellular;
    document.getElementById('email').value = p.email;
    document.getElementById('direction').value = p.direction;
    document.getElementById('is_active').checked = p.is_active;

    patientModal.show();
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

let idPacienteParaDesactivar = null;
let desactivarModal;

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el modal de confirmación de desactivación
    desactivarModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Escuchar el clic en el botón de confirmación del modal
    const btnConfirmDesactivar = document.getElementById('confirmDelete');
    if (btnConfirmDesactivar) {
        btnConfirmDesactivar.addEventListener('click', executeDesactivatePatient);
    }
});

/**
 * 1. Prepara la desactivación y muestra el modal
 */
const desactivatePatient = (id, nombre, estadoActual) => {
    idPacienteParaDesactivar = id;
    const accion = estadoActual ? 'desactivar' : 'activar';
    const color = estadoActual ? 'text-danger' : 'text-success';

    // Personalizamos el mensaje del modal de confirmación
    document.getElementById('deleteModalLabel').innerText = estadoActual ? 'Desactivar Paciente' : 'Activar Paciente';
    document.getElementById('delete-modal-body').innerHTML = `
        ¿Estás seguro de que deseas <b class="${color}">${accion}</b> al paciente <b>${nombre}</b>?<br>
        <small class="text-muted">Esto afectará su visibilidad en las citas actuales.</small>
    `;

    // Cambiamos el color del botón de confirmación según la acción
    const btnConfirm = document.getElementById('confirmDelete');
    btnConfirm.className = `btn ${estadoActual ? 'btn-danger' : 'btn-success'}`;
    btnConfirm.innerText = estadoActual ? 'Sí, desactivar' : 'Sí, activar';

    desactivarModal.show();
};

/**
 * 2. Ejecuta el PATCH a la API
 */
const executeDesactivatePatient = async () => {
    if (!idPacienteParaDesactivar) return;

    // Primero obtenemos el estado actual del paciente para invertirlo
    try {
        const res = await fetch(`/api/patients/${idPacienteParaDesactivar}/`);
        const p = await res.json();
        const nuevoEstado = !p.is_active;

        const response = await fetch(`/api/patients/${idPacienteParaDesactivar}/`, {
            method: 'PATCH', // Usamos PATCH para actualización parcial
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({is_active: nuevoEstado})
        });

        if (response.ok) {
            desactivarModal.hide();
            fetchPatients(); // Recargar la tabla
            showNotify(nuevoEstado ? 'Paciente activado' : 'Paciente desactivado', 'success');
        } else {
            showNotify('No se pudo cambiar el estado del paciente', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotify('Error de conexión', 'danger');
    } finally {
        idPacienteParaDesactivar = null;
    }
};