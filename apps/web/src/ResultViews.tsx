import { ScrollArea, Table } from '@mantine/core';
import { type MatrixView } from './analysis-types.js';

export function MatrixGrid({ matrix }: { readonly matrix: MatrixView }) {
  return (
    <ScrollArea.Autosize mah={260}>
      <Table fz="xs" withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            {matrix.labels.map((label) => (
              <Table.Th key={label}>{label}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {matrix.rows.map((row, index) => (
            <Table.Tr key={matrix.labels[index]}>
              <Table.Th>{matrix.labels[index]}</Table.Th>
              {row.map((value, column) => (
                <Table.Td key={matrix.labels[column]}>{value}</Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
}

export function ResultTable({ rows }: { readonly rows: readonly (readonly [string, string])[] }) {
  return (
    <ScrollArea.Autosize mah={200}>
      <Table fz="xs" striped>
        <Table.Tbody>
          {rows.map(([key, value]) => (
            <Table.Tr key={key}>
              <Table.Td>{key}</Table.Td>
              <Table.Td>{value}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  );
}
