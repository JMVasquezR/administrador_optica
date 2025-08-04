from rest_framework import serializers

from app_backend.models.patients import Patient
from app_backend.models.products import Product, Brand
from app_backend.models.recipes import Recipe
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
