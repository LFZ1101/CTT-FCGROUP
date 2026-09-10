import { ReactNode } from 'react';

export function DataTable({
  headers,
  children,
  empty,
  emptyTitle = 'Nada por aqui no momento',
  emptyDescription = 'Quando houver registros, eles aparecerão nesta lista.',
}: {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  return (
    <div className="tablewrap">
      <table className="table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty ? (
        <div className="emptystate" role="status">
          <strong>{emptyTitle}</strong>
          <p>{emptyDescription}</p>
        </div>
      ) : null}
    </div>
  );
}
