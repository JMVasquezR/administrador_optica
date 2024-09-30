from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .serializers import ProductSerializer
from ..models.products import Product


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
