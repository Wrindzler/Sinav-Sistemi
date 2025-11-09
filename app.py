from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
import os
from dotenv import load_dotenv
import pymysql

# PyMySQL'i MySQLdb gibi kullan
pymysql.install_as_MySQLdb()

load_dotenv()

app = Flask(__name__)
# Veritabanı bağlantısı .env dosyasından okunur
# Varsayılan: SQLite (geliştirme için)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///exam_system.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # CSRF korumasını kapat (development için)

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# JWT error handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token expired'}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'error': f'Invalid token: {error}'}), 422

@jwt.unauthorized_loader
def unauthorized_callback(error):
    return jsonify({'error': f'Unauthorized: {error}'}), 401

# Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # admin, instructor, student, department_head
    full_name = db.Column(db.String(200), unique=True, nullable=False)  # UNIQUE: Her ad soyad tek olmalı
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    instructor_courses = db.relationship('Course', backref='instructor', lazy=True, foreign_keys='Course.instructor_id')
    enrollments = db.relationship('Enrollment', backref='student', lazy=True)
    exam_attempts = db.relationship('ExamAttempt', backref='student', lazy=True)

class Course(db.Model):
    __tablename__ = 'courses'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    instructor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    enrollments = db.relationship('Enrollment', backref='course', lazy=True, cascade='all, delete-orphan')
    tests = db.relationship('Test', backref='course', lazy=True, cascade='all, delete-orphan')

class Enrollment(db.Model):
    __tablename__ = 'enrollments'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('student_id', 'course_id', name='unique_enrollment'),)

class Test(db.Model):
    __tablename__ = 'tests'
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)  # Vize, Final
    weight = db.Column(db.Float, nullable=False)  # Percentage weight (e.g., 40, 60)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, default=10)
    question_count = db.Column(db.Integer, default=5)  # Kaç soru sorulacak (soru havuzundan random seçilir)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    questions = db.relationship('Question', backref='test', lazy=True, cascade='all, delete-orphan')
    exam_attempts = db.relationship('ExamAttempt', backref='test', lazy=True)

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    test_id = db.Column(db.Integer, db.ForeignKey('tests.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(500), nullable=False)
    option_b = db.Column(db.String(500), nullable=False)
    option_c = db.Column(db.String(500), nullable=False)
    option_d = db.Column(db.String(500), nullable=False)
    correct_answer = db.Column(db.String(1), nullable=False)  # A, B, C, or D
    points = db.Column(db.Float, default=1.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ExamAttempt(db.Model):
    __tablename__ = 'exam_attempts'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    test_id = db.Column(db.Integer, db.ForeignKey('tests.id'), nullable=False)
    started_at = db.Column(db.DateTime, nullable=False)
    submitted_at = db.Column(db.DateTime, nullable=True)
    score = db.Column(db.Float, nullable=True)
    max_score = db.Column(db.Float, nullable=True)
    answers = db.relationship('Answer', backref='exam_attempt', lazy=True, cascade='all, delete-orphan')
    
    __table_args__ = (db.UniqueConstraint('student_id', 'test_id', name='unique_attempt'),)

class Answer(db.Model):
    __tablename__ = 'answers'
    id = db.Column(db.Integer, primary_key=True)
    exam_attempt_id = db.Column(db.Integer, db.ForeignKey('exam_attempts.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    selected_answer = db.Column(db.String(1), nullable=True)  # A, B, C, D, or None
    is_correct = db.Column(db.Boolean, nullable=True)
    points_earned = db.Column(db.Float, default=0.0)
    
    __table_args__ = (db.UniqueConstraint('exam_attempt_id', 'question_id', name='unique_answer'),)

# Helper function to check role
def require_role(*roles):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user_id = int(get_jwt_identity())
            user = User.query.filter_by(id=current_user_id).first()
            if not user or user.role not in roles:
                return jsonify({'error': 'Unauthorized'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Auth Routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if user and check_password_hash(user.password_hash, password):
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'full_name': user.full_name
            }
        }), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=current_user_id).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'full_name': user.full_name
    }), 200

# Admin Routes
@app.route('/api/admin/users', methods=['POST'])
@require_role('admin')
def create_user():
    data = request.get_json()
    
    # Kullanıcı adı kontrolü
    existing_user = User.query.filter_by(username=data['username']).first()
    if existing_user:
        return jsonify({
            'error': f'❌ "{data["username"]}" kullanici adi zaten kullaniliyor. Lutfen farkli bir kullanici adi secin.'
        }), 400
    
    # E-posta kontrolü
    existing_email = User.query.filter_by(email=data['email']).first()
    if existing_email:
        return jsonify({
            'error': f'❌ "{data["email"]}" e-posta adresi zaten kayitli. Lutfen farkli bir e-posta adresi kullanin.'
        }), 400
    
    # Ad Soyad kontrolü (UNIQUE olmalı)
    existing_fullname = User.query.filter_by(full_name=data['full_name']).first()
    if existing_fullname:
        return jsonify({
            'error': f'❌ "{data["full_name"]}" adinda bir kullanici zaten mevcut. Lutfen farkli bir ad soyad girin.'
        }), 400
    
    # Boş alan kontrolü
    if not data.get('username') or not data.get('email') or not data.get('password') or not data.get('full_name'):
        return jsonify({'error': 'Tum alanlar zorunludur'}), 400
    
    # Kullanıcı adı formatı kontrolü (sadece harf, rakam, alt çizgi)
    import re
    if not re.match(r'^[a-zA-Z0-9_]+$', data['username']):
        return jsonify({
            'error': 'Kullanici adi sadece harf, rakam ve alt cizgi (_) icerebilir'
        }), 400
    
    # Şifre uzunluğu kontrolü
    if len(data['password']) < 6:
        return jsonify({'error': 'Sifre en az 6 karakter olmalidir'}), 400
    
    try:
        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            role=data['role'],
            full_name=data['full_name']
        )
        
        db.session.add(user)
        db.session.commit()
        
        print(f"DEBUG - Yeni kullanıcı oluşturuldu: {user.username} ({user.role})")
        
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'full_name': user.full_name
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR - Kullanıcı oluşturma hatası: {str(e)}")
        return jsonify({'error': f'Kullanici olusturulurken hata: {str(e)}'}), 500

@app.route('/api/admin/users', methods=['GET'])
@require_role('admin')
def get_all_users():
    role = request.args.get('role')
    query = User.query
    
    if role:
        query = query.filter_by(role=role)
    
    users = query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'role': u.role,
        'full_name': u.full_name
    } for u in users]), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@require_role('admin')
def delete_user(user_id):
    current_user_id = int(get_jwt_identity())
    
    # Kendi hesabını silmeyi engelle
    if user_id == current_user_id:
        return jsonify({'error': 'Kendi hesabinizi silemezsiniz'}), 400
    
    user = User.query.filter_by(id=user_id).first()
    
    if not user:
        return jsonify({'error': 'Kullanici bulunamadi'}), 404
    
    # Admin hesabını silmeyi engelle
    if user.username == 'admin':
        return jsonify({'error': 'Ana admin hesabi silinemez'}), 400
    
    try:
        # İlişkili kayıtları temizle (DOĞRU SIRADA)
        if user.role == 'student':
            print(f"DEBUG - Siliniyor: Öğrenci {user.username} (ID: {user_id})")
            
            # 1. Önce exam_attempts'leri bul
            exam_attempts = ExamAttempt.query.filter_by(student_id=user_id).all()
            print(f"DEBUG - {len(exam_attempts)} sınav girişimi bulundu")
            
            # 2. Her attempt için önce answers'ları sil
            for attempt in exam_attempts:
                Answer.query.filter_by(exam_attempt_id=attempt.id).delete()
                print(f"DEBUG - Attempt {attempt.id} için cevaplar silindi")
            
            # 3. Şimdi exam_attempts'leri sil
            ExamAttempt.query.filter_by(student_id=user_id).delete()
            print(f"DEBUG - Sınav girişimleri silindi")
            
            # 4. Enrollment kayıtlarını sil
            Enrollment.query.filter_by(student_id=user_id).delete()
            print(f"DEBUG - Ders kayıtları silindi")
            
        elif user.role == 'instructor':
            # Öğretim üyesinin derslerini kontrol et
            courses = Course.query.filter_by(instructor_id=user_id).all()
            if courses:
                return jsonify({
                    'error': f'Bu ogretim uyesinin {len(courses)} dersi var. Once dersleri silin veya baska ogretim uyesine atayin.'
                }), 400
        
        # 5. En son kullanıcıyı sil
        db.session.delete(user)
        db.session.commit()
        
        print(f"DEBUG - Kullanıcı {user.username} başarıyla silindi")
        return jsonify({'message': 'Kullanici basariyla silindi'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR - Kullanıcı silme hatası: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Kullanici silinirken hata: {str(e)}'}), 500

@app.route('/api/admin/courses', methods=['POST'])
@require_role('admin')
def create_course():
    data = request.get_json()
    
    if Course.query.filter_by(code=data['code']).first():
        return jsonify({'error': 'Course code already exists'}), 400
    
    course = Course(
        code=data['code'],
        name=data['name'],
        instructor_id=data['instructor_id']
    )
    
    db.session.add(course)
    db.session.commit()
    
    return jsonify({
        'id': course.id,
        'code': course.code,
        'name': course.name,
        'instructor_id': course.instructor_id
    }), 201

@app.route('/api/admin/courses', methods=['GET'])
@require_role('admin', 'department_head')
def get_all_courses():
    courses = Course.query.all()
    result = []
    for course in courses:
        instructor = User.query.filter_by(id=course.instructor_id).first()
        result.append({
            'id': course.id,
            'code': course.code,
            'name': course.name,
            'instructor_id': course.instructor_id,
            'instructor_name': instructor.full_name if instructor else None,
            'student_count': len(course.enrollments)
        })
    return jsonify(result), 200

@app.route('/api/admin/courses/<int:course_id>/instructor', methods=['PUT'])
@require_role('admin')
def update_course_instructor(course_id):
    data = request.get_json()
    new_instructor_id = data.get('instructor_id')
    
    if not new_instructor_id:
        return jsonify({'error': 'Ogretim uyesi ID gerekli'}), 400
    
    course = Course.query.filter_by(id=course_id).first()
    if not course:
        return jsonify({'error': 'Ders bulunamadi'}), 404
    
    # Yeni öğretim üyesini kontrol et
    new_instructor = User.query.filter_by(id=new_instructor_id, role='instructor').first()
    if not new_instructor:
        return jsonify({'error': 'Gecerli bir ogretim uyesi bulunamadi'}), 404
    
    old_instructor_id = course.instructor_id
    course.instructor_id = new_instructor_id
    
    try:
        db.session.commit()
        print(f"DEBUG - Ders '{course.name}' öğretim üyesi değiştirildi: {old_instructor_id} -> {new_instructor_id}")
        
        return jsonify({
            'message': 'Ogretim uyesi basariyla degistirildi',
            'course': {
                'id': course.id,
                'code': course.code,
                'name': course.name,
                'instructor_id': course.instructor_id,
                'instructor_name': new_instructor.full_name
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Hata: {str(e)}'}), 500

@app.route('/api/admin/courses/<int:course_id>', methods=['DELETE'])
@require_role('admin')
def delete_course(course_id):
    course = Course.query.filter_by(id=course_id).first()
    
    if not course:
        return jsonify({'error': 'Ders bulunamadi'}), 404
    
    try:
        print(f"DEBUG - Siliniyor: Ders {course.name} (ID: {course_id})")
        
        # 1. Bu dersteki tüm testleri bul
        tests = Test.query.filter_by(course_id=course_id).all()
        print(f"DEBUG - {len(tests)} test bulundu")
        
        for test in tests:
            # Her test için exam_attempts bul
            exam_attempts = ExamAttempt.query.filter_by(test_id=test.id).all()
            print(f"DEBUG - Test {test.id} için {len(exam_attempts)} sınav girişimi bulundu")
            
            # Her attempt için answers'ları sil
            for attempt in exam_attempts:
                Answer.query.filter_by(exam_attempt_id=attempt.id).delete()
                print(f"DEBUG - Attempt {attempt.id} için cevaplar silindi")
            
            # Exam attempts'leri sil
            ExamAttempt.query.filter_by(test_id=test.id).delete()
            print(f"DEBUG - Test {test.id} için sınav girişimleri silindi")
            
            # Soruları sil
            Question.query.filter_by(test_id=test.id).delete()
            print(f"DEBUG - Test {test.id} için sorular silindi")
        
        # 2. Testleri sil
        Test.query.filter_by(course_id=course_id).delete()
        print(f"DEBUG - Tüm testler silindi")
        
        # 3. Enrollment kayıtlarını sil
        enrollments_count = Enrollment.query.filter_by(course_id=course_id).count()
        Enrollment.query.filter_by(course_id=course_id).delete()
        print(f"DEBUG - {enrollments_count} öğrenci kaydı silindi")
        
        # 4. Dersi sil
        db.session.delete(course)
        db.session.commit()
        
        print(f"DEBUG - Ders '{course.name}' başarıyla silindi")
        return jsonify({'message': 'Ders basariyla silindi'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR - Ders silme hatası: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Ders silinirken hata: {str(e)}'}), 500

@app.route('/api/admin/enrollments', methods=['POST'])
@require_role('admin')
def create_enrollment():
    data = request.get_json()
    
    # Check if enrollment already exists
    existing = Enrollment.query.filter_by(
        student_id=data['student_id'],
        course_id=data['course_id']
    ).first()
    
    if existing:
        return jsonify({'error': 'Student already enrolled in this course'}), 400
    
    enrollment = Enrollment(
        student_id=data['student_id'],
        course_id=data['course_id']
    )
    
    db.session.add(enrollment)
    db.session.commit()
    
    return jsonify({
        'id': enrollment.id,
        'student_id': enrollment.student_id,
        'course_id': enrollment.course_id
    }), 201

# Instructor Routes
@app.route('/api/instructor/courses', methods=['GET'])
@require_role('instructor')
def get_instructor_courses():
    current_user_id = int(get_jwt_identity())
    courses = Course.query.filter_by(instructor_id=current_user_id).all()
    
    result = []
    for course in courses:
        result.append({
            'id': course.id,
            'code': course.code,
            'name': course.name,
            'student_count': len(course.enrollments),
            'test_count': len(course.tests)
        })
    return jsonify(result), 200

@app.route('/api/instructor/courses/<int:course_id>/students', methods=['GET'])
@require_role('instructor')
def get_course_students(course_id):
    current_user_id = int(get_jwt_identity())
    course = Course.query.filter_by(id=course_id).first()
    
    if not course or course.instructor_id != current_user_id:
        return jsonify({'error': 'Course not found or unauthorized'}), 404
    
    students = []
    for enrollment in course.enrollments:
        student = enrollment.student
        students.append({
            'id': student.id,
            'username': student.username,
            'full_name': student.full_name,
            'email': student.email
        })
    
    return jsonify(students), 200

@app.route('/api/instructor/tests', methods=['POST'])
@require_role('instructor')
def create_test():
    data = request.get_json()
    current_user_id = int(get_jwt_identity())
    
    course = Course.query.filter_by(id=data['course_id']).first()
    if not course or course.instructor_id != current_user_id:
        return jsonify({'error': 'Course not found or unauthorized'}), 404
    
    # Timezone bilgisi olmadan parse et (naive datetime)
    start_time_str = data['start_time'].replace('Z', '').replace('+00:00', '')
    end_time_str = data['end_time'].replace('Z', '').replace('+00:00', '')
    
    start_time = datetime.fromisoformat(start_time_str)
    end_time = datetime.fromisoformat(end_time_str)
    
    # Debug için log
    print(f"DEBUG - Start time: {start_time}")
    print(f"DEBUG - End time: {end_time}")
    print(f"DEBUG - Start >= End: {start_time >= end_time}")
    
    # Validasyonlar
    if start_time >= end_time:
        return jsonify({
            'error': f'Bitis zamani baslangic zamanindan sonra olmalidir (Baslangic: {start_time}, Bitis: {end_time})'
        }), 400
    
    # Gelecek tarih kontrolü kaldırıldı - öğretim üyesi test senaryosu için geçmiş tarih girebilir
    
    weight = float(data['weight'])
    if weight <= 0 or weight > 100:
        return jsonify({'error': 'Agirlik 0 ile 100 arasinda olmalidir'}), 400
    
    # Ayni derste ayni isimde test var mi kontrol et
    existing_test = Test.query.filter_by(
        course_id=data['course_id'],
        name=data['name']
    ).first()
    
    if existing_test:
        return jsonify({'error': 'Bu ders icin ayni isimde test zaten var'}), 400
    
    test = Test(
        course_id=data['course_id'],
        name=data['name'],
        weight=weight,
        start_time=start_time,
        end_time=end_time,
        duration_minutes=data.get('duration_minutes', 10),
        question_count=data.get('question_count', 5)
    )
    
    db.session.add(test)
    db.session.commit()
    
    return jsonify({
        'id': test.id,
        'course_id': test.course_id,
        'name': test.name,
        'weight': test.weight,
        'start_time': test.start_time.isoformat(),
        'end_time': test.end_time.isoformat(),
        'duration_minutes': test.duration_minutes,
        'question_count': test.question_count
    }), 201

@app.route('/api/instructor/tests', methods=['GET'])
@require_role('instructor')
def get_instructor_tests():
    current_user_id = int(get_jwt_identity())
    course_id = request.args.get('course_id', type=int)
    
    query = Test.query.join(Course).filter(Course.instructor_id == current_user_id)
    
    if course_id:
        query = query.filter(Test.course_id == course_id)
    
    tests = query.all()
    
    result = []
    for test in tests:
        result.append({
            'id': test.id,
            'course_id': test.course_id,
            'course_name': test.course.name,
            'name': test.name,
            'weight': test.weight,
            'start_time': test.start_time.isoformat(),
            'end_time': test.end_time.isoformat(),
            'duration_minutes': test.duration_minutes,
            'question_pool_count': len(test.questions),
            'question_count': test.question_count
        })
    
    return jsonify(result), 200

@app.route('/api/instructor/questions', methods=['POST'])
@require_role('instructor')
def create_question():
    data = request.get_json()
    current_user_id = int(get_jwt_identity())
    
    test = Test.query.filter_by(id=data['test_id']).first()
    if not test or test.course.instructor_id != current_user_id:
        return jsonify({'error': 'Test not found or unauthorized'}), 404
    
    question = Question(
        test_id=data['test_id'],
        question_text=data['question_text'],
        option_a=data['option_a'],
        option_b=data['option_b'],
        option_c=data['option_c'],
        option_d=data['option_d'],
        correct_answer=data['correct_answer'],
        points=data.get('points', 1.0)
    )
    
    db.session.add(question)
    db.session.commit()
    
    return jsonify({
        'id': question.id,
        'test_id': question.test_id,
        'question_text': question.question_text,
        'option_a': question.option_a,
        'option_b': question.option_b,
        'option_c': question.option_c,
        'option_d': question.option_d,
        'correct_answer': question.correct_answer,
        'points': question.points
    }), 201

@app.route('/api/instructor/questions/<int:question_id>', methods=['DELETE'])
@require_role('instructor')
def delete_question(question_id):
    current_user_id = int(get_jwt_identity())
    
    question = Question.query.filter_by(id=question_id).first()
    if not question:
        return jsonify({'error': 'Soru bulunamadi'}), 404
    
    # Sorunun testinin öğretim üyesi kontrolü
    test = Test.query.filter_by(id=question.test_id).first()
    if not test or test.course.instructor_id != current_user_id:
        return jsonify({'error': 'Bu soruyu silme yetkiniz yok'}), 403
    
    try:
        print(f"DEBUG - Soru siliniyor: ID {question_id} (Test: {test.name})")
        
        # Sorularla ilişkili cevapları sil
        Answer.query.filter_by(question_id=question_id).delete()
        
        # Soruyu sil
        db.session.delete(question)
        db.session.commit()
        
        print(f"DEBUG - Soru basariyla silindi")
        return jsonify({'message': 'Soru basariyla silindi'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR - Soru silme hatasi: {str(e)}")
        return jsonify({'error': f'Soru silinirken hata: {str(e)}'}), 500

@app.route('/api/instructor/tests/<int:test_id>', methods=['DELETE'])
@require_role('instructor')
def delete_test(test_id):
    current_user_id = int(get_jwt_identity())
    
    test = Test.query.filter_by(id=test_id).first()
    if not test:
        return jsonify({'error': 'Test bulunamadi'}), 404
    
    # Test'in öğretim üyesi kontrolü
    if test.course.instructor_id != current_user_id:
        return jsonify({'error': 'Bu testi silme yetkiniz yok'}), 403
    
    try:
        print(f"DEBUG - Test siliniyor: {test.name} (ID: {test_id})")
        
        # 1. Exam attempts bul
        exam_attempts = ExamAttempt.query.filter_by(test_id=test_id).all()
        print(f"DEBUG - {len(exam_attempts)} sinav girisimi bulundu")
        
        # 2. Her attempt için answers'ları sil
        for attempt in exam_attempts:
            Answer.query.filter_by(exam_attempt_id=attempt.id).delete()
        
        # 3. Exam attempts'leri sil
        ExamAttempt.query.filter_by(test_id=test_id).delete()
        print(f"DEBUG - Sinav girisimleri silindi")
        
        # 4. Soruları sil
        Question.query.filter_by(test_id=test_id).delete()
        print(f"DEBUG - Sorular silindi")
        
        # 5. Testi sil
        db.session.delete(test)
        db.session.commit()
        
        print(f"DEBUG - Test '{test.name}' basariyla silindi")
        return jsonify({'message': 'Test basariyla silindi'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR - Test silme hatasi: {str(e)}")
        return jsonify({'error': f'Test silinirken hata: {str(e)}'}), 500

@app.route('/api/instructor/questions', methods=['GET'])
@require_role('instructor')
def get_questions():
    current_user_id = int(get_jwt_identity())
    test_id = request.args.get('test_id', type=int)
    
    if not test_id:
        return jsonify({'error': 'test_id required'}), 400
    
    test = Test.query.filter_by(id=test_id).first()
    if not test or test.course.instructor_id != current_user_id:
        return jsonify({'error': 'Test not found or unauthorized'}), 404
    
    questions = Question.query.filter_by(test_id=test_id).all()
    
    return jsonify([{
        'id': q.id,
        'test_id': q.test_id,
        'question_text': q.question_text,
        'option_a': q.option_a,
        'option_b': q.option_b,
        'option_c': q.option_c,
        'option_d': q.option_d,
        'correct_answer': q.correct_answer,
        'points': q.points
    } for q in questions]), 200

@app.route('/api/instructor/tests/<int:test_id>/results', methods=['GET'])
@require_role('instructor')
def get_test_results(test_id):
    current_user_id = int(get_jwt_identity())
    
    test = Test.query.filter_by(id=test_id).first()
    if not test or test.course.instructor_id != current_user_id:
        return jsonify({'error': 'Test not found or unauthorized'}), 404
    
    attempts = ExamAttempt.query.filter_by(test_id=test_id).all()
    
    results = []
    total_score = 0
    for attempt in attempts:
        student = attempt.student
        total_score += attempt.score if attempt.score else 0
        results.append({
            'student_id': student.id,
            'student_name': student.full_name,
            'score': attempt.score,
            'max_score': attempt.max_score,
            'percentage': (attempt.score / attempt.max_score * 100) if attempt.max_score else 0,
            'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None
        })
    
    average = total_score / len(attempts) if attempts else 0
    max_score = test.questions[0].points * len(test.questions) if test.questions else 0
    
    return jsonify({
        'test_id': test_id,
        'test_name': test.name,
        'average_score': average,
        'average_percentage': (average / max_score * 100) if max_score else 0,
        'results': results
    }), 200

@app.route('/api/instructor/courses/<int:course_id>/weight-summary', methods=['GET'])
@require_role('instructor')
def get_course_weight_summary(course_id):
    current_user_id = int(get_jwt_identity())
    course = Course.query.filter_by(id=course_id).first()
    
    if not course or course.instructor_id != current_user_id:
        return jsonify({'error': 'Course not found or unauthorized'}), 404
    
    tests = Test.query.filter_by(course_id=course_id).all()
    total_weight = sum(test.weight for test in tests)
    
    return jsonify({
        'course_id': course_id,
        'course_name': course.name,
        'total_weight': total_weight,
        'is_valid': total_weight == 100,
        'tests': [{
            'id': test.id,
            'name': test.name,
            'weight': test.weight
        } for test in tests]
    }), 200

@app.route('/api/instructor/courses/<int:course_id>/grades', methods=['GET'])
@require_role('instructor')
def get_course_grades(course_id):
    current_user_id = int(get_jwt_identity())
    course = Course.query.filter_by(id=course_id).first()
    
    if not course or course.instructor_id != current_user_id:
        return jsonify({'error': 'Course not found or unauthorized'}), 404
    
    # Get all tests for this course
    tests = Test.query.filter_by(course_id=course_id).all()
    
    # Get all enrolled students
    students = [e.student for e in course.enrollments]
    
    results = []
    for student in students:
        student_grades = {}
        total_weighted_score = 0
        total_weight = 0
        
        for test in tests:
            attempt = ExamAttempt.query.filter_by(
                student_id=student.id,
                test_id=test.id
            ).first()
            
            if attempt and attempt.score is not None:
                percentage = (attempt.score / attempt.max_score * 100) if attempt.max_score else 0
                weighted_score = percentage * (test.weight / 100)
                student_grades[test.name] = {
                    'score': attempt.score,
                    'max_score': attempt.max_score,
                    'percentage': percentage,
                    'weight': test.weight
                }
                total_weighted_score += weighted_score
                total_weight += test.weight
        
        final_grade = (total_weighted_score / total_weight * 100) if total_weight > 0 else 0
        
        results.append({
            'student_id': student.id,
            'student_name': student.full_name,
            'grades': student_grades,
            'final_grade': final_grade
        })
    
    return jsonify({
        'course_id': course_id,
        'course_name': course.name,
        'student_grades': results
    }), 200

# Student Routes
@app.route('/api/student/courses', methods=['GET'])
@require_role('student')
def get_student_courses():
    current_user_id = int(get_jwt_identity())
    
    enrollments = Enrollment.query.filter_by(student_id=current_user_id).all()
    
    result = []
    for enrollment in enrollments:
        course = enrollment.course
        instructor = course.instructor
        result.append({
            'id': course.id,
            'code': course.code,
            'name': course.name,
            'instructor_name': instructor.full_name if instructor else None,
            'test_count': len(course.tests)
        })
    
    return jsonify(result), 200

@app.route('/api/student/tests', methods=['GET'])
@require_role('student')
def get_available_tests():
    current_user_id = int(get_jwt_identity())
    
    # Get all courses the student is enrolled in
    enrollments = Enrollment.query.filter_by(student_id=current_user_id).all()
    course_ids = [e.course_id for e in enrollments]
    
    # Get all tests for these courses
    tests = Test.query.filter(Test.course_id.in_(course_ids)).all()
    
    result = []
    now = datetime.now()
    
    for test in tests:
        # Check if student has already attempted
        attempt = ExamAttempt.query.filter_by(
            student_id=current_user_id,
            test_id=test.id
        ).first()
        
        status = 'not_started'
        if attempt:
            status = 'completed' if attempt.submitted_at else 'in_progress'
        elif now < test.start_time:
            status = 'upcoming'
        elif now >= test.start_time and now <= test.end_time:
            status = 'available'
        elif now > test.end_time:
            status = 'expired'
        
        result.append({
            'id': test.id,
            'course_id': test.course_id,
            'course_name': test.course.name,
            'name': test.name,
            'start_time': test.start_time.isoformat(),
            'end_time': test.end_time.isoformat(),
            'duration_minutes': test.duration_minutes,
            'status': status,
            'has_attempt': attempt is not None,
            'score': attempt.score if attempt else None
        })
    
    return jsonify(result), 200

@app.route('/api/student/tests/<int:test_id>/start', methods=['POST'])
@require_role('student')
def start_test(test_id):
    current_user_id = int(get_jwt_identity())
    
    test = Test.query.filter_by(id=test_id).first()
    if not test:
        return jsonify({'error': 'Test not found'}), 404
    
    # Check if student is enrolled
    enrollment = Enrollment.query.filter_by(
        student_id=current_user_id,
        course_id=test.course_id
    ).first()
    
    if not enrollment:
        return jsonify({'error': 'Not enrolled in this course'}), 403
    
    # Check if test is available (timezone-aware karşılaştırma)
    now = datetime.now()
    if now < test.start_time:
        return jsonify({'error': 'Test henuz baslamadi'}), 400
    if now > test.end_time:
        return jsonify({'error': 'Test suresi doldu'}), 400
    
    # Check if already attempted
    existing_attempt = ExamAttempt.query.filter_by(
        student_id=current_user_id,
        test_id=test_id
    ).first()
    
    if existing_attempt and existing_attempt.submitted_at:
        return jsonify({'error': 'Test already completed'}), 400
    
    if existing_attempt:
        attempt = existing_attempt
    else:
        # Create new attempt
        attempt = ExamAttempt(
            student_id=current_user_id,
            test_id=test_id,
            started_at=datetime.now()
        )
        db.session.add(attempt)
        db.session.commit()
    
    # Soru havuzundan rastgele seçim
    all_questions = Question.query.filter_by(test_id=test_id).all()
    
    # Soru havuzunda yeterli soru var mı kontrol et
    if len(all_questions) < test.question_count:
        return jsonify({
            'error': f'Soru havuzunda yeterli soru yok! Gerekli: {test.question_count}, Mevcut: {len(all_questions)}'
        }), 400
    
    # Test'te belirlenen sayıda soru seç (rastgele)
    questions = Question.query.filter_by(test_id=test_id).order_by(db.func.random()).limit(test.question_count).all()
    
    print(f"DEBUG - Soru havuzu: {len(all_questions)} soru, Seçilen: {len(questions)} soru")
    
    # Calculate max score
    max_score = sum(q.points for q in questions)
    
    return jsonify({
        'attempt_id': attempt.id,
        'test_id': test_id,
        'test_name': test.name,
        'duration_minutes': test.duration_minutes,
        'started_at': attempt.started_at.isoformat(),
        'end_time': test.end_time.isoformat(),
        'max_score': max_score,
        'questions': [{
            'id': q.id,
            'question_text': q.question_text,
            'option_a': q.option_a,
            'option_b': q.option_b,
            'option_c': q.option_c,
            'option_d': q.option_d,
            'points': q.points
        } for q in questions]
    }), 200

@app.route('/api/student/tests/<int:test_id>/submit', methods=['POST'])
@require_role('student')
def submit_test(test_id):
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    attempt = ExamAttempt.query.filter_by(
        student_id=current_user_id,
        test_id=test_id
    ).first()
    
    if not attempt:
        return jsonify({'error': 'Test attempt not found'}), 404
    
    if attempt.submitted_at:
        return jsonify({'error': 'Test already submitted'}), 400
    
    test = Test.query.filter_by(id=test_id).first()
    now = datetime.now()
    
    # Auto-submit if time expired
    if now > test.end_time:
        now = test.end_time
    
    # Save answers and calculate score
    answers_data = data.get('answers', {})
    total_score = 0
    max_score = 0
    
    for question_id, selected_answer in answers_data.items():
        question = Question.query.filter_by(id=int(question_id)).first()
        if not question or question.test_id != test_id:
            continue
        
        max_score += question.points
        is_correct = (selected_answer.upper() == question.correct_answer.upper())
        points_earned = question.points if is_correct else 0
        total_score += points_earned
        
        # Check if answer already exists
        existing_answer = Answer.query.filter_by(
            exam_attempt_id=attempt.id,
            question_id=question.id
        ).first()
        
        if existing_answer:
            existing_answer.selected_answer = selected_answer.upper()
            existing_answer.is_correct = is_correct
            existing_answer.points_earned = points_earned
        else:
            answer = Answer(
                exam_attempt_id=attempt.id,
                question_id=question.id,
                selected_answer=selected_answer.upper(),
                is_correct=is_correct,
                points_earned=points_earned
            )
            db.session.add(answer)
    
    attempt.score = total_score
    attempt.max_score = max_score
    attempt.submitted_at = now
    
    db.session.commit()
    
    # Get test average
    all_attempts = ExamAttempt.query.filter_by(test_id=test_id).all()
    average_score = sum(a.score for a in all_attempts if a.score) / len(all_attempts) if all_attempts else 0
    average_percentage = (average_score / max_score * 100) if max_score else 0
    
    return jsonify({
        'score': total_score,
        'max_score': max_score,
        'percentage': (total_score / max_score * 100) if max_score else 0,
        'average_score': average_score,
        'average_percentage': average_percentage
    }), 200

@app.route('/api/student/tests/<int:test_id>/result', methods=['GET'])
@require_role('student')
def get_test_result(test_id):
    try:
        current_user_id = int(get_jwt_identity())
        print(f"DEBUG - Student {current_user_id} requesting result for test {test_id}")
        
        attempt = ExamAttempt.query.filter_by(
            student_id=current_user_id,
            test_id=test_id
        ).first()
        
        if not attempt:
            print(f"DEBUG - Attempt not found")
            return jsonify({'error': 'Test attempt not found'}), 404
        
        print(f"DEBUG - Attempt found: ID={attempt.id}, Score={attempt.score}, MaxScore={attempt.max_score}")
        
        test = Test.query.filter_by(id=test_id).first()
        if not test:
            print(f"DEBUG - Test not found")
            return jsonify({'error': 'Test not found'}), 404
        
        print(f"DEBUG - Test found: {test.name}")
        
        # Get answers WITHOUT eager loading to avoid issues
        answers = Answer.query.filter_by(exam_attempt_id=attempt.id).all()
        print(f"DEBUG - Found {len(answers)} answers")
        
        # Build answer list safely
        answer_list = []
        for a in answers:
            try:
                question = Question.query.filter_by(id=a.question_id).first()
                if question:
                    answer_list.append({
                        'question_id': a.question_id,
                        'question_text': question.question_text,
                        'selected_answer': a.selected_answer if a.selected_answer else '-',
                        'correct_answer': question.correct_answer,
                        'is_correct': a.is_correct if a.is_correct is not None else False,
                        'points_earned': a.points_earned if a.points_earned is not None else 0
                    })
            except Exception as e:
                print(f"DEBUG - Error processing answer {a.id}: {str(e)}")
                continue
        
        # Get test average - sadece tamamlanmış sınavları say
        all_attempts = ExamAttempt.query.filter_by(test_id=test_id).filter(
            ExamAttempt.submitted_at.isnot(None)
        ).all()
        
        print(f"DEBUG - Found {len(all_attempts)} completed attempts")
        
        if all_attempts and attempt.max_score and attempt.max_score > 0:
            total_score = sum(a.score for a in all_attempts if a.score is not None)
            average_score = total_score / len(all_attempts) if all_attempts else 0
            average_percentage = (average_score / attempt.max_score * 100)
        else:
            average_score = 0
            average_percentage = 0
        
        # Calculate percentage safely
        if attempt.score is not None and attempt.max_score and attempt.max_score > 0:
            percentage = (attempt.score / attempt.max_score * 100)
        else:
            percentage = 0
        
        result = {
            'test_id': test_id,
            'test_name': test.name,
            'score': attempt.score if attempt.score is not None else 0,
            'max_score': attempt.max_score if attempt.max_score is not None else 0,
            'percentage': round(percentage, 2),
            'average_score': round(average_score, 2),
            'average_percentage': round(average_percentage, 2),
            'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            'answers': answer_list
        }
        
        print(f"DEBUG - Returning result: {result}")
        return jsonify(result), 200
        
    except Exception as e:
        print(f"ERROR in get_test_result: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/student/courses/<int:course_id>/grade', methods=['GET'])
@require_role('student')
def get_course_grade(course_id):
    current_user_id = int(get_jwt_identity())
    
    enrollment = Enrollment.query.filter_by(
        student_id=current_user_id,
        course_id=course_id
    ).first()
    
    if not enrollment:
        return jsonify({'error': 'Not enrolled in this course'}), 404
    
    course = Course.query.filter_by(id=course_id).first()
    tests = Test.query.filter_by(course_id=course_id).all()
    
    grades = {}
    total_weighted_score = 0
    total_weight = 0
    
    for test in tests:
        attempt = ExamAttempt.query.filter_by(
            student_id=current_user_id,
            test_id=test.id
        ).first()
        
        if attempt and attempt.score is not None:
            percentage = (attempt.score / attempt.max_score * 100) if attempt.max_score else 0
            weighted_score = percentage * (test.weight / 100)
            grades[test.name] = {
                'score': attempt.score,
                'max_score': attempt.max_score,
                'percentage': percentage,
                'weight': test.weight
            }
            total_weighted_score += weighted_score
            total_weight += test.weight
    
    final_grade = (total_weighted_score / total_weight * 100) if total_weight > 0 else None
    
    return jsonify({
        'course_id': course_id,
        'course_name': course.name,
        'grades': grades,
        'final_grade': final_grade
    }), 200

# Department Head Routes
@app.route('/api/department-head/statistics', methods=['GET'])
@require_role('department_head')
def get_statistics():
    # Get all courses
    courses = Course.query.all()
    
    course_stats = []
    for course in courses:
        # Get all tests
        tests = Test.query.filter_by(course_id=course.id).all()
        
        # Get all enrolled students
        students = [e.student for e in course.enrollments]
        
        # Calculate course average
        student_final_grades = []
        for student in students:
            total_weighted_score = 0
            total_weight = 0
            
            for test in tests:
                attempt = ExamAttempt.query.filter_by(
                    student_id=student.id,
                    test_id=test.id
                ).first()
                
                if attempt and attempt.score is not None:
                    percentage = (attempt.score / attempt.max_score * 100) if attempt.max_score else 0
                    weighted_score = percentage * (test.weight / 100)
                    total_weighted_score += weighted_score
                    total_weight += test.weight
            
            if total_weight > 0:
                final_grade = (total_weighted_score / total_weight * 100)
                student_final_grades.append(final_grade)
        
        course_average = sum(student_final_grades) / len(student_final_grades) if student_final_grades else 0
        
        course_stats.append({
            'course_id': course.id,
            'course_code': course.code,
            'course_name': course.name,
            'instructor_name': course.instructor.full_name if course.instructor else None,
            'student_count': len(students),
            'course_average': round(course_average, 2)
        })
    
    # Get all students
    all_students = User.query.filter_by(role='student').all()
    
    student_stats = []
    for student in all_students:
        enrollments = Enrollment.query.filter_by(student_id=student.id).all()
        student_averages = []
        
        for enrollment in enrollments:
            course = enrollment.course
            tests = Test.query.filter_by(course_id=course.id).all()
            
            total_weighted_score = 0
            total_weight = 0
            
            for test in tests:
                attempt = ExamAttempt.query.filter_by(
                    student_id=student.id,
                    test_id=test.id
                ).first()
                
                if attempt and attempt.score is not None:
                    percentage = (attempt.score / attempt.max_score * 100) if attempt.max_score else 0
                    weighted_score = percentage * (test.weight / 100)
                    total_weighted_score += weighted_score
                    total_weight += test.weight
            
            if total_weight > 0:
                final_grade = (total_weighted_score / total_weight * 100)
                student_averages.append(final_grade)
        
        overall_average = sum(student_averages) / len(student_averages) if student_averages else 0
        
        student_stats.append({
            'student_id': student.id,
            'student_name': student.full_name,
            'overall_average': round(overall_average, 2)
        })
    
    return jsonify({
        'course_statistics': course_stats,
        'student_statistics': student_stats
    }), 200

# Initialize database
def init_db():
    db.create_all()
    
    # Create default admin user if not exists
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            email='admin@example.com',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            full_name='System Administrator'
        )
        db.session.add(admin)
        db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True, port=5000)

