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