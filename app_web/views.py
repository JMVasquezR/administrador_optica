from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.db.models import Sum
from django.shortcuts import render
from django.utils import timezone

from app_backend.models.appointment import CampaignContact
from app_backend.models.sales_ticket import SalesTicket


def one_page_view(request):
    return render(request, 'v2/web/only_page.html')


@login_required
def home_view(request):
    ahora_local = timezone.localtime(timezone.now())
    hoy = ahora_local.date()
    hace_30_dias = hoy - timedelta(days=30)

    contactos_hoy = CampaignContact.objects.filter(created__date=hoy).values('patient').distinct().count()
    regresos_mes = CampaignContact.objects.filter(is_converted=True, created__gte=hace_30_dias).count()
    total_contactos_mes = CampaignContact.objects.filter(created__gte=hace_30_dias).count()
    efectividad = 0

    if total_contactos_mes > 0:
        efectividad = round((regresos_mes / total_contactos_mes) * 100, 1)

    ventas_hoy_qs = SalesTicket.objects.filter(date_of_issue=hoy, is_disabled=False)
    total_ventas_hoy = ventas_hoy_qs.aggregate(total=Sum('sales_total'))['total'] or 0
    ultimas_boletas = SalesTicket.objects.filter(is_disabled=False).order_by('-created')[:5]

    stock_critico = [
        {'nombre': 'Montura Ray-Ban Aviator', 'cantidad': 1},
        {'nombre': 'Líquido de Limpieza 60ml', 'cantidad': 2},
    ]

    meta_total = 10000
    ventas_mes = SalesTicket.objects.filter(
        date_of_issue__month=hoy.month, date_of_issue__year=hoy.year, is_disabled=False
    ).aggregate(total=Sum('sales_total'))['total'] or 0

    meta_porcentaje = min(int((ventas_mes / meta_total) * 100), 100) if meta_total > 0 else 0

    context = {
        'fecha_actual': ahora_local,
        'contactos_hoy': contactos_hoy,
        'regresos_mes': regresos_mes,
        'efectividad': efectividad,
        'ventas_hoy': total_ventas_hoy,
        'ultimas_boletas': ultimas_boletas,
        'stock_critico': stock_critico,
        'meta_total': meta_total,
        'meta_porcentaje': meta_porcentaje,
    }

    return render(request, 'v2/home.html', context)


@login_required
def product_list_view(request):
    return render(request, 'v2/productos/listado.html')


@login_required
def patient_list_view(request):
    return render(request, 'v2/pacientes/listado.html')


@login_required
def sales_ticket_list_view(request):
    return render(request, 'v2/ventas/listado.html')


@login_required
def recipe_list_view(request):
    return render(request, 'v2/recetarios/listado.html')


@login_required
def marketin_re_examenes_view(request):
    return render(request, 'v2/marketing/re-examenes.html')


@login_required
def agenda_citas_view(request):
    return render(request, 'v2/agenda_citas/agenda_citas.html')
