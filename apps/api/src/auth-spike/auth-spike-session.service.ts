import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

export const SPIKE_SESSION_TTL_MS = 10 * 60 * 1000;

const users = {
  alice: {
    id: 'spike-alice',
    name: 'Alice',
  },
  bob: {
    id: 'spike-bob',
    name: 'Bob',
  },
} as const;

export type SpikeUserKey = keyof typeof users;

type SpikeSession = {
  userKey: SpikeUserKey;
  expiresAt: number;
};

@Injectable()
export class AuthSpikeSessionService {
  private readonly sessions = new Map<string, SpikeSession>();

  create(userKey: SpikeUserKey): string {
    this.removeExpired();

    const token = randomBytes(32).toString('hex');

    this.sessions.set(token, {
      userKey,
      expiresAt: Date.now() + SPIKE_SESSION_TTL_MS,
    });

    return token;
  }

  findUser(token: string | undefined) {
    if (!token) return undefined;

    const session = this.sessions.get(token);

    if (!session) return undefined;

    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return undefined;
    }

    return users[session.userKey];
  }

  revoke(token: string | undefined): void {
    if (token) this.sessions.delete(token);
  }

  private removeExpired(): void {
    const now = Date.now();

    for (const [token, session] of this.sessions) {
      if (session.expiresAt <= now) this.sessions.delete(token);
    }
  }
}
