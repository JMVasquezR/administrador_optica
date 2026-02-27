from django.shortcuts import render


def home_view(request):
    return render(request, 'v2/home.html')


def product_list_view(request):
    return render(request, 'v2/productos/listado.html')


def patient_list_view(request):
    return render(request, 'v2/pacientes/listado.html')


def sales_ticket_list_view(request):
    return render(request, 'v2/ventas/listado.html')


def recipe_list_view(request):
    return render(request, 'v2/recetarios/listado.html')
