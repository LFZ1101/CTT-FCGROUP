# Fase 2 — Motor de Monitoramento

## Entregue nesta fase

- Monitoramento manual via API de todas as fontes habilitadas ou de uma fonte específica.
- Histórico persistido em `SourceCheck` com status, HTTP, duração lógica e quantidade de candidatos.
- Descoberta de links candidatos a CCT, ACT, aditivos e documentos coletivos.
- Normalização de URLs e deduplicação por fonte.
- Registro de `DiscoveredDocument` com primeira e última detecção.
- Geração automática de alerta quando uma fonte apresenta documentos novos.
- Worker BullMQ + Redis com agendamento periódico por fonte.
- Nova tela **Monitoramento** no frontend para executar verificações e inspecionar descobertas/histórico.
- Respeito a fontes desabilitadas e isolamento por tenant.

## Limites intencionais

O coletor desta fase usa HTTP/HTML genérico. Sites que dependem fortemente de JavaScript, CAPTCHA, autenticação ou mecanismos anti-bot exigirão adaptadores específicos. O Mediador/MTE deverá ter um conector dedicado e juridicamente/tecnicamente validado antes de produção. Nenhum documento descoberto é tratado como juridicamente aplicável sem validação humana.

## Próxima fase

1. Download e armazenamento do PDF/documento original.
2. Hash do conteúdo real para detectar alteração de arquivo.
3. Extração textual e estruturação de cláusulas.
4. Vinculação assistida do documento a sindicato/empresa/instrumento.
5. Comparador CCT anterior x nova.
6. Evidências por página/cláusula e IA com RAG.
