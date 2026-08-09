import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { ApiError, schoolLinkApi, type Session } from "./lib/api";

type WorkspaceState =
  | { kind: "landing" }
  | { kind: "signed-out" }
  | { kind: "ready"; session: Session }

type PageKey = "home" | "messages" | "schedule" | "store" | "study-room" | "settings";

const pages: Array<{ key: PageKey; label: string; href: string }> = [
  { key: "home", label: "Home", href: "#home" },
  { key: "messages", label: "Messages", href: "#messages" },
  { key: "schedule", label: "Schedule", href: "#schedule" },
  { key: "store", label: "Store", href: "#store" },
  { key: "study-room", label: "Study rooms", href: "#study-room" },
  { key: "settings", label: "Settings", href: "#settings" },
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
  const [workspace, setWorkspace] = useState<WorkspaceState>({ kind: "landing" });

  if (workspace.kind === "landing") return <LandingPage onOpenWorkspace={() => setWorkspace({ kind: "signed-out" })} />;
  if (workspace.kind === "signed-out") return <AuthScreen onAuthenticated={(session) => setWorkspace({ kind: "ready", session })} onBack={() => setWorkspace({ kind: "landing" })} />;
  return <Workspace session={workspace.session} onSignedOut={() => setWorkspace({ kind: "landing" })} />;
}

function AccessFrame({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <main className="app-shell"><a className="skip-link" href="#access">Skip to account status</a><nav className="topbar" aria-label="Primary navigation"><a className="brand" href="#access">School<span>Link</span></a></nav><section className="workspace-wrap auth-wrap" id="access"><article className="focus-card auth-card"><div><p className="kicker">Private workspace</p><h1>{title}</h1><p>{detail}</p></div><div className="focus-card-foot">{action ?? <span>Please wait.</span>}<span>School Link</span></div></article></section><footer><span>School Link</span><span>Private by design</span></footer></main>;
}

function LandingPage({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  return <main className="landing-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <nav className="landing-nav" aria-label="Landing navigation"><a className="brand" href="#top">School<span>Link</span></a><div><a href="#how-it-works">How it works</a><a href="#independent">Our approach</a><button className="nav-signin" type="button" onClick={onOpenWorkspace}>Sign in</button></div></nav>
    <section className="landing-hero" id="top" aria-labelledby="landing-title"><div className="hero-copy"><p className="kicker">A calmer way to stay connected</p><h1 id="landing-title">Your day, <em>connected.</em></h1><p>One calm, private place for the conversations, plans, study rooms, and pickups that move your day forward.</p><div className="hero-actions"><button className="landing-primary" type="button" onClick={onOpenWorkspace}>Open your workspace</button><a className="landing-secondary" href="#how-it-works">See how it works</a></div></div><div className="hero-scene" aria-label="A preview of the School Link student workspace"><div className="scene-top"><span>School<span>Link</span></span><i>Connected securely</i></div><div className="scene-body"><div className="scene-rail"><b>Home</b><span>Messages</span><span>Schedule</span><span>Store</span></div><div className="scene-content"><small>Your workspace</small><strong>Everything you need,<br /><em>in one place.</em></strong><div className="scene-cards"><div><small>UP NEXT</small><b>Study hall<br />3:15 PM</b></div><div><small>MESSAGES</small><b>2 new updates</b></div></div></div></div></div></section>
    <section className="landing-intro" id="how-it-works"><p>School Link gives students a single, uncluttered place to stay in touch, make plans, and take the next step with confidence.</p></section>
    <section className="feature-bento" aria-label="School Link features"><article className="feature-panel feature-panel-dark"><p className="kicker">Stay in the loop</p><h2>Every update that matters, without the noise.</h2><p>Keep conversations, channels, and activity in a workspace made to be easy to return to.</p><span className="panel-mark">01</span></article><article className="feature-panel feature-panel-sand"><p className="kicker">Plan your day</p><h2>See what’s next.</h2><p>Keep plans, events, and reminders together in one quiet place.</p><div className="mini-calendar"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span></div></article><article className="feature-panel feature-panel-mint"><p className="kicker">Move with purpose</p><h2>From study rooms to pickup.</h2><p>Join rooms only when you choose. Keep orders and pickup details clear.</p><a href="#independent">Made for everyday student life</a></article></section>
    <section className="landing-proof" id="independent"><div><p className="kicker">Independent by design</p><h2>Private by design. Straightforward by default.</h2></div><div className="proof-list"><article><b>Built around your circles</b><p>Choose the conversations and spaces that make sense for you.</p></article><article><b>Permission when it matters</b><p>Camera and microphone access is requested only after you choose to join a room.</p></article><article><b>Clear next steps</b><p>Plans, orders, and messages stay focused on what you need to do now.</p></article><article><b>Made by students at Gavlin</b><p>School Link is made independently by students at Gavlin. Its creators remain anonymous.</p></article></div></section>
    <section className="landing-cta"><p className="kicker">Your community, in reach</p><h2>Ready when your day is.</h2><button className="landing-primary" type="button" onClick={onOpenWorkspace}>Sign in to School Link</button></section>
    <footer className="landing-footer"><a className="brand" href="#top">School<span>Link</span></a><span>Private by design</span><span>Made independently by anonymous Gavlin students</span></footer>
  </main>;
}

function AuthScreen({ onAuthenticated, onBack }: { onAuthenticated: (session: Session) => void; onBack: () => void }) {
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
  return <main className="app-shell"><a className="skip-link" href="#access">Skip to account form</a><nav className="topbar" aria-label="Primary navigation"><button className="brand brand-button" type="button" onClick={onBack}>School<span>Link</span></button></nav><section className="workspace-wrap auth-wrap" id="access"><article className="focus-card auth-card"><div><p className="kicker">Your account</p><h1>{signingUp ? "Create your account." : "Welcome back."}</h1><p>{signingUp ? "Use any email address you control. A school email is not required." : "Sign in with the email and password you chose."}</p></div><form className="auth-form" onSubmit={submit}>{signingUp && <label>Display name<input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}<label>Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label>Password<input required type="password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={signingUp ? "new-password" : "current-password"} /><small>At least 12 characters.</small></label>{status && <p className="auth-error" role="alert">{status}</p>}<button className="primary-button" type="submit" disabled={busy}>{busy ? "Working…" : signingUp ? "Create account" : "Sign in"}</button></form><div className="focus-card-foot"><button className="text-action inverse" type="button" onClick={() => { setMode(signingUp ? "signin" : "signup"); setStatus(""); }}>{signingUp ? "Already have an account? Sign in" : "New here? Create an account"}</button><span>School Link</span></div></article></section><footer><span>No school email required</span><span>Private by design</span></footer></main>;
}

function Workspace({ session, onSignedOut }: { session: Session; onSignedOut: () => void }) {
  const [page, setPage] = useState<PageKey>(pageFromHash);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const name = firstName(session.user.name);
  const role = session.user.role.replace(/[-_]/g, " ");

  useEffect(() => {
    const updatePage = () => setPage(pageFromHash());
    window.addEventListener("hashchange", updatePage);
    return () => window.removeEventListener("hashchange", updatePage);
  }, []);

  async function signOut() {
    setSignOutError("");
    setSigningOut(true);
    try {
      await schoolLinkApi.signOut();
      onSignedOut();
    } catch (error) {
      setSignOutError(messageFor(error));
      setSigningOut(false);
    }
  }

  return <main className="app-shell"><a className="skip-link" href="#workspace">Skip to workspace</a><nav className="topbar" aria-label="Primary navigation"><a className="brand" href="#home">School<span>Link</span></a><div className="topbar-actions"><a className="profile-button" href="#settings">{name} <span>{role}</span></a></div></nav><div className="workspace-wrap" id="workspace"><Sidebar page={page} /><section className="content-column" aria-label="School Link workspace"><WorkspacePage page={page} name={name} role={role} signingOut={signingOut} signOutError={signOutError} onSignOut={signOut} /></section></div><footer><span>Connected to your school server</span><span>School Link</span></footer></main>;
}

function Sidebar({ page }: { page: PageKey }) {
  return <aside className="sidebar" aria-label="Workspace sections"><div className="sidebar-intro"><span className="online-dot" /> Connected securely</div>{pages.map((item, index) => <a className={`nav-item${page === item.key ? " active" : ""}`} aria-current={page === item.key ? "page" : undefined} href={item.href} key={item.key}><span>{String(index + 1).padStart(2, "0")}</span> {item.label}</a>)}<div className="sidebar-foot"><p>Need help?</p><span>Contact your school administrator.</span></div></aside>;
}

function WorkspacePage({ page, name, role, signingOut, signOutError, onSignOut }: { page: PageKey; name: string; role: string; signingOut: boolean; signOutError: string; onSignOut: () => void }) {
  if (page === "messages") return <MessagesPage />;
  if (page === "schedule") return <SchedulePage />;
  if (page === "store") return <StorePage />;
  if (page === "study-room") return <StudyRoomPage />;
  if (page === "settings") return <SettingsPage name={name} role={role} signingOut={signingOut} signOutError={signOutError} onSignOut={onSignOut} />;
  return <DashboardPage name={name} />;
}

function PageHeader({ eyebrow, title, detail }: { eyebrow: string; title: ReactNode; detail: string }) {
  return <header className="workspace-header page-header"><p className="kicker">{eyebrow}</p><h1>{title}</h1><p>{detail}</p></header>;
}

function DashboardPage({ name }: { name: string }) {
  return <><PageHeader eyebrow="Your workspace" title={<>Welcome back, <em>{name}.</em></>} detail="Your school updates, conversations, and invitations appear here when they are shared with you." /><section className="dashboard-grid" aria-label="Today at School Link"><article className="focus-card"><div><p className="kicker">Up next</p><h2>No upcoming activity</h2><p>Your school events and room invitations will appear here when they are available.</p></div><div className="focus-card-foot"><span>Nothing scheduled</span><a href="#schedule">View schedule</a></div></article><article className="schedule-card"><p className="kicker">Your day</p><div className="timeline-item"><time>—</time><div><strong>No timetable available</strong><span>Your school schedule will appear here when shared with School Link.</span></div></div></article></section><section className="dashboard-secondary"><a className="feature-link" href="#messages"><span>Messages</span><strong>View conversations</strong><small>Open inbox</small></a><a className="feature-link sand" href="#store"><span>School store</span><strong>Browse approved items</strong><small>Open store</small></a><a className="feature-link mint" href="#study-room"><span>Study rooms</span><strong>View available rooms</strong><small>See rooms</small></a></section></>;
}

function MessagesPage() {
  return <><PageHeader eyebrow="Messages" title={<>Messages</>} detail="Only school-authorized conversations appear here. Your inbox is empty until a school channel is connected." /><section className="messages-page" aria-label="Message workspace"><aside className="channel-rail"><div className="rail-heading"><span>Conversations</span><button type="button" aria-label="Start a conversation" disabled>New</button></div><div className="empty-rail"><strong>No conversations yet</strong><p>When a teacher, class, or school group is available, it will appear here.</p></div></aside><article className="chat-workspace"><header className="chat-workspace-header"><div><p className="kicker">Inbox</p><h2>Select a conversation</h2></div><span className="chat-presence">Private</span></header><div className="chat-empty"><div className="empty-orb">SL</div><h3>No conversation selected</h3><p>School Link never creates a conversation without a school-authorized channel.</p></div><form className="message-composer"><textarea aria-label="Message draft" disabled placeholder="Choose a school conversation to write a message" rows={1} /><button className="primary-button" type="submit" disabled>Send message</button></form><p className="composer-notice" role="status">Messaging becomes available after your school connects a conversation.</p></article></section></>;
}

function SchedulePage() {
  return <><PageHeader eyebrow="Schedule" title={<>Schedule</>} detail="Your timetable appears here as soon as it is shared by your school." /><section className="full-page-panel schedule-page-panel"><div className="panel-intro"><p className="kicker">This week</p><h2>No timetable shared</h2><p>There are no classes or events available for this account yet.</p></div><div className="schedule-blank-grid"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div></section></>;
}

function StorePage() {
  return <><PageHeader eyebrow="School store" title={<>School store</>} detail="Approved store items, order updates, and pickup windows all stay in one place." /><section className="store-page-grid"><article className="full-page-panel store-panel"><p className="kicker">Available now</p><h2>No approved items</h2><p>Your school has not added any store inventory for this account.</p></article><aside className="order-summary"><p className="kicker">Your basket</p><strong>Nothing saved</strong><span>Items remain here until you place an order.</span></aside></section></>;
}

function StudyRoomPage() {
  return <><PageHeader eyebrow="Study rooms" title={<>Study rooms</>} detail="Study rooms become available only when your school enables them and your membership is verified." /><section className="room-page"><article className="room-hero"><p className="kicker">Available rooms</p><h2>No rooms are open</h2><p>When a verified room is ready, you can join from here. Your camera and microphone remain off until you enable them.</p><button className="primary-button" type="button" disabled>Join a room</button></article><aside className="room-safety"><p className="kicker">Your privacy</p><strong>Permission controls</strong><p>Device permissions are requested only after you choose to join a verified room.</p></aside></section></>;
}

function SettingsPage({ name, role, signingOut, signOutError, onSignOut }: { name: string; role: string; signingOut: boolean; signOutError: string; onSignOut: () => void }) {
  return <><PageHeader eyebrow="Settings" title={<>Settings</>} detail="Review how you access School Link and control this device’s active session." /><section className="settings-layout" aria-label="Account settings"><article className="account-overview"><div className="account-mark" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</div><div><p className="kicker">Signed in as</p><h2>{name}</h2><p>Your account is connected to this School Link workspace.</p></div><span className="role-chip">{role}</span></article><section className="settings-grid"><article className="settings-card"><p className="kicker">Account access</p><h2>Account security</h2><p>Use a password only you know. Password changes and account recovery will appear here once your school enables them.</p><span className="settings-note">Signed-in session active on this device</span></article><article className="settings-card privacy-card"><p className="kicker">Privacy</p><h2>Privacy controls</h2><p>School Link asks for device permissions only when you choose an action that needs them, such as joining a verified study room.</p><a href="#study-room">Review study room privacy</a></article></section><article className="signout-card"><div><p className="kicker">This device</p><h2>Sign out</h2><p>Signing out ends this browser’s active session. You can sign back in whenever you need to.</p></div><div className="signout-action">{signOutError && <p className="signout-error" role="alert">{signOutError}</p>}<button className="signout-button" type="button" onClick={onSignOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Log out"}</button></div></article></section></>;
}
