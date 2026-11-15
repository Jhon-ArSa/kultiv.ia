import React from 'react';

// Models sometimes return tables despite the prompt. Display every cell with
// its column label, so the answer stays readable on a narrow phone screen.
export default function ChatTable({ children }) {
  const sections = React.Children.toArray(children).filter(React.isValidElement);
  const header = sections.find(section => section.type === 'thead');
  const body = sections.find(section => section.type === 'tbody');
  const headerRow = React.Children.toArray(header?.props.children).find(React.isValidElement);
  const headings = React.Children.toArray(headerRow?.props.children).filter(React.isValidElement);
  const rows = React.Children.toArray(body?.props.children).filter(React.isValidElement);
  if (!headings.length || !rows.length) return <div className="chat-table-scroll"><table>{children}</table></div>;
  return <div className="chat-data-cards">{rows.map((row, rowIndex) => <dl key={rowIndex}>
    {React.Children.toArray(row.props.children).filter(React.isValidElement).map((cell, column) => <div key={column}>
      <dt>{headings[column]?.props.children}</dt><dd>{cell.props.children}</dd>
    </div>)}
  </dl>)}</div>;
}
