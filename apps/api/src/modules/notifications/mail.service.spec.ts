import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MailService } from './mail.service';

describe('MailService', () => {
  it('skips send when SMTP is not configured', async () => {
    const prevHost = process.env.SMTP_HOST;
    const prevFrom = process.env.SMTP_FROM;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM;
    const mail = new MailService();
    const result = await mail.send({
      to: 'a@test.cct',
      subject: 'x',
      text: 'y',
    });
    assert.equal(result.sent, false);
    assert.equal(result.skipped, true);
    if (prevHost) process.env.SMTP_HOST = prevHost;
    if (prevFrom) process.env.SMTP_FROM = prevFrom;
  });
});
