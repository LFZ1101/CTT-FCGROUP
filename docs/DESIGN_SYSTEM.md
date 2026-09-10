# Design System — CCT Intelligence

**Data:** 2026-09-10  
**Princípio:** refinar o que existe; tokens centralizados; sem hex espalhado em features novas.

## Tokens (`globals.css`)

| Token | Uso |
|---|---|
| `--bg` / `--bg-subtle` | Fundo da aplicação |
| `--surface` / `--surface-2` | Painéis e superfícies |
| `--text` / `--text-secondary` / `--muted` | Tipografia |
| `--border` / `--border-strong` | Separadores |
| `--primary` | Ação principal |
| `--success` / `--warning` / `--danger` / `--info` | Feedback + badges |
| `--radius-sm/md/lg` | Cantos |
| `--shadow-sm/md` | Elevação discreta |
| `--fs-display` … `--fs-label` | Escala tipográfica |

Fonte: **Inter** (já adotada) — escala nomeada, sem troca de família.

## Componentes base

| Componente | Arquivo | Notas |
|---|---|---|
| Shell (nav agrupada + colapso) | `components/Shell.tsx` | Grupos: Visão, Carteira, Convenções, Operação, Administração |
| PageHeader | `components/PageHeader.tsx` | Título + descrição + ação |
| DataTable | `components/DataTable.tsx` | Empty state contextual |
| ModalForm | `components/ModalForm.tsx` | Diálogos de formulário |
| StatusBadge / EmptyState / Skeleton / ErrorState | `components/ui/Status.tsx` | Estados padronizados |
| ToastProvider / useToast | `components/ui/Toast.tsx` | Feedback de ação |
| labels (`labelOf`, `toneOf`, `healthLabel`) | `lib/labels.ts` | Enums internos → PT-BR |

## Convenções de UX

1. Hierarquia por prioridade (crítico ≠ métrica neutra).
2. Status traduzidos; enums só no payload/API.
3. Detalhes técnicos em `<details>` / “Ver detalhes técnicos”.
4. Empty states explicam o próximo passo.
5. Loading com skeleton; erro com retry quando possível.
6. Sidebar colapsável; active state por prefixo de rota.

## Status visuais

- `ok` — saudável / validado / ativo  
- `warn` — atenção / pendente  
- `danger` — crítico / falha  
- `info` — informativo / descoberto  
- `neutral` — pausado / não conectado
