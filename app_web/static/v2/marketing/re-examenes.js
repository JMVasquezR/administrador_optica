/* ==========================================
   CAMPAIGN.JS - ÓPTICA KyM LENS
   Marketing y Fidelización de Pacientes
   ========================================== */

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
    // Carga inicial con bloqueo total
    initCampaignPage();

    // Eventos de Filtros (Carga Ligera)
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
const fetchCampaignData = async (url = '/api/patients/campaign/') => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener datos');

        // Al ser ModelViewSet con StandardResultsSetPagination, la data viene en 'results'
        const data = await response.json();
        const patients = data.results || data;

        renderCampaignTable(patients);
        updateCampaignMetrics(patients);
    } catch (error) {
        console.error('Error:', error);
    }
};

const applyCampaignFilters = async () => {
    showTableLoading();

    const search = document.getElementById('campaign-search').value;
    const period = document.getElementById('filter-campaign-period').value;

    let url = new URL('/api/patients/campaign/', window.location.origin);
    if (search) url.searchParams.append('search', search);

    // El filtrado por 'period' (crítico vs mes) se puede manejar aquí en JS
    // o enviarlo como parámetro si decides filtrar en el backend
    await fetchCampaignData(url.toString());

    hideTableLoading();
};

/* ==========================================
   RENDERIZADO DE TABLA Y MÉTRICAS
   ========================================== */
const renderCampaignTable = (patients) => {
    const tableBody = document.getElementById('campaign-table-body');
    const periodFilter = document.getElementById('filter-campaign-period').value;

    if (!patients?.length) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No hay pacientes que requieran re-examen bajo este filtro.</td></tr>`;
        return;
    }

    // Filtrado local adicional según el select de periodo
    let filtered = patients;
    if (periodFilter === 'month') {
        filtered = patients.filter(p => p.months_since_last_visit >= 11 && p.months_since_last_visit <= 13);
    } else if (periodFilter === 'critical') {
        filtered = patients.filter(p => p.months_since_last_visit >= 14);
    }

    tableBody.innerHTML = filtered.map(p => {
        const months = p.months_since_last_visit || 0;
        const isCritical = months >= 14;

        return `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark">${p.full_name}</div>
                    <small class="text-muted">DNI: ${p.document_number} | Cel: ${p.phone_or_cellular || '---'}</small>
                </td>
                <td class="text-center">${p.last_visit || 'Sin registro'}</td>
                <td class="text-center">
                    <span class="badge bg-light text-dark border">${months} meses</span>
                </td>
                <td class="text-center">
                    <span class="badge ${isCritical ? 'bg-danger' : 'bg-warning text-dark'} rounded-pill small">
                        ${isCritical ? 'CRÍTICO' : 'POR VENCER'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-success btn-sm shadow-sm" 
                            onclick="sendWhatsApp('${p.phone_or_cellular}', '${p.first_name}')">
                        <i class="fab fa-whatsapp me-1"></i> Notificar
                    </button>
                </td>
            </tr>`;
    }).join('');
};

const updateCampaignMetrics = (patients) => {
    // Calculamos basándonos en el campo calculado del Serializer
    const monthCount = patients.filter(p => p.months_since_last_visit >= 11 && p.months_since_last_visit <= 13).length;
    const criticalCount = patients.filter(p => p.months_since_last_visit >= 14).length;

    document.getElementById('count-month').innerText = monthCount;
    document.getElementById('count-critical').innerText = criticalCount;
};

/* ==========================================
   ACCIÓN: WHATSAPP
   ========================================== */
const sendWhatsApp = (phone, name) => {
    if (!phone || phone === 'null' || phone === '') {
        alert("El paciente no tiene un número de celular registrado en KyM Lens.");
        return;
    }

    // Mensaje personalizado
    const msg = `Hola ${name}, te saluda Martí de Óptica KyM Lens. 👋 Te escribimos para recordarte que ya pasó un año desde tu último examen de vista. Es importante verificar si tu medida ha cambiado para cuidar tu salud visual. ¿Te gustaría agendar un control gratuito esta semana?`;

    const whatsappUrl = `https://wa.me/51${phone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');

    // Actualizar contador visual de "Contactados hoy"
    let currentDone = parseInt(document.getElementById('count-done').innerText);
    document.getElementById('count-done').innerText = currentDone + 1;
};

/* ==========================================
   UTILIDADES
   ========================================== */
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
}