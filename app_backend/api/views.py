from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.generics import ListAPIView, CreateAPIView, DestroyAPIView, RetrieveAPIView, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from admin_opticas.pagination import CustomPagination
from .serializers import (
    ProductSerializer, ProductListSerializer, BrandSerializer, CategorySerializer, ProductUpdateSerializer,
    PatientSerializer, TypeDocumentSerializer
)
from ..filters import ProductFilter, PatientFilter
from ..models.patients import Patient
from ..models.products import Product, Brand, Category
from ..models.type_document import TypeDocument


class ProductView(generics.RetrieveAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]


class ProductoListView(ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductListSerializer
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = ProductFilter


class ProductCreateView(CreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


class MarcasListView(ListAPIView):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer


class CategoriasListView(ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductDeleteView(DestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    lookup_field = 'pk'


class ProductDetailView(RetrieveAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    lookup_field = 'pk'


class ProductUpdateView(UpdateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductUpdateSerializer
    lookup_field = 'pk'


class PatientListView(ListAPIView):
    queryset = Patient.objects.filter(is_active=True).order_by('-id')
    serializer_class = PatientSerializer
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = PatientFilter


class PatientCreateView(generics.CreateAPIView):
    serializer_class = PatientSerializer


class PatientDetailUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    lookup_field = 'id'


class PatientDeleteView(APIView):
    def delete(self, request, id):
        try:
            patient = Patient.objects.get(id=id)
            patient.is_active = False
            patient.save()
            return Response({'detail': 'Paciente desactivado'}, status=status.HTTP_204_NO_CONTENT)
        except Patient.DoesNotExist:
            return Response({'error': 'Paciente no encontrado'}, status=status.HTTP_404_NOT_FOUND)


class TypeDocumentListAPIView(ListAPIView):
    queryset = TypeDocument.objects.all()
    serializer_class = TypeDocumentSerializer
