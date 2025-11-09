import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student',
    full_name: ''
  });

  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    instructor_id: ''
  });

  const [enrollmentForm, setEnrollmentForm] = useState({
    student_id: '',
    course_id: ''
  });

  const [changeInstructorModal, setChangeInstructorModal] = useState({
    show: false,
    course: null,
    newInstructorId: ''
  });

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'courses') loadCourses();
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      const data = await apiRequest('/admin/users');
      setUsers(data);
    } catch (error) {
      alert(error.message);
    }
  };

  const loadCourses = async () => {
    try {
      const data = await apiRequest('/admin/courses');
      setCourses(data);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`"${username}" kullanıcısını silmek istediğinizden emin misiniz?`)) {
      return;
    }
    
    setLoading(true);
    try {
      await apiRequest(`/admin/users/${userId}`, {
        method: 'DELETE'
      });
      loadUsers();
      alert('✅ Kullanıcı başarıyla silindi');
    } catch (error) {
      alert('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeInstructor = async () => {
    if (!changeInstructorModal.newInstructorId) {
      alert('⚠️ Lütfen bir öğretim üyesi seçin');
      return;
    }

    setLoading(true);
    try {
      await apiRequest(`/admin/courses/${changeInstructorModal.course.id}/instructor`, {
        method: 'PUT',
        body: JSON.stringify({
          instructor_id: parseInt(changeInstructorModal.newInstructorId)
        })
      });
      setChangeInstructorModal({ show: false, course: null, newInstructorId: '' });
      loadCourses();
      alert('✅ Öğretim üyesi başarıyla değiştirildi');
    } catch (error) {
      alert('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    if (!confirm(`"${courseName}" dersini silmek istediğinizden emin misiniz?\n\n⚠️ Bu işlem:\n- Derse ait tüm testleri\n- Tüm soruları\n- Tüm sınav sonuçlarını\n- Tüm öğrenci kayıtlarını\nKALICI OLARAK SİLECEKTİR!`)) {
      return;
    }
    
    if (!confirm('⚠️ SON UYARI: Bu işlem geri alınamaz! Devam etmek istediğinizden emin misiniz?')) {
      return;
    }
    
    setLoading(true);
    try {
      await apiRequest(`/admin/courses/${courseId}`, {
        method: 'DELETE'
      });
      loadCourses();
      alert('✅ Ders ve tüm ilişkili veriler başarıyla silindi');
    } catch (error) {
      alert('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Frontend validasyonu
    if (userForm.username.length < 3) {
      alert('⚠️ Kullanıcı adı en az 3 karakter olmalıdır');
      return;
    }
    
    if (userForm.password.length < 6) {
      alert('⚠️ Şifre en az 6 karakter olmalıdır');
      return;
    }
    
    if (!userForm.email.includes('@')) {
      alert('⚠️ Geçerli bir e-posta adresi girin');
      return;
    }
    
    setLoading(true);
    try {
      await apiRequest('/admin/users', {
        method: 'POST',
        body: JSON.stringify(userForm)
      });
      setUserForm({ username: '', email: '', password: '', role: 'student', full_name: '' });
      loadUsers();
      alert('✅ Kullanıcı başarıyla oluşturuldu');
    } catch (error) {
      alert('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/admin/courses', {
        method: 'POST',
        body: JSON.stringify({
          ...courseForm,
          instructor_id: parseInt(courseForm.instructor_id)
        })
      });
      setCourseForm({ code: '', name: '', instructor_id: '' });
      loadCourses();
      alert('Ders oluşturuldu');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEnrollment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          student_id: parseInt(enrollmentForm.student_id),
          course_id: parseInt(enrollmentForm.course_id)
        })
      });
      setEnrollmentForm({ student_id: '', course_id: '' });
      alert('Kayıt oluşturuldu');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const instructors = users.filter(u => u.role === 'instructor');
  const students = users.filter(u => u.role === 'student');

  return React.createElement('div', { className: 'dashboard' },
    React.createElement('header', { className: 'dashboard-header' },
      React.createElement('div', { className: 'dashboard-header-content' },
        React.createElement('img', { src: '/logo.png', alt: 'KOSTÜ', className: 'dashboard-logo' }),
        React.createElement('div', { className: 'dashboard-title' },
          React.createElement('h1', null, 'KOSTÜ Sınav Sistemi'),
          React.createElement('span', { className: 'subtitle' }, 'Admin Paneli')
        )
      ),
      React.createElement('div', { className: 'user-info' },
        React.createElement('span', null, user?.full_name),
        React.createElement('button', { onClick: logout, className: 'btn btn-secondary' }, 'Çıkış')
      )
    ),
    React.createElement('div', { className: 'tabs' },
      React.createElement('button', {
        className: `tab ${activeTab === 'users' ? 'active' : ''}`,
        onClick: () => setActiveTab('users')
      }, 'Kullanıcılar'),
      React.createElement('button', {
        className: `tab ${activeTab === 'courses' ? 'active' : ''}`,
        onClick: () => setActiveTab('courses')
      }, 'Dersler'),
      React.createElement('button', {
        className: `tab ${activeTab === 'enrollments' ? 'active' : ''}`,
        onClick: () => setActiveTab('enrollments')
      }, 'Kayıtlar')
    ),
    React.createElement('div', { className: 'tab-content' },
      activeTab === 'users' && React.createElement('div', null,
        React.createElement('h2', null, 'Kullanıcı Oluştur'),
        React.createElement('form', { onSubmit: handleCreateUser, className: 'form' },
          React.createElement('input', {
            type: 'text',
            placeholder: 'Kullanıcı Adı',
            value: userForm.username,
            onChange: (e) => setUserForm({ ...userForm, username: e.target.value }),
            required: true
          }),
          React.createElement('input', {
            type: 'email',
            placeholder: 'E-posta',
            value: userForm.email,
            onChange: (e) => setUserForm({ ...userForm, email: e.target.value }),
            required: true
          }),
          React.createElement('input', {
            type: 'password',
            placeholder: 'Şifre',
            value: userForm.password,
            onChange: (e) => setUserForm({ ...userForm, password: e.target.value }),
            required: true
          }),
          React.createElement('input', {
            type: 'text',
            placeholder: 'Ad Soyad',
            value: userForm.full_name,
            onChange: (e) => setUserForm({ ...userForm, full_name: e.target.value }),
            required: true
          }),
          React.createElement('select', {
            value: userForm.role,
            onChange: (e) => setUserForm({ ...userForm, role: e.target.value })
          },
            React.createElement('option', { value: 'student' }, 'Öğrenci'),
            React.createElement('option', { value: 'instructor' }, 'Öğretim Üyesi'),
            React.createElement('option', { value: 'department_head' }, 'Bölüm Başkanı')
          ),
          React.createElement('button', { type: 'submit', className: 'btn btn-primary', disabled: loading }, 'Oluştur')
        ),
        React.createElement('h2', null, 'Kullanıcı Listesi'),
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'ID'),
              React.createElement('th', null, 'Kullanıcı Adı'),
              React.createElement('th', null, 'E-posta'),
              React.createElement('th', null, 'Ad Soyad'),
              React.createElement('th', null, 'Rol'),
              React.createElement('th', null, 'İşlemler')
            )
          ),
          React.createElement('tbody', null,
            users.map(u => React.createElement('tr', { key: u.id },
              React.createElement('td', null, u.id),
              React.createElement('td', null, u.username),
              React.createElement('td', null, u.email),
              React.createElement('td', null, u.full_name),
              React.createElement('td', null, u.role),
              React.createElement('td', null,
                u.username !== 'admin' && React.createElement('button', {
                  onClick: () => handleDeleteUser(u.id, u.username),
                  className: 'btn btn-sm',
                  style: { backgroundColor: '#dc3545', color: 'white' },
                  disabled: loading
                }, '🗑️ Sil')
              )
            ))
          )
        )
      ),
      activeTab === 'courses' && React.createElement('div', null,
        React.createElement('h2', null, 'Ders Oluştur'),
        React.createElement('form', { onSubmit: handleCreateCourse, className: 'form' },
          React.createElement('input', {
            type: 'text',
            placeholder: 'Ders Kodu',
            value: courseForm.code,
            onChange: (e) => setCourseForm({ ...courseForm, code: e.target.value }),
            required: true
          }),
          React.createElement('input', {
            type: 'text',
            placeholder: 'Ders Adı',
            value: courseForm.name,
            onChange: (e) => setCourseForm({ ...courseForm, name: e.target.value }),
            required: true
          }),
          React.createElement('select', {
            value: courseForm.instructor_id,
            onChange: (e) => setCourseForm({ ...courseForm, instructor_id: e.target.value }),
            required: true
          },
            React.createElement('option', { value: '' }, 'Öğretim Üyesi Seçin'),
            instructors.map(i => React.createElement('option', { key: i.id, value: i.id }, i.full_name))
          ),
          React.createElement('button', { type: 'submit', className: 'btn btn-primary', disabled: loading }, 'Oluştur')
        ),
        React.createElement('h2', null, 'Ders Listesi'),
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'ID'),
              React.createElement('th', null, 'Ders Kodu'),
              React.createElement('th', null, 'Ders Adı'),
              React.createElement('th', null, 'Öğretim Üyesi'),
              React.createElement('th', null, 'Öğrenci Sayısı'),
              React.createElement('th', null, 'İşlemler')
            )
          ),
          React.createElement('tbody', null,
            courses.map(c => React.createElement('tr', { key: c.id },
              React.createElement('td', null, c.id),
              React.createElement('td', null, c.code),
              React.createElement('td', null, c.name),
              React.createElement('td', null, c.instructor_name),
              React.createElement('td', null, c.student_count),
              React.createElement('td', null,
                React.createElement('div', { style: { display: 'flex', gap: '0.5rem' } },
                  React.createElement('button', {
                    onClick: () => setChangeInstructorModal({ show: true, course: c, newInstructorId: c.instructor_id }),
                    className: 'btn btn-sm',
                    style: { backgroundColor: '#009639', color: 'white' }
                  }, '👨‍🏫 Değiştir'),
                  React.createElement('button', {
                    onClick: () => handleDeleteCourse(c.id, c.name),
                    className: 'btn btn-sm',
                    style: { backgroundColor: '#dc3545', color: 'white' },
                    disabled: loading
                  }, '🗑️ Sil')
                )
              )
            ))
          )
        ),
        changeInstructorModal.show && React.createElement('div', {
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }
        },
          React.createElement('div', {
            style: {
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '10px',
              maxWidth: '500px',
              width: '90%'
            }
          },
            React.createElement('h3', { style: { color: '#009639', marginBottom: '1rem' } }, 
              `"${changeInstructorModal.course?.name}" Dersi - Öğretim Üyesi Değiştir`
            ),
            React.createElement('div', { style: { marginBottom: '1.5rem' } },
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' } }, 
                'Yeni Öğretim Üyesi:'
              ),
              React.createElement('select', {
                value: changeInstructorModal.newInstructorId,
                onChange: (e) => setChangeInstructorModal({ ...changeInstructorModal, newInstructorId: e.target.value }),
                style: { width: '100%', padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }
              },
                React.createElement('option', { value: '' }, 'Seçin...'),
                instructors.map(i => React.createElement('option', { key: i.id, value: i.id }, i.full_name))
              )
            ),
            React.createElement('div', { style: { display: 'flex', gap: '1rem', justifyContent: 'flex-end' } },
              React.createElement('button', {
                onClick: () => setChangeInstructorModal({ show: false, course: null, newInstructorId: '' }),
                className: 'btn btn-secondary',
                disabled: loading
              }, 'İptal'),
              React.createElement('button', {
                onClick: handleChangeInstructor,
                className: 'btn btn-primary',
                disabled: loading
              }, loading ? 'Değiştiriliyor...' : 'Değiştir')
            )
          )
        )
      ),
      activeTab === 'enrollments' && React.createElement('div', null,
        React.createElement('h2', null, 'Öğrenci Kaydı'),
        React.createElement('form', { onSubmit: handleCreateEnrollment, className: 'form' },
          React.createElement('select', {
            value: enrollmentForm.student_id,
            onChange: (e) => setEnrollmentForm({ ...enrollmentForm, student_id: e.target.value }),
            required: true
          },
            React.createElement('option', { value: '' }, 'Öğrenci Seçin'),
            students.map(s => React.createElement('option', { key: s.id, value: s.id }, s.full_name))
          ),
          React.createElement('select', {
            value: enrollmentForm.course_id,
            onChange: (e) => setEnrollmentForm({ ...enrollmentForm, course_id: e.target.value }),
            required: true
          },
            React.createElement('option', { value: '' }, 'Ders Seçin'),
            courses.map(c => React.createElement('option', { key: c.id, value: c.id }, `${c.code} - ${c.name}`))
          ),
          React.createElement('button', { type: 'submit', className: 'btn btn-primary', disabled: loading }, 'Kaydet')
        )
      )
    )
  );
}

export default AdminDashboard;

