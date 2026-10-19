import * as React from "react";
import { Project, projectStatuses } from "../classes/Project";
import { appIcons } from "../globals";

interface Props {
  project: Project;
  onDownload: () => void;
}

export function StatusBadge({ project }: { project: Project }) {
  const status = projectStatuses[project.status] ?? projectStatuses.brief
  return <span className="status-badge" style={{ color: status.color, borderColor: status.color }}>{status.label}</span>
}

export function ProjectCard(props: Props) {
  return (
    <div className="project-card">
      <div className="card-header">
        <p className="project-icon" style={{ backgroundColor: props.project.color }}>
          { props.project.initials }
        </p>
        <div>
          <bim-label style={{color: "var(--text)", fontSize: "1rem"}}>{ props.project.name }</bim-label>
          <bim-label>{ props.project.description }</bim-label>
        </div>
        {/* Inside the card link: the click must not open the project */}
        <bim-button className="card-download" icon={appIcons.DOWNLOAD} title="Download project (JSON)" onclick={(e: Event) => {
          e.preventDefault()
          e.stopPropagation()
          props.onDownload()
        }}></bim-button>
      </div>
      <div className="card-content">
        <div className="card-property">
          <bim-label icon={appIcons.STATUS} style={{ color: "var(--text-muted)" }}>Status</bim-label>
          <StatusBadge project={props.project} />
        </div>
        <div className="card-property">
          <bim-label icon={appIcons.USER} style={{ color: "var(--text-muted)" }}>Role</bim-label>
          <bim-label style={{ color: "var(--text)" }}>{ props.project.userRole }</bim-label>
        </div>
        <div className="card-property">
          <bim-label icon={appIcons.MONEY} style={{ color: "var(--text-muted)" }}>Cost</bim-label>
          <bim-label style={{ color: "var(--text)" }}>$ { props.project.cost }</bim-label>
        </div>
        <div className="card-property">
          <bim-label icon={appIcons.PROGRESS} style={{ color: "var(--text-muted)" }}>Estimated Progress</bim-label>
          <bim-label style={{ color: "var(--text)" }}>{ props.project.progress } %</bim-label>
        </div>
      </div>
    </div>
  )
}