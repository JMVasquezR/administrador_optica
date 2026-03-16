/* ==========================================
   RE-EXAMENES.JS - ÓPTICA KyM LENS
   Marketing y Fidelización de Pacientes
   ========================================== */

const API_URL = '/api/patients/campaign/';

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

// --- 2. Loader Local (Opacidad en Tabla) ---
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

/* ==========================================
   INICIALIZACIÓN
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    initCampaignPage();

    // Eventos de Filtros
    document.getElementById('campaign-search')?.addEventListener('input', debounce(() => applyCampaignFilters(), 500));
    document.getElementById('filter-campaign-period')?.addEventListener('change', () => applyCampaignFilters());

    document.getElementById('btn-refresh')?.addEventListener('click', () => {
        applyCampaignFilters();
    });
});

const initCampaignPage = async () => {
    showGlobalLoader();
    try {
        await fetchCampaignData();
    } finally {
        hideGlobalLoader();
    }
};

/* ==========================================
   API: OBTENER DATOS DE CAMPAÑA
   ========================================== */
const fetchCampaignData = async (url = API_URL) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener datos');

        const data = await response.json();
        const patients = data.results || (Array.isArray(data) ? data : []);

        renderCampaignTable(patients);
        updateCampaignMetrics(data);
        setupPagination(data);
    } catch (error) {
        console.error('Error detallado:', error);
        document.getElementById('campaign-table-body').innerHTML =
            `<tr><td colspan="5" class="text-center py-4 text-danger">Error de conexión al servidor.</td></tr>`;
    }
};

const applyCampaignFilters = async () => {
    showTableLoading();

    const search = document.getElementById('campaign-search').value;
    const period = document.getElementById('filter-campaign-period').value;

    let params = new URLSearchParams();
    if (search) params.append('search', search);
    if (period && period !== 'all') params.append('period', period);

    await fetchCampaignData(`${API_URL}?${params.toString()}`);

    hideTableLoading();
};

/* ==========================================
   RENDERIZADO DE TABLA Y MÉTRICAS
   ========================================== */
const renderCampaignTable = (patients) => {
    const tableBody = document.getElementById('campaign-table-body');

    if (!patients || patients.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No hay pacientes que requieran re-examen.</td></tr>`;
        return;
    }

    tableBody.innerHTML = patients.map(p => {
        const months = p.months_since_last_visit || 0;
        const isCritical = months >= 14;

        // 🔸 Detectamos si ya fue contactado según lo que envía Django
        const alreadyDone = p.already_contacted_today;

        return `
        <tr ${alreadyDone ? 'style="opacity: 0.7; background-color: #f8f9fa;"' : ''}>
            <td class="ps-4">
                <div class="fw-bold text-dark">${p.full_name}</div>
                <small class="text-muted">DNI: ${p.document_number}</small>
            </td>
            <td class="text-center text-muted small">${p.last_visit || 'Sin registro'}</td>
            <td class="text-center">
                <span class="badge bg-light text-dark border">${months} meses</span>
            </td>
            <td class="text-center">
                <span class="badge ${isCritical ? 'bg-danger' : 'bg-warning text-dark'} rounded-pill small">
                    ${isCritical ? 'CRÍTICO' : 'POR VENCER'}
                </span>
            </td>
            <td class="text-end pe-4">
                ${alreadyDone ? `
                    <button class="btn btn-outline-success btn-sm disabled shadow-none">
                        <i class="fas fa-check-circle me-1"></i> Contactado
                    </button>
                ` : `
                    <button class="btn btn-success btn-sm shadow-sm" 
                            onclick="sendWhatsApp('${p.phone_or_cellular}', '${p.first_name}', '${p.id}')">
                        <i class="fab fa-whatsapp me-1"></i> Notificar
                    </button>
                `}
            </td>
        </tr>`;
    }).join('');
};

const updateCampaignMetrics = (data) => {
    const countMonth = document.getElementById('count-month');
    const countCritical = document.getElementById('count-critical');
    const countDone = document.getElementById('count-done'); // El contador de hoy

    if (countMonth) countMonth.innerText = data.count_month || 0;
    if (countCritical) countCritical.innerText = data.count_critical || 0;

    // 🔸 Esto es lo que evita que se pierda al actualizar
    if (countDone) {
        countDone.innerText = data.count_done !== undefined ? data.count_done : 0;
    }
};

/* ==========================================
   LÓGICA DE PAGINACIÓN
   ========================================== */
const setupPagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    const currentCount = document.getElementById('current-count');
    document.getElementById('total-count').innerText = data.count || 0;

    if (currentCount) currentCount.innerText = data.results ? data.results.length : 0;

    nextBtn.onclick = async () => {
        if (data.next) {
            showTableLoading();
            await fetchCampaignData(data.next);
            hideTableLoading();
            window.scrollTo(0, 0);
        }
    };

    prevBtn.onclick = async () => {
        if (data.previous) {
            showTableLoading();
            await fetchCampaignData(data.previous);
            hideTableLoading();
            window.scrollTo(0, 0);
        }
    };

    nextBtn.disabled = !data.next;
    prevBtn.disabled = !data.previous;
};

/* ==========================================
   ACCIÓN: WHATSAPP Y REGISTRO
   ========================================== */
const sendWhatsApp = async (phone, name, patientId) => {
    if (!phone || phone === 'null' || phone === '') {
        alert("El paciente no tiene un número registrado en KyM Lens.");
        return;
    }

    // 1. Abrir WhatsApp en pestaña nueva
    const msg = `Hola ${name}, te saluda Martí de Óptica KyM Lens. 👋 Te escribimos porque ya pasó un año desde tu último examen. Es importante verificar tu medida para cuidar tu salud visual. ¿Te gustaría agendar un control gratuito esta semana?`;
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/51${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');

    // 2. Registrar el contacto en la base de datos de forma asíncrona
    try {
        const response = await fetch(`/api/patients/${patientId}/register-contact/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Actualizar el contador visual de "Contactados hoy"
            await fetchCampaignData();
            showNotify('Contacto registrado correctamente', 'success');
        }
    } catch (error) {
        console.error("Error al registrar el contacto en la BD:", error);
    }
};

/* ==========================================
   UTILIDADES
   ========================================== */
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