import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

export function verifyToken(token: string, secret: string): JWTPayload | null {
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch {
    return null;
  }
}

export function generateRandomToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
