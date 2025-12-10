import React from 'react';
import { PriorityChart } from './PriorityChart.tsx';
import { StatsPanel } from './StatsPanel.tsx';
import { TagsPanel } from './TagsPanel.tsx';

export function PanelContainer() {
  return (
    <box flexDirection="row" height={10}>
      <box flexGrow={1}>
        <PriorityChart />
      </box>
      <box width={25}>
        <StatsPanel />
      </box>
      <box width={20}>
        <TagsPanel type="projects" />
      </box>
      <box width={20}>
        <TagsPanel type="contexts" />
      </box>
    </box>
  );
}
