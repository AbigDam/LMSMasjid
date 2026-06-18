from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.contrib.auth import get_user_model
from .serializers import *
from .models import *
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView

User = get_user_model()

# Return all Classes
class ClassesList(APIView):
    def get(self, request):
        permission_classes = [IsAuthenticated]

        classes = Class.objects
        serializer  = ClassSerializer(classes, many=True)
        return Response(serializer.data)