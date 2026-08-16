from django.shortcuts import render, get_object_or_404
from rest_framework import status as http_status
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

# Return a specific teacher's details
class TeacherDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        teacher = User.objects.get(id=id)
        print(teacher)
        return Response({
            "first_name": teacher.first_name,
            "last_name": teacher.last_name,
            "email": teacher.email,
            "username": teacher.username,
            "id": request.user.id,
        })

class TeachersListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TeacherListSerializer

    def get_queryset(self):
        return User.objects.filter(role=0)  

class UpdateClassView(APIView):
    permission_classes = [IsAuthenticated]
 
    def patch(self, request, id):
        classroom = get_object_or_404(Class, class_id=id)
 
        serializer = UpdateClassSerializer(classroom, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(ClassSerializer(classroom).data)
 
        return Response(serializer.errors, status=http_status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id):
        classroom = get_object_or_404(Class, class_id=id)

        classroom.delete()
        return Response(status=http_status.HTTP_204_NO_CONTENT)

