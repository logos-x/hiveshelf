import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthSpikeSessionService,
  SPIKE_SESSION_TTL_MS,
} from './auth-spike-session.service.js';

describe('AuthSpikeSessionService', () => {
  let service: AuthSpikeSessionService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    service = new AuthSpikeSessionService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tạo phiên và trả đúng user', () => {
    const token = service.create('alice');

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(service.findUser(token)).toEqual({
      id: 'spike-alice',
      name: 'Alice',
    });
  });

  it('giữ hai phiên độc lập và tạo token khác nhau', () => {
    const aliceToken = service.create('alice');
    const bobToken = service.create('bob');

    expect(aliceToken).not.toBe(bobToken);
    expect(service.findUser(aliceToken)?.id).toBe('spike-alice');
    expect(service.findUser(bobToken)?.id).toBe('spike-bob');
  });

  it('từ chối token thiếu hoặc không tồn tại', () => {
    expect(service.findUser(undefined)).toBeUndefined();
    expect(service.findUser('unknown-token')).toBeUndefined();
  });

  it('phiên còn hiệu lực ngay trước thời điểm hết hạn', () => {
    const token = service.create('alice');

    vi.advanceTimersByTime(SPIKE_SESSION_TTL_MS - 1);

    expect(service.findUser(token)?.id).toBe('spike-alice');
  });

  it('phiên hết hiệu lực đúng thời điểm hết hạn', () => {
    const token = service.create('alice');

    vi.advanceTimersByTime(SPIKE_SESSION_TTL_MS);

    expect(service.findUser(token)).toBeUndefined();
  });

  it('logout thu hồi đúng phiên, giữ phiên khác hoạt động', () => {
    const aliceToken = service.create('alice');
    const bobToken = service.create('bob');

    service.revoke(aliceToken);

    expect(service.findUser(aliceToken)).toBeUndefined();
    expect(service.findUser(bobToken)?.id).toBe('spike-bob');
  });

  it('thu hồi phiên nhiều lần hoặc thiếu token không gây lỗi', () => {
    const token = service.create('alice');

    expect(() => {
      service.revoke(token);
      service.revoke(token);
      service.revoke(undefined);
    }).not.toThrow();

    expect(service.findUser(token)).toBeUndefined();
  });
});
