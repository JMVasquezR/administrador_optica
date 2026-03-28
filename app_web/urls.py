from django.urls import path

from app_web.views import (
    home_view, product_list_view, patient_list_view, sales_ticket_list_view, recipe_list_view, one_page_view,
    marketin_re_examenes_view, agenda_citas_view, category_list_view, brand_list_view
)

app_name = 'app_web'

urlpatterns = [
    path('', one_page_view, name='one_page'),
    path('gestion-kym-26/', home_view, name='home'),
    path('gestion-kym-26/agenda-citas/', agenda_citas_view, name='agenda_citas_list'),
    path('gestion-kym-26/productos/', product_list_view, name='product_list'),
    path('gestion-kym-26/pacientes/', patient_list_view, name='patient_list'),
    path('gestion-kym-26/ventas/', sales_ticket_list_view, name='sales_ticket_list'),
    path('gestion-kym-26/recetario/', recipe_list_view, name='recipe_list'),
    path('gestion-kym-26/categorias/', category_list_view, name='category_list'),
    path('gestion-kym-26/marcas/', brand_list_view, name='brand_list'),
    path('gestion-kym-26/marketing/re-examenes', marketin_re_examenes_view, name='marketing_re_examenes'),
]
