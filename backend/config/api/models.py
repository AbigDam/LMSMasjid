from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class Role(models.Model):
    role_id = models.BigAutoField(primary_key=True)
    role_name = models.CharField(max_length=255) #Options:  Teacher, Parent, Student

class User(AbstractUser):
    #AbstractUser includes username, email, password, first/last name, date joined, last_login, etc.
    id = models.BigAutoField(primary_key=True)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="users", null = True, blank= True)

class Teacher(models.Model):
    teacher_id = models.BigAutoField(primary_key=True)
    corresponding_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="teachers")

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
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="teacher")
    class_name = models.CharField(max_length=255)
    #schedule_days = models.CharField(max_length=255)
    #start_time = models.TimeField()
    #end_time = models.TimeField()

class Parent(models.Model):
    parent_id = models.BigAutoField(primary_key=True)
    corresponding_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="parents")
    phone_number = models.CharField(max_length=15, blank=True, null=True)

class Student(models.Model):
    student_id = models.BigAutoField(primary_key=True)
    corresponding_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="students")
    parent = models.ForeignKey(Parent, on_delete=models.CASCADE, related_name="child", null=True, blank= True)
    classroom = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="students", null=True, blank= True)
    #program_type = models.CharField(max_length=255)
    #enrollment_type = models.CharField(max_length=255)

class Attendance_Log(models.Model):
    attendance_log_id = models.BigAutoField(primary_key=True)
    classroom = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="student_attendances")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendances")
    date = models.DateField()

class Reading_Log(models.Model):
    reading_log_id = models.BigAutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="reading_log")
    logged_by = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="student_reading_log")
    page = models.IntegerField()
    comments = models.CharField(max_length=1000, null= True, blank= True)
    date = models.DateField()

class Memorization_Log(models.Model):
    surah = models.IntegerField()
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="memorization_log")
    logged_by = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="student_memorization_log")
    comments = models.CharField(max_length=1000, null= True, blank= True)
    forgotten = models.BooleanField()
    date = models.DateField()

class Review_Log(models.Model):
    surah = models.IntegerField()
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="review_log")
    logged_by = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="student_review_log")
    passed = models.BooleanField()
    comments = models.CharField(max_length=1000, null= True, blank= True)
    date = models.DateField()

class Behavior_Log(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="behavior_log")
    logged_by = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="student_behavior_log")
    score = models.IntegerField()  #Out of 10
    comments = models.CharField(max_length=1000, null= True, blank= True)
    date = models.DateField()

class Report_Card(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="report_card")
    logged_by = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="student_report_card")
    classroom = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="student_report_card")
    behavior_score= models.IntegerField()  #Out of 5
    reading_score = models.IntegerField()  #Out of 5
    review_score = models.IntegerField()  #Out of 5
    memorization_score = models.IntegerField()  #Out of 5
    attendance_score = models.IntegerField()  #Out of 5
    trimester = models.IntegerField() #Out of 3
    date = models.DateField()
