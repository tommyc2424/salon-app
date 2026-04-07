import { useState } from 'react';
import Login from './Login';
import Signup from './Signup';

export default function AuthPage() {
  const [view, setView] = useState('login');

  return (
    <div className="auth-page">
      {view === 'login'
        ? <Login  onSwitch={() => setView('signup')} />
        : <Signup onSwitch={() => setView('login')} />
      }
    </div>
  );
}
