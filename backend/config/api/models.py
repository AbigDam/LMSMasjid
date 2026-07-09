from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    id = models.BigAutoField(primary_key=True)
    role = models.IntegerField(null = True, blank = True) #Options:  0 - Teacher, 1 - Parent, 2 - Student
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    parents = models.JSONField(list, blank=True, null=True) #List of user IDs (of parents)

class Notification(models.Model):
    notification_id = models.BigAutoField(primary_key=True)
    corresponding_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=255)
    message = models.CharField(max_length=1000)
    is_read = models.BooleanField()
    created_at = models.DateTimeField()

class Audit_Log(models.Model):
    audit_log_id = models.BigAutoField(primary_key=True)
    corresponding_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="audit_log")
    action_type = models.CharField(max_length=1000)
    affected_table = models.CharField(max_length=1000)
    record_id = models.IntegerField()
    timestamp = models.DateTimeField()

class Class(models.Model):
    class_id = models.BigAutoField(primary_key=True)
    teachers = models.JSONField(list, null=True) #List of teacher IDs
    students = models.JSONField(list, blank = True, null=True) #List of student IDs
    class_name = models.CharField(max_length=255, blank=True, null=True)
    program = models.CharField(max_length=255, blank=True, null=True)
    schedule = models.CharField(max_length=255, blank=True, null=True)
    room = models.CharField(max_length=255, blank=True, null=True)
    status = models.BooleanField(default = True)
    #schedule_days = models.CharField(max_length=255)
    #start_time = models.TimeField()
    #end_time = models.TimeField()

class Attendance_Log(models.Model):
    attendance_log_id = models.BigAutoField(primary_key=True)
    classroom = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="student_attendances")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="attendances")
    present = models.BooleanField()
    date = models.DateField()

class Log(models.Model):
    log_id = models.BigAutoField(primary_key=True)
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reading_log")
    logged_by = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="student_reading_log")
    
    comments = models.CharField(max_length=1000, null= True, blank= True)
    date = models.DateField()
    behavior = models.IntegerField(default = 5,null=True, blank=True) 
    attendance = models.IntegerField(default = 0) #0 - Present   1-Absent    2- Excused Absence


class QuranRange(models.Model):
    log = models.ForeignKey(Log, related_name="ranges", on_delete=models.CASCADE)

    passed = models.BooleanField(null=True, blank=True)
    log_type = models.IntegerField(null=True, blank=True) # 0 - "Reading Log"   1 - "Memorization Log"   2 - "Review Log"
    surah = models.PositiveSmallIntegerField()
    ayah_init = models.PositiveSmallIntegerField()
    ayah_final = models.PositiveSmallIntegerField()
    


class Behavior_Log(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="behavior_log")
    logged_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="student_behavior_log")
    score = models.IntegerField()  #Out of 5
    comments = models.CharField(max_length=1000, null= True, blank= True)
    date = models.DateField()

class Report_Card(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="report_card")
    classroom = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="student_report_card")
    behavior_score= models.IntegerField()  #Out of 5
    reading_score = models.IntegerField()  #Out of 5
    review_score = models.IntegerField()  #Out of 5
    memorization_score = models.IntegerField()  #Out of 5
    attendance_score = models.IntegerField()  #Out of 5
    trimester = models.IntegerField() #Out of 3
    date = models.DateField()

class Announcement(models.Model):
    announcement_id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=255)
    detail = models.CharField(max_length=1000)
    date = models.DateField()