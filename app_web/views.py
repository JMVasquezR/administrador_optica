from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.contrib.auth.decorators import user_passes_test
from django.db.models import Sum
from django.shortcuts import render
from django.utils import timezone

from app_backend.models.appointment import CampaignContact, Appointment
from app_backend.models.patients import Patient
from app_backend.models.recipes import Recipe
from app_backend.models.sales_ticket import SalesTicket


def one_page_view(request):
    return render(request, 'v2/web/only_page.html')


@login_required
def home_view(request):
    user_perfil = request.user.perfil
    user_optica = user_perfil.optica

    ahora_local = timezone.localtime(timezone.now())
    hoy = ahora_local.date()
    hace_30_dias = hoy - timedelta(days=30)

    context = {
        'fecha_actual': ahora_local,
        'nombre_optica': user_optica.nombre,
        'rol_usuario': user_perfil.rol,
        'nombre_usuario': request.user.first_name or request.user.username,
    }

    if user_perfil.rol == 'OPTOMETRISTA':
        """
        DASHBOARD CLÍNICO: Enfocado en productividad médica y agenda.
        No ve ventas, ni stock, ni boletas.
        """
        # 1. Medidas (Recetas) realizadas hoy
        recetas_hoy = Recipe.objects.filter(optica=user_optica, date_of_issue=hoy, is_active=True).count()

        # 2. Citas pendientes para hoy (que aún no han sido completadas o canceladas)
        citas_pendientes = Appointment.objects.filter(optica=user_optica, date=hoy, status='pending').count()

        # 3. Pacientes nuevos registrados en la óptica hoy
        pacientes_nuevos = Patient.objects.filter(optica=user_optica, created__date=hoy).count()

        # 4. Su agenda próxima (Próximas 5 citas de hoy)
        proximas_citas = Appointment.objects.filter(
            optica=user_optica, date=hoy
        ).exclude(status='cancelled').order_by('time')[:5]

        context.update({
            'recetas_hoy': recetas_hoy,
            'citas_pendientes': citas_pendientes,
            'pacientes_nuevos': pacientes_nuevos,
            'proximas_citas': proximas_citas,
        })

    else:
        """
        DASHBOARD DE NEGOCIO (ADMIN / VENDEDOR): Enfocado en ingresos y marketing.
        """
        # --- Sección Marketing ---
        contactos_hoy = CampaignContact.objects.filter(
            optica=user_optica, created__date=hoy
        ).values('patient').distinct().count()

        regresos_mes = CampaignContact.objects.filter(
            optica=user_optica, is_converted=True, created__gte=hace_30_dias
        ).count()

        total_contactos_mes = CampaignContact.objects.filter(optica=user_optica, created__gte=hace_30_dias).count()

        efectividad = round((regresos_mes / total_contactos_mes) * 100, 1) if total_contactos_mes > 0 else 0

        # --- Sección Ventas ---
        ventas_hoy_qs = SalesTicket.objects.filter(optica=user_optica, date_of_issue=hoy, is_disabled=False)
        total_ventas_hoy = ventas_hoy_qs.aggregate(total=Sum('sales_total'))['total'] or 0

        ultimas_boletas = SalesTicket.objects.filter(optica=user_optica, is_disabled=False).order_by('-created')[:5]

        # Meta Mensual (Ejemplo: S/ 10,000)
        meta_total = 10000
        ventas_mes = SalesTicket.objects.filter(
            optica=user_optica, date_of_issue__month=hoy.month, date_of_issue__year=hoy.year, is_disabled=False
        ).aggregate(total=Sum('sales_total'))['total'] or 0

        meta_porcentaje = min(int((ventas_mes / meta_total) * 100), 100) if meta_total > 0 else 0

        # --- Sección Almacén (Stock Crítico ejemplo) ---
        # Aquí podrías filtrar productos con stock < 5
        # stock_critico = Product.objects.filter(optica=user_optica, stock__lte=5)[:5]

        context.update({
            'contactos_hoy': contactos_hoy,
            'regresos_mes': regresos_mes,
            'efectividad': efectividad,
            'ventas_hoy': total_ventas_hoy,
            'ultimas_boletas': ultimas_boletas,
            'meta_total': meta_total,
            'meta_porcentaje': meta_porcentaje,
            'stock_critico': []
        })

    return render(request, 'v2/home.html', context)


def es_admin(user):
    return user.perfil.rol == 'ADMIN'


def es_optometrista_o_admin(user):
    return user.perfil.rol in ['ADMIN', 'OPTOMETRISTA']


def es_admin_o_vendedor(user):
    return user.is_authenticated and user.perfil.rol in ['ADMIN', 'VENDEDOR', 'VENTAS']


@login_required
def product_list_view(request):
    return render(request, 'v2/productos/listado.html')


@login_required
def patient_list_view(request):
    return render(request, 'v2/pacientes/listado.html')


@login_required
@user_passes_test(es_admin_o_vendedor)
def sales_ticket_list_view(request):
    return render(request, 'v2/ventas/listado.html')


@login_required
@user_passes_test(es_optometrista_o_admin)
def recipe_list_view(request):
    return render(request, 'v2/recetarios/listado.html')


@login_required
def category_list_view(request):
    return render(request, 'v2/categorias/listado.html')


@login_required
def brand_list_view(request):
    return render(request, 'v2/marcas/listado.html')


@login_required
def marketin_re_examenes_view(request):
    return render(request, 'v2/marketing/re-examenes.html')


@login_required
def agenda_citas_view(request):
    user_optica = request.user.perfil.optica
    ahora_local = timezone.localtime(timezone.now())

    context = {
        'fecha_actual': ahora_local,
        'nombre_optica': user_optica.nombre,
    }

    return render(request, 'v2/agenda_citas/agenda_citas.html', context)
