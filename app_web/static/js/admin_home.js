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

        // Si es la sección de recetarios, cargar la primera página
        if (sectionName === "recipes") {
            const recipesList = document.getElementById("recipes-list")
            const addRecipeForm = document.getElementById("add-recipe-form")
            const editRecipeForm = document.getElementById("edit-recipe-form")

            // Asegurar que se muestre la lista y se oculten los formularios
            if (recipesList) recipesList.style.display = "block"
            if (addRecipeForm) addRecipeForm.style.display = "none"
            if (editRecipeForm) editRecipeForm.style.display = "none"

            // Cargar recetarios de la primera página
            loadRecipesFromServer(1)
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

    // Funcionalidad de búsqueda de recetarios con debounce
    const searchRecipeInput = document.getElementById("searchRecipe")
    if (searchRecipeInput) {
        const debouncedRecipeSearch = debounce(applyRecipeFilters, 500)
        searchRecipeInput.addEventListener("input", debouncedRecipeSearch)
    }

    // Funcionalidad de filtros de recetarios
    const recipeStatusFilter = document.getElementById("filterRecipeStatus")
    const recipeDateFilter = document.getElementById("filterRecipeDate")

    if (recipeStatusFilter) {
        recipeStatusFilter.addEventListener("change", applyRecipeFilters)
    }

    if (recipeDateFilter) {
        recipeDateFilter.addEventListener("change", applyRecipeFilters)
    }

    // Manejador de envío del formulario de agregar recetario
    const addRecipeForm = document.getElementById("addRecipeForm")
    if (addRecipeForm) {
        addRecipeForm.addEventListener("submit", async (e) => {
            e.preventDefault()
            console.log("Formulario de recetario enviado")

            const submitBtn = addRecipeForm.querySelector('button[type="submit"]')
            const originalText = submitBtn.innerHTML

            try {
                // Mostrar loading
                submitBtn.disabled = true
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...'

                // Obtener datos del formulario
                const formData = {
                    patient: Number.parseInt(document.getElementById("recipePatient").value),
                    date_of_issue: document.getElementById("recipeDateOfIssue").value,
                    // Datos de distancia (lejos) - Ojo derecho
                    right_eye_spherical_distance_far:
                        Number.parseFloat(document.getElementById("rightEyeSphericalDistanceFar").value) || null,
                    right_eye_cylinder_distance_far:
                        Number.parseFloat(document.getElementById("rightEyeCylinderDistanceFar").value) || null,
                    right_eye_axis_distance_far:
                        Number.parseFloat(document.getElementById("rightEyeAxisDistanceFar").value) || null,
                    // Datos de distancia (lejos) - Ojo izquierdo
                    left_eye_spherical_distance_far:
                        Number.parseFloat(document.getElementById("leftEyeSphericalDistanceFar").value) || null,
                    left_eye_cylinder_distance_far:
                        Number.parseFloat(document.getElementById("leftEyeCylinderDistanceFar").value) || null,
                    left_eye_axis_distance_far:
                        Number.parseFloat(document.getElementById("leftEyeAxisDistanceFar").value) || null,
                    // Distancia pupilar (lejos)
                    pupillary_distance_far: Number.parseFloat(document.getElementById("pupillaryDistanceFar").value) || null,
                    // Datos de cerca - Ojo derecho
                    right_eye_spherical_distance_near:
                        Number.parseFloat(document.getElementById("rightEyeSphericalDistanceNear").value) || null,
                    right_eye_cylinder_distance_near:
                        Number.parseFloat(document.getElementById("rightEyeCylinderDistanceNear").value) || null,
                    right_eye_axis_distance_near:
                        Number.parseFloat(document.getElementById("rightEyeAxisDistanceNear").value) || null,
                    // Datos de cerca - Ojo izquierdo
                    left_eye_spherical_distance_near:
                        Number.parseFloat(document.getElementById("leftEyeSphericalDistanceNear").value) || null,
                    left_eye_cylinder_distance_near:
                        Number.parseFloat(document.getElementById("leftEyeCylinderDistanceNear").value) || null,
                    left_eye_axis_distance_near:
                        Number.parseFloat(document.getElementById("leftEyeAxisDistanceNear").value) || null,
                    // Distancia pupilar (cerca)
                    pupillary_distance_near: Number.parseFloat(document.getElementById("pupillaryDistanceNear").value) || null,
                    // Observaciones e instrucciones
                    observation: document.getElementById("recipeObservation").value || null,
                    instruction: document.getElementById("recipeInstruction").value || null,
                    is_active: true,
                }

                console.log("Datos del recetario:", formData)

                // Validar campos requeridos
                if (!formData.patient || !formData.date_of_issue) {
                    throw new Error("Por favor completa todos los campos obligatorios")
                }

                // Crear en el servidor
                await createRecipeOnServer(formData)

                // Mostrar modal de éxito
                createSuccessModal("¡Recetario Creado!", "El recetario ha sido agregado exitosamente al sistema.")

                // Resetear formulario y volver a la lista
                addRecipeForm.reset()
                showRecipesList()

                // Recargar recetarios para mostrar el nuevo
                loadRecipesFromServer(1, currentRecipeFilters)
            } catch (error) {
                // Mostrar modal de error
                createErrorModal("Error al Crear Recetario", "No se pudo guardar el recetario: " + error.message)
                console.error("Error completo:", error)
            } finally {
                // Restaurar botón
                submitBtn.disabled = false
                submitBtn.innerHTML = originalText
            }
        })
    }

    // Manejador de envío del formulario de edición de recetario
    const editRecipeForm = document.getElementById("editRecipeForm")
    if (editRecipeForm) {
        editRecipeForm.addEventListener("submit", async (e) => {
            e.preventDefault()
            console.log("Formulario de edición de recetario enviado")

            const submitBtn = editRecipeForm.querySelector('button[type="submit"]')
            const originalText = submitBtn.innerHTML

            try {
                // Mostrar loading
                submitBtn.disabled = true
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Actualizando...'

                // Obtener ID del recetario
                const recipeId = document.getElementById("editRecipeId").value
                if (!recipeId) {
                    throw new Error("ID del recetario no encontrado")
                }

                // Obtener datos del formulario
                const formData = {
                    patient: Number.parseInt(document.getElementById("editRecipePatient").value),
                    date_of_issue: document.getElementById("editRecipeDateOfIssue").value,
                    // Datos de distancia (lejos) - Ojo derecho
                    right_eye_spherical_distance_far:
                        Number.parseFloat(document.getElementById("editRightEyeSphericalDistanceFar").value) || null,
                    right_eye_cylinder_distance_far:
                        Number.parseFloat(document.getElementById("editRightEyeCylinderDistanceFar").value) || null,
                    right_eye_axis_distance_far:
                        Number.parseFloat(document.getElementById("editRightEyeAxisDistanceFar").value) || null,
                    // Datos de distancia (lejos) - Ojo izquierdo
                    left_eye_spherical_distance_far:
                        Number.parseFloat(document.getElementById("editLeftEyeSphericalDistanceFar").value) || null,
                    left_eye_cylinder_distance_far:
                        Number.parseFloat(document.getElementById("editLeftEyeCylinderDistanceFar").value) || null,
                    left_eye_axis_distance_far:
                        Number.parseFloat(document.getElementById("editLeftEyeAxisDistanceFar").value) || null,
                    // Distancia pupilar (lejos)
                    pupillary_distance_far: Number.parseFloat(document.getElementById("editPupillaryDistanceFar").value) || null,
                    // Datos de cerca - Ojo derecho
                    right_eye_spherical_distance_near:
                        Number.parseFloat(document.getElementById("editRightEyeSphericalDistanceNear").value) || null,
                    right_eye_cylinder_distance_near:
                        Number.parseFloat(document.getElementById("editRightEyeCylinderDistanceNear").value) || null,
                    right_eye_axis_distance_near:
                        Number.parseFloat(document.getElementById("editRightEyeAxisDistanceNear").value) || null,
                    // Datos de cerca - Ojo izquierdo
                    left_eye_spherical_distance_near:
                        Number.parseFloat(document.getElementById("editLeftEyeSphericalDistanceNear").value) || null,
                    left_eye_cylinder_distance_near:
                        Number.parseFloat(document.getElementById("editLeftEyeCylinderDistanceNear").value) || null,
                    left_eye_axis_distance_near:
                        Number.parseFloat(document.getElementById("editLeftEyeAxisDistanceNear").value) || null,
                    // Distancia pupilar (cerca)
                    pupillary_distance_near:
                        Number.parseFloat(document.getElementById("editPupillaryDistanceNear").value) || null,
                    // Observaciones e instrucciones
                    observation: document.getElementById("editRecipeObservation").value || null,
                    instruction: document.getElementById("editRecipeInstruction").value || null,
                    is_active: document.querySelector('input[name="editRecipeStatus"]:checked')?.value === "true",
                }

                console.log("Datos del recetario a actualizar:", formData)

                // Validar campos requeridos
                if (!formData.patient || !formData.date_of_issue) {
                    throw new Error("Por favor completa todos los campos obligatorios")
                }

                // Actualizar en el servidor
                await updateRecipeOnServer(recipeId, formData)

                // Mostrar modal de éxito
                createSuccessModal("¡Recetario Actualizado!", "Los cambios han sido guardados exitosamente.")

                // Volver a la lista
                showRecipesList()

                // Recargar recetarios para mostrar los cambios
                loadRecipesFromServer(currentRecipePage, currentRecipeFilters)
            } catch (error) {
                // Mostrar modal de error
                createErrorModal("Error al Actualizar Recetario", "No se pudieron guardar los cambios: " + error.message)
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

// ==================== GESTIÓN DE RECETARIOS ====================

// Variables globales para recetarios
let currentRecipePage = 1
let totalRecipeItems = 0
let totalRecipePages = 0
let currentRecipes = []
let isLoadingRecipes = false

// Variables para filtros de recetarios
let currentRecipeFilters = {
    search: "",
    status: "",
    date: "",
}

// Configuración API para recetarios
const RECIPE_API_CONFIG = {
    baseURL: "http://127.0.0.1:8000/api",
    endpoints: {
        recipes: "/recetas/",
        createRecipe: "/recetas/crear/",
        updateRecipe: "/recetas", // Will be used with /{id}/
        deleteRecipe: "/recetas", // Will be used with /{id}/eliminar/
    },
    pageSize: 10,
}

// Funciones de navegación para recetarios
function showAddRecipeForm() {
    console.log("Ejecutando showAddRecipeForm()")
    const recipesList = document.getElementById("recipes-list")
    const addRecipeForm = document.getElementById("add-recipe-form")
    const editRecipeForm = document.getElementById("edit-recipe-form")

    // Ocultar todas las vistas
    if (recipesList) recipesList.style.display = "none"
    if (editRecipeForm) editRecipeForm.style.display = "none"

    // Mostrar formulario de agregar
    if (addRecipeForm) {
        addRecipeForm.style.display = "block"
        console.log("Formulario de agregar recetario mostrado")

        // Cargar pacientes para el select
        loadPatientsForSelect()

        // Establecer fecha actual por defecto
        const today = new Date().toISOString().split("T")[0]
        document.getElementById("recipeDateOfIssue").value = today
    }
}

function showEditRecipeForm(recipe = null) {
    console.log("Ejecutando showEditRecipeForm()", recipe)
    const recipesList = document.getElementById("recipes-list")
    const addRecipeForm = document.getElementById("add-recipe-form")
    const editRecipeForm = document.getElementById("edit-recipe-form")

    // Ocultar otras vistas
    if (recipesList) recipesList.style.display = "none"
    if (addRecipeForm) addRecipeForm.style.display = "none"

    // Mostrar formulario de edición
    if (editRecipeForm) {
        editRecipeForm.style.display = "block"
        console.log("Formulario de edición de recetario mostrado")

        // Cargar pacientes y llenar formulario
        loadPatientsForSelect().then(() => {
            if (recipe) {
                setTimeout(() => {
                    fillEditRecipeForm(recipe)
                }, 200)
            }
        })
    }
}

function showRecipesList() {
    console.log("Ejecutando showRecipesList()")
    const addRecipeForm = document.getElementById("add-recipe-form")
    const editRecipeForm = document.getElementById("edit-recipe-form")
    const recipesList = document.getElementById("recipes-list")

    // Ocultar formularios
    if (addRecipeForm) addRecipeForm.style.display = "none"
    if (editRecipeForm) editRecipeForm.style.display = "none"

    // Mostrar lista
    if (recipesList) {
        recipesList.style.display = "block"
        console.log("Lista de recetarios mostrada")
    }
}

// Función para cargar pacientes para los selects
async function loadPatientsForSelect() {
    try {
        const response = await fetch(`${PATIENT_API_CONFIG.baseURL}/pacientes/?page_size=1000`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        if (response.ok) {
            const data = await response.json()
            const patients = Array.isArray(data) ? data : data.results || []
            populatePatientSelects(patients)
        } else {
            console.log("No se pudieron cargar los pacientes")
        }
    } catch (error) {
        console.error("Error al cargar pacientes:", error)
    }
}

// Función para poblar selects de pacientes
function populatePatientSelects(patients) {
    // Select del formulario de agregar
    const addSelect = document.getElementById("recipePatient")
    if (addSelect) {
        while (addSelect.children.length > 1) {
            addSelect.removeChild(addSelect.lastChild)
        }
        patients.forEach((patient) => {
            const option = document.createElement("option")
            option.value = patient.id
            option.textContent = `${patient.first_name} ${patient.surname} ${patient.second_surname || ""}`.trim()
            addSelect.appendChild(option)
        })
    }

    // Select del formulario de editar
    const editSelect = document.getElementById("editRecipePatient")
    if (editSelect) {
        while (editSelect.children.length > 1) {
            editSelect.removeChild(editSelect.lastChild)
        }
        patients.forEach((patient) => {
            const option = document.createElement("option")
            option.value = patient.id
            option.textContent = `${patient.first_name} ${patient.surname} ${patient.second_surname || ""}`.trim()
            editSelect.appendChild(option)
        })
    }
}

// Función para construir URL de API de recetarios
function buildRecipeApiUrl(page = 1, filters = {}) {
    let url = `${RECIPE_API_CONFIG.baseURL}${RECIPE_API_CONFIG.endpoints.recipes}`
    const params = []

    // Parámetros de paginación
    params.push(`page=${page}`)
    params.push(`page_size=${RECIPE_API_CONFIG.pageSize}`)

    // Filtros
    if (filters.search && filters.search.trim()) {
        params.push(`patient_name=${encodeURIComponent(filters.search.trim())}`)
    }
    if (filters.status && filters.status.trim()) {
        params.push(`is_active=${encodeURIComponent(filters.status.trim())}`)
    }
    if (filters.date && filters.date.trim()) {
        params.push(`date_of_issue=${encodeURIComponent(filters.date.trim())}`)
    }

    if (params.length > 0) {
        url += "?" + params.join("&")
    }

    console.log("URL de recetarios construida:", url)
    return url
}

// Función para cargar recetarios desde el servidor
async function loadRecipesFromServer(page = 1, filters = currentRecipeFilters) {
    if (isLoadingRecipes) return

    isLoadingRecipes = true
    currentRecipePage = page
    currentRecipeFilters = {...filters}

    showRecipesLoading()

    try {
        const apiUrl = buildRecipeApiUrl(page, filters)
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
        console.log("Respuesta de Django API (recetarios):", data)

        // Procesar la respuesta
        totalRecipeItems = data.total_items || 0
        totalRecipePages = data.total_pages || 0
        currentRecipePage = data.current_page || 1

        // Mapear los recetarios al formato esperado
        console.log(data)
        currentRecipes = data.results.map((recipe) => ({
            id: recipe.id,
            prescription_number: recipe.prescription_number,
            patient: recipe.patient,
            name_patient: recipe.name_patient,
            date_of_issue: recipe.date_of_issue,
            is_disabled: recipe.is_disabled,
            is_active: recipe.is_active,
            observation: recipe.observation || "",
            instruction: recipe.instruction || "",
            // Datos de distancia (lejos)
            right_eye_spherical_distance_far: recipe.right_eye_spherical_distance_far,
            right_eye_cylinder_distance_far: recipe.right_eye_cylinder_distance_far,
            right_eye_axis_distance_far: recipe.right_eye_axis_distance_far,
            left_eye_spherical_distance_far: recipe.left_eye_spherical_distance_far,
            left_eye_cylinder_distance_far: recipe.left_eye_cylinder_distance_far,
            left_eye_axis_distance_far: recipe.left_eye_axis_distance_far,
            pupillary_distance_far: recipe.pupillary_distance_far,
            // Datos de cerca
            right_eye_spherical_distance_near: recipe.right_eye_spherical_distance_near,
            right_eye_cylinder_distance_near: recipe.right_eye_cylinder_distance_near,
            right_eye_axis_distance_near: recipe.right_eye_axis_distance_near,
            left_eye_spherical_distance_near: recipe.left_eye_spherical_distance_near,
            left_eye_cylinder_distance_near: recipe.left_eye_cylinder_distance_near,
            left_eye_axis_distance_near: recipe.left_eye_axis_distance_near,
            pupillary_distance_near: recipe.pupillary_distance_near,
        }))

        console.log("Recetarios procesados:", currentRecipes.length)
        console.log("Página actual:", currentRecipePage, "de", totalRecipePages)

        renderRecipes(currentRecipes)
        renderRecipesPagination(data)
    } catch (error) {
        console.error("Error al cargar recetarios:", error)
        showRecipesError(error.message)
    } finally {
        isLoadingRecipes = false
    }
}

// Función para mostrar loading de recetarios
function showRecipesLoading() {
    const tbody = document.getElementById("recipesTableBody")
    if (!tbody) return

    tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-4">
        <div class="d-flex justify-content-center align-items-center">
          <div class="spinner-border text-red-custom me-3" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
          <span class="text-muted">Cargando recetarios...</span>
        </div>
      </td>
    </tr>
  `
}

// Función para mostrar error de recetarios
function showRecipesError(message) {
    const tbody = document.getElementById("recipesTableBody")
    if (!tbody) return

    tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-4">
        <div class="text-danger">
          <i class="fas fa-exclamation-triangle fs-2 mb-3"></i>
          <h5>Error al cargar recetarios</h5>
          <p class="mb-3">${message}</p>
          <button class="btn btn-outline-red-custom" onclick="loadRecipesFromServer(${currentRecipePage})">
            <i class="fas fa-refresh me-2"></i>
            Reintentar
          </button>
        </div>
      </td>
    </tr>
  `
}

// Función para renderizar recetarios
function renderRecipes(recipes) {
    const tbody = document.getElementById("recipesTableBody")
    if (!tbody) return

    tbody.innerHTML = ""

    if (recipes.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">
          <div class="text-muted">
            <i class="fas fa-prescription fs-2 mb-3"></i>
            <h5>No hay recetarios</h5>
            <p>No se encontraron recetarios que coincidan con los filtros.</p>
          </div>
        </td>
      </tr>
    `
        return
    }

    recipes.forEach((recipe) => {
        const row = document.createElement("tr")
        row.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="bg-light rounded p-2 me-3">
            <i class="fas fa-prescription text-red-custom"></i>
          </div>
          <div>
            <div class="fw-semibold">${recipe.prescription_number}</div>
            <small class="text-muted">Recetario médico</small>
          </div>
        </div>
      </td>
      <td>
        <div class="fw-semibold">${recipe.name_patient}</div>
        <small class="text-muted">Paciente</small>
      </td>
      <td>${recipe.date_of_issue ? formatDate(recipe.date_of_issue) : "No especificada"}</td>
      <td>
        <span class="badge ${recipe.is_active ? "bg-success" : "bg-secondary"}">
          ${recipe.is_active ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td>
        <div class="text-truncate" style="max-width: 200px;" title="${recipe.observation || "Sin observaciones"}">
          ${recipe.observation || "Sin observaciones"}
        </div>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" title="Editar" onclick="editRecipe(${recipe.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" title="Eliminar" onclick="deleteRecipe(${recipe.id})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `
        tbody.appendChild(row)
    })
}

// Función para renderizar paginación de recetarios
function renderRecipesPagination(data) {
    const paginationContainer = document.getElementById("recipesPagination")
    if (!paginationContainer) return

    paginationContainer.innerHTML = ""

    const {current_page, total_pages, next_page, previous_page} = data

    // Extraer números de página de las URLs
    const nextPageNum = next_page ? extractPageNumber(next_page) : null
    const prevPageNum = previous_page ? extractPageNumber(previous_page) : null

    console.log("Datos de paginación (recetarios):", {
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
            console.log("Navegando a página anterior (recetarios):", targetPage)
            loadRecipesFromServer(targetPage)
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
            loadRecipesFromServer(1)
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
            loadRecipesFromServer(i)
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
            loadRecipesFromServer(total_pages)
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
            console.log("Navegando a página siguiente (recetarios):", targetPage)
            loadRecipesFromServer(targetPage)
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
    updateRecipesPaginationInfo(data)
}

// Función para actualizar información de paginación de recetarios
function updateRecipesPaginationInfo(data) {
    const {current_page, total_items, total_pages} = data
    const itemsPerPage = RECIPE_API_CONFIG.pageSize
    const startItem = (current_page - 1) * itemsPerPage + 1
    const endItem = Math.min(current_page * itemsPerPage, total_items)

    // Crear o actualizar el elemento de información
    let infoElement = document.getElementById("recipes-pagination-info")
    if (!infoElement) {
        infoElement = document.createElement("div")
        infoElement.id = "recipes-pagination-info"
        infoElement.className = "text-muted small mb-3"

        const paginationNav = document.querySelector('nav[aria-label="Paginación de recetarios"]')
        if (paginationNav) {
            paginationNav.parentNode.insertBefore(infoElement, paginationNav)
        }
    }

    infoElement.innerHTML = `Mostrando ${startItem} a ${endItem} de ${total_items} recetarios (Página ${current_page} de ${total_pages})`
}

// Función para aplicar filtros de recetarios
function applyRecipeFilters() {
    const searchTerm = document.getElementById("searchRecipe")?.value || ""
    const statusFilter = document.getElementById("filterRecipeStatus")?.value || ""
    const dateFilter = document.getElementById("filterRecipeDate")?.value || ""

    const filters = {
        search: searchTerm,
        status: statusFilter,
        date: dateFilter,
    }

    console.log("Aplicando filtros de recetarios:", filters)

    // Cargar primera página con filtros
    loadRecipesFromServer(1, filters)
}

// Función para limpiar filtros de recetarios
function clearRecipeFilters() {
    console.log("Limpiando filtros de recetarios")
    const searchRecipe = document.getElementById("searchRecipe")
    const filterRecipeStatus = document.getElementById("filterRecipeStatus")
    const filterRecipeDate = document.getElementById("filterRecipeDate")

    if (searchRecipe) searchRecipe.value = ""
    if (filterRecipeStatus) filterRecipeStatus.value = ""
    if (filterRecipeDate) filterRecipeDate.value = ""

    // Resetear filtros y cargar primera página
    currentRecipeFilters = {search: "", status: "", date: ""}
    loadRecipesFromServer(1, currentRecipeFilters)
}

// Función para editar recetario
async function editRecipe(id) {
    console.log("Editando recetario:", id)

    try {
        // Mostrar loading mientras se carga el recetario
        const editBtn = document.querySelector(`button[onclick="editRecipe(${id})"]`)
        const originalContent = editBtn ? editBtn.innerHTML : null

        if (editBtn) {
            editBtn.disabled = true
            editBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
            editBtn.title = "Cargando..."
        }

        // Obtener datos del recetario
        const recipe = await getRecipeFromServer(id)

        // Mostrar formulario de edición
        showEditRecipeForm(recipe)

        // Restaurar botón
        if (editBtn && originalContent) {
            editBtn.disabled = false
            editBtn.innerHTML = originalContent
            editBtn.title = "Editar"
        }
    } catch (error) {
        console.error("Error al cargar recetario para editar:", error)

        // Mostrar modal de error
        createErrorModal("Error al Cargar Recetario", "No se pudo cargar la información del recetario: " + error.message)

        // Restaurar botón
        const editBtn = document.querySelector(`button[onclick="editRecipe(${id})"]`)
        if (editBtn) {
            editBtn.disabled = false
            editBtn.innerHTML = '<i class="fas fa-edit"></i>'
            editBtn.title = "Editar"
        }
    }
}

// Función para obtener detalle del recetario via AJAX
async function getRecipeFromServer(recipeId) {
    try {
        console.log("Obteniendo recetario del servidor:", recipeId)

        const response = await fetch(`${RECIPE_API_CONFIG.baseURL}/recetas/${recipeId}/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })

        console.log("Respuesta del servidor:", response.status, response.statusText)

        if (!response.ok) {
            let errorMessage = `Error HTTP: ${response.status}`

            try {
                const errorData = await response.json()
                console.log("Error del servidor:", errorData)
                errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage
            } catch (parseError) {
                console.log("No se pudo parsear el error como JSON")
            }

            throw new Error(errorMessage)
        }

        const recipe = await response.json()
        console.log("Recetario obtenido exitosamente:", recipe)
        return recipe
    } catch (error) {
        console.error("Error al obtener recetario:", error)
        throw error
    }
}

// Función para llenar el formulario de edición con datos del recetario
function fillEditRecipeForm(recipe) {
    console.log("Llenando formulario de edición con datos:", recipe)

    // Campos básicos
    document.getElementById("editRecipeId").value = recipe.id || ""
    document.getElementById("editRecipePrescriptionNumber").value = recipe.prescription_number || ""
    document.getElementById("editRecipeDateOfIssue").value = recipe.date_of_issue || ""
    document.getElementById("editRecipeObservation").value = recipe.observation || ""
    document.getElementById("editRecipeInstruction").value = recipe.instruction || ""

    // Paciente
    const patientSelect = document.getElementById("editRecipePatient")
    if (patientSelect && recipe.patient) {
        const patientId = typeof recipe.patient === "object" ? recipe.patient.id : recipe.patient
        console.log("Seleccionando paciente:", patientId)

        for (let i = 0; i < patientSelect.options.length; i++) {
            if (patientSelect.options[i].value == patientId) {
                patientSelect.selectedIndex = i
                break
            }
        }
    }

    // Datos de distancia (lejos) - Ojo derecho
    document.getElementById("editRightEyeSphericalDistanceFar").value = recipe.right_eye_spherical_distance_far || ""
    document.getElementById("editRightEyeCylinderDistanceFar").value = recipe.right_eye_cylinder_distance_far || ""
    document.getElementById("editRightEyeAxisDistanceFar").value = recipe.right_eye_axis_distance_far || ""

    // Datos de distancia (lejos) - Ojo izquierdo
    document.getElementById("editLeftEyeSphericalDistanceFar").value = recipe.left_eye_spherical_distance_far || ""
    document.getElementById("editLeftEyeCylinderDistanceFar").value = recipe.left_eye_cylinder_distance_far || ""
    document.getElementById("editLeftEyeAxisDistanceFar").value = recipe.left_eye_axis_distance_far || ""

    // Distancia pupilar (lejos)
    document.getElementById("editPupillaryDistanceFar").value = recipe.pupillary_distance_far || ""

    // Datos de cerca - Ojo derecho
    document.getElementById("editRightEyeSphericalDistanceNear").value = recipe.right_eye_spherical_distance_near || ""
    document.getElementById("editRightEyeCylinderDistanceNear").value = recipe.right_eye_cylinder_distance_near || ""
    document.getElementById("editRightEyeAxisDistanceNear").value = recipe.right_eye_axis_distance_near || ""

    // Datos de cerca - Ojo izquierdo
    document.getElementById("editLeftEyeSphericalDistanceNear").value = recipe.left_eye_spherical_distance_near || ""
    document.getElementById("editLeftEyeCylinderDistanceNear").value = recipe.left_eye_cylinder_distance_near || ""
    document.getElementById("editLeftEyeAxisDistanceNear").value = recipe.left_eye_axis_distance_near || ""

    // Distancia pupilar (cerca)
    document.getElementById("editPupillaryDistanceNear").value = recipe.pupillary_distance_near || ""

    // Estado
    const statusActive = document.getElementById("editRecipeStatusActive")
    const statusInactive = document.getElementById("editRecipeStatusInactive")

    if (recipe.is_active === true) {
        if (statusActive) statusActive.checked = true
    } else {
        if (statusInactive) statusInactive.checked = true
    }
}

// Función para crear recetario via AJAX
async function createRecipeOnServer(recipeData) {
    try {
        console.log("Creando recetario en servidor:", recipeData)

        const response = await fetch(RECIPE_API_CONFIG.baseURL + RECIPE_API_CONFIG.endpoints.createRecipe, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify(recipeData),
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
        console.log("Recetario creado exitosamente:", result)

        return result
    } catch (error) {
        console.error("Error al crear recetario:", error)
        throw error
    }
}

// Función para actualizar recetario via AJAX
async function updateRecipeOnServer(recipeId, recipeData) {
    try {
        console.log("Actualizando recetario en servidor:", recipeId, recipeData)

        const response = await fetch(`${RECIPE_API_CONFIG.baseURL}/recetas/${recipeId}/`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify(recipeData),
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
        console.log("Recetario actualizado exitosamente:", result)

        return result
    } catch (error) {
        console.error("Error al actualizar recetario:", error)
        throw error
    }
}

// Función para eliminar recetario via AJAX
async function deleteRecipeOnServer(recipeId) {
    try {
        console.log("Eliminando recetario del servidor:", recipeId)

        const deleteUrl = `${RECIPE_API_CONFIG.baseURL}/recetas/${recipeId}/eliminar/`
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
            let errorMessage = `Error HTTP: ${response.status}`

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

        let result = {success: true, message: "Recetario eliminado exitosamente"}

        if (response.status !== 204) {
            try {
                const responseData = await response.json()
                result = {...result, ...responseData}
            } catch (parseError) {
                console.log("Respuesta exitosa pero no es JSON válido")
            }
        }

        console.log("Recetario eliminado exitosamente:", result)
        return result
    } catch (error) {
        console.error("Error al eliminar recetario:", error)
        throw error
    }
}

// Función para eliminar recetario
async function deleteRecipe(id) {
    console.log("Eliminando recetario:", id)

    const recipe = currentRecipes.find((r) => r.id === id)
    const recipeName = recipe ? recipe.prescription_number : `ID ${id}`

    createConfirmationModal(
        "Confirmar Eliminación",
        `¿Estás seguro de que deseas eliminar el recetario "<strong>${recipeName}</strong>"?<br><br>Esta acción no se puede deshacer.`,
        async () => {
            const deleteBtn = document.querySelector(`button[onclick="deleteRecipe(${id})"]`)
            const originalContent = deleteBtn ? deleteBtn.innerHTML : null

            try {
                if (deleteBtn) {
                    deleteBtn.disabled = true
                    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
                    deleteBtn.title = "Eliminando..."
                }

                const result = await deleteRecipeOnServer(id)

                const confirmationModal = document.getElementById("confirmationModal")
                if (confirmationModal) {
                    window.bootstrap.Modal.getInstance(confirmationModal).hide()
                }

                const successMessage = result.message || "Recetario eliminado exitosamente"
                createSuccessModal("¡Eliminado!", successMessage)

                if (currentRecipes.length === 1 && currentRecipePage > 1) {
                    loadRecipesFromServer(currentRecipePage - 1, currentRecipeFilters)
                } else {
                    loadRecipesFromServer(currentRecipePage, currentRecipeFilters)
                }
            } catch (error) {
                console.error("Error completo al eliminar:", error)

                const confirmationModal = document.getElementById("confirmationModal")
                if (confirmationModal) {
                    window.bootstrap.Modal.getInstance(confirmationModal).hide()
                }

                let errorMessage = "No se pudo eliminar el recetario"
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

// Hacer funciones globales para recetarios
window.showAddRecipeForm = showAddRecipeForm
window.showEditRecipeForm = showEditRecipeForm
window.showRecipesList = showRecipesList
window.editRecipe = editRecipe
window.deleteRecipe = deleteRecipe
window.clearRecipeFilters = clearRecipeFilters
window.loadRecipesFromServer = loadRecipesFromServer

// Actualizar la función showSection para incluir recetarios
const originalShowSection = showSection
showSection = (sectionName) => {
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

        // Si es la sección de recetarios, cargar la primera página
        if (sectionName === "recipes") {
            const recipesList = document.getElementById("recipes-list")
            const addRecipeForm = document.getElementById("add-recipe-form")
            const editRecipeForm = document.getElementById("edit-recipe-form")

            // Asegurar que se muestre la lista y se oculten los formularios
            if (recipesList) recipesList.style.display = "block"
            if (addRecipeForm) addRecipeForm.style.display = "none"
            if (editRecipeForm) editRecipeForm.style.display = "none"

            // Cargar recetarios de la primera página
            loadRecipesFromServer(1)
        }
    }
}

// Actualizar el array de secciones
const sections = ["dashboard", "products", "clients", "recipes", "appointments", "sales", "settings"]
