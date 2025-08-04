from django.db.models import Q
from django_filters import rest_framework as filters

from app_backend.models.patients import Patient
from app_backend.models.products import Product
from app_backend.models.recipes import Recipe


class ProductFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains')
    category = filters.NumberFilter(field_name='category__id')
    brand = filters.NumberFilter(field_name='brand__id')
    status = filters.BooleanFilter()

    class Meta:
        model = Product
        fields = ['name', 'category', 'brand', 'status']


class PatientFilter(filters.FilterSet):
    full_name = filters.CharFilter(method='filter_full_name')

    class Meta:
        model = Patient
        fields = ['first_name', 'surname', 'second_surname', 'document_number', 'gender', 'type_document__short_name']

    def filter_full_name(self, queryset, name, value):
        terms = value.strip().lower().split()
        for term in terms:
            queryset = queryset.filter(
                Q(first_name__icontains=term) |
                Q(surname__icontains=term) |
                Q(second_surname__icontains=term) |
                Q(document_number__icontains=term)
            )
        return queryset


class RecipeFilter(filters.FilterSet):
    patient_name = filters.CharFilter(method='filter_by_patient_name')
    date_of_issue = filters.DateFilter(field_name='date_of_issue')

    class Meta:
        model = Recipe
        fields = ['patient_name', 'is_active', 'date_of_issue']

    def filter_by_patient_name(self, queryset, name, value):
        terms = value.strip().split()
        for term in terms:
            queryset = queryset.filter(
                Q(patient__first_name__icontains=term) |
                Q(patient__surname__icontains=term) |
                Q(patient__second_surname__icontains=term)
            )
        return queryset
