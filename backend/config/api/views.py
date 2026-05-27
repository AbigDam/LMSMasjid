from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.contrib.auth import get_user_model
from .serializers import *
from rest_framework import generics

User = get_user_model()

@api_view(['GET'])
def test(request):
    return Response({"message": "Testing!  Testing!  Message Recived?"})

#Register
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer



# Create Classroom
# Return all Classes of a Teacher


# Add Student to Classroom
# Remove Student from Classroom
# Return all Students in Class

# Log Student Attendance
# Return list of days student was present

# Log Student Reading 
# Return Student Reading on Date
# Return pages read from InitialDay to FinalDay
# Return total pages read

#Log Student Review
# Return Student Reivew on a date
# Return surahs reviewed from InitialDay to FinalDay
# Return total surahs reviewed from  

### If a "pass" is selected as true for a review, it will be logged as reivew and a memorization log will be genrated
### If "pass" is false for a surah that was already memorized, that surah will be marked in memorization log as forgotten

# Log Student Memorization
# Remove Student Memorization (Student failed review and has forgotten Surah)
# Return total list of attempted Surahs for a student
# Return total list of memorized Surahs for a student
# Return list of surahs memorized for InitialDay to FinalDay 
# Return list of surahs attempted for InitialDay to FinalDay 
# Return percent of Quran memorized 

# Log Student Behavior
# Return Behavior log on Date
# Return list of dates with comments
# Return average behavior score (out of 10)

#Log report card
# Return report card of partciular year/trimester
