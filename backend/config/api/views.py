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

@api_view(['GET'])
def test(request):
    return Response({"message": "Testing!  Testing!  Message Recived?"})

#Register
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

# Create Classroom
class CreateClassView(generics.CreateAPIView):
    serializer_class = CreateClassSerializer

# Return all Classes of a Teacher
class FilterClasses(APIView):
    def get(self, request):
        permission_classes = [IsAuthenticated]

        teacher_name = request.user.username
        classes = Class.objects.filter(teacher = Teacher.objects.get(corresponding_user = User.objects.get(username = teacher_name)))
        serializer  = ClassSerializer(classes, many=True)
        return Response(serializer.data)

class CurrentUser(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
            "email": request.user.email,
            "username": request.user.username,
        })

class AnnouncementListView(ListAPIView):
    queryset = Announcement.objects.all().order_by("-date")
    serializer_class = AnnouncementSerializer

### Yousef TODO: Add the following API endpoints:
# Create Account Student 
# Add Student to Classroom
# Remove Student from Classroom

# Return all Students in Class
class StudentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id):
        students = Student.objects.filter(classroom__class_id=class_id)
        serializer = StudentSerializer(students, many=True)
    
        return Response(serializer.data)

#Log Functions
#   CreateLog(student, teacher, surah, starting_ayah, ending_ayah, passed, comments, dates, log_type)
#   ReturnLogs(student, passed, starting_date, ending_date, log_type)

# Creates Report Card for a date
# Return report card of partciular year/trimester



###  Muwahid Starts here ###

class LogAttendanceView(generics.CreateAPIView):
    serializer_class = LogAttendanceSerializer
    permission_classes = [IsAuthenticated]


class LogBehaviorView(generics.CreateAPIView):
    serializer_class = LogBehaviorSerializer
    permission_classes = [IsAuthenticated]


class GetBehaviorLogView(APIView):
    """GET /api/get_behavior_log/?student_id=X&date=YYYY-MM-DD"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        student_id = request.query_params.get("student_id")
        date = request.query_params.get("date")
        logs = Behavior_Log.objects.filter(student__student_id=student_id, date=date)
        serializer = BehaviorLogSerializer(logs, many=True)
        return Response(serializer.data)


class GetBehaviorIssuesView(APIView):
    """GET /api/get_behavior_issues/?student_id=X  — returns dates where score < 5"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        student_id = request.query_params.get("student_id")
        dates = (
            Behavior_Log.objects
            .filter(student__student_id=student_id, score__lt=5)
            .values("date", "score", "comments")
            .order_by("date")
        )
        return Response(list(dates))


class GetAttendanceView(APIView):
    """GET /api/get_attendance/?student_id=X  — returns dates the student was present"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        student_id = request.query_params.get("student_id")
        dates = (
            Attendance_Log.objects
            .filter(student__student_id=student_id, present=True)
            .values_list("date", flat=True)
            .order_by("date")
        )
        return Response(list(dates))