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
 
class AvailableStudentsView(APIView):

    permission_classes = [IsAuthenticated]
 
    def get(self, request, class_id):
        classroom = get_object_or_404(Class, class_id=class_id)
        enrolled_ids = classroom.students or []
 
        available_students = User.objects.filter(role=2).exclude(id__in=enrolled_ids)
 
        serializer = StudentSerializer(available_students, many=True)
        return Response(serializer.data)

 
class AddStudentsToClassView(APIView):

    permission_classes = [IsAuthenticated]
 
    def post(self, request):
        class_id = request.data.get('class_id')
        student_ids = request.data.get('student_ids')
 
        if class_id is None or not student_ids:
            return Response(
                {"error": "class_id and student_ids are required."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
 
        if not isinstance(student_ids, list):
            student_ids = [student_ids]
 
        classroom = get_object_or_404(Class, class_id=class_id)
        current_students = classroom.students or []

        valid_ids = set(
            User.objects.filter(id__in=student_ids, role=2).values_list('id', flat=True)
        )
 
        added = []
        for student_id in student_ids:
            if student_id in valid_ids and student_id not in current_students:
                current_students.append(student_id)
                added.append(student_id)
 
        classroom.students = current_students
        classroom.save()
 
        return Response({"students": classroom.students, "added": added}, status=http_status.HTTP_200_OK)
 
#
class RemoveStudentFromClassView(APIView):

    permission_classes = [IsAuthenticated]
 
    def post(self, request):
        class_id = request.data.get('class_id')
        student_id = request.data.get('student_id')
 
        if class_id is None or student_id is None:
            return Response(
                {"error": "class_id and student_id are required."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
 
        classroom = get_object_or_404(Class, class_id=class_id)
        students = classroom.students or []
 
        if student_id not in students:
            return Response(
                {"error": "That student is not enrolled in this class."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
 
        students.remove(student_id)
        classroom.students = students
        classroom.save()
 
        return Response({"students": classroom.students}, status=http_status.HTTP_200_OK)

