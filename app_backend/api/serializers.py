from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from app_backend.models.appointment import Appointment
from app_backend.models.patients import Patient, TypeDocument
from app_backend.models.products import Product, Category, Brand
from app_backend.models.recipes import Recipe
from app_backend.models.sales_ticket import SalesTicket, SalesLines


class RecipeSerializer(serializers.ModelSerializer):
    name_patient = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = Recipe
        fields = [
            'id', 'prescription_number', 'patient', 'name_patient', 'date_of_issue', 'is_active',
            # Campos Lejos
            'right_eye_spherical_distance_far', 'right_eye_cylinder_distance_far', 'right_eye_axis_distance_far',
            'left_eye_spherical_distance_far', 'left_eye_cylinder_distance_far', 'left_eye_axis_distance_far',
            'pupillary_distance_far',
            # Campos Cerca
            'right_eye_spherical_distance_near', 'right_eye_cylinder_distance_near', 'right_eye_axis_distance_near',
            'left_eye_spherical_distance_near', 'left_eye_cylinder_distance_near', 'left_eye_axis_distance_near',
            'pupillary_distance_near', 'observation', 'instruction'
        ]
        read_only_fields = ['prescription_number']


class SalesLinesSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = SalesLines
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'amount']

    def get_product_name(self, obj):
        # Usamos getattr por si acaso el objeto product no está cargado correctamente
        product = obj.product
        brand = getattr(product, 'brand', None)

        if brand and hasattr(brand, 'name'):
            return f"{product.name} {brand.name}"

        return product.name


class SalesTicketSerializer(serializers.ModelSerializer):
    name_patient = serializers.ReadOnlyField()
    total_bill = serializers.ReadOnlyField()
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False, allow_null=True)
    lines = SalesLinesSerializer(many=True, required=False)

    class Meta:
        model = SalesTicket
        fields = [
            'id', 'ballot_number', 'date_of_issue', 'patient', 'name_patient', 'payer_name', 'sales_total',
            'total_bill', 'observation', 'is_disabled', 'lines'
        ]
        read_only_fields = ['ballot_number']

    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        # validated_data ya incluye payer_name y patient (que puede ser None)
        ticket = SalesTicket.objects.create(**validated_data)
        for line in lines_data:
            SalesLines.objects.create(sales_ticket=ticket, **line)
        return ticket


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['id', 'name', 'description']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    brand_name = serializers.ReadOnlyField(source='brand.name')
    brand = serializers.PrimaryKeyRelatedField(
        queryset=Brand.objects.all(),
        required=False,
        allow_null=True
    )
    full_detail = serializers.ReadOnlyField(source='detail_product')

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'code', 'description', 'unit_price', 'category', 'category_name', 'brand', 'brand_name',
            'unit_measure', 'initial_stock', 'status', 'full_detail'
        ]
        read_only_fields = ['code']


class TypeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeDocument
        fields = ['id', 'short_name', 'long_name']


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    full_document = serializers.ReadOnlyField()
    type_document_name = serializers.ReadOnlyField(source='type_document.short_name')
    months_since_last_visit = serializers.ReadOnlyField()
    already_contacted_today = serializers.BooleanField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'first_name', 'surname', 'second_surname', 'date_of_birth', 'type_document', 'type_document_name',
            'document_number', 'full_document', 'gender', 'phone_or_cellular', 'direction', 'email', 'is_active',
            'full_name', 'last_visit', 'months_since_last_visit', 'already_contacted_today'
        ]
        validators = [
            UniqueTogetherValidator(
                queryset=Patient.objects.all(),
                fields=['type_document', 'document_number'],
                message="Ya existe un paciente registrado con este tipo y número de documento."
            )
        ]


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.ReadOnlyField(source='patient.full_name')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    medium_display = serializers.CharField(source='get_medium_display', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_name', 'date', 'time', 'reason', 'notes', 'status', 'status_display', 'medium',
            'medium_display', 'created_at'
        ]

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
