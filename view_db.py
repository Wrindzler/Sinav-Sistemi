import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

# .env'den database bilgilerini al
db_url = os.getenv('DATABASE_URL', 'mysql://root:@localhost/exam_system')

# Parse et
import re
match = re.match(r'mysql://([^:]+):([^@]*)@([^/]+)/(.+)', db_url)
if match:
    user, password, host, database = match.groups()
else:
    print("❌ DATABASE_URL formatı hatalı!")
    exit()

try:
    # MySQL'e bağlan
    connection = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    print("✅ Veritabanına bağlanıldı!\n")
    
    with connection.cursor() as cursor:
        # Kullanıcılar
        print("=" * 80)
        print("👥 KULLANICILAR")
        print("=" * 80)
        cursor.execute("SELECT id, username, full_name, role, email FROM users")
        users = cursor.fetchall()
        for user in users:
            print(f"ID: {user['id']} | {user['username']:15} | {user['full_name']:25} | {user['role']:15} | {user['email']}")
        
        # Dersler
        print("\n" + "=" * 80)
        print("📚 DERSLER")
        print("=" * 80)
        cursor.execute("""
            SELECT c.id, c.code, c.name, u.full_name as instructor_name
            FROM courses c
            JOIN users u ON c.instructor_id = u.id
        """)
        courses = cursor.fetchall()
        for course in courses:
            print(f"ID: {course['id']} | {course['code']:10} | {course['name']:30} | Öğretim Üyesi: {course['instructor_name']}")
        
        # Testler
        print("\n" + "=" * 80)
        print("📝 TESTLER")
        print("=" * 80)
        cursor.execute("""
            SELECT t.id, t.name, c.name as course_name, t.weight,
                   DATE_FORMAT(t.start_time, '%Y-%m-%d %H:%i') as start_time,
                   DATE_FORMAT(t.end_time, '%Y-%m-%d %H:%i') as end_time
            FROM tests t
            JOIN courses c ON t.course_id = c.id
        """)
        tests = cursor.fetchall()
        for test in tests:
            print(f"ID: {test['id']} | {test['name']:15} | Ders: {test['course_name']:30} | Ağırlık: %{test['weight']}")
            print(f"      Başlangıç: {test['start_time']} | Bitiş: {test['end_time']}")
        
        # Kayıtlar
        print("\n" + "=" * 80)
        print("📋 ÖĞRENCİ KAYITLARI")
        print("=" * 80)
        cursor.execute("""
            SELECT u.full_name as student_name, c.name as course_name, c.code
            FROM enrollments e
            JOIN users u ON e.student_id = u.id
            JOIN courses c ON e.course_id = c.id
            ORDER BY u.full_name
        """)
        enrollments = cursor.fetchall()
        for enr in enrollments:
            print(f"👨‍🎓 {enr['student_name']:30} → {enr['code']:10} {enr['course_name']}")
        
        # Sınav Sonuçları
        print("\n" + "=" * 80)
        print("📊 SINAV SONUÇLARI")
        print("=" * 80)
        cursor.execute("""
            SELECT 
                u.full_name as student_name,
                t.name as test_name,
                c.name as course_name,
                ea.score,
                ea.max_score,
                ROUND((ea.score / ea.max_score * 100), 2) as percentage,
                DATE_FORMAT(ea.submitted_at, '%Y-%m-%d %H:%i:%s') as submitted_at
            FROM exam_attempts ea
            JOIN users u ON ea.student_id = u.id
            JOIN tests t ON ea.test_id = t.id
            JOIN courses c ON t.course_id = c.id
            WHERE ea.submitted_at IS NOT NULL
            ORDER BY ea.submitted_at DESC
        """)
        results = cursor.fetchall()
        for result in results:
            print(f"👨‍🎓 {result['student_name']:30} | {result['test_name']:15}")
            print(f"      Ders: {result['course_name']}")
            print(f"      Puan: {result['score']}/{result['max_score']} (%{result['percentage']})")
            print(f"      Tarih: {result['submitted_at']}")
            print()
        
        # İstatistikler
        print("=" * 80)
        print("📈 İSTATİSTİKLER")
        print("=" * 80)
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE role='student'")
        student_count = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE role='instructor'")
        instructor_count = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) as count FROM courses")
        course_count = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) as count FROM tests")
        test_count = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) as count FROM exam_attempts WHERE submitted_at IS NOT NULL")
        completed_exams = cursor.fetchone()['count']
        
        print(f"👨‍🎓 Öğrenci Sayısı: {student_count}")
        print(f"👨‍🏫 Öğretim Üyesi Sayısı: {instructor_count}")
        print(f"📚 Ders Sayısı: {course_count}")
        print(f"📝 Test Sayısı: {test_count}")
        print(f"✅ Tamamlanan Sınav: {completed_exams}")
    
    connection.close()
    print("\n✅ Bağlantı kapatıldı!")
    
except Exception as e:
    print(f"❌ Hata: {e}")

