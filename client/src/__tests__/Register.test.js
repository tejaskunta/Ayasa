import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../pages/Register';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
}

describe('Register page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
  });

  test('renders all required fields', () => {
    renderRegister();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText(/password/i).length).toBeGreaterThan(0);
  });

  test('renders submit button', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: /register|sign up|create/i })).toBeInTheDocument();
  });

  test('shows error on duplicate email', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email already registered' }),
    });
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText(/jane doe/i), { target: { value: 'Fresh User' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'dup@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/min\. 6 chars/i), { target: { value: 'pass123' } });
    fireEvent.change(screen.getByPlaceholderText(/repeat password/i), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /register|sign up|create/i }));
    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
  });

  test('saves token to localStorage after successful registration', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'new_user_token', user: { email: 'fresh@example.com', fullName: 'New User' } }),
    });
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText(/jane doe/i), { target: { value: 'New User' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'fresh@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/min\. 6 chars/i), { target: { value: 'pass123' } });
    fireEvent.change(screen.getByPlaceholderText(/repeat password/i), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /register|sign up|create/i }));
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('new_user_token');
    });
  });

  test('has a link to login page', () => {
    renderRegister();
    expect(screen.getAllByRole('link', { name: /sign in|log in|login/i }).length).toBeGreaterThan(0);
  });
});
