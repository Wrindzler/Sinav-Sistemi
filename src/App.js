import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import InstructorDashboard from './components/InstructorDashboard';
import StudentDashboard from './components/StudentDashboard';
import DepartmentHeadDashboard from './components/DepartmentHeadDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return React.createElement('div', { className: 'loading' }, 'Yükleniyor...');
  }

  const roleRoutes = {
    admin: '/admin',
    instructor: '/instructor',
    student: '/student',
    department_head: '/department-head'
  };

  return React.createElement(BrowserRouter, null,
    React.createElement(Routes, null,
      React.createElement(Route, { 
        path: '/login', 
        element: user ? React.createElement(Navigate, { to: roleRoutes[user.role] || '/admin', replace: true }) : React.createElement(Login) 
      }),
      React.createElement(Route, { 
        path: '/admin', 
        element: user && user.role === 'admin' ? React.createElement(AdminDashboard) : React.createElement(Navigate, { to: '/login', replace: true }) 
      }),
      React.createElement(Route, { 
        path: '/instructor', 
        element: user && user.role === 'instructor' ? React.createElement(InstructorDashboard) : React.createElement(Navigate, { to: '/login', replace: true }) 
      }),
      React.createElement(Route, { 
        path: '/student', 
        element: user && user.role === 'student' ? React.createElement(StudentDashboard) : React.createElement(Navigate, { to: '/login', replace: true }) 
      }),
      React.createElement(Route, { 
        path: '/department-head', 
        element: user && user.role === 'department_head' ? React.createElement(DepartmentHeadDashboard) : React.createElement(Navigate, { to: '/login', replace: true }) 
      }),
      React.createElement(Route, { 
        path: '/', 
        element: user ? React.createElement(Navigate, { to: roleRoutes[user.role] || '/admin', replace: true }) : React.createElement(Navigate, { to: '/login', replace: true }) 
      }),
      React.createElement(Route, { 
        path: '*', 
        element: React.createElement(Navigate, { to: '/', replace: true }) 
      })
    )
  );
}

function App() {
  return React.createElement(AuthProvider, null,
    React.createElement(AppRoutes)
  );
}

export default App;

