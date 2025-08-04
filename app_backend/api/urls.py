from django.urls import path
from rest_framework import routers

from app_backend.api.views import (
    ProductView, ProductoListView, ProductCreateView, MarcasListView, CategoriasListView, ProductDeleteView,
    ProductDetailView, ProductUpdateView, PatientListView, PatientCreateView, PatientDetailUpdateView,
    PatientDeleteView, TypeDocumentListAPIView, RecipeListView, RecipeCreateView, RecipeRetrieveUpdateView,
    RecipeDeleteView
)

app_name = 'app_backend'

router = routers.DefaultRouter()

urlpatterns = router.urls

# Productos
urlpatterns.append(path('product/<int:pk>/', ProductView.as_view(), name='product-detail'), )
urlpatterns.append(path('marcas/', MarcasListView.as_view(), name='marcas-list'), )
urlpatterns.append(path('categorias/', CategoriasListView.as_view(), name='categorias-list'), )
urlpatterns.append(path('productos/', ProductoListView.as_view(), name='producto-list'), )
urlpatterns.append(path('productos/create/', ProductCreateView.as_view(), name='crear-producto'), )
urlpatterns.append(path('productos/<int:pk>/delete/', ProductDeleteView.as_view(), name='eliminar-producto'), )
urlpatterns.append(path('productos/<int:pk>/', ProductDetailView.as_view(), name='detalle-producto'), )
urlpatterns.append(path('productos/<int:pk>/edit/', ProductUpdateView.as_view(), name='editar-producto'), )

# Pacientes
urlpatterns.append(path('pacientes/', PatientListView.as_view(), name='listar-pacientes'), )
urlpatterns.append(path('pacientes/crear/', PatientCreateView.as_view(), name='crear-paciente'), )
urlpatterns.append(path('pacientes/<int:id>/', PatientDetailUpdateView.as_view(), name='detalle-editar-paciente'), )
urlpatterns.append(path('pacientes/<int:id>/eliminar/', PatientDeleteView.as_view(), name='eliminar-paciente'), )

# Documentos
urlpatterns.append(path('documentos/', TypeDocumentListAPIView.as_view(), name='listar-documentos'), )

# Recetarios
urlpatterns.append(path('recetas/', RecipeListView.as_view(), name='listar-recetas'), )
urlpatterns.append(path('recetas/crear/', RecipeCreateView.as_view(), name='crear-receta'), )
urlpatterns.append(path('recetas/<int:id>/', RecipeRetrieveUpdateView.as_view(), name='detalle-actualizar-receta'), )
urlpatterns.append(path('recetas/<int:id>/eliminar/', RecipeDeleteView.as_view(), name='eliminar-receta'), )
