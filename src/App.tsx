import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { ApiError, schoolLinkApi, type Session } from "./lib/api";

type WorkspaceState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "ready"; session: Session }
  | { kind: "error"; message: string };

type PageKey = "home" | "messages" | "schedule" | "store" | "study-room";

const pages: Array<{ key: PageKey; label: string; href: string }> = [
  { key: "home", label: "Home", href: "#home" },
  { key: "messages", label: "Messages", href: "#messages" },
  { key: "schedule", label: "Schedule", href: "#schedule" },
  { key: "store", label: "Store", href: "#store" },
  { key: "study-room", label: "Study rooms", href: "#study-room" },
];

function messageFor(error: unknown) {
  return error instanceof ApiError ? error.message : "School Link could not open your workspace.";
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function pageFromHash(): PageKey {
  const hash = window.location.hash.replace("#", "") as PageKey;
  return pages.some((page) => page.key === hash) ? hash : "home";
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

  if (workspace.kind === "loading") return <AccessFrame title="Opening your private workspace" detail="Checking your secure connection." />;
  if (workspace.kind === "error") return <AccessFrame title="Your workspace is unavailable" detail={workspace.message} action={<button className="primary-button" type="button" onClick={loadWorkspace}>Try again</button>} />;
  if (workspace.kind === "signed-out") return <AuthScreen onAuthenticated={(session) => setWorkspace({ kind: "ready", session })} />;
  return <Workspace session={workspace.session} />;
}

function AccessFrame({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <main className="app-shell"><a className="skip-link" href="#access">Skip to account status</a><nav className="topbar" aria-label="Primary navigation"><a className="brand" href="#access">School<span>Link</span></a></nav><section className="workspace-wrap auth-wrap" id="access"><article className="focus-card auth-card"><div><p className="kicker">Private workspace</p><h1>{title}</h1><p>{detail}</p></div><div className="focus-card-foot">{action ?? <span>Please wait.</span>}<span>School Link</span></div></article></section><footer><span>School Link</span><span>Private by design</span></footer></main>;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setBusy(true);
    try {
      const session = mode === "signup" ? await schoolLinkApi.signUp(name, email, password) : await schoolLinkApi.signIn(email, password);
      onAuthenticated(session);
    } catch (error) {
      setStatus(messageFor(error));
    } finally {
      setBusy(false);
    }
  }

  const signingUp = mode === "signup";
  return <main className="app-shell"><a className="skip-link" href="#access">Skip to account form</a><nav className="topbar" aria-label="Primary navigation"><a className="brand" href="#access">School<span>Link</span></a></nav><section className="workspace-wrap auth-wrap" id="access"><article className="focus-card auth-card"><div><p className="kicker">Your account</p><h1>{signingUp ? "Create your account." : "Welcome back."}</h1><p>{signingUp ? "Use any email address you control. A school email is not required." : "Sign in with the email and password you chose."}</p></div><form className="auth-form" onSubmit={submit}>{signingUp && <label>Display name<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}<label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label>Password<input required type="password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={signingUp ? "new-password" : "current-password"} /><small>At least 12 characters.</small></label>{status && <p className="auth-error" role="alert">{status}</p>}<button className="primary-button" type="submit" disabled={busy}>{busy ? "Working…" : signingUp ? "Create account" : "Sign in"}</button></form><div className="focus-card-foot"><button className="text-action inverse" type="button" onClick={() => { setMode(signingUp ? "signin" : "signup"); setStatus(""); }}>{signingUp ? "Already have an account? Sign in" : "New here? Create an account"}</button><span>School Link</span></div></article></section><footer><span>No school email required</span><span>Private by design</span></footer></main>;
}

function Workspace({ session }: { session: Session }) {
  const [page, setPage] = useState<PageKey>(pageFromHash);
  const name = firstName(session.user.name);
  const role = session.user.role.replace(/[-_]/g, " ");

  useEffect(() => {
    const updatePage = () => setPage(pageFromHash());
    window.addEventListener("hashchange", updatePage);
    return () => window.removeEventListener("hashchange", updatePage);
  }, []);

  return <main className="app-shell"><a className="skip-link" href="#workspace">Skip to workspace</a><nav className="topbar" aria-label="Primary navigation"><a className="brand" href="#home">School<span>Link</span></a><div className="topbar-actions"><span className="profile-button">{name} <span>{role}</span></span></div></nav><div className="workspace-wrap" id="workspace"><Sidebar page={page} /><section className="content-column" aria-label="School Link workspace"><WorkspacePage page={page} name={name} /></section></div><footer><span>Connected to your school server</span><span>School Link</span></footer></main>;
}

function Sidebar({ page }: { page: PageKey }) {
  return <aside className="sidebar" aria-label="Workspace sections"><div className="sidebar-intro"><span className="online-dot" /> Connected securely</div>{pages.map((item, index) => <a className={`nav-item${page === item.key ? " active" : ""}`} aria-current={page === item.key ? "page" : undefined} href={item.href} key={item.key}><span>{String(index + 1).padStart(2, "0")}</span> {item.label}</a>)}<div className="sidebar-foot"><p>Need help?</p><span>Contact your school administrator.</span></div></aside>;
}

function WorkspacePage({ page, name }: { page: PageKey; name: string }) {
  if (page === "messages") return <MessagesPage />;
  if (page === "schedule") return <SchedulePage />;
  if (page === "store") return <StorePage />;
  if (page === "study-room") return <StudyRoomPage />;
  return <DashboardPage name={name} />;
}

function PageHeader({ eyebrow, title, detail }: { eyebrow: string; title: ReactNode; detail: string }) {
  return <header className="workspace-header page-header"><p className="kicker">{eyebrow}</p><h1>{title}</h1><p>{detail}</p></header>;
}

function DashboardPage({ name }: { name: string }) {
  return <><PageHeader eyebrow="Your workspace" title={<>Welcome back, <em>{name}.</em></>} detail="Your school updates, conversations, and invitations appear here when they are shared with you." /><section className="dashboard-grid" aria-label="Today at School Link"><article className="focus-card"><div><p className="kicker">Up next</p><h2>No upcoming activity</h2><p>Your school events and room invitations will appear here when they are available.</p></div><div className="focus-card-foot"><span>Nothing scheduled</span><a href="#schedule">View schedule</a></div></article><article className="schedule-card"><p className="kicker">Your day</p><div className="timeline-item"><time>—</time><div><strong>No timetable available</strong><span>Your school schedule will appear here when shared with School Link.</span></div></div></article></section><section className="dashboard-secondary"><a className="feature-link" href="#messages"><span>Messages</span><strong>Your conversations, in one place.</strong><small>Open inbox</small></a><a className="feature-link sand" href="#store"><span>School store</span><strong>Pickup made simple.</strong><small>Open store</small></a><a className="feature-link mint" href="#study-room"><span>Study rooms</span><strong>Join on your terms.</strong><small>See rooms</small></a></section></>;
}

function MessagesPage() {
  return <><PageHeader eyebrow="Messages" title={<>A quieter way to <em>keep up.</em></>} detail="Only school-authorized conversations appear here. Your inbox is empty until a school channel is connected." /><section className="messages-page" aria-label="Message workspace"><aside className="channel-rail"><div className="rail-heading"><span>Conversations</span><button type="button" aria-label="Start a conversation" disabled>New</button></div><div className="empty-rail"><strong>No conversations yet</strong><p>When a teacher, class, or school group is available, it will appear here.</p></div></aside><article className="chat-workspace"><header className="chat-workspace-header"><div><p className="kicker">Inbox</p><h2>Select a conversation</h2></div><span className="chat-presence">Private</span></header><div className="chat-empty"><div className="empty-orb">SL</div><h3>Your messages will live here.</h3><p>School Link never creates a conversation without a school-authorized channel.</p></div><form className="message-composer"><textarea aria-label="Message draft" disabled placeholder="Choose a school conversation to write a message" rows={1} /><button className="primary-button" type="submit" disabled>Send message</button></form><p className="composer-notice" role="status">Messaging becomes available after your school connects a conversation.</p></article></section></>;
}

function SchedulePage() {
  return <><PageHeader eyebrow="Schedule" title={<>A clear view of <em>your day.</em></>} detail="Your timetable appears here as soon as it is shared by your school." /><section className="full-page-panel schedule-page-panel"><div className="panel-intro"><p className="kicker">This week</p><h2>No timetable shared</h2><p>There are no classes or events available for this account yet.</p></div><div className="schedule-blank-grid"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div></section></>;
}

function StorePage() {
  return <><PageHeader eyebrow="School store" title={<>Pickup made <em>simple.</em></>} detail="Approved store items, order updates, and pickup windows all stay in one place." /><section className="store-page-grid"><article className="full-page-panel store-panel"><p className="kicker">Available now</p><h2>No approved items</h2><p>Your school has not added any store inventory for this account.</p></article><aside className="order-summary"><p className="kicker">Your basket</p><strong>Nothing saved</strong><span>Items remain here until you place an order.</span></aside></section></>;
}

function StudyRoomPage() {
  return <><PageHeader eyebrow="Study rooms" title={<>A room when <em>you need it.</em></>} detail="Study rooms become available only when your school enables them and your membership is verified." /><section className="room-page"><article className="room-hero"><p className="kicker">Available rooms</p><h2>No rooms are open</h2><p>When a verified room is ready, you can join from here. Your camera and microphone remain off until you enable them.</p><button className="primary-button" type="button" disabled>Join a room</button></article><aside className="room-safety"><p className="kicker">Your privacy</p><strong>You stay in control.</strong><p>Device permissions are requested only after you choose to join a verified room.</p></aside></section></>;
}
