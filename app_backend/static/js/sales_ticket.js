jQuery(document).ready(function ($) {
    $(document).on('change', 'select[name^="saleslines_set-"][name$="-product"]', function () {
        let productId = $(this).val();
        let this_x = this;

        if (productId) {
            $.ajax({
                url: `/api/product/${productId}/`,
                method: 'GET',
                success: function (data) {
                    let parentRow = $(this_x).closest('tr');
                    parentRow.find('td.field-product_code p').text(data['code']);
                    parentRow.find('td.field-product_unit_measure p').text(data['unit_measure']);
                },
                error: function (xhr, status, error) {
                    console.error('Error al obtener los detalles del producto:', error);
                }
            });
        }
    });
});
