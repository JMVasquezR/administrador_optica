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
        console.log("Solicitando datos a:", url); // Depuración
        const response = await fetch(url);
        const data = await response.json();
        console.log("Datos recibidos del servidor:", data); // Depuración

        // Verificamos si la data viene en 'results' o es el array directo
        const patients = data.results ? data.results : (Array.isArray(data) ? data : []);

        console.log("Pacientes a procesar:", patients);
        renderCampaignTable(patients);
        setupPagination(data);
    } catch (error) {
        console.error('Error detallado:', error);
    }
};

const applyCampaignFilters = async () => {
    showTableLoading();

    const search = document.getElementById('campaign-search').value;
    const period = document.getElementById('filter-campaign-period').value;

    let params = new URLSearchParams();
    if (search) params.append('search', search);
    if (period && period !== 'all') params.append('period', period); // Enviamos el filtro al backend

    await fetchCampaignData(`${API_URL}?${params.toString()}`);

    hideTableLoading();
};

/* ==========================================
   RENDERIZADO DE TABLA Y MÉTRICAS
   ========================================== */
const renderCampaignTable = (patients) => {
    const tableBody = document.getElementById('campaign-table-body');

    if (!patients || patients.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No hay pacientes que requieran re-examen bajo este filtro.</td></tr>`;
        return;
    }

    tableBody.innerHTML = patients.map(p => {
        const months = p.months_since_last_visit || 0;
        const isCritical = months >= 14;

        return `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark">${p.full_name}</div>
                    <small class="text-muted">DNI: ${p.document_number} | Cel: ${p.phone_or_cellular || '---'}</small>
                </td>
                <td class="text-center text-muted small">${p.last_visit || 'Sin registro'}</td>
                <td class="text-center">
                    <span class="badge bg-light text-dark border">${months} meses</span>
                </td>
                <td class="text-center">
                    <span class="badge ${isCritical ? 'bg-danger' : 'bg-warning text-dark'} rounded-pill small" style="font-size: 0.7rem;">
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

const updateCampaignMetrics = (data) => {
    // Si el backend envía las métricas en la respuesta (recomendado), úsalas.
    // Si no, las calculamos del total si no hay paginación, o mostramos el conteo del backend.
    if (data.count_month !== undefined) {
        document.getElementById('count-month').innerText = data.count_month;
        document.getElementById('count-critical').innerText = data.count_critical;
    } else {
        // Fallback: Si el backend no envía los contadores específicos aún
        document.getElementById('total-count').innerText = data.count || 0;
    }
};

/* ==========================================
   LÓGICA DE PAGINACIÓN
   ========================================== */
const setupPagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    const currentCount = document.getElementById('current-count');
    const totalCount = document.getElementById('total-count');

    // Actualizar números
    totalCount.innerText = data.count || 0;
    currentCount.innerText = data.results ? data.results.length : 0;

    // Configurar botones
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
   ACCIÓN: WHATSAPP
   ========================================== */
const sendWhatsApp = (phone, name) => {
    if (!phone || phone === 'null' || phone === '') {
        alert("El paciente no tiene un número de celular registrado en KyM Lens.");
        return;
    }

    // Mensaje profesional para Óptica KyM Lens
    const msg = `Hola ${name}, te saluda Martí de Óptica KyM Lens. 👋 Te escribimos porque ya pasó un año desde tu último examen. Es importante verificar tu medida para cuidar tu salud visual. ¿Te gustaría agendar un control gratuito esta semana?`;

    // Limpiar el teléfono (quitar espacios o guiones si los hay)
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/51${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');

    // Incrementar contador de contactados hoy (visual)
    const countDone = document.getElementById('count-done');
    countDone.innerText = parseInt(countDone.innerText) + 1;
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