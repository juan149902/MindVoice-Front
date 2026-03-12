export interface ApiEntity {
  _id?: string;
  [key: string]: unknown;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  roleId?: string;
}
