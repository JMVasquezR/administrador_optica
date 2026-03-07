from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProductViewSet, CategoryViewSet, BrandViewSet, PatientViewSet, TypeDocumentViewSet, SalesTicketViewSet,
    RecipeViewSet, DashboardStatsAPIView
)

app_name = 'api'

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'brands', BrandViewSet)

router.register(r'patients', PatientViewSet)
router.register(r'type-documents', TypeDocumentViewSet)

router.register(r'sales-tickets', SalesTicketViewSet)

router.register(r'recipes', RecipeViewSet)

urlpatterns = [
    path('api/dashboard/sales-stats/', DashboardStatsAPIView.as_view(), name='api-sales-stats'),
    path('api/', include(router.urls)),
]
