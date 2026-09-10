import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AlertsService } from './alerts.service';

describe('AlertsService.scanExpiringInstruments', () => {
  it('cria alerta CRITICAL e tenta notificar por e-mail', async () => {
    const endDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const notifyCalls: string[] = [];
    const prisma = {
      collectiveInstrument: {
        findMany: async () => [
          { id: 'inst-1', title: 'CCT Demo', endDate, type: 'CCT' },
        ],
      },
      alert: {
        findFirst: async () => null,
        create: async ({ data }: { data: { severity: string } }) => ({
          id: 'alert-1',
          ...data,
        }),
      },
    };
    const ownership = {} as any;
    const notifications = {
      notifyAlert: async (_tenantId: string, alertId: string) => {
        notifyCalls.push(alertId);
        return { sent: true, messageId: 'm1' };
      },
    };

    const service = new AlertsService(prisma as any, ownership, notifications as any);
    const result = await service.scanExpiringInstruments('tenant-1', 60);

    assert.equal(result.scanned, 1);
    assert.equal(result.created, 1);
    assert.equal(result.notified, 1);
    assert.deepEqual(notifyCalls, ['alert-1']);
  });

  it('não notifica INFO e não falha se e-mail lançar erro', async () => {
    const endDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
    const prisma = {
      collectiveInstrument: {
        findMany: async () => [
          { id: 'inst-2', title: 'ACT Longe', endDate, type: 'ACT' },
        ],
      },
      alert: {
        findFirst: async () => null,
        create: async ({ data }: { data: { severity: string } }) => ({
          id: 'alert-2',
          ...data,
        }),
      },
    };
    const notifications = {
      notifyAlert: async () => {
        throw new Error('smtp boom');
      },
    };

    const service = new AlertsService(prisma as any, {} as any, notifications as any);
    const result = await service.scanExpiringInstruments('tenant-1', 60);

    assert.equal(result.created, 1);
    assert.equal(result.notified, 0);
  });
});
