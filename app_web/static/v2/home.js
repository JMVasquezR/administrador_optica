const loadChartData = async () => {
    try {
        const response = await fetch('/api/dashboard/sales-stats/');
        const stats = await response.json();

        // Actualizar el monto de "Ventas de Hoy" en el HTML
        const todayElement = document.querySelector('h2.fw-bold');
        if (todayElement) {
            todayElement.innerText = `S/ ${stats.total_today.toFixed(2)}`;
        }

        // Renderizar el gráfico con datos reales
        renderSalesChart(stats.labels, stats.data);

    } catch (error) {
        console.error("Error cargando estadísticas:", error);
    }
};

const renderSalesChart = (labels, data) => {
    const ctx = document.getElementById('salesChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas (S/)',
                data: data,
                borderColor: '#d90429',
                backgroundColor: 'rgba(217, 4, 41, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {beginAtZero: true}
            }
        }
    });
};

// Llamar a la función al cargar la página
document.addEventListener('DOMContentLoaded', loadChartData);