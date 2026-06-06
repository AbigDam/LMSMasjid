from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.contrib.auth import get_user_model
from .serializers import *
from .models import *
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

User = get_user_model()

@api_view(['GET'])
def test(request):
    return Response({"message": "Testing!  Testing!  Message Recived?"})

#Register
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

#Log Out
### Far Future: Change Password

# Create Classroom
class CreateClassView(generics.CreateAPIView):
    serializer_class = CreateClassSerializer

# Return all Classes of a Teacher
class FilterClasses(APIView):
    def get(self, request):
        teacher_name = self.request.query_params.get("teacher_name")
        classes = Class.objects.filter(teacher = Teacher.objects.get(corresponding_user = User.objects.get(username = teacher_name)))
        serializer  = ClassSerializer(classes, many=True)
        return Response(serializer.data)


# Create Account Student 
# Add Student to Classroom
# Remove Student from Classroom
# Return all Students in Class

#Log Functions
#   CreateLog(student, teacher, surah, starting_ayah, ending_ayah, passed, comments, dates, log_type)
#   ReturnLogs(student, passed, starting_date, ending_date, log_type)

# Creates Report Card for a date
# Return report card of partciular year/trimester



###  Muwahid Starts here ###

# Log Student Behavior
# Return Behavior log on Date
# Return list of dates that aren't 5

# Log Student Attendance
    ## If an attendance log exsists for the previous day, but no behavior log exsists at that day, then make a behavior log for that day
# Return list of days student was present