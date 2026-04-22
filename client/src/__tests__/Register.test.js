import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Register from '../pages/Register';

jest.mock('axios');
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
  });

  test('renders all required fields', () => {
    renderRegister();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  test('renders submit button', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: /register|sign up|create/i })).toBeInTheDocument();
  });

  test('shows error on duplicate email', async () => {
    axios.post.mockRejectedValue({
      response: { data: { error: 'Email already registered' } },
    });
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'dup@example.com' } });
    const passwordFields = screen.getAllByPlaceholderText(/password/i);
    fireEvent.change(passwordFields[0], { target: { value: 'pass123' } });
    if (passwordFields[1]) fireEvent.change(passwordFields[1], { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /register|sign up|create/i }));
    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
  });

  test('saves token to localStorage after successful registration', async () => {
    axios.post.mockResolvedValue({
      data: { token: 'new_user_token', user: { email: 'fresh@example.com', fullName: 'New User' } },
    });
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'fresh@example.com' } });
    const passwordFields = screen.getAllByPlaceholderText(/password/i);
    fireEvent.change(passwordFields[0], { target: { value: 'pass123' } });
    if (passwordFields[1]) fireEvent.change(passwordFields[1], { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /register|sign up|create/i }));
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('new_user_token');
    });
  });

  test('has a link to login page', () => {
    renderRegister();
    expect(screen.getByRole('link', { name: /sign in|log in|login/i })).toBeInTheDocument();
  });
});
