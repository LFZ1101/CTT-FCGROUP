# ADR 0002 — Integração Mediador/MTE via HTTP + parsing

## Status

Aceito (2026-09)

## Contexto

O portal Mediador (MTE) é a fonte oficial de instrumentos coletivos, mas frequentemente protege listagens com JavaScript, desafios anti-bot e CAPTCHA.

## Decisão

1. Adaptador dedicado (`services/worker/src/adapters/mediador.ts`) com fetch HTTP, detecção de bloqueio e parsing HTML/registros.
2. Fontes `MEDIADOR_MTE` usam o cliente Mediador; fontes genéricas continuam no scraper HTML.
3. Quando houver bloqueio, gravar `SourceCheck.status=BLOCKED` com motivo — **não inventar documentos**.
4. Fixtures locais cobrem o parser; probe live é best-effort e pode falhar por rede/anti-bot.

## Consequências

- Integração “real” no sentido de protocolo/parsing, sem browser headless obrigatório.
- Sites com CAPTCHA exigirão evolução futura (browser automation autorizada / dados oficiais exportados).
