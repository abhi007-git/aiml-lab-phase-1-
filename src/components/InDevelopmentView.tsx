import React from 'react';

interface InDevelopmentViewProps {
  moduleTitle: string;
  summary: string;
  plannedTasks: { title: string; status: 'Pending' | 'In Progress' | 'Data Ready' }[];
}

export const InDevelopmentView: React.FC<InDevelopmentViewProps> = ({
  moduleTitle,
  summary,
  plannedTasks,
}) => {
  return (
    <div className="fade-in-view">
      <div className="cmd-panel-header">{moduleTitle}</div>

      <div
        className="cmd-panel"
        style={{
          borderLeft: '4px solid #0F4C81',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span className="badge-med">UNDER DEVELOPMENT</span>
          <span style={{ fontSize: '0.78rem', color: '#5D6D7E', fontWeight: 600 }}>
            Module Integration Pending
          </span>
        </div>

        <p style={{ fontSize: '0.88rem', color: '#2C3E50', lineHeight: 1.55, margin: '0 0 14px 0' }}>
          {summary}
        </p>

        <div className="section-subhead" style={{ marginTop: 12 }}>
          PLANNED COMPONENTS
        </div>

        <div className="data-table-wrap" style={{ marginBottom: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Component</th>
                <th style={{ width: 150 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {plannedTasks.map((task) => (
                <tr key={task.title}>
                  <td style={{ fontFamily: 'Inter, sans-serif' }}>{task.title}</td>
                  <td>
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color:
                          task.status === 'In Progress'
                            ? '#0F4C81'
                            : task.status === 'Data Ready'
                              ? '#2E8B57'
                              : '#7F8C8D',
                      }}
                    >
                      ● {task.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
