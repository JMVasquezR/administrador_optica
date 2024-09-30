from django.urls import path
from rest_framework import routers

from app_backend.api.views import ProductDetailView

app_name = 'app_backend'

router = routers.DefaultRouter()

urlpatterns = router.urls

urlpatterns.append(path('product/<int:pk>/', ProductDetailView.as_view(), name='product-detail'), )
