from django_filters import rest_framework as filters

from app_backend.models.patients import Patient
from app_backend.models.products import Product


class ProductFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains')
    category = filters.NumberFilter(field_name='category__id')
    brand = filters.NumberFilter(field_name='brand__id')
    status = filters.BooleanFilter()

    class Meta:
        model = Product
        fields = ['name', 'category', 'brand', 'status']


class PatientFilter(filters.FilterSet):
    first_name = filters.CharFilter(lookup_expr='icontains')
    surname = filters.CharFilter(lookup_expr='icontains')
    second_surname = filters.CharFilter(lookup_expr='icontains')
    gender = filters.CharFilter(lookup_expr='exact')
    type_document = filters.CharFilter(field_name='type_document__short_name', lookup_expr='icontains')

    class Meta:
        model = Patient
        fields = ['first_name', 'surname', 'second_surname', 'gender', 'type_document']
