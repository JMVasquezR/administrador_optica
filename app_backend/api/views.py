from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from app_backend.models.patients import Patient, TypeDocument
from app_backend.models.products import Product, Category, Brand
from app_backend.models.recipes import Recipe
from app_backend.models.sales_ticket import SalesTicket
from .serializers import (
    CategorySerializer, BrandSerializer, ProductSerializer, PatientSerializer, TypeDocumentSerializer,
    SalesTicketSerializer, RecipeSerializer
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'count': self.page.paginator.count,
            'results': data  # Aquí viaja la lista de productos
        })


class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all().order_by('-created')
    serializer_class = RecipeSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]

    # Permitir buscar por nombre de paciente o número de receta
    search_fields = ['prescription_number', 'patient__first_name', 'patient__surname', 'patient__second_surname']

    # Permitir filtrar por fecha de emisión
    filterset_fields = ['date_of_issue', 'is_active']


class SalesTicketViewSet(viewsets.ModelViewSet):
    queryset = SalesTicket.objects.all().order_by('-created')
    serializer_class = SalesTicketSerializer
    # Usamos la paginación que ya definimos para productos/pacientes
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_disabled', 'date_of_issue']
    # Permite buscar por nro de boleta o nombre/apellido del paciente relacionado
    search_fields = ['ballot_number', 'patient__first_name', 'patient__surname']


class TypeDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TypeDocument.objects.all()
    serializer_class = TypeDocumentSerializer


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by('-created')
    serializer_class = PatientSerializer
    pagination_class = StandardResultsSetPagination

    # Configuración de Filtros
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # Filtro exacto por estado (Activo/Inactivo)
    filterset_fields = ['is_active']

    # Búsqueda por Nombre, Apellido Paterno y Apellido Materno
    # El símbolo '^' indica que busque que empiecen por ese texto
    search_fields = ['first_name', 'surname', 'second_surname', 'document_number']

    # Ordenamiento por nombre o fecha de registro
    ordering_fields = ['first_name', 'surname', 'created']


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination

    # Filtros para que el buscador del template funcione
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'brand']
    search_fields = ['name', 'code']
    ordering_fields = ['created', 'unit_price', 'initial_stock']

    def perform_create(self, serializer):
        # Aquí puedes agregar lógica extra antes de guardar si fuera necesario
        serializer.save()

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        # Agregamos un mensaje personalizado a la respuesta JSON
        response.data['message'] = "Producto de óptica registrado correctamente."
        return response


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer


class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all().order_by('name')
    serializer_class = BrandSerializer


class DashboardStatsAPIView(APIView):
    def get(self, request):
        today = timezone.now().date()
        labels = []
        data = []

        # Obtenemos ventas de los últimos 7 días
        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            # Formato de nombre de día corto (Lun, Mar...)
            labels.append(date.strftime('%a'))

            # Sumamos el total de boletas activas de ese día
            daily_sum = SalesTicket.objects.filter(
                date_of_issue=date,
                is_disabled=False
            ).aggregate(Sum('sales_total'))['sales_total__sum'] or 0.0

            data.append(daily_sum)

        # Cálculo de ventas de hoy
        total_today = data[-1]

        return Response({
            "labels": labels,
            "data": data,
            "total_today": total_today
        })
