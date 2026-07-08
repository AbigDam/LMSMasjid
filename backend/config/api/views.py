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
from rest_framework import status
from django.shortcuts import get_object_or_404

User = get_user_model()

LOG_TYPE_MAP = {
    0: 'reading',
    1: 'memorization',
    2: 'review',
}
@api_view(['GET'])
def test(request):
    return Response({"message": "Testing!  Testing!  Message Recived?"})

#Register
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

# Create Classroom
class CreateClassView(generics.CreateAPIView):
    serializer_class = CreateClassSerializer
    permission_classes = [IsAuthenticated]

# Return all Classes of a Teacher
class FilterClasses(APIView):
    def get(self, request):
        permission_classes = [IsAuthenticated]

        teacher_id = request.user.id
        all_classes = Class.objects.all()
        classes = []
        for classroom in all_classes:
            if teacher_id in classroom.teachers:
                classes.append(classroom)
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
            "role_id": request.user.role,
        })

class AnnouncementListView(ListAPIView):
    queryset = Announcement.objects.all().order_by("-date")
    serializer_class = AnnouncementSerializer


class StudentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id):
        classroom = get_object_or_404(Class, class_id=class_id)
        student_ids = classroom.students or []

        students = User.objects.filter(
            id__in=student_ids, 
            role=2
        )

        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)
        
class CreateLogView(generics.CreateAPIView):
    serializer_class = CreateLogSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = serializer.save()
        return Response({"id": log.log_id}, status=status.HTTP_201_CREATED)

class UpdateLogView(generics.GenericAPIView):
    serializer_class = CreateLogSerializer

    def get_object(self):
        return get_object_or_404(
            Log,
            log_id = self.request.data.get('log_id')
        )

    def post(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if request.data.get('attendance') == 0:
            instance.surah = request.data.get('surah')
            instance.ayah_init = request.data.get('starting_ayah')
            instance.ayah_final = request.data.get('ending_ayah')
            instance.passed = request.data.get('passed')
            instance.comments = request.data.get('comments')
            instance.behavior = request.data.get('behavior')
            instance.attendance = request.data.get('attendance')
            instance.save()
        else:
            instance.surah = None
            instance.ayah_init =  None
            instance.ayah_final =  None
            instance.passed = None
            instance.comments = ""
            instance.behavior = None
            instance.attendance = request.data.get('attendance')
            instance.save()
        
        return Response({"id": instance.log_id}, status=status.HTTP_200_OK)


class DeleteLogView(generics.GenericAPIView):
    serializer_class = CreateLogSerializer

    def get_object(self):
        return get_object_or_404(
            Log,
            log_id = self.request.data.get('log_id')
        )

    def post(self, request, *args, **kwargs):
        instance = self.get_object()
        
        instance.delete()

        return Response({"id": instance.log_id}, status=status.HTTP_200_OK)

class ReportCardListCreateView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "POST":
            return CreateReportCardSerializer
        return ReportCardSerializer
 
    def get_queryset(self):
        queryset = Report_Card.objects.all()
 
        if self.request.method == "GET":
            student_id = self.request.query_params.get("student")
            if not student_id:
                raise ValidationError({"student": "This query parameter is required."})
            queryset = queryset.filter(student_id=student_id)
 
            trimester = self.request.query_params.get("trimester")
            if trimester:
                queryset = queryset.filter(trimester=trimester)
 
        return queryset.order_by("-date")
 
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report_card = serializer.save()
        return Response({"id": report_card.id}, status=status.HTTP_201_CREATED)
 




class GetLogsView(generics.GenericAPIView):
    def get(self, request, *args, **kwargs):
        class_id = request.query_params.get('class_id')
        if not class_id:
            return Response({"error": "class_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        logs = Log.objects.filter(logged_by_id=class_id).select_related('student')

        result = {}
        for log in logs:
            student_id = log.student_id
            if student_id not in result:
                result[student_id] = []
            if log.attendance == 0:
                result[student_id].append({
                    "id": log.log_id,
                    "date": log.date.isoformat(),
                    "surah": log.surah,
                    "surahName": quran_surahs[log.surah],
                    "ayahStart": log.ayah_init,
                    "ayahEnd": log.ayah_final,
                    "type": LOG_TYPE_MAP.get(log.log_type, 'reading'),
                    "behavior": log.behavior,
                    "comments": log.comments,
                    "grade": "pass" if log.passed else "fail",
                })
            else:
                result[student_id].append({
                    "id": log.log_id,
                    "date": log.date.isoformat(),
                    "attendance": log.attendance,
                })

        return Response(result, status=status.HTTP_200_OK)

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


class CreateClassAccounts(APIView):
     def post(self, request): 
        first_names = self.request.data.get("first_names") 
        last_names = self.request.data.get("last_names") 
        emails = self.request.data.get("emails") 
        class_name = self.request.data.get("class_name") 
        
        program = self.request.data.get("program") 
        schedule = self.request.data.get("schedule") 
        room = self.request.data.get("room") 

        teacher =  request.user
        
        classroom = Class.objects.create(class_name = class_name, teachers = [teacher.id], program = program, schedule = schedule, room = room, status = True) 
        results = {"created": []}
        students = []
        for i in range(len(first_names)): 
            first_name = first_names[i] 
            last_name = last_names[i] 
            email = emails[i] 
            username = f"{first_name}{last_name}" 
            password = "studentpass" 
            role_obj = 2
            if User.objects.filter(username = first_name + last_name).exists():
                user = User.objects.get(username = first_name + last_name)
            else:
                user = User.objects.create_user(username = first_name + last_name, first_name = first_name, last_name = last_name, email = email, password = password, role = role_obj)
            students.append(user.id)
            results["created"].append( {"username":username, "student_id":user.id}) 
        classroom.students = students
        classroom.save()

        return Response(results, status=status.HTTP_201_CREATED)
        
quran_surahs = {
    1: "Al-Fatiha",
    2: "Al-Baqara",
    3: "Aal-E-Imran",
    4: "An-Nisa",
    5: "Al-Ma'ida",
    6: "Al-An'am",
    7: "Al-A'raf",
    8: "Al-Anfal",
    9: "At-Tawbah",
    10: "Yunus",
    11: "Hud",
    12: "Yusuf",
    13: "Ar-Ra'd",
    14: "Ibrahim",
    15: "Al-Hijr",
    16: "An-Nahl",
    17: "Al-Isra",
    18: "Al-Kahf",
    19: "Maryam",
    20: "Ta-Ha",
    21: "Al-Anbiya",
    22: "Al-Hajj",
    23: "Al-Mu'minun",
    24: "An-Nur",
    25: "Al-Furqan",
    26: "Ash-Shu'ara",
    27: "An-Naml",
    28: "Al-Qasas",
    29: "Al-Ankabut",
    30: "Ar-Rum",
    31: "Luqman",
    32: "As-Sajdah",
    33: "Al-Ahzab",
    34: "Saba",
    35: "Fatir",
    36: "Ya-Sin",
    37: "As-Saffat",
    38: "Sad",
    39: "Az-Zumar",
    40: "Ghafir",
    41: "Fussilat",
    42: "Ash-Shura",
    43: "Az-Zukhruf",
    44: "Ad-Dukhan",
    45: "Al-Jathiyah",
    46: "Al-Ahqaf",
    47: "Muhammad",
    48: "Al-Fath",
    49: "Al-Hujurat",
    50: "Qaf",
    51: "Adh-Dhariyat",
    52: "At-Tur",
    53: "An-Najm",
    54: "Al-Qamar",
    55: "Ar-Rahman",
    56: "Al-Waqi'ah",
    57: "Al-Hadid",
    58: "Al-Mujadila",
    59: "Al-Hashr",
    60: "Al-Mumtahanah",
    61: "As-Saff",
    62: "Al-Jumu'ah",
    63: "Al-Munafiqun",
    64: "At-Taghabun",
    65: "At-Talaq",
    66: "At-Tahrim",
    67: "Al-Mulk",
    68: "Al-Qalam",
    69: "Al-Haqqah",
    70: "Al-Ma'arij",
    71: "Nuh",
    72: "Al-Jinn",
    73: "Al-Muzzammil",
    74: "Al-Muddaththir",
    75: "Al-Qiyamah",
    76: "Al-Insan",
    77: "Al-Mursalat",
    78: "An-Naba",
    79: "An-Nazi'at",
    80: "Abasa",
    81: "At-Takwir",
    82: "Al-Infitar",
    83: "Al-Mutaffifin",
    84: "Al-Inshiqaq",
    85: "Al-Buruj",
    86: "At-Tariq",
    87: "Al-A'la",
    88: "Al-Ghashiyah",
    89: "Al-Fajr",
    90: "Al-Balad",
    91: "Ash-Shams",
    92: "Al-Lail",
    93: "Ad-Duha",
    94: "Ash-Sharh",
    95: "At-Tin",
    96: "Al-'Alaq",
    97: "Al-Qadr",
    98: "Al-Bayyinah",
    99: "Az-Zalzalah",
    100: "Al-'Adiyat",
    101: "Al-Qari'ah",
    102: "At-Takathur",
    103: "Al-'Asr",
    104: "Al-Humazah",
    105: "Al-Fil",
    106: "Quraish",
    107: "Al-Ma'un",
    108: "Al-Kawthar",
    109: "Al-Kafirun",
    110: "An-Nasr",
    111: "Al-Masad",
    112: "Al-Ikhlas",
    113: "Al-Falaq",
    114: "An-Nas"
}
