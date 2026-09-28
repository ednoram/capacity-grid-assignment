export function TableSpacer({ height, columns }: { height: number; columns: number }) {
  return (
    <tbody aria-hidden="true">
      <tr>
        <td colSpan={columns} style={{ height }} />
      </tr>
    </tbody>
  );
}
