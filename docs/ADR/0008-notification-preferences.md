# ADR 0008 — Preferências de notificação por usuário

## Contexto

E-mail, webhook e Web Push existiam sem controle fino por usuário (barulho / opt-out).

## Decisão

1. Modelo `NotificationPreference` (email/push, `minSeverity`, `mutedTypes`).
2. `GET|PUT /notifications/preferences` no contexto do usuário autenticado.
3. `notifyAlert` filtra destinatários de e-mail e subscriptions de push pelas preferências.
4. Webhook permanece no nível tenant (`NOTIFY_WEBHOOK_URL`).
5. Default: e-mail+push ligados, severidade mínima `WARNING`.

## Consequências

- `NOTIFY_EMAILS` (csv ops) ainda sobrescreve a lista de e-mails quando definido.
- Preferências por empresa/instrumento ficam para fase futura.
