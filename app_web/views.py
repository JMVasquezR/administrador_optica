from django.contrib.auth.decorators import login_required
from django.shortcuts import render


def one_page_view(request):
    return render(request, 'v2/web/only_page.html')


@login_required
def home_view(request):
    return render(request, 'v2/home.html')


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
