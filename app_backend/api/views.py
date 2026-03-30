from datetime import timedelta

from django.db import transaction
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
from app_backend.permissions import EsAdmin, IsAdminOrVendedorOrReadOnly
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
    permission_classes = [IsAuthenticated, IsAdminOrVendedorOrReadOnly]
    serializer_class = RecipeSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['prescription_number', 'patient__first_name', 'patient__surname', 'patient__second_surname']
    filterset_fields = ['date_of_issue', 'is_active']

    def get_queryset(self):
        # Siempre filtrar por la óptica del usuario logueado
        user_optica = self.request.user.perfil.optica
        return Recipe.objects.filter(optica=user_optica).select_related('patient').order_by('-date_of_issue')

    def perform_create(self, serializer):
        # BLOQUEO DE SEGURIDAD: Solo Admin u Optometrista crean
        if self.request.user.perfil.rol not in ['ADMIN', 'OPTOMETRISTA']:
            raise PermissionDenied("No tiene permiso para registrar medidas.")
        serializer.save(optica=self.request.user.perfil.optica)

    def perform_update(self, serializer):
        # BLOQUEO DE SEGURIDAD: Solo Admin u Optometrista editan
        if self.request.user.perfil.rol not in ['ADMIN', 'OPTOMETRISTA']:
            raise PermissionDenied("No tiene permiso para modificar medidas.")
        serializer.save()


class SalesTicketViewSet(viewsets.ModelViewSet):
    # Permitimos que Admin y Vendedor gestionen ventas
    permission_classes = [IsAuthenticated, IsAdminOrVendedorOrReadOnly]
    serializer_class = SalesTicketSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_disabled', 'date_of_issue']
    search_fields = ['ballot_number', 'patient__first_name', 'patient__surname', 'payer_name']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return SalesTicket.objects.none()

        user_optica = user.perfil.optica
        # Retornamos las ventas de la óptica, incluyendo las anuladas para el historial
        return SalesTicket.objects.filter(optica=user_optica).select_related('patient').order_by('-created')

    @transaction.atomic
    def perform_create(self, serializer):
        user_optica = self.request.user.perfil.optica
        serie = "001"  # Puedes hacer esto dinámico si luego tienes más series

        # 1. Buscar la última boleta de esta óptica
        ultimo_ticket = SalesTicket.objects.filter(
            optica=user_optica,
            ballot_number__startswith=f"{serie}-"
        ).order_by('id').last()

        if ultimo_ticket:
            try:
                # Extraemos la parte numérica después del '-' (ej: de '001-000005' toma '000005')
                ultimo_nro_str = ultimo_ticket.ballot_number.split('-')[1]
                nuevo_nro_int = int(ultimo_nro_str) + 1
                correlativo = str(nuevo_nro_int).zfill(6)
            except (IndexError, ValueError):
                # Si el formato guardado era inválido, reseteamos a 1
                correlativo = "000001"
        else:
            # Si es la primera boleta de la óptica
            correlativo = "000001"

        nuevo_ballot_number = f"{serie}-{correlativo}"

        # 2. Guardar con el nuevo formato y auditoría
        serializer.save(
            optica=user_optica,
            ballot_number=nuevo_ballot_number,
            created_by=self.request.user,
            date_of_issue=timezone.localtime(timezone.now()).date()
        )

    def destroy(self, request, *args, **kwargs):
        """
        Sobrescribimos para que no se borre físicamente.
        Solo el ADMIN puede 'Anular' (is_disabled=True).
        """
        if request.user.perfil.rol != 'ADMIN':
            raise PermissionDenied("Solo el administrador puede anular boletas de venta.")

        instance = self.get_object()
        instance.is_disabled = True
        instance.save()
        return Response({"message": "Venta anulada correctamente"}, status=status.HTTP_200_OK)


class TypeDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = TypeDocument.objects.all()
    serializer_class = TypeDocumentSerializer


class PatientViewSet(viewsets.ModelViewSet):
    """
    Gestión de Pacientes:
    - Admin/Vendedor: Acceso total a creación y edición.
    - Optometrista: Solo lectura de pacientes con cita hoy.
    """
    permission_classes = [IsAuthenticated, IsAdminOrVendedorOrReadOnly]
    serializer_class = PatientSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    filterset_fields = ['is_active']
    search_fields = ['first_name', 'surname', 'second_surname', 'document_number']
    ordering_fields = ['first_name', 'surname', 'created']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Patient.objects.none()

        user_optica = user.perfil.optica

        # --- LÓGICA DE FILTRADO POR ROL ---
        if user.perfil.rol == 'OPTOMETRISTA':
            # El Optometrista solo ve pacientes que tienen cita HOY en su óptica
            hoy = timezone.localtime(timezone.now()).date()
            pacientes_ids = Appointment.objects.filter(
                optica=user_optica,
                date=hoy
            ).values_list('patient_id', flat=True)

            return Patient.objects.filter(id__in=pacientes_ids) \
                .select_related('type_document') \
                .order_by('surname')

        # Admin y Vendedor ven todos los pacientes de su óptica
        return Patient.objects.filter(optica=user_optica) \
            .select_related('type_document') \
            .order_by('-created')

    def perform_create(self, serializer):
        # Asignamos automáticamente la óptica del usuario que crea el registro
        serializer.save(optica=self.request.user.perfil.optica)

    # --- MÓDULO DE MARKETING (Solo Admin y Vendedor) ---
    @action(detail=False, methods=['get'], url_path='campaign')
    def campaign(self, request):
        # Bloqueo: El optometrista no accede a herramientas de marketing
        if request.user.perfil.rol == 'OPTOMETRISTA':
            return Response({"error": "No tiene permisos para ver campañas."}, status=403)

        user_optica = request.user.perfil.optica
        hoy = timezone.localtime(timezone.now()).date()
        hace_11_meses = hoy - timedelta(days=330)
        hace_14_meses = hoy - timedelta(days=420)

        # Subquery para saber si ya se contactó hoy
        contactado_hoy_subquery = CampaignContact.objects.filter(
            patient=OuterRef('pk'),
            created__date=hoy
        )

        queryset = Patient.objects.select_related('type_document').filter(
            optica=user_optica,
            is_active=True,
            last_visit__lte=hace_11_meses
        ).annotate(
            already_contacted_today=Exists(contactado_hoy_subquery)
        ).order_by('already_contacted_today', 'last_visit')

        filtered_queryset = self.filter_queryset(queryset)

        # Filtros por periodo (Mes o Crítico)
        period = request.query_params.get('period')
        if period == 'month':
            filtered_queryset = filtered_queryset.filter(last_visit__gt=hace_14_meses)
        elif period == 'critical':
            filtered_queryset = filtered_queryset.filter(last_visit__lte=hace_14_meses)

        # Métricas para los contadores del frontend
        metrics = queryset.aggregate(
            total_month=Count('id', filter=Q(last_visit__gt=hace_14_meses)),
            total_critical=Count('id', filter=Q(last_visit__lte=hace_14_meses))
        )

        count_done_today = CampaignContact.objects.filter(
            optica=user_optica,
            created__date=hoy
        ).values('patient').distinct().count()

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
        if request.user.perfil.rol == 'OPTOMETRISTA':
            return Response({"error": "Acción no permitida"}, status=403)

        patient = self.get_object()
        hoy = timezone.now().date()

        if not CampaignContact.objects.filter(patient=patient, created__date=hoy).exists():
            CampaignContact.objects.create(
                patient=patient,
                user=request.user,
                optica=request.user.perfil.optica
            )
            return Response({'status': 'ok'}, status=status.HTTP_201_CREATED)

        return Response({'status': 'ya registrado'}, status=status.HTTP_200_OK)

    # --- HISTORIAL CLÍNICO (Accesible para todos) ---
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        patient = self.get_object()
        # Traemos las recetas de este paciente en esta óptica
        recipes_qs = patient.recipe_set.filter(optica=request.user.perfil.optica).order_by('-prescription_number')

        # Usamos tu paginador SmallHistoryPagination
        paginator = SmallHistoryPagination()
        page = paginator.paginate_queryset(recipes_qs, request)

        serializer = RecipeSerializer(page, many=True)

        # Obtenemos la respuesta paginada (que trae 'next', 'previous' y 'results')
        paginated_recipes = paginator.get_paginated_response(serializer.data).data

        # IMPORTANTE: Devolvemos un objeto plano donde 'recipes' contiene la paginación
        return Response({
            'full_name': patient.full_name,
            'document_number': patient.document_number,
            'phone_or_cellular': patient.phone_or_cellular,
            'last_visit': patient.last_visit,
            'recipes': paginated_recipes  # <--- Aquí van results, next y prev
        })


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'brand']
    search_fields = ['name', 'code', 'brand__name']
    ordering_fields = ['created', 'unit_price', 'initial_stock']

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Product.objects.none()

        user_optica = self.request.user.perfil.optica

        return Product.objects.filter(optica=user_optica).select_related('brand', 'category').order_by('name')

    def perform_create(self, serializer):
        serializer.save(optica=self.request.user.perfil.optica)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        response.data['message'] = "Producto de óptica registrado correctamente."
        return response

    def destroy(self, request, *args, **kwargs):
        if request.user.perfil.rol != 'ADMIN':
            return Response(
                {"error": "Solo el administrador puede eliminar registros."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CategorySerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['name']
    ordering_fields = ['name', 'created']

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Category.objects.filter(
                optica_id=user.perfil.optica_id
            ).only('id', 'name', 'description').order_by('name')
        return Category.objects.none()

    def perform_create(self, serializer):
        serializer.save(optica=self.request.user.perfil.optica)


class BrandViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BrandSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created']

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Brand.objects.filter(
                optica=self.request.user.perfil.optica
            ).only('id', 'name', 'description').order_by('name')
        return Brand.objects.none()

    def perform_create(self, serializer):
        serializer.save(optica=self.request.user.perfil.optica)


class DashboardStatsAPIView(APIView):
    permission_classes = [IsAuthenticated, EsAdmin]

    def get(self, request):
        user_optica = request.user.perfil.optica

        today = timezone.now().date()
        labels = []
        data = []

        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            labels.append(date.strftime('%a'))

            daily_sum = SalesTicket.objects.filter(
                optica=user_optica, date_of_issue=date, is_disabled=False
            ).aggregate(Sum('sales_total'))['sales_total__sum'] or 0.0

            data.append(float(daily_sum))

        total_today = data[-1]

        return Response({
            "labels": labels,
            "data": data,
            "total_today": total_today,
            "optica_nombre": user_optica.nombre
        })


class AppointmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AppointmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'date']
    search_fields = ['patient__first_name', 'patient__surname', 'reason']
    ordering_fields = ['date', 'time']

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Appointment.objects.none()

        user_optica = self.request.user.perfil.optica

        return Appointment.objects.filter(optica=user_optica).select_related('patient').order_by('date', 'time')

    def perform_create(self, serializer):
        serializer.save(optica=self.request.user.perfil.optica)
