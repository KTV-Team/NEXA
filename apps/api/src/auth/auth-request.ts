export interface AuthIdentity {
  userId: string;
  sessionId: string;
}

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  user?: AuthIdentity;
}
