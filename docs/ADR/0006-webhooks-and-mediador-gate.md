# ADR 0006 — Webhooks de alerta + gate Mediador

## Contexto

Além de e-mail, o produto precisa de canal push/integração (Slack/Make/Zapier).
O Mediador exige politeness e proteção contra loops de bloqueio.

## Decisão

1. `NOTIFY_WEBHOOK_URL` recebe POST JSON de alertas; assinatura opcional `X-CCT-Signature: sha256=…`
   com `NOTIFY_WEBHOOK_SECRET`.
2. `NotificationsService.notifyAlert` fan-out e-mail + webhook; audit `ALERT_NOTIFICATION`.
3. Gate em memória: intervalo mínimo (`MEDIADOR_MIN_INTERVAL_MS`) e circuit breaker após
   `MEDIADOR_BLOCK_THRESHOLD` bloqueios (`MEDIADOR_COOLDOWN_MS`).
4. `MEDIADOR_MODE=fixture` usa HTML local para staging offline sem bater no portal.

## Consequências

- Web Push nativo (VAPID) fica para fase futura; webhook cobre integrações imediatas.
- Circuit breaker é por processo worker (não compartilhado entre réplicas até Redis).
