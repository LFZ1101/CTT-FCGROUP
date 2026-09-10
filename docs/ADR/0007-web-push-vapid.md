# ADR 0007 — Web Push (VAPID)

## Contexto

Além de e-mail e webhook, o DP precisa de alertas no navegador sem abrir o painel.

## Decisão

1. Modelo `PushSubscription` (endpoint + keys) por tenant/usuário.
2. VAPID via `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`.
3. Endpoints: `GET /notifications/push/vapid-public-key`, `POST|DELETE /notifications/push/subscribe`.
4. Fan-out em `notifyAlert` (e-mail + webhook + push); remove subscriptions 404/410.
5. Service worker `apps/web/public/sw.js` + botão “Ativar Web Push” em `/alertas`.

## Consequências

- Sem chaves VAPID, push é skip (como SMTP/webhook).
- Preferências granulares por tipo de alerta ficam para fase futura.
- HTTPS (ou localhost) é requisito do browser para Push API.
