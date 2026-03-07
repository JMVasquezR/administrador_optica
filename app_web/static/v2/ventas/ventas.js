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

    // 2. Carga inicial de la tabla principal
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

    // 5. Evento Botón Ejecutar Anulación
    document.getElementById('btn-execute-anular').addEventListener('click', () => {
        if (idParaAnular) anularBoleta(idParaAnular);
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

            // Martí: Destruimos instancias previas de Select2 para evitar fallos de renderizado
            if ($.fn.select2) {
                if ($('#sale-patient').data('select2')) $('#sale-patient').select2('destroy');
                if ($('#sale-product-search').data('select2')) $('#sale-product-search').select2('destroy');
            }

            loadPatientsAndProducts();
        });
    }

    document.getElementById('btn-add-product').addEventListener('click', addProductRow);
    document.getElementById('sale-form').addEventListener('submit', saveSale);
});

/* ==========================================
   LÓGICA DEL BUSCADOR (SELECT2 + API)
   ========================================== */

const loadPatientsAndProducts = async () => {
    try {
        // 1. Cargamos datos iniciales (Top 5) para que no aparezcan vacíos
        const [prodRes, patRes] = await Promise.all([
            fetch('/api/products/?limit=5'),
            fetch('/api/patients/?limit=5')
        ]);

        const dataProd = await prodRes.json();
        const dataPat = await patRes.json();

        // Mapeo inicial para Productos
        const initialProducts = (dataProd.results ? dataProd.results : dataProd).map(p => ({
            id: p.id,
            text: `${p.name} - S/.${parseFloat(p.unit_price).toFixed(2)}`,
            price: p.unit_price
        }));

        // Mapeo inicial para Pacientes
        const initialPatients = (dataPat.results ? dataPat.results : dataPat).map(p => ({
            id: p.id,
            text: `${p.full_name} (${p.document_number})`
        }));

        setTimeout(() => {
            // --- SELECT2 PRODUCTOS (Top 5 + Búsqueda AJAX) ---
            $('#sale-product-search').select2({
                theme: 'default',
                width: '100%',
                dropdownParent: $('#modalSale'),
                placeholder: 'Seleccione o busque producto...',
                data: initialProducts,
                minimumInputLength: 0,
                ajax: {
                    url: '/api/products/',
                    dataType: 'json',
                    delay: 300,
                    data: (params) => ({ search: params.term, page: params.page || 1 }),
                    processResults: (data) => ({
                        results: data.results.map(p => ({
                            id: p.id,
                            text: `${p.name} - S/.${parseFloat(p.unit_price).toFixed(2)}`,
                            price: p.unit_price
                        })),
                        pagination: { more: !!data.next }
                    }),
                    cache: true
                }
            });

            // --- SELECT2 PACIENTES (Top 5 + Búsqueda AJAX) ---
            $('#sale-patient').select2({
                theme: 'default',
                width: '100%',
                dropdownParent: $('#modalSale'),
                placeholder: 'Seleccione o busque paciente...',
                data: initialPatients, // Martí: Aquí cargan los 5 primeros pacientes
                minimumInputLength: 0, // Ahora permite ver la lista sin escribir
                ajax: {
                    url: '/api/patients/',
                    dataType: 'json',
                    delay: 300,
                    data: (params) => ({ search: params.term, page: params.page || 1 }),
                    processResults: (data) => ({
                        results: data.results.map(p => ({
                            id: p.id,
                            text: `${p.full_name} (${p.document_number})`
                        })),
                        pagination: { more: !!data.next }
                    }),
                    cache: true
                }
            });
        }, 200);

    } catch (err) {
        console.error("Error cargando componentes:", err);
    }
};

/* ==========================================
   LÓGICA DEL CARRITO DE VENTAS
   ========================================== */

function addProductRow() {
    // Obtenemos el producto seleccionado de Select2
    const data = $('#sale-product-search').select2('data')[0];

    if (!data || !data.id) {
        showNotify("Seleccione un producto primero", "danger");
        return;
    }

    const productId = data.id;
    const name = data.text.split(' - ')[0];
    // Recuperamos el precio que guardamos en la propiedad 'price' en processResults
    const price = parseFloat(data.price);

    const existing = selectedProducts.find(p => p.product === productId);
    if (existing) {
        existing.quantity += 1;
        existing.amount = existing.quantity * existing.unit_price;
    } else {
        selectedProducts.push({
            product: productId,
            name: name,
            quantity: 1,
            unit_price: price,
            amount: price
        });
    }
    renderDetailTable();

    // Limpiar el buscador después de añadir
    $('#sale-product-search').val(null).trigger('change');
}

function renderDetailTable() {
    const tbody = document.getElementById('sale-details-body');
    tbody.innerHTML = selectedProducts.map((p, index) => `
        <tr>
            <td class="align-middle">${p.name}</td>
            <td style="width: 100px;">
                <input type="number" class="form-control form-control-sm text-center" 
                       value="${p.quantity}" min="1" onchange="updateQty(${index}, this.value)">
            </td>
            <td style="width: 150px;">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">S/</span>
                    <input type="number" class="form-control text-end fw-bold text-danger" 
                           value="${p.unit_price.toFixed(2)}" step="0.50" 
                           onchange="updatePrice(${index}, this.value)">
                </div>
            </td>
            <td class="text-end align-middle fw-bold" style="width: 120px;">
                S/. ${p.amount.toFixed(2)}
            </td>
            <td class="text-center align-middle">
                <button type="button" class="btn btn-sm text-danger" onclick="removeRow(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`).join('');
    updateTotal();
}

function updatePrice(index, val) {
    const newPrice = parseFloat(val);
    if (isNaN(newPrice) || newPrice < 0) return;
    selectedProducts[index].unit_price = newPrice;
    selectedProducts[index].amount = selectedProducts[index].quantity * newPrice;
    renderDetailTable();
}

function updateQty(index, val) {
    const newQty = parseInt(val);
    if (isNaN(newQty) || newQty < 1) return;
    selectedProducts[index].quantity = newQty;
    selectedProducts[index].amount = newQty * selectedProducts[index].unit_price;
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

/* ==========================================
   LISTADO Y FILTROS
   ========================================== */

const fetchSales = async (url = '/api/sales-tickets/') => {
    try {
        const response = await fetch(url);
        const data = await response.json();
        renderSalesTable(data.results);
        setupPagination(data);
        const counter = document.getElementById('total-count');
        if (counter) counter.innerText = data.count;
    } catch (error) {
        console.error('Error fetch:', error);
    }
};

const applyFilters = () => {
    const ballot = document.getElementById('ballot-search').value;
    const patient = document.getElementById('patient-search-filter').value;
    const date = document.getElementById('date-filter').value;
    let params = new URLSearchParams();
    if (ballot) params.append('search', ballot);
    else if (patient) params.append('search', patient);
    if (date) params.append('date_of_issue', date);
    fetchSales(`/api/sales-tickets/?${params.toString()}`);
};

const renderSalesTable = (tickets) => {
    const tableBody = document.getElementById('sales-table-body');
    let html = '';
    if (!tickets || tickets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No hay ventas registradas</td></tr>`;
        return;
    }
    tickets.forEach(t => {
        html += `
            <tr ${t.is_disabled ? 'style="opacity: 0.6;"' : ''}>
                <td class="ps-4"><b>${t.ballot_number}</b></td>
                <td>${t.date_of_issue}</td>
                <td>${t.name_patient}</td>
                <td class="text-center text-danger fw-bold">${t.total_bill}</td>
                <td class="text-center">
                    <span class="badge ${t.is_disabled ? 'bg-secondary' : 'bg-success'} rounded-pill">
                        ${t.is_disabled ? 'Anulada' : 'Vigente'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-dark" onclick="viewSaleDetail(${t.id})"><i class="fa-solid fa-eye"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="printTicket(${t.id})"><i class="fa-solid fa-print"></i></button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="${t.is_disabled ? '' : `confirmAnular(${t.id}, '${t.ballot_number}')`}"><i class="fa-solid fa-ban"></i></button>
                    </div>
                </td>
            </tr>`;
    });
    tableBody.innerHTML = html;
};

/* ==========================================
   GUARDADO Y UTILIDADES
   ========================================== */

async function saveSale(e) {
    e.preventDefault();
    if (selectedProducts.length === 0) {
        showNotify('Agregue productos a la boleta', 'danger');
        return;
    }

    const btn = document.getElementById('btn-save-sale');
    btn.disabled = true;

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
            showNotify('Error al guardar la venta', 'danger');
        }
    } catch (e) {
        showNotify('Error de conexión', 'danger');
    } finally {
        btn.disabled = false;
    }
}

const showNotify = (msg, type) => {
    const toastEl = document.getElementById('liveToast');
    const toastMsg = document.getElementById('toast-message');
    if (!toastEl) return;
    toastEl.classList.remove('bg-success', 'bg-danger');
    toastEl.classList.add(`bg-${type}`);
    toastMsg.innerText = msg;
    new bootstrap.Toast(toastEl).show();
};

const setupPagination = (data) => {
    const nextBtn = document.getElementById('next-page');
    const prevBtn = document.getElementById('prev-page');
    const currentSpan = document.getElementById('current-count');

    if (currentSpan) currentSpan.innerText = data.results ? data.results.length : 0;
    if (nextBtn) {
        nextBtn.disabled = !data.next;
        nextBtn.onclick = () => data.next && fetchSales(data.next);
    }
    if (prevBtn) {
        prevBtn.disabled = !data.previous;
        prevBtn.onclick = () => data.previous && fetchSales(data.previous);
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
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

/* ==========================================
   LÓGICA DE DETALLE Y ANULACIÓN (CORREGIDA)
   ========================================== */

const viewSaleDetail = async (id) => {
    try {
        const response = await fetch(`/api/sales-tickets/${id}/`);
        if (!response.ok) throw new Error("No se encontró la boleta");

        const sale = await response.json();

        console.log(sale)

        // Llenar encabezados del modal
        document.getElementById('detail-ballot-number').innerText = sale.ballot_number;
        document.getElementById('detail-patient-name').innerText = sale.name_patient;
        document.getElementById('detail-date').innerText = sale.date_of_issue;
        document.getElementById('detail-total').innerText = sale.total_bill;
        document.getElementById('detail-observations').innerText = sale.observation || 'Sin observaciones.';

        // Estado con colores
        const statusBadge = document.getElementById('detail-status');
        statusBadge.innerText = sale.is_disabled ? 'ANULADA' : 'VIGENTE';
        statusBadge.className = sale.is_disabled ? 'badge bg-secondary' : 'badge bg-success';

        // Llenar la tabla de productos dentro del detalle
        const itemsBody = document.getElementById('detail-items-body');
        itemsBody.innerHTML = sale.lines.map(item => `
            <tr>
                <td>${item.product_name || 'Producto'}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">S/. ${parseFloat(item.unit_price).toFixed(2)}</td>
                <td class="text-end fw-bold">S/. ${parseFloat(item.amount).toFixed(2)}</td>
            </tr>`).join('');

        // Mostrar el modal
        detailModal.show();
    } catch (error) {
        console.error("Error:", error);
        showNotify("No se pudo cargar el detalle de la boleta", "danger");
    }
};

const confirmAnular = (id, number) => {
    idParaAnular = id;
    document.getElementById('text-ballot-number').innerText = number;
    confirmAnularModal.show();
};

const anularBoleta = async (id) => {
    const btn = document.getElementById('btn-execute-anular');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Anulando...';

    try {
        const response = await fetch(`/api/sales-tickets/${id}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ is_disabled: true })
        });

        if (response.ok) {
            confirmAnularModal.hide();
            showNotify('Boleta anulada con éxito', 'success');
            fetchSales(); // Recargar la tabla principal
        } else {
            showNotify('Error al intentar anular la boleta', 'danger');
        }
    } catch (error) {
        showNotify('Error de conexión con el servidor', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Anular permanentemente';
        idParaAnular = null;
    }
};