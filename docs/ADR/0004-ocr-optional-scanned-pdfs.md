# ADR 0004 — OCR opcional para PDFs escaneados

## Contexto

Muitos instrumentos coletivos chegam como PDF escaneado (imagem), sem camada de texto.
O parse atual (`pdfjs-dist`) só lê texto embutido; páginas vazias geram classificação/cláusulas pobres.

## Decisão

1. Após a extração textual, `assessExtraction` marca `needsOcr` por densidade (chars/página, páginas vazias).
2. OCR só roda com `OCR_ENABLED=true` e binários `pdftoppm` + `tesseract` no worker.
3. Sem OCR ou sem binários, o parse **não falha**: grava `metadata.ocr` e força `needsReview`.
4. Imagem Docker do worker instala poppler + tesseract (por/eng) para ambientes que ativem OCR.

## Consequências

- CI/dev sem binários continuam verdes; OCR é opt-in operacional.
- Qualidade depende do idioma (`OCR_LANG`, default `por+eng`) e de `OCR_MAX_PAGES`.
- Alternativas futuras (tesseract.js / cloud OCR) podem plugar em `maybeApplyOcr` sem mudar o contrato de metadata.
