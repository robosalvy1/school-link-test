import { useMemo, useState } from "react";
import { canJoinCall, reserveInventory, validateUpload, type Product } from "./lib/platform";

const products: Product[] = [
  { id: "candy", name: "Fruit chews", priceCents: 125, inventory: 18, approved: true },
  { id: "soda", name: "Sparkling water", priceCents: 150, inventory: 12, approved: true },
  { id: "supply", name: "Homework kit", priceCents: 350, inventory: 7, approved: true },
];

export default function App() {
  const [basket, setBasket] = useState<Product[]>([]);
  const [notice, setNotice] = useState("Your School Link workspace is ready.");
  const [mediaStatus, setMediaStatus] = useState("No media selected");
  const [callJoined, setCallJoined] = useState(false);
  const total = useMemo(() => basket.reduce((sum, item) => sum + item.priceCents, 0), [basket]);

  function addToBasket(product: Product) {
    try {
      reserveInventory(product, 1);
      setBasket((items) => [...items, product]);
      setNotice(`${product.name} added to the basket.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to add item.");
    }
  }

  function onFileChange(file?: File) {
    if (!file) return;
    const result = validateUpload({ name: file.name, type: file.type, size: file.size });
    setMediaStatus(result.ok ? `${file.name} is ready for protected upload.` : result.reason);
  }

  function joinCall() {
    const allowed = canJoinCall({ id: "ava", name: "Ava", role: "student" }, { id: "science", memberIds: ["ava", "eli"], consentedIds: ["ava"], active: true });
    setCallJoined(allowed);
    setNotice(allowed ? "Joined Science study room. Camera and microphone remain under your control." : "Consent is required before joining.");
  }

  return (
    <main className="app-shell">
      <nav className="nav"><a className="brand" href="#top">School Link<span>Test</span></a><div className="nav-links"><a href="#chat">Chat</a><a href="#store">Store</a><a href="#bob">Bob</a><button className="quiet-button">Ava M.</button></div></nav>
      <section id="top" className="hero">
        <div><p className="eyebrow">Private school community</p><h1 className="max-w-5xl">A safer way for students to connect, share, and get what they need.</h1><p className="lede">School Link keeps the useful parts of school life in one protected workspace: conversation, approved supplies, and consent-first calls.</p><div className="hero-actions"><a className="button light" href="#chat">Open chat</a><a className="button outline" href="#store">Browse store</a></div></div>
        <aside className="hero-panel"><p>Today at School Link</p><strong>18</strong><span>active classmates</span><div className="pulse-line"/><small>Moderation coverage is active. Private messages stay private unless a participant reports them.</small></aside>
      </section>
      <section className="bento" aria-label="School Link features">
        <article id="chat" className="card chat-card span-two"><p className="eyebrow">Chatroom</p><h2>Channels with clear boundaries.</h2><div className="message"><b>Science club</b><span>Lab partners, remember your goggles tomorrow.</span></div><div className="message dim"><b>Ava M.</b><span>Can someone share the worksheet?</span></div><div className="chat-actions"><label className="upload"><input aria-label="Upload a chat image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFileChange(event.target.files?.[0])}/>Share picture</label><button className="text-button" onClick={() => setNotice("Report drafted. Bob can review the report without silently browsing private messages.")}>Report message</button></div><small>{mediaStatus}</small></article>
        <article id="store" className="card store-card span-two"><p className="eyebrow">School store</p><h2>Approved essentials, ready at pickup.</h2><div className="product-list">{products.map((product) => <div className="product" key={product.id}><div><b>{product.name}</b><span>{product.inventory} in stock</span></div><button onClick={() => addToBasket(product)}>Add ${ (product.priceCents / 100).toFixed(2) }</button></div>)}</div><div className="basket">Basket: {basket.length} item{basket.length === 1 ? "" : "s"}<strong>${(total / 100).toFixed(2)}</strong><button className="checkout" disabled={!basket.length} onClick={() => setNotice("Checkout request prepared. A real payment provider is intentionally not connected in version one.")}>Continue</button></div></article>
        <article className="card call-card"><p className="eyebrow">Voice and video</p><h2>Join only when you agree.</h2><p>Science study room is waiting. Your camera and microphone are off until you enable them.</p><button className="button dark" onClick={joinCall}>{callJoined ? "In the room" : "Join study room"}</button></article>
        <article className="card guard-card"><p className="eyebrow">Privacy guardrails</p><h2>Nothing hidden behind the scenes.</h2><ul><li>Channels and DMs require membership.</li><li>Images are size and type checked.</li><li>Reports create accountable review work.</li></ul></article>
      </section>
      <section id="bob" className="bob-section"><div className="bob-copy"><p className="eyebrow">Bob moderation desk</p><h2>Useful oversight without a back door.</h2><p>Bob receives reports, media review work, and security alerts. The role cannot quietly read student conversations, bypass membership, or access files that were not reported.</p><button className="button light" onClick={() => setNotice("Bob’s protected dashboard would require a moderator or admin session.")}>View protected desk</button></div><div className="queue"><div><span>Open reports</span><strong>03</strong></div><div><span>Media review</span><strong>01</strong></div><div><span>Security alerts</span><strong>00</strong></div><p>Every action is written to an audit log.</p></div></section>
      <footer><span>{notice}</span><span>School Link Test · Version one · No AI integration</span></footer>
    </main>
  );
}
