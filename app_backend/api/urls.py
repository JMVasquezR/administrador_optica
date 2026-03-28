from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProductViewSet, CategoryViewSet, BrandViewSet, PatientViewSet, TypeDocumentViewSet, SalesTicketViewSet,
    RecipeViewSet, DashboardStatsAPIView, AppointmentViewSet
)

app_name = 'api'

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'brands', BrandViewSet, basename='brands')

router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'type-documents', TypeDocumentViewSet)

router.register(r'sales-tickets', SalesTicketViewSet, basename='sales-tickets')

router.register(r'recipes', RecipeViewSet, basename='recipes')

router.register(r'appointments', AppointmentViewSet, basename='appointments')

urlpatterns = [
    path('api/dashboard/sales-stats/', DashboardStatsAPIView.as_view(), name='api-sales-stats'),
    path('api/', include(router.urls)),
]
