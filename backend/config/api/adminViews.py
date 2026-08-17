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

ROLE_NAME_TO_INT = {"Teacher": 0, "Admin": 1, "Student": 2}

# POST /admin/users/create/

# Body for role="Teacher" or role="Admin":
#     { role, first_name, last_name, username, email, password }
#     (mirrors SignupScreen's fields — full account, real credentials)

# Body for role="Student":
#     { role, first_name, last_name, class_id? }
#     (class_id is optional — matches "not assigned by default")
#     Username is auto-generated (first+last, deduplicated with a numeric
#     suffix on collision) and the password defaults to "studentpass",
#     matching the pattern in CreateClassAccounts — but unlike that view,
#     a collision here creates a NEW distinct account rather than silently
#     reusing an existing one, since this endpoint is for adding a brand
#     new user, not enrolling an existing student in another class.
class CreateUserView(APIView):

    permission_classes = [IsAuthenticated]
 
    def post(self, request):
        role_name = request.data.get("role")
        first_name = (request.data.get("first_name") or "").strip()
        last_name = (request.data.get("last_name") or "").strip()
 
        if role_name not in ROLE_NAME_TO_INT:
            return Response(
                {"error": "role must be one of: Teacher, Admin, Student."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
 
        if not first_name or not last_name:
            return Response(
                {"error": "First and last name are required."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
 
        role_obj = ROLE_NAME_TO_INT[role_name]
 
        if role_name == "Student":
            username_base = f"{first_name}{last_name}"
            username = username_base
            suffix = 1
            while User.objects.filter(username=username).exists():
                suffix += 1
                username = f"{username_base}{suffix}"
 
            user = User.objects.create_user(
                username=username,
                first_name=first_name,
                last_name=last_name,
                password="studentpass",
                role=role_obj,
            )
 
            class_id = request.data.get("class_id")
            if class_id:
                classroom = get_object_or_404(Class, class_id=class_id)
                students = classroom.students or []
                if user.id not in students:
                    students.append(user.id)
                    classroom.students = students
                    classroom.save()
 
            return Response(
                {"id": user.id, "username": username},
                status=http_status.HTTP_201_CREATED,
            )
 
        # Teacher or Admin
        username = (request.data.get("username") or "").strip()
        email = (request.data.get("email") or "").strip()
        password = request.data.get("password")
 
        if not username or not email or not password:
            return Response(
                {"error": "Username, email, and password are required."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
 
        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "That username is already taken."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
 
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role_obj,
        )
 
        return Response(
            {"id": user.id, "username": username},
            status=http_status.HTTP_201_CREATED,
        )
 
class AllUsersView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by("role", "first_name")

class AdminUserDetailView(APIView):
    """
    PATCH  /admin/users/<id>/  — edit first_name/last_name/username/email.
                                  role is intentionally NOT editable here —
                                  it's locked after account creation.
    DELETE /admin/users/<id>/  — delete the account and scrub it out of
                                  every class's teachers/students list so no
                                  class is left pointing at a dead user id.
    """
    permission_classes = [IsAuthenticated]
 
    def patch(self, request, id):
        user = get_object_or_404(User, id=id)
 
        for field in ["first_name", "last_name", "username", "email"]:
            if field in request.data:
                setattr(user, field, request.data[field])
 
        user.save()
        return Response(AdminUserSerializer(user).data)
 
    def delete(self, request, id):
        user = get_object_or_404(User, id=id)
        user_id = user.id
 
        # Iterates every class rather than using a JSONField __contains
        # query, since __contains support for JSONField varies by database
        # backend (reliable on Postgres, inconsistent on SQLite). Fine at
        # masjid scale; revisit if the Class table ever gets huge.
        for classroom in Class.objects.all():
            changed = False
            if classroom.teachers and user_id in classroom.teachers:
                classroom.teachers = [t for t in classroom.teachers if t != user_id]
                changed = True
            if classroom.students and user_id in classroom.students:
                classroom.students = [s for s in classroom.students if s != user_id]
                changed = True
            if changed:
                classroom.save()
 
        user.delete()
        return Response(status=http_status.HTTP_204_NO_CONTENT)

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

