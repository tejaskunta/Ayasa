import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Login from '../pages/Login';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe('Login page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders email and password fields', () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  test('renders submit button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in|login|log in/i })).toBeInTheDocument();
  });

  test('shows error when credentials are invalid', async () => {
    axios.post.mockRejectedValue({
      response: { data: { error: 'Invalid email or password' } },
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'bad@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in|login|log in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  test('saves token to localStorage on successful login', async () => {
    axios.post.mockResolvedValue({
      data: { token: 'test_jwt_token', user: { email: 'ok@example.com', fullName: 'Test' } },
    });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'ok@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'correct' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in|login|log in/i }));
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('test_jwt_token');
    });
  });

  test('has a link to register page', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /register|sign up|create/i })).toBeInTheDocument();
  });
});
