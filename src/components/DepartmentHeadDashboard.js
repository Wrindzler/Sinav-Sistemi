import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';

function DepartmentHeadDashboard() {
  const { user, logout } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const data = await apiRequest('/department-head/statistics');
      setStatistics(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return React.createElement('div', { className: 'loading' }, 'Yükleniyor...');
  }

  return React.createElement('div', { className: 'dashboard' },
    React.createElement('header', { className: 'dashboard-header' },
      React.createElement('div', { className: 'dashboard-header-content' },
        React.createElement('img', { src: '/logo.png', alt: 'KOSTÜ', className: 'dashboard-logo' }),
        React.createElement('div', { className: 'dashboard-title' },
          React.createElement('h1', null, 'KOSTÜ Sınav Sistemi'),
          React.createElement('span', { className: 'subtitle' }, 'Bölüm Başkanı Paneli')
        )
      ),
      React.createElement('div', { className: 'user-info' },
        React.createElement('span', null, user?.full_name),
        React.createElement('button', { onClick: logout, className: 'btn btn-secondary' }, 'Çıkış')
      )
    ),
    React.createElement('div', { className: 'statistics-container' },
      React.createElement('div', { className: 'statistics-section' },
        React.createElement('h2', null, 'Ders İstatistikleri'),
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'Ders Kodu'),
              React.createElement('th', null, 'Ders Adı'),
              React.createElement('th', null, 'Öğretim Üyesi'),
              React.createElement('th', null, 'Öğrenci Sayısı'),
              React.createElement('th', null, 'Ders Ortalaması')
            )
          ),
          React.createElement('tbody', null,
            statistics?.course_statistics.map(cs => React.createElement('tr', { key: cs.course_id },
              React.createElement('td', null, cs.course_code),
              React.createElement('td', null, cs.course_name),
              React.createElement('td', null, cs.instructor_name),
              React.createElement('td', null, cs.student_count),
              React.createElement('td', null, `${cs.course_average.toFixed(2)}%`)
            ))
          )
        )
      ),
      React.createElement('div', { className: 'statistics-section' },
        React.createElement('h2', null, 'Öğrenci İstatistikleri'),
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'Öğrenci Adı'),
              React.createElement('th', null, 'Genel Ortalama')
            )
          ),
          React.createElement('tbody', null,
            statistics?.student_statistics.map(ss => React.createElement('tr', { key: ss.student_id },
              React.createElement('td', null, ss.student_name),
              React.createElement('td', null, `${ss.overall_average.toFixed(2)}%`)
            ))
          )
        )
      )
    )
  );
}

export default DepartmentHeadDashboard;

