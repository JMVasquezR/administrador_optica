// Navigation functionality
function showSection(sectionName) {
    console.log("Mostrando sección:", sectionName)

    // Ocultar todas las secciones
    const sections = document.querySelectorAll(".content-section")
    sections.forEach((section) => {
        section.style.display = "none"
    })

    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionName + "-section")
    if (targetSection) {
        targetSection.style.display = "block"
        console.log("Sección mostrada:", sectionName)

        // Si es la sección de productos, cargar la primera página
        if (sectionName === "products") {
            const productsList = document.getElementById("products-list")
            const addProductForm = document.getElementById("add-product-form")
            const editProductForm = document.getElementById("edit-product-form")

            // Asegurar que se muestre la lista y se oculten los formularios
            if (productsList) productsList.style.display = "block"
            if (addProductForm) addProductForm.style.display = "none"
            if (editProductForm) editProductForm.style.display = "none"

            // Cargar productos de la primera página
            loadProductsFromServer(1)
        }

        // Si es la sección de clientes/pacientes, cargar la primera página
        if (sectionName === "clients") {
            const patientsList = document.getElementById("patients-list")
            const addPatientForm = document.getElementById("add-patient-form")
            const editPatientForm = document.getElementById("edit-patient-form")

            // Asegurar que se muestre la lista y se oculten los formularios
            if (patientsList) patientsList.style.display = "block"
            if (addPatientForm) addPatientForm.style.display = "none"
            if (editPatientForm) editPatientForm.style.display = "none"

            // Cargar pacientes de la primera página
            loadPatientsFromServer(1)
        }
    }
}

// Variables globales para paginación
let currentPage = 1
let totalItems = 0
let totalPages = 0
let currentProducts = []
let isLoading = false

// Variables para filtros
let currentFilters = {
    name: "", // Cambiar de 'search' a 'name'
    category: "",
    brand: "",
}

// Configuración de la API Django
const API_CONFIG = {
    baseURL: "http://127.0.0.1:8000/api", // Cambia esto por tu URL de API Django
    endpoints: {
        products: "/productos/", // Endpoint con paginación
        createProduct: "/productos/create/",
        updateProduct: "/productos",
        deleteProduct: "/productos", // Cambiaremos esto en la función
        categories: "/categorias/",
        brands: "/marcas/",
    },
    pageSize: 5, // Tamaño de página que maneja tu API
}

// Función para mostrar loading
function showLoading() {
    const tbody = document.getElementById("productsTableBody")
    if (!tbody) return

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-4">
                <div class="d-flex justify-content-center align-items-center">
                    <div class="spinner-border text-red-custom me-3" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                    <span class="text-muted">Cargando productos...</span>
                </div>
            </td>
        </tr>
    `
}

// Función para mostrar error
function showError(message) {
    const tbody = document.getElementById("productsTableBody")
    if (!tbody) return

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-4">
                <div class="text-danger">
                    <i class="fas fa-exclamation-triangle fs-2 mb-3"></i>
                    <h5>Error al cargar productos</h5>
                    <p class="mb-3">${message}</p>
                    <button class="btn btn-outline-red-custom" onclick="loadProductsFromServer(${currentPage})">
                        <i class="fas fa-refresh me-2"></i>
                        Reintentar
                    </button>
                </div>
            </td>
        </tr>
    `
}

// Función para construir URL con parámetros (versión corregida)
function buildApiUrl(page = 1, filters = {}) {
    // Construir la URL base
    let url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.products}`

    // Crear array de parámetros
    const params = []

    // Parámetros de paginación (solo agregar una vez)
    params.push(`page=${page}`)
    params.push(`page_size=${API_CONFIG.pageSize}`)

    // Parámetros de filtros (solo si tienen valor)
    if (filters.name && filters.name.trim()) {
        params.push(`name=${encodeURIComponent(filters.name.trim())}`)
    }
    if (filters.category && filters.category.trim()) {
        params.push(`category=${encodeURIComponent(filters.category.trim())}`)
    }
    if (filters.brand && filters.brand.trim()) {
        params.push(`brand=${encodeURIComponent(filters.brand.trim())}`)
    }

    // Agregar parámetros a la URL
    if (params.length > 0) {
        url += "?" + params.join("&")
    }

    console.log("URL construida:", url)
    return url
}

// Función para cargar productos desde el servidor (con paginación del servidor)
async function loadProductsFromServer(page = 1, filters = currentFilters) {
    if (isLoading) return

    isLoading = true
    currentPage = page
    currentFilters = {...filters}

    showLoading()

    try {
        const apiUrl = buildApiUrl(page, filters)
        console.log("Realizando petición AJAX a:", apiUrl)

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                // Agregar headers de autenticación si es necesario
                // 'Authorization': 'Bearer ' + token,
            },
        })

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`)
        }

        const data = await response.json()
        console.log("Respuesta de Django API:", data)

        // Procesar la respuesta de Django REST Framework
        totalItems = data.total_items || 0
        totalPages = data.total_pages || 0
        currentPage = data.current_page || 1

        // Mapear los productos al formato esperado
        currentProducts = data.results.map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description || "",
            code: product.code || "Sin código",
            unitMeasure: product.unit_measure,
            brand: product.brand || "Sin marca",
            price: Number.parseFloat(product.unit_price || 0),
            category: product.category,
            stock: Number.parseInt(product.initial_stock || 0),
            status: product.status,
            icon: getIconByCategory(product.category),
        }))

        console.log("Productos procesados:", currentProducts.length)
        console.log("Página actual:", currentPage, "de", totalPages)

        renderProducts(currentProducts)
        renderDjangoPagination(data)
    } catch (error) {
        console.error("Error al cargar productos:", error)
        showError(error.message)
    } finally {
        isLoading = false
    }
}

// Función para obtener icono según categoría
function getIconByCategory(category) {
    const icons = {
        "Gafas de Sol": "fas fa-glasses",
        "Lentes de Contacto": "fas fa-eye",
        Monturas: "fas fa-glasses",
        Accesorios: "fas fa-tools",
    }
    return icons[category] || "fas fa-glasses"
}

// Función para crear producto via AJAX
async function createProductOnServer(productData) {
    try {
        console.log("Creando producto en servidor:", productData)

        // Mapear datos al formato esperado por tu modelo Django
        const djangoData = {
            name: productData.name,
            code: productData.code || null,
            description: productData.description || "",
            unit_price: productData.price ? Number.parseFloat(productData.price) : null,
            category: Number.parseInt(productData.category), // ID de la categoría
            brand: productData.brand ? Number.parseInt(productData.brand) : null, // ID de la marca (puede ser null)
            unit_measure: productData.unitMeasure,
            initial_stock: Number.parseInt(productData.stock) || 0,
            status: productData.status === "active" ? true : false,
        }

        console.log("Datos mapeados para Django:", djangoData)

        const response = await fetch(API_CONFIG.baseURL + API_CONFIG.endpoints.createProduct, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                // Agregar CSRF token si es necesario
                "X-CSRFToken": getCookie("csrftoken"),
                // Agregar headers de autenticación si es necesario
                // 'Authorization': 'Bearer ' + localStorage.getItem('token'),
            },
            body: JSON.stringify(djangoData),
        })

        if (!response.ok) {
            let errorMessage = `Error HTTP: ${response.status}`

            try {
                const errorData = await response.json()
                console.log("Error del servidor:", errorData)

                // Manejar errores específicos de Django REST Framework
                if (errorData.detail) {
                    errorMessage = errorData.detail
                } else if (errorData.message) {
                    errorMessage = errorData.message
                } else if (typeof errorData === "object") {
                    // Manejar errores de validación de campos
                    const fieldErrors = []
                    for (const [field, errors] of Object.entries(errorData)) {
                        if (Array.isArray(errors)) {
                            fieldErrors.push(`${field}: ${errors.join(", ")}`)
                        } else {
                            fieldErrors.push(`${field}: ${errors}`)
                        }
                    }
                    if (fieldErrors.length > 0) {
                        errorMessage = fieldErrors.join("\n")
                    }
                }
            } catch (parseError) {
                console.log("No se pudo parsear el error como JSON")
            }

            throw new Error(errorMessage)
        }

        const result = await response.json()
        console.log("Producto creado exitosamente:", result)

        return result
    } catch (error) {
        console.error("Error al crear producto:", error)
        throw error
    }
}

// Función para eliminar producto via AJAX
async function deleteProductOnServer(productId) {
    try {
        console.log("Eliminando producto del servidor:", productId)

        // Usar el endpoint específico de eliminación
        const deleteUrl = `${API_CONFIG.baseURL}/productos/${productId}/delete/`
        console.log("URL de eliminación:", deleteUrl)

        const response = await fetch(deleteUrl, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                // Agregar CSRF token si es necesario
                "X-CSRFToken": getCookie("csrftoken"),
            },
        })

        console.log("Respuesta del servidor:", response.status, response.statusText)

        if (!response.ok) {
            let errorMessage = `Error HTTP: ${response.status} - ${response.statusText}`

            try {
                const errorData = await response.json()
                console.log("Error del servidor:", errorData)
                errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage
            } catch (parseError) {
                console.log("No se pudo parsear el error como JSON")
                // Si no se puede parsear como JSON, usar el texto de respuesta
                try {
                    const errorText = await response.text()
                    if (errorText) {
                        errorMessage = errorText
                    }
                } catch (textError) {
                    console.log("No se pudo obtener texto de respuesta")
                }
            }

            throw new Error(errorMessage)
        }

        // Manejar diferentes tipos de respuesta exitosa
        let result = {success: true, message: "Producto eliminado exitosamente"}

        // Si la respuesta tiene contenido (no es 204 No Content)
        if (response.status !== 204) {
            try {
                const responseData = await response.json()
                result = {...result, ...responseData}
            } catch (parseError) {
                // Si no se puede parsear como JSON, usar respuesta por defecto
                console.log("Respuesta exitosa pero no es JSON válido")
            }
        }

        console.log("Producto eliminado exitosamente:", result)
        return result
    } catch (error) {
        console.error("Error al eliminar producto:", error)
        throw error
    }
}

// Función para obtener detalle del producto via AJAX
async function getProductFromServer(productId) {
    try {
        console.log("Obteniendo producto del servidor:", productId)

        const response = await fetch(`${API_CONFIG.baseURL}/productos/${productId}/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        console.log("Respuesta del servidor:", response.status, response.statusText)

        if (!response.ok) {
            let errorMessage = `Error HTTP: ${response.status} - ${response.statusText}`

            try {
                const errorData = await response.json()
                console.log("Error del servidor:", errorData)
                errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage
            } catch (parseError) {
                console.log("No se pudo parsear el error como JSON")
            }

            throw new Error(errorMessage)
        }

        const product = await response.json()
        console.log("Producto obtenido exitosamente:", product)
        return product
    } catch (error) {
        console.error("Error al obtener producto:", error)
        throw error
    }
}

// Función para actualizar producto via AJAX
async function updateProductOnServer(productId, productData) {
    try {
        console.log("Actualizando producto en servidor:", productId, productData)

        // Mapear datos al formato esperado por tu modelo Django
        const djangoData = {
            name: productData.name,
            code: productData.code || null,
            description: productData.description || "",
            unit_price: productData.price ? Number.parseFloat(productData.price) : null,
            category: Number.parseInt(productData.category), // ID de la categoría
            brand: productData.brand ? Number.parseInt(productData.brand) : null, // ID de la marca (puede ser null)
            unit_measure: productData.unitMeasure,
            initial_stock: Number.parseInt(productData.stock) || 0,
            status: productData.status === "active" ? true : false,
        }

        console.log("Datos mapeados para Django:", djangoData)

        const response = await fetch(`${API_CONFIG.baseURL}/productos/${productId}/edit/`, {
            method: "PUT", // o "PATCH" dependiendo de tu API
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                // Agregar CSRF token si es necesario
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify(djangoData),
        })

        if (!response.ok) {
            let errorMessage = `Error HTTP: ${response.status}`

            try {
                const errorData = await response.json()
                console.log("Error del servidor:", errorData)

                // Manejar errores específicos de Django REST Framework
                if (errorData.detail) {
                    errorMessage = errorData.detail
                } else if (errorData.message) {
                    errorMessage = errorData.message
                } else if (typeof errorData === "object") {
                    // Manejar errores de validación de campos
                    const fieldErrors = []
                    for (const [field, errors] of Object.entries(errorData)) {
                        if (Array.isArray(errors)) {
                            fieldErrors.push(`${field}: ${errors.join(", ")}`)
                        } else {
                            fieldErrors.push(`${field}: ${errors}`)
                        }
                    }
                    if (fieldErrors.length > 0) {
                        errorMessage = fieldErrors.join("\n")
                    }
                }
            } catch (parseError) {
                console.log("No se pudo parsear el error como JSON")
            }

            throw new Error(errorMessage)
        }

        const result = await response.json()
        console.log("Producto actualizado exitosamente:", result)

        return result
    } catch (error) {
        console.error("Error al actualizar producto:", error)
        throw error
    }
}

// Función para obtener el badge de stock
function getStockBadge(stock) {
    if (stock > 20) return '<span class="badge bg-success">' + stock + "</span>"
    if (stock > 5) return '<span class="badge bg-warning">' + stock + "</span>"
    return '<span class="badge bg-danger">' + stock + "</span>"
}

// Función para obtener el badge de categoría
function getCategoryBadge(category) {
    const badges = {
        "Gafas de Sol": '<span class="badge bg-info">Gafas de Sol</span>',
        "Lentes de Contacto": '<span class="badge bg-success">Lentes de Contacto</span>',
        Monturas: '<span class="badge bg-primary">Monturas</span>',
        Accesorios: '<span class="badge bg-warning">Accesorios</span>',
    }
    return badges[category] || '<span class="badge bg-secondary">' + category + "</span>"
}

// Función para obtener el badge de estado
function getStatusBadge(status) {
    if (status) {
        return '<span class="badge bg-success">Activo</span>'
    } else {
        return '<span class="badge bg-secondary">Inactivo</span>'
    }
}

// Función para renderizar productos
function renderProducts(products) {
    const tbody = document.getElementById("productsTableBody")
    if (!tbody) return

    tbody.innerHTML = ""

    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="text-muted">
                        <i class="fas fa-inbox fs-2 mb-3"></i>
                        <h5>No hay productos</h5>
                        <p>No se encontraron productos que coincidan con los filtros.</p>
                    </div>
                </td>
            </tr>
        `
        return
    }

    products.forEach((product) => {
        const row = document.createElement("tr")
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="bg-light rounded p-2 me-3">
                        <i class="${product.icon} text-red-custom"></i>
                    </div>
                    <div>
                        <div class="fw-semibold">${product.name}</div>
                        <small class="text-muted">${product.description}</small>
                    </div>
                </div>
            </td>
            <td><span class="badge bg-secondary">${product.code}</span></td>
            <td>${product.unitMeasure}</td>
            <td>${product.brand}</td>
            <td class="fw-bold text-success">S/ ${product.price.toFixed(2)}</td>
            <td>${getCategoryBadge(product.category)}</td>
            <td>${getStockBadge(product.stock)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" title="Editar" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" title="Eliminar" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `
        tbody.appendChild(row)
    })
}

// Función para extraer el número de página de una URL - CORREGIDA
function extractPageNumber(url) {
    if (!url || typeof url !== "string") {
        console.log("URL inválida para extraer página:", url)
        return null
    }

    try {
        const urlObj = new URL(url)
        const pageParam = urlObj.searchParams.get("page")

        // Si no hay parámetro page, asumimos que es la página 1
        const pageNumber = pageParam ? Number.parseInt(pageParam, 10) : 1

        console.log(`Extrayendo página de "${url}": ${pageNumber}`)
        return pageNumber
    } catch (error) {
        console.error("Error al extraer número de página de:", url, error)
        return null
    }
}

// Función para renderizar la paginación optimizada para Django - CORREGIDA
function renderDjangoPagination(data) {
    const paginationContainer = document.querySelector(".pagination")
    if (!paginationContainer) return

    paginationContainer.innerHTML = ""

    const {current_page, total_pages, next_page, previous_page} = data

    // Extraer números de página de las URLs
    const nextPageNum = next_page ? extractPageNumber(next_page) : null
    const prevPageNum = previous_page ? extractPageNumber(previous_page) : null

    console.log("Datos de paginación:", {
        current_page,
        total_pages,
        next_page,
        previous_page,
        nextPageNum,
        prevPageNum,
    })

    // Botón Anterior - CORREGIDO
    const prevLi = document.createElement("li")
    // Si estamos en página > 1, el botón anterior debe estar habilitado
    const canGoPrevious = current_page > 1
    prevLi.className = `page-item ${!canGoPrevious ? "disabled" : ""}`

    if (canGoPrevious) {
        const prevLink = document.createElement("a")
        prevLink.className = "page-link"
        prevLink.href = "#"
        prevLink.textContent = "Anterior"
        prevLink.addEventListener("click", (e) => {
            e.preventDefault()
            const targetPage = prevPageNum || current_page - 1
            console.log("Navegando a página anterior:", targetPage)
            loadProductsFromServer(targetPage)
        })
        prevLi.appendChild(prevLink)
    } else {
        const prevSpan = document.createElement("span")
        prevSpan.className = "page-link"
        prevSpan.textContent = "Anterior"
        prevSpan.setAttribute("tabindex", "-1")
        prevLi.appendChild(prevSpan)
    }
    paginationContainer.appendChild(prevLi)

    // Lógica para mostrar páginas (sin cambios)
    let startPage = 1
    let endPage = total_pages

    if (total_pages > 5) {
        if (current_page <= 3) {
            endPage = 5
        } else if (current_page >= total_pages - 2) {
            startPage = total_pages - 4
        } else {
            startPage = current_page - 2
            endPage = current_page + 2
        }
    }

    // Primera página si no está en el rango
    if (startPage > 1) {
        const firstLi = document.createElement("li")
        firstLi.className = "page-item"

        const firstLink = document.createElement("a")
        firstLink.className = "page-link"
        firstLink.href = "#"
        firstLink.textContent = "1"
        firstLink.addEventListener("click", (e) => {
            e.preventDefault()
            loadProductsFromServer(1)
        })
        firstLi.appendChild(firstLink)
        paginationContainer.appendChild(firstLi)

        if (startPage > 2) {
            const dotsLi = document.createElement("li")
            dotsLi.className = "page-item disabled"
            const dotsSpan = document.createElement("span")
            dotsSpan.className = "page-link"
            dotsSpan.textContent = "..."
            dotsLi.appendChild(dotsSpan)
            paginationContainer.appendChild(dotsLi)
        }
    }

    // Páginas del rango
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement("li")
        li.className = `page-item ${i === current_page ? "active" : ""}`

        const link = document.createElement("a")
        link.className = "page-link"
        link.href = "#"
        link.textContent = i.toString()
        link.addEventListener("click", (e) => {
            e.preventDefault()
            loadProductsFromServer(i)
        })
        li.appendChild(link)
        paginationContainer.appendChild(li)
    }

    // Última página si no está en el rango
    if (endPage < total_pages) {
        if (endPage < total_pages - 1) {
            const dotsLi = document.createElement("li")
            dotsLi.className = "page-item disabled"
            const dotsSpan = document.createElement("span")
            dotsSpan.className = "page-link"
            dotsSpan.textContent = "..."
            dotsLi.appendChild(dotsSpan)
            paginationContainer.appendChild(dotsLi)
        }

        const lastLi = document.createElement("li")
        lastLi.className = "page-item"

        const lastLink = document.createElement("a")
        lastLink.className = "page-link"
        lastLink.href = "#"
        lastLink.textContent = total_pages.toString()
        lastLink.addEventListener("click", (e) => {
            e.preventDefault()
            loadProductsFromServer(total_pages)
        })
        lastLi.appendChild(lastLink)
        paginationContainer.appendChild(lastLi)
    }

    // Botón Siguiente - CORREGIDO
    const nextLi = document.createElement("li")
    // Si estamos en página < total_pages, el botón siguiente debe estar habilitado
    const canGoNext = current_page < total_pages
    nextLi.className = `page-item ${!canGoNext ? "disabled" : ""}`

    if (canGoNext) {
        const nextLink = document.createElement("a")
        nextLink.className = "page-link"
        nextLink.href = "#"
        nextLink.textContent = "Siguiente"
        nextLink.addEventListener("click", (e) => {
            e.preventDefault()
            const targetPage = nextPageNum || current_page + 1
            console.log("Navegando a página siguiente:", targetPage)
            loadProductsFromServer(targetPage)
        })
        nextLi.appendChild(nextLink)
    } else {
        const nextSpan = document.createElement("span")
        nextSpan.className = "page-link"
        nextSpan.textContent = "Siguiente"
        nextSpan.setAttribute("tabindex", "-1")
        nextLi.appendChild(nextSpan)
    }
    paginationContainer.appendChild(nextLi)

    // Información de paginación
    updateDjangoPaginationInfo(data)
}

// Función para actualizar información de paginación
function updateDjangoPaginationInfo(data) {
    const {current_page, total_items, total_pages} = data
    const itemsPerPage = API_CONFIG.pageSize
    const startItem = (current_page - 1) * itemsPerPage + 1
    const endItem = Math.min(current_page * itemsPerPage, total_items)

    // Crear o actualizar el elemento de información
    let infoElement = document.getElementById("pagination-info")
    if (!infoElement) {
        infoElement = document.createElement("div")
        infoElement.id = "pagination-info"
        infoElement.className = "text-muted small mb-3"

        const paginationNav = document.querySelector('nav[aria-label="Paginación de productos"]')
        if (paginationNav) {
            paginationNav.parentNode.insertBefore(infoElement, paginationNav)
        }
    }

    infoElement.innerHTML = `Mostrando ${startItem} a ${endItem} de ${total_items} productos (Página ${current_page} de ${total_pages})`
}

// Función para aplicar filtros (ahora usa la API de Django)
// Función para aplicar filtros - CORREGIDA para usar IDs
function applyFilters() {
    const searchTerm = document.getElementById("searchProduct")?.value || ""
    const categoryFilter = document.getElementById("filterCategory")?.value || ""
    const brandFilter = document.getElementById("filterBrand")?.value || ""

    const filters = {
        name: searchTerm, // Cambiar de 'search' a 'name' para coincidir con tu filtro Django
        category: categoryFilter, // Ahora enviará el ID de la categoría
        brand: brandFilter, // Ahora enviará el ID de la marca
    }

    console.log("Aplicando filtros:", filters)

    // Cargar primera página con filtros
    loadProductsFromServer(1, filters)
}

// Debounce para la búsqueda
function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

// Funciones de gestión de productos
function showAddProductForm() {
    console.log("Ejecutando showAddProductForm()")
    const productsList = document.getElementById("products-list")
    const addProductForm = document.getElementById("add-product-form")

    if (productsList) {
        productsList.style.display = "none"
        console.log("Lista de productos ocultada")
    }
    if (addProductForm) {
        addProductForm.style.display = "block"
        console.log("Formulario mostrado")

        // Cargar categorías y marcas
        loadCategories()
        loadBrands()
    }
}

// Función para mostrar formulario de edición
function showEditProductForm(product = null) {
    console.log("Ejecutando showEditProductForm()", product)
    const productsList = document.getElementById("products-list")
    const addProductForm = document.getElementById("add-product-form")
    const editProductForm = document.getElementById("edit-product-form")

    // Ocultar otras vistas
    if (productsList) {
        productsList.style.display = "none"
        console.log("Lista de productos ocultada")
    }
    if (addProductForm) {
        addProductForm.style.display = "none"
        console.log("Formulario de agregar ocultado")
    }

    // Mostrar formulario de edición
    if (editProductForm) {
        editProductForm.style.display = "block"
        console.log("Formulario de edición mostrado")

        // Cargar categorías y marcas primero
        Promise.all([loadCategories(), loadBrands()]).then(() => {
            // Después de cargar las opciones, llenar el formulario
            if (product) {
                setTimeout(() => {
                    fillEditForm(product)
                }, 300) // Aumentar el delay para asegurar que los selects se carguen
            }
        })
    }
}

// Función para llenar el formulario de edición con datos del producto
function fillEditForm(product) {
    console.log("Llenando formulario con datos:", product)

    // Campos básicos
    document.getElementById("editProductId").value = product.id || ""
    document.getElementById("editProductName").value = product.name || ""
    document.getElementById("editProductCode").value = product.code || ""
    document.getElementById("editDescription").value = product.description || ""
    document.getElementById("editPrice").value = product.unit_price || ""
    document.getElementById("editStock").value = product.initial_stock || 0

    // Unidad de medida
    const unitMeasureSelect = document.getElementById("editUnitMeasure")
    if (unitMeasureSelect && product.unit_measure) {
        unitMeasureSelect.value = product.unit_measure
    }

    // Categoría - Mejorado
    const categorySelect = document.getElementById("editCategory")
    if (categorySelect && product.category) {
        // Si product.category es un objeto, usar su id, si es un número, usarlo directamente
        const categoryId = typeof product.category === "object" ? product.category.id : product.category
        console.log("Seleccionando categoría:", categoryId)

        // Buscar la opción correcta
        for (let i = 0; i < categorySelect.options.length; i++) {
            if (categorySelect.options[i].value == categoryId) {
                categorySelect.selectedIndex = i
                break
            }
        }
    }

    // Marca - Mejorado
    const brandSelect = document.getElementById("editBrand")
    if (brandSelect && product.brand) {
        // Si product.brand es un objeto, usar su id, si es un número, usarlo directamente
        const brandId = typeof product.brand === "object" ? product.brand.id : product.brand
        console.log("Seleccionando marca:", brandId)

        // Buscar la opción correcta
        for (let i = 0; i < brandSelect.options.length; i++) {
            if (brandSelect.options[i].value == brandId) {
                brandSelect.selectedIndex = i
                break
            }
        }
    }

    // Estado
    const statusActive = document.getElementById("editStatusActive")
    const statusInactive = document.getElementById("editStatusInactive")

    if (product.status === true || product.status === "active") {
        if (statusActive) statusActive.checked = true
    } else {
        if (statusInactive) statusInactive.checked = true
    }
}

function showProductsList() {
    console.log("Ejecutando showProductsList()")
    const addProductForm = document.getElementById("add-product-form")
    const editProductForm = document.getElementById("edit-product-form")
    const productsList = document.getElementById("products-list")

    // Ocultar TODAS las vistas de productos primero
    const allProductViews = document.querySelectorAll(".products-view")
    allProductViews.forEach((view) => {
        view.style.display = "none"
    })

    // Mostrar solo la lista de productos
    if (productsList) {
        productsList.style.display = "block"
        console.log("Lista de productos mostrada")
    }
}

// Función para limpiar filtros
// Función para limpiar filtros - CORREGIDA
function clearFilters() {
    console.log("Limpiando filtros")
    const searchProduct = document.getElementById("searchProduct")
    const filterCategory = document.getElementById("filterCategory")
    const filterBrand = document.getElementById("filterBrand")

    if (searchProduct) searchProduct.value = ""
    if (filterCategory) filterCategory.value = ""
    if (filterBrand) filterBrand.value = ""

    // Resetear filtros y cargar primera página
    currentFilters = {name: "", category: "", brand: ""} // Cambiar 'search' por 'name'
    loadProductsFromServer(1, currentFilters)
}

// Funciones para editar y eliminar productos
// Función para editar producto - ACTUALIZADA
async function editProduct(id) {
    console.log("Editando producto:", id)

    try {
        // Mostrar loading mientras se carga el producto
        const editBtn = document.querySelector(`button[onclick="editProduct(${id})"]`)
        const originalContent = editBtn ? editBtn.innerHTML : null

        if (editBtn) {
            editBtn.disabled = true
            editBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
            editBtn.title = "Cargando..."
        }

        // Obtener datos del producto
        const product = await getProductFromServer(id)

        // Mostrar formulario de edición
        showEditProductForm(product)

        // Restaurar botón
        if (editBtn && originalContent) {
            editBtn.disabled = false
            editBtn.innerHTML = originalContent
            editBtn.title = "Editar"
        }
    } catch (error) {
        console.error("Error al cargar producto para editar:", error)

        // Mostrar modal de error
        createErrorModal("Error al Cargar Producto", "No se pudo cargar la información del producto: " + error.message)

        // Restaurar botón
        const editBtn = document.querySelector(`button[onclick="editProduct(${id})"]`)
        if (editBtn) {
            editBtn.disabled = false
            editBtn.innerHTML = '<i class="fas fa-edit"></i>'
            editBtn.title = "Editar"
        }
    }
}

// Función para crear modal de confirmación personalizado
function createConfirmationModal(title, message, onConfirm, onCancel = null) {
    // Remover modal existente si hay uno
    const existingModal = document.getElementById("confirmationModal")
    if (existingModal) {
        existingModal.remove()
    }

    // Crear el modal
    const modalHTML = `
    <div class="modal fade" id="confirmationModal" tabindex="-1" aria-labelledby="confirmationModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title fw-bold text-danger" id="confirmationModalLabel">
              <i class="fas fa-exclamation-triangle me-2"></i>
              ${title}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body pt-2">
            <p class="text-muted mb-0">${message}</p>
          </div>
          <div class="modal-footer border-0 pt-2">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" id="cancelBtn">
              <i class="fas fa-times me-2"></i>
              Cancelar
            </button>
            <button type="button" class="btn btn-danger" id="confirmBtn">
              <i class="fas fa-trash me-2"></i>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  `

    // Agregar modal al DOM
    document.body.insertAdjacentHTML("beforeend", modalHTML)

    // Obtener referencias
    const modal = document.getElementById("confirmationModal")
    const confirmBtn = document.getElementById("confirmBtn")
    const cancelBtn = document.getElementById("cancelBtn")

    // Configurar eventos
    confirmBtn.addEventListener("click", () => {
        // Mostrar loading en el botón
        confirmBtn.disabled = true
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Eliminando...'

        // Ejecutar callback de confirmación
        if (onConfirm) {
            onConfirm()
        }
    })

    cancelBtn.addEventListener("click", () => {
        if (onCancel) {
            onCancel()
        }
    })

    // Limpiar modal cuando se cierre
    modal.addEventListener("hidden.bs.modal", () => {
        modal.remove()
    })

    // Mostrar modal
    const bsModal = new window.bootstrap.Modal(modal)
    bsModal.show()

    return bsModal
}

// Función para crear modal de éxito
function createSuccessModal(title, message, onClose = null) {
    // Remover modal existente si hay uno
    const existingModal = document.getElementById("successModal")
    if (existingModal) {
        existingModal.remove()
    }

    // Crear el modal
    const modalHTML = `
    <div class="modal fade" id="successModal" tabindex="-1" aria-labelledby="successModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title fw-bold text-success" id="successModalLabel">
              <i class="fas fa-check-circle me-2"></i>
              ${title}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body pt-2">
            <p class="text-muted mb-0">${message}</p>
          </div>
          <div class="modal-footer border-0 pt-2">
            <button type="button" class="btn btn-success" data-bs-dismiss="modal" id="okBtn">
              <i class="fas fa-check me-2"></i>
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  `

    // Agregar modal al DOM
    document.body.insertAdjacentHTML("beforeend", modalHTML)

    // Obtener referencias
    const modal = document.getElementById("successModal")
    const okBtn = document.getElementById("okBtn")

    // Configurar eventos
    okBtn.addEventListener("click", () => {
        if (onClose) {
            onClose()
        }
    })

    // Limpiar modal cuando se cierre
    modal.addEventListener("hidden.bs.modal", () => {
        modal.remove()
    })

    // Mostrar modal
    const bsModal = new window.bootstrap.Modal(modal)
    bsModal.show()

    // Auto-cerrar después de 3 segundos
    setTimeout(() => {
        bsModal.hide()
    }, 3000)

    return bsModal
}

// Función para crear modal de error
function createErrorModal(title, message, onClose = null) {
    // Remover modal existente si hay uno
    const existingModal = document.getElementById("errorModal")
    if (existingModal) {
        existingModal.remove()
    }

    // Crear el modal
    const modalHTML = `
    <div class="modal fade" id="errorModal" tabindex="-1" aria-labelledby="errorModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title fw-bold text-danger" id="errorModalLabel">
              <i class="fas fa-exclamation-circle me-2"></i>
              ${title}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body pt-2">
            <p class="text-muted mb-0">${message}</p>
          </div>
          <div class="modal-footer border-0 pt-2">
            <button type="button" class="btn btn-outline-danger" data-bs-dismiss="modal" id="okBtn">
              <i class="fas fa-times me-2"></i>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `

    // Agregar modal al DOM
    document.body.insertAdjacentHTML("beforeend", modalHTML)

    // Obtener referencias
    const modal = document.getElementById("errorModal")
    const okBtn = document.getElementById("okBtn")

    // Configurar eventos
    okBtn.addEventListener("click", () => {
        if (onClose) {
            onClose()
        }
    })

    // Limpiar modal cuando se cierre
    modal.addEventListener("hidden.bs.modal", () => {
        modal.remove()
    })

    // Mostrar modal
    const bsModal = new window.bootstrap.Modal(modal)
    bsModal.show()

    return bsModal
}

// Reemplazar la función deleteProduct para usar el modal personalizado
async function deleteProduct(id) {
    console.log("Eliminando producto:", id)

    // Buscar el producto en la lista actual para mostrar su nombre
    const product = currentProducts.find((p) => p.id === id)
    const productName = product ? product.name : `ID ${id}`

    // Crear modal de confirmación personalizado
    createConfirmationModal(
        "Confirmar Eliminación",
        `¿Estás seguro de que deseas eliminar el producto "<strong>${productName}</strong>"?<br><br>Esta acción no se puede deshacer.`,
        async () => {
            // Esta función se ejecuta cuando el usuario confirma
            const deleteBtn = document.querySelector(`button[onclick="deleteProduct(${id})"]`)
            const originalContent = deleteBtn ? deleteBtn.innerHTML : null

            try {
                // Mostrar loading en el botón de la tabla también
                if (deleteBtn) {
                    deleteBtn.disabled = true
                    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
                    deleteBtn.title = "Eliminando..."
                }

                // Eliminar en el servidor usando la nueva API
                const result = await deleteProductOnServer(id)

                // Cerrar modal de confirmación
                const confirmationModal = document.getElementById("confirmationModal")
                if (confirmationModal) {
                    window.bootstrap.Modal.getInstance(confirmationModal).hide()
                }

                // Mostrar modal de éxito
                const successMessage = result.message || "Producto eliminado exitosamente"
                createSuccessModal("¡Eliminado!", successMessage)

                // Recargar la página actual para reflejar los cambios
                // Si estamos en la última página y solo queda un elemento, ir a la página anterior
                if (currentProducts.length === 1 && currentPage > 1) {
                    loadProductsFromServer(currentPage - 1, currentFilters)
                } else {
                    loadProductsFromServer(currentPage, currentFilters)
                }
            } catch (error) {
                console.error("Error completo al eliminar:", error)

                // Cerrar modal de confirmación
                const confirmationModal = document.getElementById("confirmationModal")
                if (confirmationModal) {
                    window.bootstrap.Modal.getInstance(confirmationModal).hide()
                }

                // Mostrar modal de error
                let errorMessage = "No se pudo eliminar el producto"
                if (error.message) {
                    errorMessage = error.message
                }

                createErrorModal("Error al Eliminar", errorMessage)

                // Restaurar botón
                if (deleteBtn && originalContent) {
                    deleteBtn.disabled = false
                    deleteBtn.innerHTML = originalContent
                    deleteBtn.title = "Eliminar"
                }
            }
        },
        () => {
            // Esta función se ejecuta cuando el usuario cancela
            console.log("Eliminación cancelada por el usuario")
        },
    )
}

// Función para obtener CSRF token (si usas Django CSRF)
function getCookie(name) {
    let cookieValue = null
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";")
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim()
            if (cookie.substring(0, name.length + 1) === name + "=") {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
                break
            }
        }
    }
    return cookieValue
}

// Función para cargar categorías desde el servidor
async function loadCategories() {
    try {
        const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.categories}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (response.ok) {
            const data = await response.json()
            // Manejar tanto arrays directos como objetos con results
            const categories = Array.isArray(data) ? data : data.results || []
            populateCategorySelect(categories)
            populateFilterCategorySelect(categories)
            populateEditCategorySelect(categories) // Agregar esta línea
        } else {
            console.log("No se pudieron cargar las categorías")
        }
    } catch (error) {
        console.error("Error al cargar categorías:", error)
    }
}

// Función para cargar marcas desde el servidor
async function loadBrands() {
    try {
        const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.brands}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (response.ok) {
            const data = await response.json()
            // Manejar tanto arrays directos como objetos con results
            const brands = Array.isArray(data) ? data : data.results || []
            populateBrandSelect(brands)
            populateFilterBrandSelect(brands)
            populateEditBrandSelect(brands) // Agregar esta línea
        } else {
            console.log("No se pudieron cargar las marcas")
        }
    } catch (error) {
        console.error("Error al cargar marcas:", error)
    }
}

// Función para poblar el select de categorías del formulario
function populateCategorySelect(categories) {
    const categorySelect = document.getElementById("category")
    if (!categorySelect) return

    // Limpiar opciones existentes (excepto la primera)
    while (categorySelect.children.length > 1) {
        categorySelect.removeChild(categorySelect.lastChild)
    }

    // Agregar categorías
    categories.forEach((category) => {
        const option = document.createElement("option")
        option.value = category.id
        option.textContent = category.name
        categorySelect.appendChild(option)
    })
}

// Función para poblar el select de marcas del formulario
function populateBrandSelect(brands) {
    const brandSelect = document.getElementById("brand")
    if (!brandSelect) return

    // Limpiar opciones existentes (excepto la primera)
    while (brandSelect.children.length > 1) {
        brandSelect.removeChild(brandSelect.lastChild)
    }

    // Agregar marcas
    brands.forEach((brand) => {
        const option = document.createElement("option")
        option.value = brand.id
        option.textContent = brand.name
        brandSelect.appendChild(option)
    })
}

// Función para poblar el select de filtro de categorías
// Función para poblar el select de filtro de categorías - CORREGIDA
function populateFilterCategorySelect(categories) {
    const filterCategorySelect = document.getElementById("filterCategory")
    if (!filterCategorySelect) return

    // Limpiar opciones existentes (excepto la primera)
    while (filterCategorySelect.children.length > 1) {
        filterCategorySelect.removeChild(filterCategorySelect.lastChild)
    }

    // Agregar categorías usando ID en lugar de nombre
    categories.forEach((category) => {
        const option = document.createElement("option")
        option.value = category.id // Usar ID para filtros
        option.textContent = category.name
        filterCategorySelect.appendChild(option)
    })
}

// Función para poblar el select de filtro de marcas
// Función para poblar el select de filtro de marcas - CORREGIDA
function populateFilterBrandSelect(brands) {
    const filterBrandSelect = document.getElementById("filterBrand")
    if (!filterBrandSelect) return

    // Limpiar opciones existentes (excepto la primera)
    while (filterBrandSelect.children.length > 1) {
        filterBrandSelect.removeChild(filterBrandSelect.lastChild)
    }

    // Agregar marcas usando ID en lugar de nombre
    brands.forEach((brand) => {
        const option = document.createElement("option")
        option.value = brand.id // Usar ID para filtros
        option.textContent = brand.name
        filterBrandSelect.appendChild(option)
    })
}

// Función para generar código automático
function generateProductCode(categoryName) {
    let prefix = ""

    switch (categoryName) {
        case "Gafas de Sol":
            prefix = "GS"
            break
        case "Lentes de Contacto":
            prefix = "LC"
            break
        case "Monturas":
            prefix = "MT"
            break
        case "Accesorios":
            prefix = "AC"
            break
        default:
            prefix = "PR"
    }

    // Generar número aleatorio
    const randomNum = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")

    return `${prefix}-${randomNum}`
}

// Inicializar cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM cargado")

    // Mostrar dashboard por defecto
    showSection("dashboard")

    // Agregar event listeners a los botones de navegación
    const navButtons = document.querySelectorAll(".nav-link-custom")
    navButtons.forEach((button, index) => {
        button.addEventListener("click", function (e) {
            e.preventDefault()
            console.log("Botón de navegación clickeado:", index)

            // Remover activo de todos
            navButtons.forEach((btn) => btn.classList.remove("active"))
            // Agregar activo al clickeado
            this.classList.add("active")

            // Determinar sección basada en el índice del botón
            const sections = ["dashboard", "products", "clients", "appointments", "sales", "settings"]
            const sectionName = sections[index]

            if (sectionName) {
                showSection(sectionName)
            }
        })
    })

    // Event listener para el botón "Agregar Producto"
    document.addEventListener("click", (e) => {
        if (e.target.closest('button[onclick="showAddProductForm()"]')) {
            console.log("Botón Agregar Producto clickeado")
            e.preventDefault()
            showAddProductForm()
        }

        if (e.target.closest('button[onclick="showProductsList()"]')) {
            console.log("Botón Volver al Listado clickeado")
            e.preventDefault()
            showProductsList()
        }

        if (e.target.closest('button[onclick="clearFilters()"]')) {
            console.log("Botón Limpiar clickeado")
            e.preventDefault()
            clearFilters()
        }
    })

    // Manejador de envío del formulario
    const addProductForm = document.getElementById("addProductForm")
    if (addProductForm) {
        addProductForm.addEventListener("submit", async (e) => {
            e.preventDefault()
            console.log("Formulario enviado")

            const submitBtn = addProductForm.querySelector('button[type="submit"]')
            const originalText = submitBtn.innerHTML

            try {
                // Mostrar loading
                submitBtn.disabled = true
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...'

                // Obtener datos del formulario
                const formData = {
                    name: document.getElementById("productName").value,
                    code: document.getElementById("productCode").value || null, // Puede ser null
                    description: document.getElementById("description").value,
                    unitMeasure: document.getElementById("unitMeasure").value,
                    brand: document.getElementById("brand").value || null, // Puede ser null
                    category: document.getElementById("category").value, // Requerido
                    price: document.getElementById("price").value || null, // Puede ser null
                    stock: document.getElementById("stock").value || 0,
                    status: document.querySelector('input[name="status"]:checked')?.value || "inactive",
                }

                console.log("Datos del producto:", formData)

                // Validar campos requeridos
                if (!formData.name || !formData.unitMeasure || !formData.category) {
                    throw new Error("Por favor completa todos los campos obligatorios")
                }

                // Crear en el servidor
                await createProductOnServer(formData)

                // Mostrar modal de éxito en lugar de alert
                createSuccessModal("¡Producto Creado!", "El producto ha sido agregado exitosamente al inventario.")

                // Resetear formulario y volver a la lista
                addProductForm.reset()
                showProductsList()

                // Recargar productos para mostrar el nuevo
                loadProductsFromServer(1, currentFilters)
            } catch (error) {
                // Mostrar modal de error en lugar de alert
                createErrorModal("Error al Crear Producto", "No se pudo guardar el producto: " + error.message)
                console.error("Error completo:", error)
            } finally {
                // Restaurar botón
                submitBtn.disabled = false
                submitBtn.innerHTML = originalText
            }
        })
    }

    // Manejador de envío del formulario de edición
    const editProductForm = document.getElementById("editProductForm")
    if (editProductForm) {
        editProductForm.addEventListener("submit", async (e) => {
            e.preventDefault()
            console.log("Formulario de edición enviado")

            const submitBtn = editProductForm.querySelector('button[type="submit"]')
            const originalText = submitBtn.innerHTML

            try {
                // Mostrar loading
                submitBtn.disabled = true
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Actualizando...'

                // Obtener ID del producto
                const productId = document.getElementById("editProductId").value
                if (!productId) {
                    throw new Error("ID del producto no encontrado")
                }

                // Obtener datos del formulario
                const formData = {
                    name: document.getElementById("editProductName").value,
                    code: document.getElementById("editProductCode").value || null,
                    description: document.getElementById("editDescription").value,
                    unitMeasure: document.getElementById("editUnitMeasure").value,
                    brand: document.getElementById("editBrand").value || null,
                    category: document.getElementById("editCategory").value,
                    price: document.getElementById("editPrice").value || null,
                    stock: document.getElementById("editStock").value || 0,
                    status: document.querySelector('input[name="editStatus"]:checked')?.value || "inactive",
                }

                console.log("Datos del producto a actualizar:", formData)

                // Validar campos requeridos
                if (!formData.name || !formData.unitMeasure || !formData.category) {
                    throw new Error("Por favor completa todos los campos obligatorios")
                }

                // Actualizar en el servidor
                await updateProductOnServer(productId, formData)

                // Mostrar modal de éxito
                createSuccessModal("¡Producto Actualizado!", "Los cambios han sido guardados exitosamente.")

                // Volver a la lista
                showProductsList()

                // Recargar productos para mostrar los cambios
                loadProductsFromServer(currentPage, currentFilters)
            } catch (error) {
                // Mostrar modal de error
                createErrorModal("Error al Actualizar Producto", "No se pudieron guardar los cambios: " + error.message)
                console.error("Error completo:", error)
            } finally {
                // Restaurar botón
                submitBtn.disabled = false
                submitBtn.innerHTML = originalText
            }
        })
    }

    // Funcionalidad de búsqueda con debounce
    const searchInput = document.getElementById("searchProduct")
    if (searchInput) {
        const debouncedSearch = debounce(applyFilters, 500) // 500ms de delay
        searchInput.addEventListener("input", debouncedSearch)
    }

    // Funcionalidad de filtros
    const categoryFilter = document.getElementById("filterCategory")
    const brandFilter = document.getElementById("filterBrand")

    if (categoryFilter) {
        categoryFilter.addEventListener("change", applyFilters)
    }

    if (brandFilter) {
        brandFilter.addEventListener("change", applyFilters)
    }

    // Funcionalidad de búsqueda de pacientes con debounce
    const searchPatientInput = document.getElementById("searchPatient")
    if (searchPatientInput) {
        const debouncedPatientSearch = debounce(applyPatientFilters, 500)
        searchPatientInput.addEventListener("input", debouncedPatientSearch)
    }

    // Funcionalidad de filtros de pacientes
    const documentTypeFilter = document.getElementById("filterDocumentType")
    const genderFilter = document.getElementById("filterGender")

    if (documentTypeFilter) {
        documentTypeFilter.addEventListener("change", applyPatientFilters)
    }

    if (genderFilter) {
        genderFilter.addEventListener("change", applyPatientFilters)
    }

    // Generar código automático cuando se selecciona una categoría
    const categorySelect = document.getElementById("category")
    const codeInput = document.getElementById("productCode")

    if (categorySelect && codeInput) {
        categorySelect.addEventListener("change", function () {
            const selectedOption = this.options[this.selectedIndex]
            if (selectedOption && selectedOption.textContent && !codeInput.value) {
                const categoryName = selectedOption.textContent
                codeInput.value = generateProductCode(categoryName)
            }
        })
    }

    // Cargar categorías y marcas al inicio
    loadCategories()
    loadBrands()

    // Cargar tipos de documento al inicio
    loadDocumentTypes()
})

// Función para poblar el select de categorías del formulario de EDICIÓN
function populateEditCategorySelect(categories) {
    const categorySelect = document.getElementById("editCategory")
    if (!categorySelect) return

    // Limpiar opciones existentes (excepto la primera)
    while (categorySelect.children.length > 1) {
        categorySelect.removeChild(categorySelect.lastChild)
    }

    // Agregar categorías
    categories.forEach((category) => {
        const option = document.createElement("option")
        option.value = category.id
        option.textContent = category.name
        categorySelect.appendChild(option)
    })
}

// Función para poblar el select de marcas del formulario de EDICIÓN
function populateEditBrandSelect(brands) {
    const brandSelect = document.getElementById("editBrand")
    if (!brandSelect) return

    // Limpiar opciones existentes (excepto la primera)
    while (brandSelect.children.length > 1) {
        brandSelect.removeChild(brandSelect.lastChild)
    }

    // Agregar marcas
    brands.forEach((brand) => {
        const option = document.createElement("option")
        option.value = brand.id
        option.textContent = brand.name
        brandSelect.appendChild(option)
    })
}

// Hacer las funciones globales para que funcionen con onclick
window.showAddProductForm = showAddProductForm
window.showEditProductForm = showEditProductForm
window.showProductsList = showProductsList
window.clearFilters = clearFilters
window.showSection = showSection
window.loadProductsFromServer = loadProductsFromServer
window.editProduct = editProduct
window.deleteProduct = deleteProduct

// ==================== GESTIÓN DE PACIENTES ====================

// Variables globales para pacientes
let currentPatientPage = 1
let totalPatientItems = 0
let totalPatientPages = 0
let currentPatients = []
let isLoadingPatients = false

// Variables para filtros de pacientes
let currentPatientFilters = {
    search: "",
    document_type: "",
    gender: "",
}

// Configuración API para pacientes
// Update the PATIENT_API_CONFIG to match your actual endpoints
const PATIENT_API_CONFIG = {
    baseURL: "http://127.0.0.1:8000/api",
    endpoints: {
        patients: "/pacientes/",
        createPatient: "/pacientes/crear/",
        updatePatient: "/pacientes/pacientes", // Will be used with /{id}/
        deletePatient: "/pacientes", // Will be used with /{id}/eliminar/
        documentTypes: "/documentos/", // Updated to match your API
    },
    pageSize: 10,
}

// Funciones de navegación para pacientes
function showAddPatientForm() {
    console.log("Ejecutando showAddPatientForm()")
    const patientsList = document.getElementById("patients-list")
    const addPatientForm = document.getElementById("add-patient-form")
    const editPatientForm = document.getElementById("edit-patient-form")

    // Ocultar todas las vistas
    if (patientsList) patientsList.style.display = "none"
    if (editPatientForm) editPatientForm.style.display = "none"

    // Mostrar formulario de agregar
    if (addPatientForm) {
        addPatientForm.style.display = "block"
        console.log("Formulario de agregar paciente mostrado")

        // Cargar tipos de documento
        loadDocumentTypes()
    }
}

function showEditPatientForm(patient = null) {
    console.log("Ejecutando showEditPatientForm()", patient)
    const patientsList = document.getElementById("patients-list")
    const addPatientForm = document.getElementById("add-patient-form")
    const editPatientForm = document.getElementById("edit-patient-form")

    // Ocultar otras vistas
    if (patientsList) patientsList.style.display = "none"
    if (addPatientForm) addPatientForm.style.display = "none"

    // Mostrar formulario de edición
    if (editPatientForm) {
        editPatientForm.style.display = "block"
        console.log("Formulario de edición de paciente mostrado")

        // Cargar tipos de documento y llenar formulario
        loadDocumentTypes().then(() => {
            if (patient) {
                setTimeout(() => {
                    fillEditPatientForm(patient)
                }, 200)
            }
        })
    }
}

function showPatientsList() {
    console.log("Ejecutando showPatientsList()")
    const addPatientForm = document.getElementById("add-patient-form")
    const editPatientForm = document.getElementById("edit-patient-form")
    const patientsList = document.getElementById("patients-list")

    // Ocultar formularios
    if (addPatientForm) addPatientForm.style.display = "none"
    if (editPatientForm) editPatientForm.style.display = "none"

    // Mostrar lista
    if (patientsList) {
        patientsList.style.display = "block"
        console.log("Lista de pacientes mostrada")
    }
}

// Función para cargar tipos de documento
async function loadDocumentTypes() {
    try {
        const response = await fetch(`${PATIENT_API_CONFIG.baseURL}${PATIENT_API_CONFIG.endpoints.documentTypes}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (response.ok) {
            const data = await response.json()
            const documentTypes = Array.isArray(data) ? data : data.results || []
            populateDocumentTypeSelects(documentTypes)
        } else {
            console.log("No se pudieron cargar los tipos de documento")
        }
    } catch (error) {
        console.error("Error al cargar tipos de documento:", error)
    }
}

// Función para poblar selects de tipos de documento
// Update populateDocumentTypeSelects to handle the new API structure
function populateDocumentTypeSelects(documentTypes) {
    // Select del formulario de agregar
    const addSelect = document.getElementById("patientTypeDocument")
    if (addSelect) {
        while (addSelect.children.length > 1) {
            addSelect.removeChild(addSelect.lastChild)
        }
        documentTypes.forEach((type) => {
            const option = document.createElement("option")
            option.value = type.id
            option.textContent = `${type.short_name} - ${type.long_name}` // Show both short and long name
            addSelect.appendChild(option)
        })
    }

    // Select del formulario de editar
    const editSelect = document.getElementById("editPatientTypeDocument")
    if (editSelect) {
        while (editSelect.children.length > 1) {
            editSelect.removeChild(editSelect.lastChild)
        }
        documentTypes.forEach((type) => {
            const option = document.createElement("option")
            option.value = type.id
            option.textContent = `${type.short_name} - ${type.long_name}`
            editSelect.appendChild(option)
        })
    }

    // Select del filtro - use short_name for filtering
    const filterSelect = document.getElementById("filterDocumentType")
    if (filterSelect) {
        while (filterSelect.children.length > 1) {
            filterSelect.removeChild(filterSelect.lastChild)
        }
        documentTypes.forEach((type) => {
            const option = document.createElement("option")
            option.value = type.short_name // Use short_name for filtering as per your filter
            option.textContent = `${type.short_name} - ${type.long_name}`
            filterSelect.appendChild(option)
        })
    }
}

// Función para construir URL de API de pacientes
// Update the buildPatientApiUrl function to match your filter structure
function buildPatientApiUrl(page = 1, filters = {}) {
    let url = `${PATIENT_API_CONFIG.baseURL}${PATIENT_API_CONFIG.endpoints.patients}`
    const params = []

    // Parámetros de paginación
    params.push(`page=${page}`)
    params.push(`page_size=${PATIENT_API_CONFIG.pageSize}`)

    // Update filters to match your Django filter structure
    if (filters.search && filters.search.trim()) {
        // Search in first_name, surname, and second_surname
        params.push(`full_name=${encodeURIComponent(filters.search.trim())}`)
        // params.push(`surname=${encodeURIComponent(filters.search.trim())}`)
        // params.push(`second_surname=${encodeURIComponent(filters.search.trim())}`)
    }
    if (filters.document_type && filters.document_type.trim()) {
        params.push(`type_document=${encodeURIComponent(filters.document_type.trim())}`)
    }
    if (filters.gender && filters.gender.trim()) {
        params.push(`gender=${encodeURIComponent(filters.gender.trim())}`)
    }

    if (params.length > 0) {
        url += "?" + params.join("&")
    }

    console.log("URL de pacientes construida:", url)
    return url
}

// Función para cargar pacientes desde el servidor
async function loadPatientsFromServer(page = 1, filters = currentPatientFilters) {
    if (isLoadingPatients) return

    isLoadingPatients = true
    currentPatientPage = page
    currentPatientFilters = {...filters}

    showPatientsLoading()

    try {
        const apiUrl = buildPatientApiUrl(page, filters)
        console.log("Realizando petición AJAX a:", apiUrl)

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`)
        }

        const data = await response.json()
        console.log("Respuesta de Django API (pacientes):", data)

        // Procesar la respuesta igual que productos
        totalPatientItems = data.total_items || 0
        totalPatientPages = data.total_pages || 0
        currentPatientPage = data.current_page || 1

        // Mapear los pacientes al formato esperado
        currentPatients = data.results.map((patient) => ({
            id: patient.id,
            first_name: patient.first_name,
            surname: patient.surname,
            second_surname: patient.second_surname || "",
            full_name: `${patient.first_name} ${patient.surname} ${patient.second_surname || ""}`.trim(),
            date_of_birth: patient.date_of_birth,
            type_document: patient.type_document,
            document_number: patient.document_number,
            gender: patient.gender,
            gender_display: patient.gender === "M" ? "Masculino" : "Femenino",
            phone_or_cellular: patient.phone_or_cellular || "",
            direction: patient.direction || "",
            email: patient.email || "",
            age: calculateAge(patient.date_of_birth),
        }))

        console.log("Pacientes procesados:", currentPatients.length)
        console.log("Página actual:", currentPatientPage, "de", totalPatientPages)

        renderPatients(currentPatients)
        renderPatientsPagination(data)
    } catch (error) {
        console.error("Error al cargar pacientes:", error)
        showPatientsError(error.message)
    } finally {
        isLoadingPatients = false
    }
}

// Función para calcular edad
function calculateAge(birthDate) {
    if (!birthDate) return null

    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
    }

    return age
}

// Función para mostrar loading de pacientes
function showPatientsLoading() {
    const tbody = document.getElementById("patientsTableBody")
    if (!tbody) return

    tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-4">
        <div class="d-flex justify-content-center align-items-center">
          <div class="spinner-border text-red-custom me-3" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <span class="text-muted">Cargando pacientes...</span>
        </div>
      </td>
    </tr>
  `
}

// Función para mostrar error de pacientes
function showPatientsError(message) {
    const tbody = document.getElementById("patientsTableBody")
    if (!tbody) return

    tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-4">
        <div class="text-danger">
          <i class="fas fa-exclamation-triangle fs-2 mb-3"></i>
          <h5>Error al cargar pacientes</h5>
          <p class="mb-3">${message}</p>
          <button class="btn btn-outline-red-custom" onclick="loadPatientsFromServer(${currentPatientPage})">
            <i class="fas fa-refresh me-2"></i>
            Reintentar
          </button>
        </div>
      </td>
    </tr>
  `
}

// Función para renderizar pacientes
// Update renderPatients to show document type correctly
function renderPatients(patients) {
    const tbody = document.getElementById("patientsTableBody")
    if (!tbody) return

    tbody.innerHTML = ""

    if (patients.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="text-muted">
            <i class="fas fa-users fs-2 mb-3"></i>
            <h5>No hay pacientes</h5>
            <p>No se encontraron pacientes que coincidan con los filtros.</p>
          </div>
        </td>
      </tr>
    `
        return
    }

    patients.forEach((patient) => {
        const row = document.createElement("tr")
        row.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="bg-light rounded-circle p-2 me-3" style="width: 40px; height: 40px;">
            <i class="fas fa-user text-red-custom"></i>
          </div>
          <div>
            <div class="fw-semibold">${patient.full_name}</div>
            <small class="text-muted">${patient.age ? patient.age + " años" : "Edad no especificada"}</small>
          </div>
        </div>
      </td>
      <td>
        <div>
          <span class="badge bg-secondary">${patient.type_document}</span>
          <div class="small mt-1">${patient.document_number}</div>
        </div>
      </td>
      <td>${patient.date_of_birth ? formatDate(patient.date_of_birth) : "No especificada"}</td>
      <td>
        <span class="badge ${patient.gender === "M" ? "bg-primary" : "bg-info"}">${patient.gender_display}</span>
      </td>
      <td>${patient.phone_or_cellular || "No especificado"}</td>
      <td>${patient.email || "No especificado"}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" title="Editar" onclick="editPatient(${patient.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" title="Eliminar" onclick="deletePatient(${patient.id})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `
        tbody.appendChild(row)
    })
}

// Función para formatear fecha
function formatDate(dateString) {
    if (!dateString) return ""

    const date = new Date(dateString)
    return date.toLocaleDateString("es-PE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    })
}

// Función para renderizar paginación de pacientes
function renderPatientsPagination(data) {
    const paginationContainer = document.getElementById("patientsPagination")
    if (!paginationContainer) return

    paginationContainer.innerHTML = ""

    const {current_page, total_pages, next_page, previous_page} = data

    // Extraer números de página de las URLs
    const nextPageNum = next_page ? extractPageNumber(next_page) : null
    const prevPageNum = previous_page ? extractPageNumber(previous_page) : null

    console.log("Datos de paginación (pacientes):", {
        current_page,
        total_pages,
        next_page,
        previous_page,
        nextPageNum,
        prevPageNum,
    })

    // Botón Anterior
    const prevLi = document.createElement("li")
    const canGoPrevious = current_page > 1
    prevLi.className = `page-item ${!canGoPrevious ? "disabled" : ""}`

    if (canGoPrevious) {
        const prevLink = document.createElement("a")
        prevLink.className = "page-link"
        prevLink.href = "#"
        prevLink.textContent = "Anterior"
        prevLink.addEventListener("click", (e) => {
            e.preventDefault()
            const targetPage = prevPageNum || current_page - 1
            console.log("Navegando a página anterior (pacientes):", targetPage)
            loadPatientsFromServer(targetPage)
        })
        prevLi.appendChild(prevLink)
    } else {
        const prevSpan = document.createElement("span")
        prevSpan.className = "page-link"
        prevSpan.textContent = "Anterior"
        prevSpan.setAttribute("tabindex", "-1")
        prevLi.appendChild(prevSpan)
    }
    paginationContainer.appendChild(prevLi)

    // Lógica para mostrar páginas
    let startPage = 1
    let endPage = total_pages

    if (total_pages > 5) {
        if (current_page <= 3) {
            endPage = 5
        } else if (current_page >= total_pages - 2) {
            startPage = total_pages - 4
        } else {
            startPage = current_page - 2
            endPage = current_page + 2
        }
    }

    // Primera página si no está en el rango
    if (startPage > 1) {
        const firstLi = document.createElement("li")
        firstLi.className = "page-item"

        const firstLink = document.createElement("a")
        firstLink.className = "page-link"
        firstLink.href = "#"
        firstLink.textContent = "1"
        firstLink.addEventListener("click", (e) => {
            e.preventDefault()
            loadPatientsFromServer(1)
        })
        firstLi.appendChild(firstLink)
        paginationContainer.appendChild(firstLi)

        if (startPage > 2) {
            const dotsLi = document.createElement("li")
            dotsLi.className = "page-item disabled"
            const dotsSpan = document.createElement("span")
            dotsSpan.className = "page-link"
            dotsSpan.textContent = "..."
            dotsLi.appendChild(dotsSpan)
            paginationContainer.appendChild(dotsLi)
        }
    }

    // Páginas del rango
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement("li")
        li.className = `page-item ${i === current_page ? "active" : ""}`

        const link = document.createElement("a")
        link.className = "page-link"
        link.href = "#"
        link.textContent = i.toString()
        link.addEventListener("click", (e) => {
            e.preventDefault()
            loadPatientsFromServer(i)
        })
        li.appendChild(link)
        paginationContainer.appendChild(li)
    }

    // Última página si no está en el rango
    if (endPage < total_pages) {
        if (endPage < total_pages - 1) {
            const dotsLi = document.createElement("li")
            dotsLi.className = "page-item disabled"
            const dotsSpan = document.createElement("span")
            dotsSpan.className = "page-link"
            dotsSpan.textContent = "..."
            dotsLi.appendChild(dotsSpan)
            paginationContainer.appendChild(dotsLi)
        }

        const lastLi = document.createElement("li")
        lastLi.className = "page-item"

        const lastLink = document.createElement("a")
        lastLink.className = "page-link"
        lastLink.href = "#"
        lastLink.textContent = total_pages.toString()
        lastLink.addEventListener("click", (e) => {
            e.preventDefault()
            loadPatientsFromServer(total_pages)
        })
        lastLi.appendChild(lastLink)
        paginationContainer.appendChild(lastLi)
    }

    // Botón Siguiente
    const nextLi = document.createElement("li")
    const canGoNext = current_page < total_pages
    nextLi.className = `page-item ${!canGoNext ? "disabled" : ""}`

    if (canGoNext) {
        const nextLink = document.createElement("a")
        nextLink.className = "page-link"
        nextLink.href = "#"
        nextLink.textContent = "Siguiente"
        nextLink.addEventListener("click", (e) => {
            e.preventDefault()
            const targetPage = nextPageNum || current_page + 1
            console.log("Navegando a página siguiente (pacientes):", targetPage)
            loadPatientsFromServer(targetPage)
        })
        nextLi.appendChild(nextLink)
    } else {
        const nextSpan = document.createElement("span")
        nextSpan.className = "page-link"
        nextSpan.textContent = "Siguiente"
        nextSpan.setAttribute("tabindex", "-1")
        nextLi.appendChild(nextSpan)
    }
    paginationContainer.appendChild(nextLi)

    // Información de paginación
    updatePatientsPaginationInfo(data)
}

// Función para actualizar información de paginación de pacientes
function updatePatientsPaginationInfo(data) {
    const {current_page, total_items, total_pages} = data
    const itemsPerPage = PATIENT_API_CONFIG.pageSize
    const startItem = (current_page - 1) * itemsPerPage + 1
    const endItem = Math.min(current_page * itemsPerPage, total_items)

    // Crear o actualizar el elemento de información
    let infoElement = document.getElementById("patients-pagination-info")
    if (!infoElement) {
        infoElement = document.createElement("div")
        infoElement.id = "patients-pagination-info"
        infoElement.className = "text-muted small mb-3"

        const paginationNav = document.querySelector('nav[aria-label="Paginación de pacientes"]')
        if (paginationNav) {
            paginationNav.parentNode.insertBefore(infoElement, paginationNav)
        }
    }

    infoElement.innerHTML = `Mostrando ${startItem} a ${endItem} de ${total_items} pacientes (Página ${current_page} de ${total_pages})`
}

// Función para aplicar filtros de pacientes
function applyPatientFilters() {
    const searchTerm = document.getElementById("searchPatient")?.value || ""
    const documentTypeFilter = document.getElementById("filterDocumentType")?.value || ""
    const genderFilter = document.getElementById("filterGender")?.value || ""

    const filters = {
        search: searchTerm,
        document_type: documentTypeFilter,
        gender: genderFilter,
    }

    console.log("Aplicando filtros de pacientes:", filters)

    // Cargar primera página con filtros
    loadPatientsFromServer(1, filters)
}

// Función para limpiar filtros de pacientes
function clearPatientFilters() {
    console.log("Limpiando filtros de pacientes")
    const searchPatient = document.getElementById("searchPatient")
    const filterDocumentType = document.getElementById("filterDocumentType")
    const filterGender = document.getElementById("filterGender")

    if (searchPatient) searchPatient.value = ""
    if (filterDocumentType) filterDocumentType.value = ""
    if (filterGender) filterGender.value = ""

    // Resetear filtros y cargar primera página
    currentPatientFilters = {search: "", document_type: "", gender: ""}
    loadPatientsFromServer(1, currentPatientFilters)
}

// Función para editar paciente
async function editPatient(id) {
    console.log("Editando paciente:", id)

    try {
        // Mostrar loading mientras se carga el paciente
        const editBtn = document.querySelector(`button[onclick="editPatient(${id})"]`)
        const originalContent = editBtn ? editBtn.innerHTML : null

        if (editBtn) {
            editBtn.disabled = true
            editBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
            editBtn.title = "Cargando..."
        }

        // Obtener datos del paciente
        const patient = await getPatientFromServer(id)

        // Mostrar formulario de edición
        showEditPatientForm(patient)

        // Restaurar botón
        if (editBtn && originalContent) {
            editBtn.disabled = false
            editBtn.innerHTML = originalContent
            editBtn.title = "Editar"
        }
    } catch (error) {
        console.error("Error al cargar paciente para editar:", error)

        // Mostrar modal de error
        createErrorModal("Error al Cargar Paciente", "No se pudo cargar la información del paciente: " + error.message)

        // Restaurar botón
        const editBtn = document.querySelector(`button[onclick="editPatient(${id})"]`)
        if (editBtn) {
            editBtn.disabled = false
            editBtn.innerHTML = '<i class="fas fa-edit"></i>'
            editBtn.title = "Editar"
        }
    }
}

// Función para obtener detalle del paciente via AJAX
// Update getPatientFromServer to use correct endpoint
async function getPatientFromServer(patientId) {
    try {
        console.log("Obteniendo paciente del servidor:", patientId)

        const response = await fetch(`${PATIENT_API_CONFIG.baseURL}/pacientes/${patientId}/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        console.log("Respuesta del servidor:", response.status, response.statusText)

        if (!response.ok) {
            let errorMessage = `Error HTTP: ${response.status} - ${response.statusText}`

            try {
                const errorData = await response.json()
                console.log("Error del servidor:", errorData)
                errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage
            } catch (parseError) {
                console.log("No se pudo parsear el error como JSON")
            }

            throw new Error(errorMessage)
        }

        const patient = await response.json()
        console.log("Paciente obtenido exitosamente:", patient)
        return patient
    } catch (error) {
        console.error("Error al obtener paciente:", error)
        throw error
    }
}

// Función para llenar el formulario de edición con datos del paciente
function fillEditPatientForm(patient) {
    console.log("Llenando formulario de edición con datos:", patient)

    // Campos básicos
    document.getElementById("editPatientId").value = patient.id || ""
    document.getElementById("editPatientFirstName").value = patient.first_name || ""
    document.getElementById("editPatientSurname").value = patient.surname || ""
    document.getElementById("editPatientSecondSurname").value = patient.second_surname || ""
    document.getElementById("editPatientDateOfBirth").value = patient.date_of_birth || ""
    document.getElementById("editPatientDocumentNumber").value = patient.document_number || ""
    document.getElementById("editPatientPhone").value = patient.phone_or_cellular || ""
    document.getElementById("editPatientDirection").value = patient.direction || ""
    document.getElementById("editPatientEmail").value = patient.email || ""

    // Tipo de documento
    const documentTypeSelect = document.getElementById("editPatientTypeDocument")
    if (documentTypeSelect && patient.type_document) {
        const documentTypeId = typeof patient.type_document === "object" ? patient.type_document.id : patient.type_document
        console.log("Seleccionando tipo de documento:", documentTypeId)

        for (let i = 0; i < documentTypeSelect.options.length; i++) {
            if (documentTypeSelect.options[i].value == documentTypeId) {
                documentTypeSelect.selectedIndex = i
                break
            }
        }
    }

    // Género
    const genderSelect = document.getElementById("editPatientGender")
    if (genderSelect && patient.gender) {
        genderSelect.value = patient.gender
    }
}

// Función para crear paciente via AJAX
async function createPatientOnServer(patientData) {
    try {
        console.log("Creando paciente en servidor:", patientData)

        // Mapear datos al formato esperado por tu modelo Django
        const djangoData = {
            first_name: patientData.first_name,
            surname: patientData.surname,
            second_surname: patientData.second_surname || null,
            date_of_birth: patientData.date_of_birth,
            type_document: Number.parseInt(patientData.type_document),
            document_number: patientData.document_number,
            gender: patientData.gender,
            phone_or_cellular: patientData.phone_or_cellular || null,
            direction: patientData.direction || null,
            email: patientData.email || null,
        }

        console.log("Datos mapeados para Django:", djangoData)

        const response = await fetch(PATIENT_API_CONFIG.baseURL + PATIENT_API_CONFIG.endpoints.createPatient, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify(djangoData),
        })

        if (!response.ok) {
            let errorMessage = `Error HTTP: ${response.status}`

            try {
                const errorData = await response.json()
                console.log("Error del servidor:", errorData)

                if (errorData.detail) {
                    errorMessage = errorData.detail
                } else if (errorData.message) {
                    errorMessage = errorData.message
                } else if (typeof errorData === "object") {
                    const fieldErrors = []
                    for (const [field, errors] of Object.entries(errorData)) {
                        if (Array.isArray(errors)) {
                            fieldErrors.push(`${field}: ${errors.join(", ")}`)
                        } else {
                            fieldErrors.push(`${field}: ${errors}`)
                        }
                    }
                    if (fieldErrors.length > 0) {
                        errorMessage = fieldErrors.join("\n")
                    }
                }
            } catch (parseError) {
                console.log("No se pudo parsear el error como JSON")
            }

            throw new Error(errorMessage)
        }

        const result = await response.json()
        console.log("Paciente creado exitosamente:", result)

        return result
    } catch (error) {
        console.error("Error al crear paciente:", error)
        throw error
    }
}

// Función para actualizar paciente via AJAX
// Update updatePatientOnServer to use correct endpoint
async function updatePatientOnServer(patientId, patientData) {
    try {
        console.log("Actualizando paciente en servidor:", patientId, patientData)

        const djangoData = {
            first_name: patientData.first_name,
            surname: patientData.surname,
            second_surname: patientData.second_surname || null,
            date_of_birth: patientData.date_of_birth || null,
            type_document: Number.parseInt(patientData.type_document),
            document_number: patientData.document_number,
            gender: patientData.gender,
            phone_or_cellular: patientData.phone_or_cellular || null,
            direction: patientData.direction || null,
            email: patientData.email || null,
        }

        console.log("Datos mapeados para Django:", djangoData)

        const response = await fetch(`${PATIENT_API_CONFIG.baseURL}/pacientes/${patientId}/`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify(djangoData),
        })

        if (!response.ok) {
            let errorMessage = `Error HTTP: ${response.status}`

            try {
                const errorData = await response.json()
                console.log("Error del servidor:", errorData)

                if (errorData.detail) {
                    errorMessage = errorData.detail
                } else if (errorData.message) {
                    errorMessage = errorData.message
                } else if (typeof errorData === "object") {
                    const fieldErrors = []
                    for (const [field, errors] of Object.entries(errorData)) {
                        if (Array.isArray(errors)) {
                            fieldErrors.push(`${field}: ${errors.join(", ")}`)
                        } else {
                            fieldErrors.push(`${field}: ${errors}`)
                        }
                    }
                    if (fieldErrors.length > 0) {
                        errorMessage = fieldErrors.join("\n")
                    }
                }
            } catch (parseError) {
                console.log("No se pudo parsear el error como JSON")
            }

            throw new Error(errorMessage)
        }

        const result = await response.json()
        console.log("Paciente actualizado exitosamente:", result)

        return result
    } catch (error) {
        console.error("Error al actualizar paciente:", error)
        throw error
    }
}

// Función para eliminar paciente via AJAX
// Update deletePatientOnServer to use correct endpoint
async function deletePatientOnServer(patientId) {
    try {
        console.log("Eliminando paciente del servidor:", patientId)

        const deleteUrl = `${PATIENT_API_CONFIG.baseURL}/pacientes/${patientId}/eliminar/`
        console.log("URL de eliminación:", deleteUrl)

        const response = await fetch(deleteUrl, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
        })

        console.log("Respuesta del servidor:", response.status, response.statusText)

        if (!response.ok) {
            let errorMessage = `Error HTTP: ${response.status} - ${response.statusText}`

            try {
                const errorData = await response.json()
                console.log("Error del servidor:", errorData)
                errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage
            } catch (parseError) {
                console.log("No se pudo parsear el error como JSON")
                try {
                    const errorText = await response.text()
                    if (errorText) {
                        errorMessage = errorText
                    }
                } catch (textError) {
                    console.log("No se pudo obtener texto de respuesta")
                }
            }

            throw new Error(errorMessage)
        }

        let result = {success: true, message: "Paciente eliminado exitosamente"}

        if (response.status !== 204) {
            try {
                const responseData = await response.json()
                result = {...result, ...responseData}
            } catch (parseError) {
                console.log("Respuesta exitosa pero no es JSON válido")
            }
        }

        console.log("Paciente eliminado exitosamente:", result)
        return result
    } catch (error) {
        console.error("Error al eliminar paciente:", error)
        throw error
    }
}

// Función para eliminar paciente
async function deletePatient(id) {
    console.log("Eliminando paciente:", id)

    const patient = currentPatients.find((p) => p.id === id)
    const patientName = patient ? patient.full_name : `ID ${id}`

    createConfirmationModal(
        "Confirmar Eliminación",
        `¿Estás seguro de que deseas eliminar el paciente "<strong>${patientName}</strong>"?<br><br>Esta acción no se puede deshacer.`,
        async () => {
            const deleteBtn = document.querySelector(`button[onclick="deletePatient(${id})"]`)
            const originalContent = deleteBtn ? deleteBtn.innerHTML : null

            try {
                if (deleteBtn) {
                    deleteBtn.disabled = true
                    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
                    deleteBtn.title = "Eliminando..."
                }

                const result = await deletePatientOnServer(id)

                const confirmationModal = document.getElementById("confirmationModal")
                if (confirmationModal) {
                    window.bootstrap.Modal.getInstance(confirmationModal).hide()
                }

                const successMessage = result.message || "Paciente eliminado exitosamente"
                createSuccessModal("¡Eliminado!", successMessage)

                if (currentPatients.length === 1 && currentPatientPage > 1) {
                    loadPatientsFromServer(currentPatientPage - 1, currentPatientFilters)
                } else {
                    loadPatientsFromServer(currentPatientPage, currentPatientFilters)
                }
            } catch (error) {
                console.error("Error completo al eliminar:", error)

                const confirmationModal = document.getElementById("confirmationModal")
                if (confirmationModal) {
                    window.bootstrap.Modal.getInstance(confirmationModal).hide()
                }

                let errorMessage = "No se pudo eliminar el paciente"
                if (error.message) {
                    errorMessage = error.message
                }

                createErrorModal("Error al Eliminar", errorMessage)

                if (deleteBtn && originalContent) {
                    deleteBtn.disabled = false
                    deleteBtn.innerHTML = originalContent
                    deleteBtn.title = "Eliminar"
                }
            }
        },
        () => {
            console.log("Eliminación cancelada por el usuario")
        },
    )
}

// Hacer funciones globales para pacientes
window.showAddPatientForm = showAddPatientForm
window.showEditPatientForm = showEditPatientForm
window.showPatientsList = showPatientsList
window.editPatient = editPatient
window.deletePatient = deletePatient
window.clearPatientFilters = clearPatientFilters
window.loadPatientsFromServer = loadPatientsFromServer

// Add event listeners for patient forms in the DOMContentLoaded section
document.addEventListener("DOMContentLoaded", () => {
    // ... existing code ...

    // Manejador de envío del formulario de agregar paciente
    const addPatientForm = document.getElementById("addPatientForm")
    if (addPatientForm) {
        addPatientForm.addEventListener("submit", async (e) => {
            e.preventDefault()
            console.log("Formulario de paciente enviado")

            const submitBtn = addPatientForm.querySelector('button[type="submit"]')
            const originalText = submitBtn.innerHTML

            try {
                // Mostrar loading
                submitBtn.disabled = true
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...'

                // Obtener datos del formulario
                const formData = {
                    first_name: document.getElementById("patientFirstName").value,
                    surname: document.getElementById("patientSurname").value,
                    second_surname: document.getElementById("patientSecondSurname").value || null,
                    date_of_birth: document.getElementById("patientDateOfBirth").value || null,
                    type_document: document.getElementById("patientTypeDocument").value,
                    document_number: document.getElementById("patientDocumentNumber").value,
                    gender: document.getElementById("patientGender").value,
                    phone_or_cellular: document.getElementById("patientPhone").value || null,
                    direction: document.getElementById("patientDirection").value || null,
                    email: document.getElementById("patientEmail").value || null,
                }

                console.log("Datos del paciente:", formData)

                // Validar campos requeridos
                if (
                    !formData.first_name ||
                    !formData.surname ||
                    !formData.type_document ||
                    !formData.document_number ||
                    !formData.gender
                ) {
                    throw new Error("Por favor completa todos los campos obligatorios")
                }

                // Crear en el servidor
                await createPatientOnServer(formData)

                // Mostrar modal de éxito
                createSuccessModal("¡Paciente Creado!", "El paciente ha sido agregado exitosamente al sistema.")

                // Resetear formulario y volver a la lista
                addPatientForm.reset()
                showPatientsList()

                // Recargar pacientes para mostrar el nuevo
                loadPatientsFromServer(1, currentPatientFilters)
            } catch (error) {
                // Mostrar modal de error
                createErrorModal("Error al Crear Paciente", "No se pudo guardar el paciente: " + error.message)
                console.error("Error completo:", error)
            } finally {
                // Restaurar botón
                submitBtn.disabled = false
                submitBtn.innerHTML = originalText
            }
        })
    }

    // Manejador de envío del formulario de edición de paciente
    const editPatientForm = document.getElementById("editPatientForm")
    if (editPatientForm) {
        editPatientForm.addEventListener("submit", async (e) => {
            e.preventDefault()
            console.log("Formulario de edición de paciente enviado")

            const submitBtn = editPatientForm.querySelector('button[type="submit"]')
            const originalText = submitBtn.innerHTML

            try {
                // Mostrar loading
                submitBtn.disabled = true
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Actualizando...'

                // Obtener ID del paciente
                const patientId = document.getElementById("editPatientId").value
                if (!patientId) {
                    throw new Error("ID del paciente no encontrado")
                }

                // Obtener datos del formulario
                const formData = {
                    first_name: document.getElementById("editPatientFirstName").value,
                    surname: document.getElementById("editPatientSurname").value,
                    second_surname: document.getElementById("editPatientSecondSurname").value || null,
                    date_of_birth: document.getElementById("editPatientDateOfBirth").value || null,
                    type_document: document.getElementById("editPatientTypeDocument").value,
                    document_number: document.getElementById("editPatientDocumentNumber").value,
                    gender: document.getElementById("editPatientGender").value,
                    phone_or_cellular: document.getElementById("editPatientPhone").value || null,
                    direction: document.getElementById("editPatientDirection").value || null,
                    email: document.getElementById("editPatientEmail").value || null,
                }

                console.log("Datos del paciente a actualizar:", formData)

                // Validar campos requeridos
                if (
                    !formData.first_name ||
                    !formData.surname ||
                    !formData.type_document ||
                    !formData.document_number ||
                    !formData.gender
                ) {
                    throw new Error("Por favor completa todos los campos obligatorios")
                }

                // Actualizar en el servidor
                await updatePatientOnServer(patientId, formData)

                // Mostrar modal de éxito
                createSuccessModal("¡Paciente Actualizado!", "Los cambios han sido guardados exitosamente.")

                // Volver a la lista
                showPatientsList()

                // Recargar pacientes para mostrar los cambios
                loadPatientsFromServer(currentPatientPage, currentPatientFilters)
            } catch (error) {
                // Mostrar modal de error
                createErrorModal("Error al Actualizar Paciente", "No se pudieron guardar los cambios: " + error.message)
                console.error("Error completo:", error)
            } finally {
                // Restaurar botón
                submitBtn.disabled = false
                submitBtn.innerHTML = originalText
            }
        })
    }

    // ... rest of existing code ...
})
