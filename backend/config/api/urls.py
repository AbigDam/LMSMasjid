from django.urls import path
from . import views
from .views import *
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('test/', views.test, name = "test"),
    path('register/', RegisterView.as_view(), name = "register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("create_class/", CreateClassView.as_view(), name="create_class"),
    path("select_classes/", FilterClasses.as_view(), name="filter_class"),
    path("current_user/", CurrentUser.as_view(), name="current_user"),
    path("announcements/", AnnouncementListView.as_view(), name="announcements"),
]