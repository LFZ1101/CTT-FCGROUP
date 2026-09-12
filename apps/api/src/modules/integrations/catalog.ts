/**
 * Catálogo de provedores de folha/ERP.
 * Conforme Documento Mestre §66: não criar integração fake.
 */
export const INTEGRATION_CATALOG = [
  {
    provider: 'ONVIO' as const,
    displayName: 'ONVIO',
    status: 'UNSUPPORTED' as const,
    capabilities: ['employees_export', 'payroll_sync'],
    limitation:
      'API oficial/parceiro não conectada neste ambiente. Cadastre a intenção de conexão; sync real exige credenciais e contrato.',
  },
  {
    provider: 'DOMINIO' as const,
    displayName: 'Domínio Sistemas',
    status: 'UNSUPPORTED' as const,
    capabilities: ['employees_export', 'payroll_sync'],
    limitation:
      'Sem conector homologado. Use importação CSV de colaboradores até haver API/credenciais.',
  },
  {
    provider: 'ALTERDATA' as const,
    displayName: 'Alterdata',
    status: 'UNSUPPORTED' as const,
    capabilities: ['employees_export'],
    limitation: 'Integração não implementada. Documentado para roadmap pós-núcleo.',
  },
  {
    provider: 'OTHER' as const,
    displayName: 'Outro ERP / folha',
    status: 'UNSUPPORTED' as const,
    capabilities: ['csv_import'],
    limitation: 'Use CSV em /colaboradores ou /empresas/importar.',
  },
];
