import { HttpError } from '../http.js';
import { User } from '../models.js';
import { verifyToken } from '../lib/tokens.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.header('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new HttpError(401, 'Sign in required.', 'UNAUTHENTICATED');
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new HttpError(401, 'Sign in required.', 'UNAUTHENTICATED');
    }
    const user = await User.findById(payload.sub);
    if (!user) throw new HttpError(401, 'Sign in required.', 'UNAUTHENTICATED');
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
