# Arquitetura de Informação — CCT Intelligence

**Data:** 2026-09-12  
**Princípio:** navegação orientada ao trabalho, não à arquitetura do banco.

## Navegação atual

```
Visão → Visão geral, Vigilância
Carteira → Empresas, Colaboradores, Sindicatos
Convenções → CCT/ACT, Documentos, Prazos, Rede
Operação → Alertas, Tarefas, Monitoramento
Administração → Fontes, Integrações, Auditoria
```

Problema: tudo compete no mesmo nível; Monitoramento/Fontes misturam ops e técnico.

## Navegação proposta (usuário operacional)

```
TRABALHO
  · Hoje              (/)
  · Caixa de entrada  (/caixa-de-entrada)
  · Tarefas           (/tarefas)           — detalhe da fila; Caixa agrega

CARTEIRA
  · Empresas          (/empresas)
  · Sindicatos        (/sindicatos)

CONVENÇÕES
  · Instrumentos      (/instrumentos)
  · Prazos            (/prazos)
  · Vigilância        (/vigilancia)

MAIS
  · Rede colaborativa (/rede)
  · Documentos        (/documentos)
  · Colaboradores     (/colaboradores)

ADMINISTRAÇÃO  (OWNER | ADMIN | MODERATOR parcial)
  · Fontes            (/fontes)
  · Monitoramento     (/monitoramento)
  · Moderação rede    (/rede/moderacao)
  · Integrações       (/integracoes)
  · Auditoria         (/auditoria)
```

Rotas antigas **permanecem** (compatibilidade / deep links). Apenas o acesso principal é reorganizado.

## Visibilidade por perfil

| Item | OWNER | ADMIN | MODERATOR | ANALYST / demais |
|---|---|---|---|---|
| Trabalho / Carteira / Convenções / Mais | ✓ | ✓ | ✓ | ✓ |
| Administração (grupo) | ✓ | ✓ | ✓ (moderação+auditoria leitura) | ✗ |
| Moderação rede | ✓ | ✓ | ✓ | ✗ |
| Integrações / Fontes / Monitoramento | ✓ | ✓ | ✗* | ✗ |

\* Moderador vê Moderação; fontes/monitoramento só se role admin/owner.

## Relação entre entidades

```
Empresa ──vínculo──► Sindicato ──fontes──► Vigilância
    │                     │
    └── aplicações ──► Instrumento ◄── Documento
                           │
                     Prazos / Tarefas / Alertas
                           │
                     Caixa de entrada (camada)
```

## Jornadas (pós-simplificação)

1. **Nova CCT** → Caixa → Instrumento (resumo) → revisar → tarefas/prazos  
2. **CCT da empresa** → Empresas → detalhe → Instrumentos  
3. **Prazo crítico** → Hoje/Caixa → Prazo → atribuir → tarefa  
4. **Vínculo** → Empresa → Enquadramento → confirmar com motivos  
5. **Fonte com falha** → Vigilância (ops) → Admin/Monitoramento (técnico)  
6. **Pergunta CCT** → Instrumento → Ask (evidência)

## Justificativa

- **Caixa de entrada** reduz três filas a uma superfície “exige ação”.  
- **Admin separado** tira hash/HTTP/adapters do caminho do analista.  
- **Colaboradores sob Mais** evita poluir Carteira sem perder acesso.  
- **Documentos sob Mais** privilegia Instrumentos como unidade operacional.  
- **Vigilância** permanece operacional (cobertura); Monitoramento/Fontes vão ao Admin.
