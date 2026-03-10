from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
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
    permission_classes = [IsAuthenticated]
    queryset = Recipe.objects.all().order_by('-created')
    serializer_class = RecipeSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['prescription_number', 'patient__first_name', 'patient__surname', 'patient__second_surname']
    filterset_fields = ['date_of_issue', 'is_active']


class SalesTicketViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = SalesTicket.objects.select_related('patient').all().order_by('-created')
    serializer_class = SalesTicketSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_disabled', 'date_of_issue']
    search_fields = ['ballot_number', 'patient__first_name', 'patient__surname', 'payer_name']

    def perform_create(self, serializer):
        ticket = serializer.save()

        if ticket.patient:
            patient = ticket.patient
            patient.last_visit = ticket.date_of_issue
            patient.save()


class TypeDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = TypeDocument.objects.all()
    serializer_class = TypeDocumentSerializer


class PatientViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Patient.objects.select_related('type_document').all().order_by('-created')
    serializer_class = PatientSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['first_name', 'surname', 'second_surname', 'document_number']
    ordering_fields = ['first_name', 'surname', 'created']

    @action(detail=False, methods=['get'], url_path='campaign')
    def campaign(self, request):
        hace_11_meses = timezone.now().date() - timedelta(days=330)

        queryset = Patient.objects.select_related('type_document').filter(
            is_active=True, last_visit__lte=hace_11_meses
        ).order_by('last_visit')

        filtered_queryset = self.filter_queryset(queryset)

        serializer = self.get_serializer(filtered_queryset, many=True)
        return Response(serializer.data)


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'brand']
    search_fields = ['name', 'code']
    ordering_fields = ['created', 'unit_price', 'initial_stock']

    def perform_create(self, serializer):
        serializer.save()

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        response.data['message'] = "Producto de óptica registrado correctamente."
        return response


class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer


class BrandViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Brand.objects.all().order_by('name')
    serializer_class = BrandSerializer


class DashboardStatsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        labels = []
        data = []

        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            labels.append(date.strftime('%a'))
            daily_sum = SalesTicket.objects.filter(
                date_of_issue=date,
                is_disabled=False
            ).aggregate(Sum('sales_total'))['sales_total__sum'] or 0.0

            data.append(daily_sum)

        total_today = data[-1]

        return Response({"labels": labels, "data": data, "total_today": total_today})
