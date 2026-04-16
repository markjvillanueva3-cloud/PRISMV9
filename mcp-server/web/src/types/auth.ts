export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface ApiKeyResponse {
  key: string;
  name: string;
  created_at: string;
}

export interface ApiError {
  message: string;
  code?: string;
}
