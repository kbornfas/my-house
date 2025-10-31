import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type LoginForm = {
  email: string;
  password: string;
};

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<LoginForm>({
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const onSubmit: SubmitHandler<LoginForm> = async (values) => {
    setFeedback(null);
    try {
      const response = await api.post('/auth/login', values);
      const preview = response.data?.accessToken?.slice(0, 12) ?? 'token';
      setFeedback({ message: `Welcome back! Token preview: ${preview}…`, type: 'success' });
      reset({ email: values.email, password: '' });
    } catch (error: any) {
      const message = error?.response?.data?.error ?? 'Unable to log in right now. Please try again.';
      setFeedback({ message, type: 'error' });
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <header className="auth-card__header">
          <h1>Welcome to Personal Fortress</h1>
          <p>Sign in to access your colorful household dashboard and schedule reminders with ease.</p>
        </header>

        {feedback && (
          <div className={`alert ${feedback.type === 'success' ? 'alert--success' : 'alert--error'}`}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register('email', { required: true })} />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register('password', { required: true })}
            />
          </div>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <footer style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Need a refresher on what&apos;s new? <Link to="/">Return to the dashboard</Link> or{' '}
          <Link to="/reminders">preview reminders</Link>.
        </footer>
      </div>
    </div>
  );
}
