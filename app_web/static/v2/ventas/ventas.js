/* ==========================================
   VARIABLES GLOBALES E INICIALIZACIÓN
   ========================================== */
let saleModal, detailModal, confirmAnularModal;
let idParaAnular = null;
let selectedProducts = [];

// El rol viene desde el template de Django (base.html)
const CURRENT_USER_ROL = typeof USER_ROL !== 'undefined' ? USER_ROL : 'GUEST';

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
    // Inicializar Modales
    saleModal = new bootstrap.Modal(document.getElementById('modalSale'));
    detailModal = new bootstrap.Modal(document.getElementById('modalViewDetail'));
    confirmAnularModal = new bootstrap.Modal(document.getElementById('modalConfirmAnular'));

    initSales();

    // Filtros
    document.getElementById('ballot-search').addEventListener('input', debounce(() => applyFilters(), 500));
    document.getElementById('patient-search-filter').addEventListener('input', debounce(() => applyFilters(), 500));
    document.getElementById('date-filter').addEventListener('change', () => applyFilters());

    document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
        document.getElementById('ballot-search').value = '';
        document.getElementById('patient-search-filter').value = '';
        document.getElementById('date-filter').value = '';
        applyFilters();
    });

    // Acción de Anular (Solo Admin)
    document.getElementById('btn-execute-anular').addEventListener('click', () => {
        if (idParaAnular) anularBoleta(idParaAnular);
    });

    // Resetear modal al abrir Nueva Venta
    document.querySelector('[data-bs-target="#modalSale"]')?.addEventListener('click', () => {
        document.getElementById('sale-form').reset();
        document.getElementById('sale-details-body').innerHTML = '';
        document.getElementById('sale-date').valueAsDate = new Date();
        selectedProducts = [];
        updateTotal();
        loadPatientsAndProducts();
    });

    document.getElementById('btn-add-product').addEventListener('click', addProductRow);
    document.getElementById('sale-form').addEventListener('submit', saveSale);
});

const initSales = async () => {
    showGlobalLoader();
    try {
        await fetchSales();
    } finally {
        hideGlobalLoader();
    }
};

/* ==========================================
   SELECT2: BUSCADORES DINÁMICOS
   ========================================== */
const loadPatientsAndProducts = () => {
    $('#sale-product-search').select2({
        theme: 'default',
        width: '100%',
        dropdownParent: $('#modalSale'),
        placeholder: 'Busca montura, luna o accesorio...',
        ajax: {
            url: '/api/products/',
            dataType: 'json',
            delay: 300,
            data: (params) => ({search: params.term, page: params.page || 1}),
            processResults: (data) => ({
                results: data.results.map(p => {
                            // Martí: Si brand_name existe, lo concatena, si no, usa solo el nombre
                            const displayName = p.brand_name ? `${p.brand_name} ${p.name}` : p.name;

                            return {
                                id: p.id,
                                text: `${displayName} - S/.${parseFloat(p.unit_price).toFixed(2)}`,
                                price: p.unit_price
                            };
                        }),
                pagination: {more: !!data.next}
            })
        }
    });

    $('#sale-patient').select2({
        theme: 'default',
        width: '100%',
        dropdownParent: $('#modalSale'),
        placeholder: 'Seleccione paciente o deje vacío...',
        allowClear: true,
        ajax: {
            url: '/api/patients/',
            dataType: 'json',
            delay: 300,
            data: (params) => ({search: params.term, page: params.page || 1}),
            processResults: (data) => ({
                results: data.results.map(p => ({
                    id: p.id,
                    text: `${p.full_name} (${p.document_number})`
                })),
                pagination: {more: !!data.next}
            })
        }
    });
};

/* ==========================================
   CARRITO DE PRODUCTOS
   ========================================== */
function addProductRow() {
    const data = $('#sale-product-search').select2('data')[0];
    if (!data?.id) return showNotify("Seleccione un producto", "danger");

    const existing = selectedProducts.find(p => p.product === data.id);
    if (existing) {
        existing.quantity += 1;
        existing.amount = existing.quantity * existing.unit_price;
    } else {
        selectedProducts.push({
            product: data.id,
            name: data.text.split(' - ')[0],
            quantity: 1,
            unit_price: parseFloat(data.price),
            amount: parseFloat(data.price)
        });
    }
    renderDetailTable();
    $('#sale-product-search').val(null).trigger('change');
}

function renderDetailTable() {
    const body = document.getElementById('sale-details-body');
    body.innerHTML = selectedProducts.map((p, i) => `
        <tr>
            <td class="align-middle small">${p.name}</td>
            <td style="width: 80px;">
                <input type="number" class="form-control form-control-sm text-center" value="${p.quantity}" min="1" onchange="updateQty(${i}, this.value)">
            </td>
            <td style="width: 140px;">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">S/</span>
                    <input type="number" class="form-control text-end fw-bold" value="${p.unit_price.toFixed(2)}" step="0.10" onchange="updatePrice(${i}, this.value)">
                </div>
            </td>
            <td class="text-end align-middle fw-bold">S/ ${p.amount.toFixed(2)}</td>
            <td class="text-center">
                <button type="button" class="btn btn-sm text-danger" onclick="removeRow(${i})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');
    updateTotal();
}

window.updatePrice = (i, v) => {
    selectedProducts[i].unit_price = parseFloat(v) || 0;
    selectedProducts[i].amount = selectedProducts[i].quantity * selectedProducts[i].unit_price;
    renderDetailTable();
};

window.updateQty = (i, v) => {
    selectedProducts[i].quantity = parseInt(v) || 1;
    selectedProducts[i].amount = selectedProducts[i].quantity * selectedProducts[i].unit_price;
    renderDetailTable();
};

window.removeRow = (i) => {
    selectedProducts.splice(i, 1);
    renderDetailTable();
};

function updateTotal() {
    const total = selectedProducts.reduce((sum, p) => sum + p.amount, 0);
    document.getElementById('sale-total-display').innerText = `S/ ${total.toFixed(2)}`;
}

/* ==========================================
   API: GUARDADO Y LISTADO
   ========================================== */
async function saveSale(e) {
    e.preventDefault();
    const patientId = document.getElementById('sale-patient').value;
    const payerName = document.getElementById('sale-payer-name').value.trim();

    if (!patientId && !payerName) return showNotify('Identifique al paciente o pagador', 'danger');
    if (selectedProducts.length === 0) return showNotify('Carrito vacío', 'danger');

    showGlobalLoader();
    const saleData = {
        patient: patientId || null,
        payer_name: payerName || null,
        date_of_issue: document.getElementById('sale-date').value,
        observation: document.getElementById('sale-observation').value,
        lines: selectedProducts.map(p => ({
            product: p.product,
            quantity: p.quantity,
            unit_price: p.unit_price,
            amount: p.amount
        }))
    };

    try {
        const response = await fetch('/api/sales-tickets/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify(saleData)
        });

        if (response.ok) {
            saleModal.hide();
            await fetchSales();
            showNotify('¡Venta registrada con éxito!', 'success');
        } else {
            showNotify('Error al guardar la venta', 'danger');
        }
    } finally {
        hideGlobalLoader();
    }
}

const fetchSales = async (url = '/api/sales-tickets/') => {
    try {
        const response = await fetch(url);
        const data = await response.json();
        renderSalesTable(data.results);
        setupPagination(data);
    } catch (error) {
        console.error(error);
    }
};

const renderSalesTable = (tickets) => {
    const tableBody = document.getElementById('sales-table-body');
    if (!tickets?.length) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No hay ventas registradas</td></tr>`;
        return;
    }

    tableBody.innerHTML = tickets.map(t => {
        // SEGURIDAD: Solo el ADMIN puede anular
        const isAllowedToAnular = (CURRENT_USER_ROL === 'ADMIN');
        const canExecuteAnular = isAllowedToAnular && !t.is_disabled;

        return `
            <tr ${t.is_disabled ? 'style="opacity: 0.6;"' : ''}>
                <td class="ps-4 fw-bold text-danger">${t.ballot_number}</td>
                <td>${t.date_of_issue}</td>
                <td>
                    <div class="fw-bold small">${t.payer_name || t.name_patient || 'Genérico'}</div>
                    <small class="text-muted italic">${t.payer_name ? `P: ${t.name_patient || '---'}` : ''}</small>
                </td>
                <td class="text-center fw-bold">${t.total_bill}</td>
                <td class="text-center">
                    <span class="badge ${t.is_disabled ? 'bg-secondary' : 'bg-success'} rounded-pill x-small">
                        ${t.is_disabled ? 'Anulada' : 'Vigente'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-dark" onclick="viewSaleDetail(${t.id})"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm ${canExecuteAnular ? 'btn-outline-danger' : 'btn-light text-muted opacity-50'}" 
                                ${canExecuteAnular ? `onclick="confirmAnular(${t.id}, '${t.ballot_number}')"` : 'disabled'} 
                                title="${isAllowedToAnular ? 'Anular boleta' : 'Solo Admin puede anular'}">
                            <i class="fas fa-ban"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');
};

/* ==========================================
   ANULACIÓN Y DETALLE
   ========================================== */
window.viewSaleDetail = async (id) => {
    showGlobalLoader();
    try {
        const response = await fetch(`/api/sales-tickets/${id}/`);
        const sale = await response.json();

        document.getElementById('detail-ballot-number').innerText = sale.ballot_number;
        document.getElementById('detail-patient-name').innerText = sale.name_patient || 'Sin registro';
        document.getElementById('detail-payer-name').innerText = sale.payer_name || sale.name_patient || 'Genérico';
        document.getElementById('detail-date').innerText = sale.date_of_issue;
        document.getElementById('detail-total').innerText = `S/ ${sale.total_bill}`;
        document.getElementById('detail-observations').innerText = sale.observation || 'Sin notas adicionales.';

        const itemsBody = document.getElementById('detail-items-body');
        itemsBody.innerHTML = sale.lines.map(item => `
            <tr>
                <td class="small">${item.product_name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end small">S/ ${parseFloat(item.unit_price).toFixed(2)}</td>
                <td class="text-end fw-bold small">S/ ${parseFloat(item.amount).toFixed(2)}</td>
            </tr>
        `).join('');
        detailModal.show();
    } finally {
        hideGlobalLoader();
    }
};

window.confirmAnular = (id, number) => {
    idParaAnular = id;
    document.getElementById('text-ballot-number').innerText = number;
    confirmAnularModal.show();
};

const anularBoleta = async (id) => {
    if (CURRENT_USER_ROL !== 'ADMIN') {
        showNotify("Acceso denegado: Solo el Administrador puede anular.", "danger");
        confirmAnularModal.hide();
        return;
    }

    showGlobalLoader();
    try {
        const response = await fetch(`/api/sales-tickets/${id}/`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify({is_disabled: true})
        });
        if (response.ok) {
            confirmAnularModal.hide();
            await fetchSales();
            showNotify('Boleta anulada', 'success');
        }
    } finally {
        idParaAnular = null;
        hideGlobalLoader();
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

const showNotify = (msg, type) => {
    const toastEl = document.getElementById('liveToast');
    document.getElementById('toast-message').innerText = msg;
    toastEl.classList.remove('bg-success', 'bg-danger');
    toastEl.classList.add(`bg-${type}`);
    new bootstrap.Toast(toastEl).show();
};

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), timeout);
    };
}

const applyFilters = async () => {
    showTableLoading();
    const ballot = document.getElementById('ballot-search').value;
    const patient = document.getElementById('patient-search-filter').value;
    const date = document.getElementById('date-filter').value;

    let params = new URLSearchParams();
    if (ballot) params.append('search', ballot);
    if (patient) params.append('search', patient);
    if (date) params.append('date_of_issue', date);

    await fetchSales(`/api/sales-tickets/?${params.toString()}`);
    hideTableLoading();
};

const setupPagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    document.getElementById('total-count').innerText = data.count || 0;
    document.getElementById('current-count').innerText = data.results?.length || 0;

    if (nextBtn) {
        nextBtn.disabled = !data.next;
        nextBtn.onclick = () => data.next && fetchSales(data.next);
    }
    if (prevBtn) {
        prevBtn.disabled = !data.previous;
        prevBtn.onclick = () => data.previous && fetchSales(data.previous);
    }
};