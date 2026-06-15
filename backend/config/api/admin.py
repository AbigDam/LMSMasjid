from django.contrib import admin

# Register your models here.
from .models import *

# Register your models here
admin.site.register(User)
admin.site.register(Role)
admin.site.register(Teacher)
admin.site.register(Class)
admin.site.register(Student)
admin.site.register(Announcement)
admin.site.register(Parent)
admin.site.register(Attendance_Log)
admin.site.register(Behavior_Log)
admin.site.register(Log)
