import { type ReactNode, useEffect, useState } from "react";
import { ApiError, schoolLinkApi, type Session } from "./lib/api";

type WorkspaceState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "ready"; session: Session }
  | { kind: "error"; message: string };

function messageFor(error: unknown) {
  return error instanceof ApiError ? error.message : "School Link could not open your workspace.";
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceState>({ kind: "loading" });

  function loadWorkspace() {
    const controller = new AbortController();
    setWorkspace({ kind: "loading" });

    Promise.all([schoolLinkApi.getHealth(controller.signal), schoolLinkApi.getSession(controller.signal)])
      .then(([, session]) => setWorkspace(session ? { kind: "ready", session } : { kind: "signed-out" }))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWorkspace({ kind: "error", message: messageFor(error) });
      });

    return () => controller.abort();
  }

  useEffect(() => loadWorkspace(), []);

  if (workspace.kind === "loading") return <AccessScreen title="Opening your private workspace" detail="Checking your school account and secure connection." />;
  if (workspace.kind === "error") return <AccessScreen title="Your workspace is unavailable" detail={workspace.message} action={<button className="primary-button" type="button" onClick={loadWorkspace}>Try again</button>} />;
  if (workspace.kind === "signed-out") return <AccessScreen title="Sign in through your school" detail="Your school account is required before messages, schedules, purchases, or study rooms can be shown." action={<button className="primary-button" type="button" onClick={loadWorkspace}>Check account again</button>} />;

  return <Workspace session={workspace.session} />;
}

function AccessScreen({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <main className="app-shell"><a className="skip-link" href="#access">Skip to sign-in status</a><nav className="topbar" aria-label="Primary navigation"><a className="brand" href="#access">School<span>Link</span></a></nav><section className="workspace-wrap" id="access"><article className="focus-card"><div><p className="kicker">Private workspace</p><h1>{title}</h1><p>{detail}</p></div><div className="focus-card-foot">{action ?? <span>Please wait.</span>}<span>School Link</span></div></article></section><footer><span>School Link</span><span>Private by design</span></footer></main>;
}

function Workspace({ session }: { session: Session }) {
  const name = firstName(session.user.name);
  const role = session.user.role.replace(/[-_]/g, " ");

  return (
    <main className="app-shell">
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="#workspace">School<span>Link</span></a>
        <div className="topbar-actions"><span className="profile-button">{name} <span>{role}</span></span></div>
      </nav>
      <div className="workspace-wrap" id="workspace">
        <aside className="sidebar" aria-label="Workspace sections">
          <div className="sidebar-intro"><span className="online-dot" /> Connected securely</div>
          <a className="nav-item active" href="#messages"><span>01</span> Messages</a>
          <a className="nav-item" href="#schedule"><span>02</span> Today</a>
          <a className="nav-item" href="#store"><span>03</span> Store</a>
          <a className="nav-item" href="#study-room"><span>04</span> Study rooms</a>
          <div className="sidebar-foot"><p>Need help?</p><span>Contact your school administrator.</span></div>
        </aside>
        <section className="content-column" aria-label="School Link workspace">
          <header className="workspace-header"><p className="kicker">Your workspace</p><h1>Welcome back, <em>{name}.</em></h1><p>Your account is connected. School Link only shows information your school has authorized for you.</p></header>
          <section className="dashboard-grid" aria-label="Today at School Link">
            <article className="focus-card"><div><p className="kicker">Up next</p><h2>No upcoming activity</h2><p>Your school events and room invitations will appear here when they are available.</p></div><div className="focus-card-foot"><span>Nothing scheduled</span><a href="#schedule">View schedule</a></div></article>
            <article className="schedule-card" id="schedule"><p className="kicker">Your day</p><div className="timeline-item"><time>—</time><div><strong>No timetable available</strong><span>Your school schedule will appear here when shared with School Link.</span></div></div></article>
          </section>
          <section className="messages-section" id="messages"><div className="section-heading"><div><p className="kicker">Messages</p><h2>Your conversations, in one place.</h2></div></div><div className="messages-layout"><div className="conversation-list"><p className="empty-copy">No conversations are available.</p></div><article className="chat-panel" aria-label="Messages"><header><div><p className="kicker">Messages</p><h3>Select a conversation</h3></div></header><div className="chat-stream empty-stream"><p>Only channels you belong to are shown here. Messaging becomes available when your school connects it.</p></div></article></div></section>
          <section className="utility-grid"><article className="store-card" id="store"><div className="section-heading"><div><p className="kicker">School store</p><h2>Pickup made simple.</h2></div></div><div className="product-list"><p className="empty-copy">No approved store inventory is available.</p></div></article><article className="call-card" id="study-room"><p className="kicker">Study room</p><h2>Join on your terms.</h2><p>Available rooms will appear only when your school enables them. Your camera and microphone stay off until you turn them on.</p><small>Membership and consent are verified on the server before a connection begins.</small></article></section>
        </section>
      </div>
      <footer><span>Connected to your school server</span><span>School Link</span></footer>
    </main>
  );
}
