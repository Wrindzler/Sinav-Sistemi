import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';

function StudentDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [tests, setTests] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const answersRef = useRef({});
  const currentTestRef = useRef(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    loadCourses();
    loadTests();
  }, []);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    currentTestRef.current = currentTest;
    submittedRef.current = false;
  }, [currentTest]);

  const loadCourses = async () => {
    try {
      const data = await apiRequest('/student/courses');
      setCourses(data);
    } catch (error) {
      alert(error.message);
    }
  };

  const loadTests = async () => {
    try {
      const data = await apiRequest('/student/tests');
      setTests(data);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleStartTest = async (testId) => {
    try {
      const data = await apiRequest(`/student/tests/${testId}/start`, { method: 'POST' });
      setCurrentTest(data);
      setAnswers({});
      setTimeLeft(data.duration_minutes * 60);
      setResult(null);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = useCallback(async () => {
    const test = currentTestRef.current;
    const currentAnswers = answersRef.current;
    
    if (!test || submittedRef.current) return;
    
    submittedRef.current = true;
    setLoading(true);
    try {
      const data = await apiRequest(`/student/tests/${test.test_id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: currentAnswers })
      });
      setResult(data);
      setCurrentTest(null);
      setAnswers({});
      setTimeLeft(0);
      loadTests();
    } catch (error) {
      alert(error.message);
      submittedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAutoSubmit = useCallback(async () => {
    await handleSubmit();
  }, [handleSubmit]);

  // Timer useEffect - handleAutoSubmit'ten sonra tanimlanmali
  useEffect(() => {
    if (currentTest && timeLeft > 0 && !submittedRef.current) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1 && !submittedRef.current) {
            submittedRef.current = true;
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentTest, timeLeft, handleAutoSubmit]);

  const handleViewResult = async (testId) => {
    try {
      const data = await apiRequest(`/student/tests/${testId}/result`);
      setResult(data);
      setActiveTab('result');
    } catch (error) {
      alert(error.message);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const availableTests = tests.filter(t => t.status === 'available' && !t.has_attempt);
  const upcomingTests = tests.filter(t => t.status === 'upcoming');
  const completedTests = tests.filter(t => t.status === 'completed');

  return React.createElement('div', { className: 'dashboard' },
    React.createElement('header', { className: 'dashboard-header' },
      React.createElement('div', { className: 'dashboard-header-content' },
        React.createElement('img', { src: '/logo.png', alt: 'KOSTÜ', className: 'dashboard-logo' }),
        React.createElement('div', { className: 'dashboard-title' },
          React.createElement('h1', null, 'KOSTÜ Sınav Sistemi'),
          React.createElement('span', { className: 'subtitle' }, 'Öğrenci Paneli')
        )
      ),
      React.createElement('div', { className: 'user-info' },
        React.createElement('span', null, user?.full_name),
        React.createElement('button', { onClick: logout, className: 'btn btn-secondary' }, 'Çıkış')
      )
    ),
    currentTest ? React.createElement('div', { className: 'exam-container' },
      React.createElement('div', { className: 'exam-header' },
        React.createElement('h2', null, currentTest.test_name),
        React.createElement('div', { className: `timer ${timeLeft < 60 ? 'warning' : ''}` },
          `Kalan Süre: ${formatTime(timeLeft)}`
        )
      ),
      React.createElement('div', { className: 'exam-questions' },
        currentTest.questions.map((q, idx) => React.createElement('div', { key: q.id, className: 'question-card' },
          React.createElement('h3', null, `Soru ${idx + 1}`),
          React.createElement('p', { className: 'question-text' }, q.question_text),
          React.createElement('div', { className: 'options' },
            ['A', 'B', 'C', 'D'].map(opt => React.createElement('label', { key: opt, className: 'option-label' },
              React.createElement('input', {
                type: 'radio',
                name: `question-${q.id}`,
                value: opt,
                checked: answers[q.id] === opt,
                onChange: (e) => handleAnswerChange(q.id, e.target.value)
              }),
              React.createElement('span', null, `${opt}) ${q[`option_${opt.toLowerCase()}`]}`)
            ))
          )
        ))
      ),
      React.createElement('div', { className: 'exam-footer' },
        React.createElement('button', {
          className: 'btn btn-primary',
          onClick: handleSubmit,
          disabled: loading
        }, 'Sınavı Bitir')
      )
    ) : React.createElement(React.Fragment, null,
      React.createElement('div', { className: 'tabs' },
        React.createElement('button', {
          className: `tab ${activeTab === 'courses' ? 'active' : ''}`,
          onClick: () => setActiveTab('courses')
        }, 'Derslerim'),
        React.createElement('button', {
          className: `tab ${activeTab === 'tests' ? 'active' : ''}`,
          onClick: () => setActiveTab('tests')
        }, 'Sınavlar'),
        React.createElement('button', {
          className: `tab ${activeTab === 'result' ? 'active' : ''}`,
          onClick: () => setActiveTab('result')
        }, 'Sonuçlar')
      ),
      React.createElement('div', { className: 'tab-content' },
        activeTab === 'courses' && React.createElement('div', null,
          React.createElement('h2', null, 'Derslerim'),
          courses.length === 0 ? React.createElement('div', { className: 'empty-state' },
            React.createElement('p', null, '📚 Henüz hiçbir derse kayıtlı değilsiniz.'),
            React.createElement('p', null, 'Lütfen sistem yöneticisi ile iletişime geçin.')
          ) : React.createElement('div', { className: 'card-grid' },
            courses.map(course => React.createElement('div', { key: course.id, className: 'card' },
              React.createElement('h3', null, course.code),
              React.createElement('p', null, course.name),
              React.createElement('p', null, `Öğretim Üyesi: ${course.instructor_name}`),
              React.createElement('p', null, `Test Sayısı: ${course.test_count}`)
            ))
          )
        ),
        activeTab === 'tests' && React.createElement('div', null,
          React.createElement('h2', null, 'Sınavlarım'),
          tests.length === 0 ? React.createElement('div', { className: 'empty-state' },
            React.createElement('p', null, '📝 Henüz hiçbir sınav bulunmuyor.'),
            React.createElement('p', null, 'Öğretim üyeleri henüz test oluşturmamış.')
          ) : React.createElement(React.Fragment, null,
          availableTests.length > 0 && React.createElement('div', null,
            React.createElement('h2', null, 'Mevcut Sınavlar'),
            React.createElement('div', { className: 'test-list' },
              availableTests.map(test => React.createElement('div', { key: test.id, className: 'test-card' },
                React.createElement('h3', null, `${test.course_name} - ${test.name}`),
                React.createElement('p', null, `Başlangıç: ${new Date(test.start_time).toLocaleString('tr-TR')}`),
                React.createElement('p', null, `Bitiş: ${new Date(test.end_time).toLocaleString('tr-TR')}`),
                React.createElement('p', null, `Süre: ${test.duration_minutes} dakika`),
                React.createElement('button', {
                  className: 'btn btn-primary',
                  onClick: () => handleStartTest(test.id)
                }, 'Sınava Başla')
              ))
            )
          ),
          upcomingTests.length > 0 && React.createElement('div', null,
            React.createElement('h2', null, 'Yaklaşan Sınavlar'),
            React.createElement('div', { className: 'test-list' },
              upcomingTests.map(test => React.createElement('div', { key: test.id, className: 'test-card' },
                React.createElement('h3', null, `${test.course_name} - ${test.name}`),
                React.createElement('p', null, `Başlangıç: ${new Date(test.start_time).toLocaleString('tr-TR')}`),
                React.createElement('p', null, `Bitiş: ${new Date(test.end_time).toLocaleString('tr-TR')}`)
              ))
            )
          ),
          completedTests.length > 0 && React.createElement('div', null,
            React.createElement('h2', null, 'Tamamlanan Sınavlar'),
            React.createElement('div', { className: 'test-list' },
              completedTests.map(test => React.createElement('div', { key: test.id, className: 'test-card' },
                React.createElement('h3', null, `${test.course_name} - ${test.name}`),
                React.createElement('p', null, `Puan: ${test.score !== null && test.score !== undefined ? test.score : 'Henüz değerlendirilmedi'}`),
                React.createElement('button', {
                  className: 'btn btn-secondary',
                  onClick: () => handleViewResult(test.id)
                }, 'Detayları Görüntüle')
              ))
            )
          ))
        ),
        activeTab === 'result' && React.createElement('div', null,
          React.createElement('h2', null, 'Sonuçlar'),
          !result ? React.createElement('div', { className: 'empty-state' },
            React.createElement('p', null, '🎯 Henüz sonuç görüntülenmedi.'),
            React.createElement('p', null, 'Tamamlanan sınavlardan birinin detaylarına tıklayın.')
          ) : React.createElement('div', { className: 'result-container' },
          React.createElement('h2', null, 'Sınav Sonucu'),
          React.createElement('div', { className: 'result-card' },
            React.createElement('h3', null, result.test_name),
            React.createElement('p', { className: 'score' }, `Puanınız: ${result.score} / ${result.max_score}`),
            React.createElement('p', { className: 'percentage' }, `Yüzde: %${result.percentage.toFixed(2)}`),
            React.createElement('p', null, `Sınıf Ortalaması: ${result.average_score.toFixed(1)} / ${result.max_score}`),
            React.createElement('h3', null, 'Cevaplarınız'),
            React.createElement('div', { className: 'answers-list' },
              result.answers.map((answer, idx) => React.createElement('div', {
                key: idx,
                className: `answer-item ${answer.is_correct ? 'correct' : 'incorrect'}`
              },
                React.createElement('p', { className: 'question-text' }, answer.question_text),
                React.createElement('p', null, `Seçtiğiniz: ${answer.selected_answer || 'Boş'}`),
                React.createElement('p', null, `Doğru Cevap: ${answer.correct_answer}`),
                React.createElement('p', null, `Puan: ${answer.points_earned}`)
              ))
            )
          ))
        )
      )
    )
  );
}

export default StudentDashboard;

