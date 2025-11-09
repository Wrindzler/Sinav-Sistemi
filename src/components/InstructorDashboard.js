import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';

function InstructorDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [tests, setTests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultsModal, setResultsModal] = useState({
    show: false,
    data: null
  });

  const [testForm, setTestForm] = useState({
    course_id: '',
    name: '',
    weight: '',
    exam_date: '',
    start_hour: '',
    exam_duration_minutes: 120,
    student_duration_minutes: 10,
    question_count: 5
  });

  const [questionForm, setQuestionForm] = useState({
    test_id: '',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    points: 1.0
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadTests(selectedCourse);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedTest) {
      loadQuestions(selectedTest);
    }
  }, [selectedTest]);

  const loadCourses = async () => {
    try {
      const data = await apiRequest('/instructor/courses');
      setCourses(data);
    } catch (error) {
      alert(error.message);
    }
  };

  const loadTests = async (courseId) => {
    try {
      const data = await apiRequest(`/instructor/tests?course_id=${courseId}`);
      setTests(data);
    } catch (error) {
      alert(error.message);
    }
  };

  const loadQuestions = async (testId) => {
    try {
      const data = await apiRequest(`/instructor/questions?test_id=${testId}`);
      setQuestions(data);
    } catch (error) {
      alert(error.message);
    }
  };

  const calculateEndTime = () => {
    if (!testForm.exam_date || !testForm.start_hour || !testForm.exam_duration_minutes) {
      return '--:--';
    }
    
    try {
      const startDateTime = new Date(`${testForm.exam_date}T${testForm.start_hour}`);
      const endDateTime = new Date(startDateTime.getTime() + testForm.exam_duration_minutes * 60000);
      return endDateTime.toTimeString().substring(0, 5);
    } catch (e) {
      return '--:--';
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      // Tarih ve saati birleştir (Local time olarak)
      const startDateTime = `${testForm.exam_date}T${testForm.start_hour}:00`;
      
      // Bitiş saatini hesapla (Local time olarak)
      const startDate = new Date(`${testForm.exam_date}T${testForm.start_hour}`);
      const endDate = new Date(startDate.getTime() + testForm.exam_duration_minutes * 60000);
      
      // Local time formatında string oluştur (UTC'ye çevirmeden)
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      const hours = String(endDate.getHours()).padStart(2, '0');
      const minutes = String(endDate.getMinutes()).padStart(2, '0');
      const endDateTime = `${year}-${month}-${day}T${hours}:${minutes}:00`;
      
      const response = await apiRequest('/instructor/tests', {
        method: 'POST',
        body: JSON.stringify({
          course_id: parseInt(testForm.course_id),
          name: testForm.name,
          weight: parseFloat(testForm.weight),
          start_time: startDateTime,
          end_time: endDateTime,
          duration_minutes: parseInt(testForm.student_duration_minutes),
          question_count: parseInt(testForm.question_count)
        })
      });
      
      setTestForm({ 
        course_id: '', 
        name: '', 
        weight: '', 
        exam_date: '', 
        start_hour: '', 
        exam_duration_minutes: 120,
        student_duration_minutes: 10,
        question_count: 5
      });
      
      // Testleri yeniden yükle
      await loadTests(selectedCourse);
      
      // Oluşturulan testi seç ve soru ekleme ekranına geç
      setSelectedTest(response.id);
      setQuestionForm({ ...questionForm, test_id: response.id });
      setActiveTab('questions');
      
      alert('✅ Test başarıyla oluşturuldu! Şimdi sorularını ekleyin.');
    } catch (error) {
      alert('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest('/instructor/questions', {
        method: 'POST',
        body: JSON.stringify({
          ...questionForm,
          test_id: parseInt(questionForm.test_id),
          points: parseFloat(questionForm.points)
        })
      });
      setQuestionForm({
        test_id: questionForm.test_id, // Test ID'yi koru
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        points: 1.0
      });
      loadQuestions(selectedTest);
      alert('✅ Soru başarıyla eklendi! Toplam soru: ' + (questions.length + 1));
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId, questionText) => {
    if (!confirm(`Bu soruyu silmek istediğinizden emin misiniz?\n\n"${questionText.substring(0, 50)}..."`)) {
      return;
    }
    
    setLoading(true);
    try {
      await apiRequest(`/instructor/questions/${questionId}`, {
        method: 'DELETE'
      });
      loadQuestions(selectedTest);
      alert('✅ Soru başarıyla silindi');
    } catch (error) {
      alert('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId, testName) => {
    if (!confirm(`"${testName}" testini silmek istediğinizden emin misiniz?\n\n⚠️ Bu işlem:\n- Tüm soruları\n- Tüm sınav sonuçlarını\nKALICI OLARAK SİLECEKTİR!`)) {
      return;
    }
    
    setLoading(true);
    try {
      await apiRequest(`/instructor/tests/${testId}`, {
        method: 'DELETE'
      });
      loadTests(selectedCourse);
      if (selectedTest === testId) {
        setSelectedTest(null);
      }
      alert('✅ Test başarıyla silindi');
    } catch (error) {
      alert('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = async (testId) => {
    setLoading(true);
    try {
      const data = await apiRequest(`/instructor/tests/${testId}/results`);
      setResultsModal({ show: true, data: data });
    } catch (error) {
      alert('❌ ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return React.createElement('div', { className: 'dashboard' },
    React.createElement('header', { className: 'dashboard-header' },
      React.createElement('div', { className: 'dashboard-header-content' },
        React.createElement('img', { src: '/logo.png', alt: 'KOSTÜ', className: 'dashboard-logo' }),
        React.createElement('div', { className: 'dashboard-title' },
          React.createElement('h1', null, 'KOSTÜ Sınav Sistemi'),
          React.createElement('span', { className: 'subtitle' }, 'Öğretim Üyesi Paneli')
        )
      ),
      React.createElement('div', { className: 'user-info' },
        React.createElement('span', null, user?.full_name),
        React.createElement('button', { onClick: logout, className: 'btn btn-secondary' }, 'Çıkış')
      )
    ),
    React.createElement('div', { className: 'tabs' },
      React.createElement('button', {
        className: `tab ${activeTab === 'courses' ? 'active' : ''}`,
        onClick: () => setActiveTab('courses')
      }, 'Derslerim'),
      React.createElement('button', {
        className: `tab ${activeTab === 'tests' ? 'active' : ''}`,
        onClick: () => setActiveTab('tests')
      }, 'Testler'),
      React.createElement('button', {
        className: `tab ${activeTab === 'questions' ? 'active' : ''}`,
        onClick: () => setActiveTab('questions')
      }, 'Sorular')
    ),
    React.createElement('div', { className: 'tab-content' },
      activeTab === 'courses' && React.createElement('div', null,
        React.createElement('h2', null, 'Derslerim'),
        React.createElement('div', { className: 'card-grid' },
          courses.map(course => React.createElement('div', { key: course.id, className: 'card' },
            React.createElement('h3', null, course.code),
            React.createElement('p', null, course.name),
            React.createElement('p', null, `Öğrenci Sayısı: ${course.student_count}`),
            React.createElement('p', null, `Test Sayısı: ${course.test_count}`),
            React.createElement('button', {
              className: 'btn btn-primary',
              onClick: () => {
                setSelectedCourse(course.id);
                setActiveTab('tests');
              }
            }, 'Testleri Görüntüle')
          ))
        )
      ),
      activeTab === 'tests' && React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' } },
          React.createElement('h2', { style: { margin: 0 } }, 'Test Oluştur'),
          React.createElement('span', { 
            style: { 
              padding: '0.5rem 1rem', 
              backgroundColor: '#e6f7ed', 
              borderRadius: '5px',
              color: '#009639',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            } 
          }, '📝 Her ders için Vize (%40) ve Final (%60) oluşturun')
        ),
        React.createElement('form', { onSubmit: handleCreateTest, className: 'form', style: { backgroundColor: '#f8f9fa' } },
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' } },
            React.createElement('div', null,
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#009639' } }, 
                '📚 Ders Seçin:'
              ),
              React.createElement('select', {
                value: testForm.course_id,
                onChange: (e) => setTestForm({ ...testForm, course_id: e.target.value }),
                required: true,
                style: { width: '100%' }
              },
                React.createElement('option', { value: '' }, 'Ders seçin...'),
                courses.map(c => React.createElement('option', { key: c.id, value: c.id }, `${c.code} - ${c.name}`))
              )
            ),
            React.createElement('div', null,
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#009639' } }, 
                '📝 Test Türü:'
              ),
              React.createElement('select', {
                value: testForm.name,
                onChange: (e) => {
                  const newName = e.target.value;
                  const newWeight = newName === 'Vize' ? 40 : newName === 'Final' ? 60 : '';
                  setTestForm({ ...testForm, name: newName, weight: newWeight });
                },
                required: true,
                style: { width: '100%' }
              },
                React.createElement('option', { value: '' }, 'Seçin...'),
                React.createElement('option', { value: 'Vize' }, '📘 Vize (Otomatik %40)'),
                React.createElement('option', { value: 'Final' }, '📕 Final (Otomatik %60)')
              )
            ),
            React.createElement('div', null,
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#009639' } }, 
                '⚖️ Ağırlık (%):'
              ),
              React.createElement('input', {
                type: 'number',
                placeholder: '40',
                value: testForm.weight,
                onChange: (e) => setTestForm({ ...testForm, weight: e.target.value }),
                min: 0,
                max: 100,
                required: true,
                style: { width: '100%', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center' }
              })
            )
          ),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' } },
            React.createElement('div', null,
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#009639' } }, '📅 Sınav Tarihi'),
              React.createElement('input', {
                type: 'date',
                value: testForm.exam_date,
                onChange: (e) => setTestForm({ ...testForm, exam_date: e.target.value }),
                required: true,
                style: { width: '100%' }
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#009639' } }, '🕐 Başlangıç Saati'),
              React.createElement('input', {
                type: 'time',
                value: testForm.start_hour,
                onChange: (e) => setTestForm({ ...testForm, start_hour: e.target.value }),
                required: true,
                style: { width: '100%' }
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#009639' } }, '⏱️ Sınav Süresi (dk)'),
              React.createElement('input', {
                type: 'number',
                value: testForm.exam_duration_minutes,
                onChange: (e) => setTestForm({ ...testForm, exam_duration_minutes: parseInt(e.target.value) || 0 }),
                min: 1,
                required: true,
                placeholder: '120',
                style: { width: '100%' }
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#666' } }, '🏁 Bitiş Saati'),
              React.createElement('input', {
                type: 'text',
                value: calculateEndTime(),
                disabled: true,
                style: { width: '100%', backgroundColor: '#e6f7ed', fontWeight: 'bold', color: '#009639' }
              })
            )
          ),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' } },
            React.createElement('div', { style: { padding: '1rem', backgroundColor: '#e6f7ed', borderRadius: '8px', border: '2px solid #009639' } },
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#009639' } }, 
                '📝 Kaç Soru Sorulsun?'
              ),
              React.createElement('input', {
                type: 'number',
                value: testForm.question_count,
                onChange: (e) => setTestForm({ ...testForm, question_count: parseInt(e.target.value) || 0 }),
                min: 1,
                max: 50,
                required: true,
                style: { width: '100%', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center', padding: '0.75rem' }
              }),
              React.createElement('p', { style: { marginTop: '0.5rem', fontSize: '0.85rem', color: '#666', marginBottom: 0 } }, 
                '💡 Soru havuzundan rastgele seçilir'
              )
            ),
            React.createElement('div', { style: { padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px', border: '2px solid #ffc107' } },
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#856404' } }, 
                '⏱️ Öğrenci Sınav Süresi'
              ),
              React.createElement('input', {
                type: 'number',
                value: testForm.student_duration_minutes,
                onChange: (e) => setTestForm({ ...testForm, student_duration_minutes: parseInt(e.target.value) || 0 }),
                min: 1,
                max: 120,
                required: true,
                style: { width: '100%', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center', padding: '0.75rem' }
              }),
              React.createElement('p', { style: { marginTop: '0.5rem', fontSize: '0.85rem', color: '#666', marginBottom: 0 } }, 
                '⏰ Her öğrenciye verilen süre (dakika)'
              )
            )
          ),
          React.createElement('button', { type: 'submit', className: 'btn btn-primary', disabled: loading }, 'Oluştur')
        ),
        selectedCourse && React.createElement('div', { style: { marginTop: '2rem' } },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' } },
            React.createElement('h2', { style: { margin: 0 } }, '📋 Testler'),
            tests.length > 0 && React.createElement('div', { style: { color: '#666', fontSize: '0.9rem' } },
              `Toplam ${tests.length} test • Toplam ağırlık: %${tests.reduce((sum, t) => sum + t.weight, 0)}`
            )
          ),
          React.createElement('table', { className: 'data-table' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Test Adı'),
                React.createElement('th', null, 'Ağırlık'),
                React.createElement('th', null, 'Başlangıç'),
                React.createElement('th', null, 'Bitiş'),
                React.createElement('th', null, 'Soru Havuzu'),
                React.createElement('th', null, 'İşlemler')
              )
            ),
            React.createElement('tbody', null,
              tests.map(t => React.createElement('tr', { key: t.id },
                React.createElement('td', null, t.name),
                React.createElement('td', null, `%${t.weight}`),
                React.createElement('td', null, new Date(t.start_time).toLocaleString('tr-TR')),
                React.createElement('td', null, new Date(t.end_time).toLocaleString('tr-TR')),
                React.createElement('td', { 
                  style: { 
                    fontWeight: 'bold',
                    color: t.question_pool_count >= t.question_count ? '#28a745' : '#dc3545'
                  } 
                }, 
                  `${t.question_pool_count || 0}/${t.question_count} soru`
                ),
                React.createElement('td', null,
                  React.createElement('div', { style: { display: 'flex', gap: '0.5rem' } },
                    React.createElement('button', {
                      className: 'btn btn-sm',
                      onClick: () => {
                        setSelectedTest(t.id);
                        setQuestionForm({ ...questionForm, test_id: t.id });
                        setActiveTab('questions');
                      },
                      style: { backgroundColor: '#009639', color: 'white' }
                    }, '➕ Sorular'),
                    React.createElement('button', {
                      className: 'btn btn-sm',
                      onClick: () => handleViewResults(t.id),
                      style: { backgroundColor: '#17a2b8', color: 'white' }
                    }, '📊 Sonuçlar'),
                    React.createElement('button', {
                      className: 'btn btn-sm',
                      onClick: () => handleDeleteTest(t.id, t.name),
                      style: { backgroundColor: '#dc3545', color: 'white' },
                      disabled: loading
                    }, '🗑️ Sil')
                  )
                )
              ))
            )
          )
        )
      ),
      activeTab === 'questions' && React.createElement('div', null,
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' } },
          React.createElement('h2', { style: { margin: 0 } }, 'Soru Ekle'),
          selectedTest && questions.length > 0 && React.createElement('div', { 
            style: { 
              padding: '0.75rem 1.5rem', 
              backgroundColor: '#e6f7ed',
              border: '2px solid #009639',
              borderRadius: '8px',
              fontWeight: 'bold'
            } 
          },
            React.createElement('span', { style: { fontSize: '1.1rem', color: '#009639' } },
              `📚 Soru Havuzu: ${questions.length} soru • Sınavda Sorulacak: ${tests.find(t => t.id === selectedTest)?.question_count || 5} soru`
            )
          )
        ),
        !selectedTest && React.createElement('div', { 
          style: { 
            padding: '2rem', 
            textAlign: 'center', 
            backgroundColor: '#e6f7ed', 
            borderRadius: '10px',
            border: '2px dashed #009639'
          } 
        },
          React.createElement('p', { style: { fontSize: '1.2rem', color: '#009639', marginBottom: '1rem' } }, 
            '👆 Önce "Testler" sekmesinden bir test seçin'
          ),
          React.createElement('button', {
            onClick: () => setActiveTab('tests'),
            className: 'btn btn-primary'
          }, 'Testlere Git')
        ),
        selectedTest && React.createElement('form', { onSubmit: handleCreateQuestion, className: 'form' },
          React.createElement('select', {
            value: questionForm.test_id,
            onChange: (e) => setQuestionForm({ ...questionForm, test_id: e.target.value }),
            required: true
          },
            React.createElement('option', { value: '' }, 'Test Seçin'),
            tests.map(t => React.createElement('option', { key: t.id, value: t.id }, `${t.course_name} - ${t.name}`))
          ),
          React.createElement('div', { style: { marginBottom: '1rem' } },
            React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#009639' } }, 
              '❓ Soru Metni:'
            ),
            React.createElement('textarea', {
              placeholder: 'Soruyu buraya yazın...',
              value: questionForm.question_text,
              onChange: (e) => setQuestionForm({ ...questionForm, question_text: e.target.value }),
              rows: 4,
              required: true,
              style: { fontSize: '1rem' }
            })
          ),
          React.createElement('div', { 
            style: { 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '2px solid #e0e0e0'
            } 
          },
            React.createElement('div', null,
              React.createElement('label', { 
                style: { 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold',
                  color: questionForm.correct_answer === 'A' ? '#009639' : '#666'
                } 
              }, 
                questionForm.correct_answer === 'A' ? '✅ A) Şıkkı (DOĞRU CEVAP)' : '⭕ A) Şıkkı'
              ),
              React.createElement('input', {
                type: 'text',
                placeholder: 'A şıkkını yazın',
                value: questionForm.option_a,
                onChange: (e) => setQuestionForm({ ...questionForm, option_a: e.target.value }),
                required: true,
                style: { 
                  borderColor: questionForm.correct_answer === 'A' ? '#28a745' : '#ddd',
                  borderWidth: questionForm.correct_answer === 'A' ? '2px' : '1px',
                  backgroundColor: questionForm.correct_answer === 'A' ? '#d4edda' : 'white'
                }
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { 
                style: { 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold',
                  color: questionForm.correct_answer === 'B' ? '#009639' : '#666'
                } 
              }, 
                questionForm.correct_answer === 'B' ? '✅ B) Şıkkı (DOĞRU CEVAP)' : '⭕ B) Şıkkı'
              ),
              React.createElement('input', {
                type: 'text',
                placeholder: 'B şıkkını yazın',
                value: questionForm.option_b,
                onChange: (e) => setQuestionForm({ ...questionForm, option_b: e.target.value }),
                required: true,
                style: { 
                  borderColor: questionForm.correct_answer === 'B' ? '#28a745' : '#ddd',
                  borderWidth: questionForm.correct_answer === 'B' ? '2px' : '1px',
                  backgroundColor: questionForm.correct_answer === 'B' ? '#d4edda' : 'white'
                }
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { 
                style: { 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold',
                  color: questionForm.correct_answer === 'C' ? '#009639' : '#666'
                } 
              }, 
                questionForm.correct_answer === 'C' ? '✅ C) Şıkkı (DOĞRU CEVAP)' : '⭕ C) Şıkkı'
              ),
              React.createElement('input', {
                type: 'text',
                placeholder: 'C şıkkını yazın',
                value: questionForm.option_c,
                onChange: (e) => setQuestionForm({ ...questionForm, option_c: e.target.value }),
                required: true,
                style: { 
                  borderColor: questionForm.correct_answer === 'C' ? '#28a745' : '#ddd',
                  borderWidth: questionForm.correct_answer === 'C' ? '2px' : '1px',
                  backgroundColor: questionForm.correct_answer === 'C' ? '#d4edda' : 'white'
                }
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { 
                style: { 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 'bold',
                  color: questionForm.correct_answer === 'D' ? '#009639' : '#666'
                } 
              }, 
                questionForm.correct_answer === 'D' ? '✅ D) Şıkkı (DOĞRU CEVAP)' : '⭕ D) Şıkkı'
              ),
              React.createElement('input', {
                type: 'text',
                placeholder: 'D şıkkını yazın',
                value: questionForm.option_d,
                onChange: (e) => setQuestionForm({ ...questionForm, option_d: e.target.value }),
                required: true,
                style: { 
                  borderColor: questionForm.correct_answer === 'D' ? '#28a745' : '#ddd',
                  borderWidth: questionForm.correct_answer === 'D' ? '2px' : '1px',
                  backgroundColor: questionForm.correct_answer === 'D' ? '#d4edda' : 'white'
                }
              })
            )
          ),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginTop: '1rem' } },
            React.createElement('div', null,
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#009639' } }, 
                '✅ Doğru Cevap:'
              ),
              React.createElement('div', { 
                style: { 
                  display: 'flex', 
                  gap: '0.5rem', 
                  padding: '0.75rem',
                  backgroundColor: '#e6f7ed',
                  borderRadius: '8px',
                  border: '2px solid #009639'
                } 
              },
                ['A', 'B', 'C', 'D'].map(option =>
                  React.createElement('label', {
                    key: option,
                    style: {
                      flex: 1,
                      padding: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: questionForm.correct_answer === option ? '#009639' : 'white',
                      color: questionForm.correct_answer === option ? 'white' : '#333',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.3s',
                      border: '2px solid ' + (questionForm.correct_answer === option ? '#009639' : '#ddd')
                    }
                  },
                    React.createElement('input', {
                      type: 'radio',
                      name: 'correct_answer',
                      value: option,
                      checked: questionForm.correct_answer === option,
                      onChange: (e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value }),
                      style: { display: 'none' }
                    }),
                    option
                  )
                )
              )
            ),
            React.createElement('div', null,
              React.createElement('label', { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#009639' } }, 
                '🎯 Puan Değeri:'
              ),
              React.createElement('input', {
                type: 'number',
                placeholder: 'Puan',
                value: questionForm.points,
                onChange: (e) => setQuestionForm({ ...questionForm, points: e.target.value }),
                min: 0,
                step: 0.5,
                required: true,
                style: { fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center' }
              })
            )
          ),
          React.createElement('button', { 
            type: 'submit', 
            className: 'btn btn-primary', 
            disabled: loading,
            style: { fontSize: '1.1rem', padding: '1rem', marginTop: '0.5rem' }
          }, loading ? 'Ekleniyor...' : '➕ Soru Ekle')
        ),
        selectedTest && questions.length > 0 && React.createElement('div', { style: { marginTop: '2rem' } },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' } },
            React.createElement('h2', { style: { margin: 0 } }, '📝 Eklenen Sorular'),
            React.createElement('div', { style: { color: '#666', fontSize: '0.9rem' } },
              `${questions.length} soru • Toplam ${questions.reduce((sum, q) => sum + q.points, 0)} puan`
            )
          ),
          React.createElement('div', { className: 'questions-list' },
            questions.map((q, index) => React.createElement('div', { key: q.id, className: 'question-card' },
              React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' } },
                React.createElement('h3', { style: { margin: 0, color: '#009639' } }, `Soru ${index + 1}`),
                React.createElement('div', { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' } },
                  React.createElement('span', { 
                    style: { 
                      backgroundColor: '#009639', 
                      color: 'white', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    } 
                  }, `${q.points} Puan`),
                  React.createElement('button', {
                    onClick: () => handleDeleteQuestion(q.id, q.question_text),
                    className: 'btn btn-sm',
                    style: { 
                      backgroundColor: '#dc3545', 
                      color: 'white',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.85rem'
                    },
                    disabled: loading
                  }, '🗑️ Sil')
                )
              ),
              React.createElement('p', { className: 'question-text', style: { fontSize: '1.05rem', marginBottom: '1rem' } }, q.question_text),
              React.createElement('div', { 
                style: { 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                } 
              },
                React.createElement('div', { 
                  className: q.correct_answer === 'A' ? 'option correct' : 'option',
                  style: { 
                    padding: '0.75rem',
                    borderRadius: '5px',
                    border: q.correct_answer === 'A' ? '2px solid #28a745' : '1px solid #e0e0e0',
                    backgroundColor: q.correct_answer === 'A' ? '#d4edda' : '#f8f9fa'
                  }
                }, 
                  React.createElement('strong', null, q.correct_answer === 'A' ? '✅ A) ' : 'A) '), 
                  q.option_a
                ),
                React.createElement('div', { 
                  className: q.correct_answer === 'B' ? 'option correct' : 'option',
                  style: { 
                    padding: '0.75rem',
                    borderRadius: '5px',
                    border: q.correct_answer === 'B' ? '2px solid #28a745' : '1px solid #e0e0e0',
                    backgroundColor: q.correct_answer === 'B' ? '#d4edda' : '#f8f9fa'
                  }
                }, 
                  React.createElement('strong', null, q.correct_answer === 'B' ? '✅ B) ' : 'B) '), 
                  q.option_b
                ),
                React.createElement('div', { 
                  className: q.correct_answer === 'C' ? 'option correct' : 'option',
                  style: { 
                    padding: '0.75rem',
                    borderRadius: '5px',
                    border: q.correct_answer === 'C' ? '2px solid #28a745' : '1px solid #e0e0e0',
                    backgroundColor: q.correct_answer === 'C' ? '#d4edda' : '#f8f9fa'
                  }
                }, 
                  React.createElement('strong', null, q.correct_answer === 'C' ? '✅ C) ' : 'C) '), 
                  q.option_c
                ),
                React.createElement('div', { 
                  className: q.correct_answer === 'D' ? 'option correct' : 'option',
                  style: { 
                    padding: '0.75rem',
                    borderRadius: '5px',
                    border: q.correct_answer === 'D' ? '2px solid #28a745' : '1px solid #e0e0e0',
                    backgroundColor: q.correct_answer === 'D' ? '#d4edda' : '#f8f9fa'
                  }
                }, 
                  React.createElement('strong', null, q.correct_answer === 'D' ? '✅ D) ' : 'D) '), 
                  q.option_d
                )
              )
            ))
          )
        )
      )
    ),
    resultsModal.show && React.createElement('div', {
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem'
      },
      onClick: () => setResultsModal({ show: false, data: null })
    },
      React.createElement('div', {
        style: {
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        },
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('div', {
          style: {
            background: 'linear-gradient(135deg, #009639 0%, #006b28 100%)',
            color: 'white',
            padding: '1.5rem 2rem',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }
        },
          React.createElement('div', null,
            React.createElement('h2', { style: { margin: 0, marginBottom: '0.5rem' } }, 
              `📊 ${resultsModal.data?.test_name} - Sonuçlar`
            ),
            React.createElement('p', { style: { margin: 0, opacity: 0.9, fontSize: '0.95rem' } },
              `${resultsModal.data?.results.length || 0} öğrenci sınava katıldı`
            )
          ),
          React.createElement('button', {
            onClick: () => setResultsModal({ show: false, data: null }),
            style: {
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '1.5rem',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }
          }, '✖')
        ),
        React.createElement('div', { style: { padding: '2rem' } },
          React.createElement('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1.5rem',
              marginBottom: '2rem'
            }
          },
            React.createElement('div', {
              style: {
                padding: '2rem',
                backgroundColor: '#e6f7ed',
                borderRadius: '10px',
                textAlign: 'center',
                border: '3px solid #009639'
              }
            },
              React.createElement('div', { style: { fontSize: '3rem', marginBottom: '0.5rem' } }, '📊'),
              React.createElement('div', { style: { fontSize: '3rem', fontWeight: 'bold', color: '#009639' } },
                resultsModal.data?.average_score.toFixed(1) || '0'
              ),
              React.createElement('div', { style: { fontSize: '1rem', color: '#666', marginTop: '0.25rem' } },
                `/ ${resultsModal.data?.results[0]?.max_score || 100}`
              ),
              React.createElement('div', { style: { marginTop: '0.75rem', fontSize: '1.1rem', fontWeight: 'bold', color: '#009639' } },
                'Sınıf Ortalaması'
              )
            ),
            React.createElement('div', {
              style: {
                padding: '2rem',
                backgroundColor: '#d4edda',
                borderRadius: '10px',
                textAlign: 'center',
                border: '3px solid #28a745'
              }
            },
              React.createElement('div', { style: { fontSize: '3rem', marginBottom: '0.5rem' } }, '👨‍🎓'),
              React.createElement('div', { style: { fontSize: '3rem', fontWeight: 'bold', color: '#28a745' } },
                resultsModal.data?.results.length || 0
              ),
              React.createElement('div', { style: { marginTop: '0.75rem', fontSize: '1.1rem', fontWeight: 'bold', color: '#155724' } },
                'Katılan Öğrenci'
              )
            )
          ),
          React.createElement('h3', { style: { marginBottom: '1rem', color: '#009639' } }, '🎓 Öğrenci Sonuçları'),
          React.createElement('div', { style: { overflowX: 'auto' } },
            React.createElement('table', { className: 'data-table' },
              React.createElement('thead', null,
                React.createElement('tr', null,
                  React.createElement('th', null, '#'),
                  React.createElement('th', null, 'Öğrenci Adı'),
                  React.createElement('th', null, 'Puan')
                )
              ),
              React.createElement('tbody', null,
                resultsModal.data?.results
                  .sort((a, b) => b.score - a.score)
                  .map((r, index) => React.createElement('tr', { 
                    key: r.student_id,
                    style: {
                      backgroundColor: r.percentage >= 50 ? '#d4edda' : '#fff'
                    }
                  },
                    React.createElement('td', { style: { fontWeight: 'bold' } }, index + 1),
                    React.createElement('td', { 
                      style: { 
                        fontWeight: r.percentage >= 50 ? 'bold' : 'normal',
                        color: r.percentage >= 50 ? '#155724' : '#333'
                      } 
                    }, r.student_name),
                    React.createElement('td', { 
                      style: { 
                        fontWeight: 'bold', 
                        fontSize: '1.2rem',
                        color: r.percentage >= 50 ? '#28a745' : '#dc3545'
                      } 
                    },
                      `${r.score.toFixed(1)} / ${r.max_score}`
                    )
                  ))
              )
            )
          )
        )
      )
    )
  );
}

export default InstructorDashboard;

