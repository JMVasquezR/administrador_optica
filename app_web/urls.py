from django.urls import path

from app_web.views import (
    home_view, product_list_view, patient_list_view, sales_ticket_list_view, recipe_list_view
)

app_name = 'app_web'

urlpatterns = [
    path('', home_view, name='home'),
    path('productos/', product_list_view, name='product_list'),
    path('pacientes/', patient_list_view, name='patient_list'),
    path('ventas/', sales_ticket_list_view, name='sales_ticket_list'),
    path('recetario/', recipe_list_view, name='recipe_list'),
]
