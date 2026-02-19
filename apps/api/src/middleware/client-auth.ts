import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'orion-dev-secret';

export interface ClientRequest extends Request {
  client?: {
    clientId: string;
    projectId: string;
    type: 'client';
  };
}

export function authenticateClient(req: ClientRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Acesso não autorizado' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { clientId: string; projectId: string; type: string };

    if (decoded.type !== 'client') {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    req.client = { clientId: decoded.clientId, projectId: decoded.projectId, type: 'client' };
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada. Acesse novamente pelo link.' });
  }
}

export function generateClientToken(clientId: string, projectId: string): string {
  return jwt.sign(
    { clientId, projectId, type: 'client' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}
