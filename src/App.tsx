import { FormEvent, useMemo, useState } from "react";
import { canJoinCall, reserveInventory, validateUpload, type Product } from "./lib/platform";

type CartLine = Product & { quantity: number };

const products: Product[] = [
  { id: "candy", name: "Fruit chews", priceCents: 125, inventory: 18, approved: true },
  { id: "soda", name: "Sparkling water", priceCents: 150, inventory: 12, approved: true },
  { id: "supply", name: "Homework kit", priceCents: 350, inventory: 7, approved: true },
];

const conversations = [
  { name: "Science club", detail: "Lab partners, remember your goggles tomorrow.", time: "10:42", active: true },
  { name: "Ava M.", detail: "Can someone share the worksheet?", time: "09:18", active: false },
  { name: "Student council", detail: "The Friday agenda is ready.", time: "Yesterday", active: false },
];

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function App() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notice, setNotice] = useState("Your workspace is ready.");
  const [mediaStatus, setMediaStatus] = useState("No media selected");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(["Lab partners, remember your goggles tomorrow.", "Can someone share the worksheet?"]);
  const [callConsent, setCallConsent] = useState(false);
  const [callJoined, setCallJoined] = useState(false);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0), [cart]);

  function addToCart(product: Product) {
    const existing = cart.find((item) => item.id === product.id);
    const quantity = (existing?.quantity ?? 0) + 1;
    try {
      reserveInventory(product, quantity);
      setCart((items) => existing
        ? items.map((item) => item.id === product.id ? { ...item, quantity } : item)
        : [...items, { ...product, quantity: 1 }]);
      setNotice(`${product.name} added to your pickup basket.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to add item.");
    }
  }

  function changeQuantity(id: string, direction: -1 | 1) {
    setCart((items) => items.flatMap((item) => {
      if (item.id !== id) return [item];
      const quantity = item.quantity + direction;
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }));
  }

  function onFileChange(file?: File) {
    if (!file) return;
    const result = validateUpload({ name: file.name, type: file.type, size: file.size });
    setMediaStatus(result.ok ? `${file.name} is ready for review before upload.` : result.reason);
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessages((items) => [...items, trimmed]);
    setMessage("");
    setNotice("Message staged in this local workspace. Production delivery requires an authenticated API.");
  }

  function joinCall() {
    const allowed = canJoinCall(
      { id: "ava", name: "Ava", role: "student" },
      { id: "science", memberIds: ["ava", "eli"], consentedIds: callConsent ? ["ava"] : [], active: true },
    );
    setCallJoined(allowed);
    setNotice(allowed ? "You joined the Science study room. Your camera and microphone remain off." : "Please confirm consent before joining the study room.");
  }

  return (
    <main className="app-shell">
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="#workspace">School<span>Link</span></a>
        <div className="topbar-actions">
          <button className="icon-button" type="button" aria-label="View notifications" onClick={() => setNotice("You have 3 unread updates.")}>03</button>
          <button className="profile-button" type="button" onClick={() => setNotice("Ava M. profile controls are available when authentication is connected.")}>AM <span>Ava M.</span></button>
        </div>
      </nav>

      <div className="workspace-wrap" id="workspace">
        <aside className="sidebar" aria-label="Workspace sections">
          <div className="sidebar-intro"><span className="online-dot" /> Student workspace</div>
          <a className="nav-item active" href="#messages"><span>01</span> Messages</a>
          <a className="nav-item" href="#schedule"><span>02</span> Today</a>
          <a className="nav-item" href="#store"><span>03</span> Store</a>
          <a className="nav-item" href="#study-room"><span>04</span> Study rooms</a>
          <div className="sidebar-foot"><p>Need help?</p><button type="button" className="text-action" onClick={() => setNotice("Support is available through your school administrator.")}>Contact support</button></div>
        </aside>

        <section className="content-column" aria-label="School Link workspace">
          <header className="workspace-header">
            <p className="kicker">Friday, August 1</p>
            <h1>Make today <em>count.</em></h1>
            <p>Everything you need to stay in sync with school, without the noise.</p>
          </header>

          <section className="dashboard-grid" aria-label="Today at School Link">
            <article className="focus-card">
              <div><p className="kicker">Up next</p><h2>Science study room</h2><p>Review the motion lab with Eli before third period.</p></div>
              <div className="focus-card-foot"><span>Starts in 22 min</span><a href="#study-room">Open room</a></div>
            </article>
            <article className="schedule-card" id="schedule">
              <p className="kicker">Your day</p>
              <div className="timeline-item"><time>10:30</time><div><strong>Algebra II</strong><span>Room 214</span></div></div>
              <div className="timeline-item next"><time>12:10</time><div><strong>Science study room</strong><span>Online</span></div></div>
              <div className="timeline-item"><time>14:05</time><div><strong>Student council</strong><span>Library</span></div></div>
            </article>
          </section>

          <section className="messages-section" id="messages">
            <div className="section-heading"><div><p className="kicker">Messages</p><h2>Keep the conversation moving.</h2></div><button type="button" className="text-action" onClick={() => setNotice("Only channels you belong to appear here.")}>View all</button></div>
            <div className="messages-layout">
              <div className="conversation-list">{conversations.map((conversation) => <button type="button" className={`conversation ${conversation.active ? "selected" : ""}`} key={conversation.name} onClick={() => setNotice(`${conversation.name} opened.`)}><span className="avatar">{conversation.name.slice(0, 1)}</span><span className="conversation-copy"><strong>{conversation.name}</strong><small>{conversation.detail}</small></span><time>{conversation.time}</time></button>)}</div>
              <article className="chat-panel" aria-label="Science club conversation">
                <header><div><p className="kicker">Channel</p><h3>Science club</h3></div><button className="small-button" type="button" onClick={() => setNotice("A report can be submitted without giving staff silent access to this channel.")}>Report</button></header>
                <div className="chat-stream" aria-live="polite">{messages.map((item, index) => <div className={`message-row ${index === messages.length - 1 ? "own" : ""}`} key={`${item}-${index}`}><span className="avatar">{index === messages.length - 1 ? "AM" : index === 0 ? "EL" : "JM"}</span><div><strong>{index === messages.length - 1 ? "Ava M." : index === 0 ? "Eli R." : "Jamie T."}</strong><p>{item}</p></div></div>)}</div>
                <form className="composer" onSubmit={sendMessage}><label className="sr-only" htmlFor="message">Write a message</label><input id="message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message" maxLength={500} /><label className="attachment" title="Share an image"><input aria-label="Upload a chat image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFileChange(event.target.files?.[0])} />Add media</label><button type="submit">Send</button></form><small className="media-status">{mediaStatus}</small>
              </article>
            </div>
          </section>

          <section className="utility-grid">
            <article className="store-card" id="store"><div className="section-heading"><div><p className="kicker">School store</p><h2>Pick up, not wait around.</h2></div><span className="cart-count">{cartCount} items</span></div><div className="product-list">{products.map((product) => <div className="product" key={product.id}><div><strong>{product.name}</strong><small>{product.inventory} available</small></div><span>{formatMoney(product.priceCents)}</span><button type="button" onClick={() => addToCart(product)}>Add</button></div>)}</div>{cart.length > 0 && <div className="basket" aria-label="Pickup basket"><div>{cart.map((item) => <div className="basket-line" key={item.id}><span>{item.name}</span><div><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => changeQuantity(item.id, -1)}>−</button><b>{item.quantity}</b><button type="button" aria-label={`Add one ${item.name}`} onClick={() => addToCart(item)}>+</button></div></div>)}</div><div className="basket-total"><span>Total</span><strong>{formatMoney(total)}</strong><button type="button" onClick={() => setNotice("Pickup request prepared. Production checkout requires an approved payment provider.")}>Continue to pickup</button></div></div>}</article>
            <article className="call-card" id="study-room"><p className="kicker">Study room</p><h2>Join on your terms.</h2><p>Science study room is active. Your camera and microphone stay off until you turn them on.</p><label className="consent"><input type="checkbox" checked={callConsent} onChange={(event) => setCallConsent(event.target.checked)} /> I agree to join this room.</label><button type="button" className="primary-button" onClick={joinCall}>{callJoined ? "In the room" : "Join study room"}</button><small>Membership and consent are checked before a call connection starts.</small></article>
          </section>
        </section>
      </div>

      <footer><span aria-live="polite">{notice}</span><span>School Link client preview</span></footer>
    </main>
  );
}
