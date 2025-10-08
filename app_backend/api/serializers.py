from rest_framework import serializers

from app_backend.models.patients import Patient
from app_backend.models.products import Product, Brand
from app_backend.models.recipes import Recipe
from app_backend.models.sales_ticket import SalesTicket, SalesLines
from app_backend.models.type_document import TypeDocument


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ('id', 'name')


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ('id', 'name')


class ProductListSerializer(serializers.ModelSerializer):
    brand = serializers.StringRelatedField()
    category = serializers.StringRelatedField()

    class Meta:
        model = Product
        fields = ('id', 'name', 'code', 'unit_measure', 'brand', 'unit_price', 'category', 'initial_stock')


class ProductUpdateSerializer(serializers.ModelSerializer):
    code = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = '__all__'


class PatientCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = '__all__'


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    full_document = serializers.ReadOnlyField()
    date = serializers.ReadOnlyField()
    type_document = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'first_name', 'surname', 'second_surname', 'date_of_birth', 'type_document', 'document_number',
            'gender', 'phone_or_cellular', 'direction', 'email', 'is_active', 'full_name', 'full_document', 'date'
        ]

    def get_type_document(self, obj):
        return obj.type_document.short_name if obj.type_document else None


class TypeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeDocument
        fields = ['id', 'short_name', 'long_name']


class RecipeSerializer(serializers.ModelSerializer):
    name_patient = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = Recipe
        fields = '__all__'
        read_only_fields = ['id', 'prescription_number', 'name_patient']


class BoletaSerializer(serializers.ModelSerializer):
    name_patient = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = SalesTicket
        fields = '__all__'
        # read_only_fields = ['id', 'prescription_number', 'name_patient']
        read_only_fields = ['name_patient']


class SalesLineSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product'
    )  # Permitimos pasar el ID del producto

    class Meta:
        model = SalesLines
        fields = ['quantity', 'product_id', 'unit_price', 'amount']


class SalesTicketSerializer(serializers.ModelSerializer):
    # Usamos un SerializerMethodField para serializar las líneas de venta relacionadas
    saleslines = SalesLineSerializer(many=True, required=True, write_only=True)
    patient_id = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(), source='patient'
    )  # Pasar el ID del paciente

    class Meta:
        model = SalesTicket
        fields = ['ballot_number', 'date_of_issue', 'patient_id', 'saleslines', 'sales_total', 'observation']

    def create(self, validated_data):
        # Extraer las líneas de venta del payload
        saleslines_data = validated_data.pop('saleslines')

        # Crear el objeto SalesTicket
        sales_ticket = SalesTicket.objects.create(**validated_data)

        # Iterar sobre cada línea de venta y crearla con relación al SalesTicket creado
        for line_data in saleslines_data:
            SalesLines.objects.create(sales_ticket=sales_ticket, **line_data)

        return sales_ticket


class ProductDetalleSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)  # Obtener el nombre de la categoría
    brand_name = serializers.CharField(source='brand.name', read_only=True)  # Obtener el nombre de la marca

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'code',
            'description',
            'unit_price',
            'category',
            'category_name',  # Campo extra para mostrar el nombre de la categoría
            'brand',
            'brand_name',  # Campo extra para mostrar el nombre de la marca
            'unit_measure',
            'initial_stock',
            'status'
        ]


class SalesLineDetalleSerializer(serializers.ModelSerializer):
    product = ProductDetalleSerializer(read_only=True)  # Detalles completos del producto
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), source='product')  # ID para updates

    class Meta:
        model = SalesLines
        fields = ['id', 'product', 'product_id', 'quantity', 'unit_price', 'amount']
        read_only_fields = ['id', 'product', 'amount']

    def validate(self, data):
        # Validación de cantidad y precio
        quantity = data.get('quantity', 0)
        unit_price = data.get('unit_price', 0)

        if quantity <= 0:
            raise serializers.ValidationError({'quantity': 'La cantidad debe ser mayor a 0.'})
        if unit_price <= 0:
            raise serializers.ValidationError({'unit_price': 'El precio unitario debe ser mayor a 0.'})

        # Calcular el importe automáticamente
        data['amount'] = quantity * unit_price
        return data


class SalesTicketDetalleSerializer(serializers.ModelSerializer):
    lines = SalesLineDetalleSerializer(many=True, source='saleslines_set', required=False)  # Detalles anidados de línea

    class Meta:
        model = SalesTicket
        fields = [
            'id',
            'ballot_number',
            'date_of_issue',
            'patient',
            'sales_total',
            'observation',
            'lines'  # Incluye las líneas de ventas con detalles del producto
        ]
        read_only_fields = ['id', 'sales_total', 'ballot_number']

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('saleslines_set', [])  # Extraer las líneas del request
        instance.date_of_issue = validated_data.get('date_of_issue', instance.date_of_issue)
        instance.patient = validated_data.get('patient', instance.patient)
        instance.observation = validated_data.get('observation', instance.observation)
        instance.save()

        # Procesar datos anidados de las líneas
        for line_data in lines_data:
            product = line_data['product']
            quantity = line_data['quantity']
            unit_price = line_data['unit_price']
            amount = line_data['amount']

            # Crear o actualizar las líneas asociadas
            SalesLines.objects.update_or_create(
                sales_ticket=instance,
                product=product,
                defaults={
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'amount': amount
                }
            )
        return instance

