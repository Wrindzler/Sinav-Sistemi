import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await login(username, password);
    if (!result.success) {
      setError(result.error || 'Giriş başarısız');
    }
  };

  return React.createElement('div', { className: 'login-container' },
    React.createElement('div', { className: 'login-box' },
      React.createElement('div', { className: 'login-logo' },
        React.createElement('img', { src: '/logo.png', alt: 'KOSTÜ Logo' })
      ),
      React.createElement('h1', null, 'KOSTÜ Sınav Sistemi'),
      React.createElement('p', { className: 'login-subtitle' }, 
        'Kocaeli Sağlık ve Teknoloji Üniversitesi'
      ),
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Kullanıcı Adı'),
          React.createElement('input', {
            type: 'text',
            value: username,
            onChange: (e) => setUsername(e.target.value),
            required: true
          })
        ),
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', null, 'Şifre'),
          React.createElement('input', {
            type: 'password',
            value: password,
            onChange: (e) => setPassword(e.target.value),
            required: true
          })
        ),
        error && React.createElement('div', { className: 'error' }, error),
        React.createElement('button', { type: 'submit', className: 'btn btn-primary' }, 'Giriş Yap')
      )
    )
  );
}

export default Login;

