# Design System — CCT Intelligence

**Atualizado:** 2026-09-11 (UX redesign)  
**Princípio:** refinar o existente; tokens centralizados; UI operacional, não “template”.

## Tokens (`apps/web/src/app/globals.css`)

| Token | Uso |
|---|---|
| `--bg` / `--bg-subtle` | Fundo off-white frio |
| `--surface` / `--surface-2` | Painéis |
| `--text` / `--text-secondary` / `--muted` | Tipografia |
| `--border` / `--border-strong` | Separadores leves |
| `--primary` | Ação principal (azul sóbrio / near-black) |
| `--success` / `--warning` / `--danger` / `--info` | Feedback |
| `--radius-sm/md/lg` | Cantos contidos |
| `--shadow-sm/md` | Elevação discreta |
| `--fs-display` … `--fs-label` | Escala tipográfica |
| `--nav` | Sidebar navy quase preto |

Fonte: **Inter** (`next/font`).

## Navegação

- Grupos: **Visão · Carteira · Convenções · Operação · Administração**
- Sidebar colapsável (ícones + `title` tooltip)
- Topbar: breadcrumb, busca ⌘K / Ctrl+K (`CommandPalette`), chip de ambiente

## Componentes base

| Componente | Arquivo |
|---|---|
| Shell | `components/Shell.tsx` |
| PageHeader | `components/PageHeader.tsx` |
| DataTable | `components/DataTable.tsx` |
| ModalForm | `components/ModalForm.tsx` |
| StatusBadge / EmptyState / Skeleton / ErrorState | `components/ui/Status.tsx` |
| ToastProvider / useToast | `components/ui/Toast.tsx` |
| CommandPalette | `components/ui/CommandPalette.tsx` |
| Labels (`labelOf`, `toneOf`, `healthLabel`, `auditPhrase`, `originClass`) | `lib/labels.ts` |

## Padrões visuais

- **MetricCard** — contraste de surface, sombra mínima  
- **AttentionCard** — peso maior (borda/priority)  
- **Filterbar + chipbtn** — filtros de lista  
- **Deadline strip** — resumo de criticidade em Prazos  
- **Mode toggle** — Operacional vs Técnico (Monitoramento)  
- Origens: Oficial / Sindicato / Colaborativo / Privado via `originClass`

## Acessibilidade

- Foco visível global  
- `aria-current` / `aria-label` na nav e busca  
- Labels explícitos no login  
- Preferência `prefers-reduced-motion`
