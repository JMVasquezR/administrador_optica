from datetime import timedelta

from django.db.models import Count, Q, OuterRef, Exists, Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from app_backend.models.appointment import Appointment, CampaignContact
from app_backend.models.patients import Patient, TypeDocument
from app_backend.models.products import Product, Category, Brand
from app_backend.models.recipes import Recipe
from app_backend.models.sales_ticket import SalesTicket
from .serializers import (
    CategorySerializer, BrandSerializer, ProductSerializer, PatientSerializer, TypeDocumentSerializer,
    SalesTicketSerializer, RecipeSerializer, AppointmentSerializer
)


class SmallHistoryPagination(PageNumberPagination):
    page_size = 5


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
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
    queryset = Recipe.objects.select_related('patient').all().order_by('-date_of_issue')
    serializer_class = RecipeSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['prescription_number', 'patient__first_name', 'patient__surname', 'patient__second_surname']
    filterset_fields = ['date_of_issue', 'is_active']

    def perform_create(self, serializer):
        ticket = serializer.save()

        if ticket.patient:
            patient = ticket.patient
            patient.last_visit = ticket.date_of_issue
            patient.save()


class SalesTicketViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = SalesTicket.objects.select_related('patient').all().order_by('-date_of_issue')
    serializer_class = SalesTicketSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_disabled', 'date_of_issue']
    search_fields = ['ballot_number', 'patient__first_name', 'patient__surname', 'payer_name']


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
        hoy = timezone.localtime(timezone.now()).date()
        hace_11_meses = hoy - timedelta(days=330)
        hace_14_meses = hoy - timedelta(days=420)

        contactado_hoy_subquery = CampaignContact.objects.filter(patient=OuterRef('pk'), created__date=hoy)

        queryset = Patient.objects.select_related('type_document').filter(
            is_active=True, last_visit__lte=hace_11_meses
        ).annotate(
            already_contacted_today=Exists(contactado_hoy_subquery)
        ).order_by('already_contacted_today', 'last_visit')

        filtered_queryset = self.filter_queryset(queryset)
        period = request.query_params.get('period')

        if period == 'month':
            filtered_queryset = filtered_queryset.filter(last_visit__gt=hace_14_meses)
        elif period == 'critical':
            filtered_queryset = filtered_queryset.filter(last_visit__lte=hace_14_meses)

        metrics = queryset.aggregate(
            total_month=Count('id', filter=Q(last_visit__gt=hace_14_meses)),
            total_critical=Count('id', filter=Q(last_visit__lte=hace_14_meses))
        )

        count_done_today = CampaignContact.objects.filter(created__date=hoy).values('patient').distinct().count()
        page = self.paginate_queryset(filtered_queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data.update({
                'count_month': metrics['total_month'],
                'count_critical': metrics['total_critical'],
                'count_done': count_done_today
            })
            return response

        serializer = self.get_serializer(filtered_queryset, many=True)

        return Response({
            'results': serializer.data,
            'count_month': metrics['total_month'],
            'count_critical': metrics['total_critical'],
            'count_done': count_done_today
        })

    @action(detail=True, methods=['post'], url_path='register-contact')
    def register_contact(self, request, pk=None):
        patient = self.get_object()
        hoy = timezone.now().date()

        if not CampaignContact.objects.filter(patient=patient, created__date=hoy).exists():
            CampaignContact.objects.create(patient=patient, user=request.user)
            return Response({'status': 'ok'}, status=status.HTTP_201_CREATED)

        return Response({'status': 'ya registrado'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        patient = self.get_object()
        recipes = patient.recipe_set.all().order_by('-prescription_number')

        paginator = SmallHistoryPagination()
        page = paginator.paginate_queryset(recipes, request)

        serializer = RecipeSerializer(page, many=True)

        return Response({
            'full_name': patient.full_name,
            'document_number': patient.document_number,
            'phone_or_cellular': patient.phone_or_cellular,
            'last_visit': patient.last_visit,
            'recipes': paginator.get_paginated_response(serializer.data).data
        })


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Product.objects.select_related('brand', 'category').order_by('name')
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'brand']
    search_fields = ['name', 'code', 'brand__name']
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


class AppointmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Appointment.objects.select_related('patient').all().order_by('date', 'time')
    serializer_class = AppointmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'date']
    search_fields = ['patient__first_name', 'patient__surname', 'reason']
    ordering_fields = ['date', 'time']

    def get_queryset(self):
        return self.queryset
