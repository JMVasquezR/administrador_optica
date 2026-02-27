/* ==========================================
   VARIABLES GLOBALES E INICIALIZACIÓN
   ========================================== */
let saleModal;
let detailModal;
let confirmAnularModal;
let idParaAnular = null;
let selectedProducts = []; // Carrito temporal de productos

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar componentes de Bootstrap
    saleModal = new bootstrap.Modal(document.getElementById('modalSale'));
    detailModal = new bootstrap.Modal(document.getElementById('modalViewDetail'));
    confirmAnularModal = new bootstrap.Modal(document.getElementById('modalConfirmAnular'));

    // 2. Carga inicial de la tabla
    fetchSales();

    // 3. Eventos de Filtros (Buscadores del Listado)
    document.getElementById('ballot-search').addEventListener('input', debounce(() => applyFilters(), 500));
    document.getElementById('patient-search-filter').addEventListener('input', debounce(() => applyFilters(), 500));
    document.getElementById('date-filter').addEventListener('change', () => applyFilters());

    // 4. Evento Botón Limpiar Filtros
    const btnClear = document.getElementById('btn-clear-filters');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            document.getElementById('ballot-search').value = '';
            document.getElementById('patient-search-filter').value = '';
            document.getElementById('date-filter').value = '';
            fetchSales('/api/sales-tickets/');
        });
    }

    // 5. Evento Botón Ejecutar Anulación (Dentro del Modal)
    document.getElementById('btn-execute-anular').addEventListener('click', () => {
        if (idParaAnular) anularRecetario(idParaAnular);
    });

    // 6. Eventos del Modal "Nueva Venta"
    const btnOpenModal = document.querySelector('[data-bs-target="#modalSale"]');
    if (btnOpenModal) {
        btnOpenModal.addEventListener('click', () => {
            document.getElementById('sale-form').reset();
            document.getElementById('sale-details-body').innerHTML = '';
            document.getElementById('sale-date').valueAsDate = new Date();
            selectedProducts = [];
            updateTotal();
            loadPatientsAndProducts();
        });
    }

    document.getElementById('btn-add-product').addEventListener('click', addProductRow);
    document.getElementById('sale-form').addEventListener('submit', saveSale);
});

/* ==========================================
   LÓGICA DEL LISTADO (TABLA PRINCIPAL)
   ========================================== */

const fetchSales = async (url = '/api/sales-tickets/') => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error en el servidor');
        const data = await response.json();

        renderSalesTable(data.results);
        setupPagination(data);
        document.getElementById('count-tickets').innerText = data.count;
    } catch (error) {
        console.error('Error cargando ventas:', error);
    }
};

const applyFilters = () => {
    const ballotQuery = document.getElementById('ballot-search').value;
    const patientQuery = document.getElementById('patient-search-filter').value;
    const dateQuery = document.getElementById('date-filter').value;

    let params = new URLSearchParams();
    if (ballotQuery) params.append('search', ballotQuery);
    else if (patientQuery) params.append('search', patientQuery);
    if (dateQuery) params.append('date_of_issue', dateQuery);

    fetchSales(`/api/sales-tickets/?${params.toString()}`);
};

const renderSalesTable = (tickets) => {
    const tableBody = document.getElementById('sales-table-body');
    let html = '';

    if (!tickets || tickets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No se encontraron boletas</td></tr>`;
        return;
    }

    tickets.forEach(t => {
        const opacityClass = t.is_disabled ? 'style="opacity: 0.6;"' : '';
        html += `
            <tr ${opacityClass}>
                <td class="ps-4"><span class="text-ballot">${t.ballot_number}</span></td>
                <td class="small">${t.date_of_issue}</td>
                <td><div class="fw-bold">${t.name_patient}</div></td>
                <td class="text-center"><span class="badge badge-total">${t.total_bill}</span></td>
                <td class="text-center">
                    <i class="fa-solid fa-circle ${t.is_disabled ? 'text-secondary' : 'text-success'}"></i>
                    <small class="text-muted d-block" style="font-size: 0.7rem;">${t.is_disabled ? 'Anulada' : 'Vigente'}</small>
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-dark" onclick="viewSaleDetail(${t.id})" title="Ver detalle">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="printTicket(${t.id})" title="Imprimir">
                        <i class="fa-solid fa-print"></i>
                    </button>
                    <button class="btn btn-sm ${t.is_disabled ? 'btn-light disabled' : 'btn-outline-secondary'}" 
                            onclick="${t.is_disabled ? '' : `confirmAnular(${t.id}, '${t.ballot_number}')`}" 
                            title="Anular Boleta">
                        <i class="fa-solid fa-ban"></i>
                    </button>
                </td>
            </tr>`;
    });
    tableBody.innerHTML = html;
};

/* ==========================================
   LÓGICA DE DETALLE Y ANULACIÓN PRO
   ========================================== */

const viewSaleDetail = async (id) => {
    try {
        const response = await fetch(`/api/sales-tickets/${id}/`);
        const sale = await response.json();

        document.getElementById('detail-ballot-number').innerText = sale.ballot_number;
        document.getElementById('detail-patient-name').innerText = sale.name_patient;
        document.getElementById('detail-date').innerText = sale.date_of_issue;
        document.getElementById('detail-total').innerText = sale.total_bill;
        document.getElementById('detail-observations').innerText = sale.observation || 'Sin observaciones.';

        const statusBadge = document.getElementById('detail-status');
        statusBadge.innerText = sale.is_disabled ? 'ANULADA' : 'VIGENTE';
        statusBadge.className = sale.is_disabled ? 'badge bg-secondary' : 'badge bg-success';

        const itemsBody = document.getElementById('detail-items-body');
        itemsBody.innerHTML = sale.lines.map(item => `
            <tr>
                <td>${item.product_name || 'Producto'}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">S/. ${parseFloat(item.unit_price).toFixed(2)}</td>
                <td class="text-end fw-bold">S/. ${parseFloat(item.amount).toFixed(2)}</td>
            </tr>`).join('');

        detailModal.show();
    } catch (error) {
        showNotify("No se pudo cargar el detalle", "danger");
    }
};

const confirmAnular = (id, number) => {
    idParaAnular = id;
    document.getElementById('text-ballot-number').innerText = number;
    confirmAnularModal.show();
};

const anularRecetario = async (id) => {
    const btn = document.getElementById('btn-execute-anular');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Anulando...';

    try {
        const response = await fetch(`/api/sales-tickets/${id}/`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken')},
            body: JSON.stringify({is_disabled: true})
        });
        if (response.ok) {
            confirmAnularModal.hide();
            showNotify('Boleta anulada con éxito', 'success');
            fetchSales();
        } else {
            showNotify('Error al intentar anular', 'danger');
        }
    } catch (error) {
        showNotify('Error de conexión', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Anular permanentemente';
        idParaAnular = null;
    }
};

/* ==========================================
   LÓGICA DEL MODAL NUEVA VENTA
   ========================================== */

const loadPatientsAndProducts = async () => {
    try {
        const [patRes, prodRes] = await Promise.all([fetch('/api/patients/'), fetch('/api/products/')]);
        const patients = await patRes.json();
        const products = await prodRes.json();

        document.getElementById('sale-patient').innerHTML = '<option value="">Buscar paciente...</option>' +
            patients.results.map(p => `<option value="${p.id}">${p.full_name} (${p.document_number})</option>`).join('');

        document.getElementById('sale-product-search').innerHTML = '<option value="">Seleccione un producto...</option>' +
            products.results.map(p => `<option value="${p.id}" data-price="${p.unit_price}">${p.name} - S/.${p.unit_price}</option>`).join('');
    } catch (err) {
        console.error("Error cargando selects:", err);
    }
};

function addProductRow() {
    const select = document.getElementById('sale-product-search');
    const option = select.options[select.selectedIndex];
    if (!option.value) return;

    const productId = option.value;
    const name = option.text.split(' - ')[0];
    const price = parseFloat(option.getAttribute('data-price'));

    const existing = selectedProducts.find(p => p.product === productId);
    if (existing) {
        existing.quantity += 1;
        existing.amount = existing.quantity * existing.unit_price;
    } else {
        selectedProducts.push({product: productId, name: name, quantity: 1, unit_price: price, amount: price});
    }
    renderDetailTable();
}

function renderDetailTable() {
    const tbody = document.getElementById('sale-details-body');
    tbody.innerHTML = selectedProducts.map((p, index) => `
        <tr>
            <td>${p.name}</td>
            <td><input type="number" class="form-control form-control-sm" value="${p.quantity}" min="1" onchange="updateQty(${index}, this.value)"></td>
            <td>S/. ${p.unit_price.toFixed(2)}</td>
            <td class="fw-bold">S/. ${p.amount.toFixed(2)}</td>
            <td><button type="button" class="btn btn-sm text-danger" onclick="removeRow(${index})"><i class="fas fa-trash"></i></button></td>
        </tr>`).join('');
    updateTotal();
}

function updateQty(index, val) {
    selectedProducts[index].quantity = parseInt(val);
    selectedProducts[index].amount = selectedProducts[index].quantity * selectedProducts[index].unit_price;
    renderDetailTable();
}

function removeRow(index) {
    selectedProducts.splice(index, 1);
    renderDetailTable();
}

function updateTotal() {
    const total = selectedProducts.reduce((sum, p) => sum + p.amount, 0);
    document.getElementById('sale-total-display').innerText = `S/. ${total.toFixed(2)}`;
}

async function saveSale(e) {
    e.preventDefault();
    if (selectedProducts.length === 0) {
        showNotify('Agregue productos a la boleta', 'danger');
        return;
    }

    const btn = document.getElementById('btn-save-sale');
    const spinner = document.getElementById('save-sale-spinner');
    const icon = document.getElementById('save-sale-icon');
    const btnText = document.getElementById('save-sale-text');

    btn.disabled = true;
    spinner.classList.remove('d-none');
    icon.classList.add('d-none');
    btnText.innerText = 'Procesando...';

    const saleData = {
        patient: document.getElementById('sale-patient').value,
        date_of_issue: document.getElementById('sale-date').value,
        observation: document.getElementById('sale-observation').value,
        sales_total: selectedProducts.reduce((sum, p) => sum + p.amount, 0),
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
            fetchSales();
            showNotify('¡Boleta generada con éxito!', 'success');
        } else {
            const err = await response.json();
            showNotify('Error al guardar: ' + JSON.stringify(err), 'danger');
        }
    } catch (error) {
        showNotify('Error de conexión con el servidor', 'danger');
    } finally {
        btn.disabled = false;
        spinner.classList.add('d-none');
        icon.classList.remove('d-none');
        btnText.innerText = 'Generar Boleta';
    }
}

/* ==========================================
   UTILIDADES
   ========================================== */

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
        nextBtn.onclick = () => fetchSales(data.next);
    } else {
        nextBtn.disabled = true;
    }

    // Configurar botón Anterior
    if (data.previous) {
        prevBtn.disabled = false;
        prevBtn.onclick = () => fetchSales(data.previous);
    } else {
        prevBtn.disabled = true;
    }
};

const showNotify = (message, type = 'success') => {
    const toastEl = document.getElementById('liveToast');
    const toastMessage = document.getElementById('toast-message');
    toastEl.classList.remove('bg-success', 'bg-danger');
    toastEl.classList.add(type === 'success' ? 'bg-success' : 'bg-danger');
    toastMessage.innerText = message;
    new bootstrap.Toast(toastEl).show();
};

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

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