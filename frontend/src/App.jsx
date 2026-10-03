import React, { useEffect, useState } from 'react';
import { request } from './api.js';

const can = (user, module) => user?.role === 'admin' || user?.[`can_access_${module}`];

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') ?? 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('home');
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [checkoutQuantity, setCheckoutQuantity] = useState(1);
  const [authMode, setAuthMode] = useState('login');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    if (!token) return;
    try {
      const profile = await request(`/users/${user.id}`, { token });
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
      if (can(profile, 'products')) setProducts(await request('/products', { token }));
      if (can(profile, 'orders')) setOrders(await request('/orders', { token }));
      if (profile.role === 'admin') setUsers(await request('/users', { token }));
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { if (token && user?.id) load(); }, [token, tab]);

  async function authenticate(event) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const path = authMode === 'login' ? '/auth/login' : '/auth/register';
      const result = await request(path, { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) });
      if (result.token) {
        setToken(result.token); setUser(result.user);
        localStorage.setItem('token', result.token); localStorage.setItem('user', JSON.stringify(result.user));
        setTab('home');
      } else { setNotice('Cuenta creada. El administrador debe otorgarte acceso a productos o pedidos.'); setAuthMode('login'); }
    } catch (e) { setError(e.message); }
  }

  function logout() {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    setToken(null); setUser(null); setProducts([]); setOrders([]); setUsers([]); setTab('home');
  }

  function startCheckout(product) {
    setCheckoutProduct(product);
    setCheckoutQuantity(1);
    setError('');
    setTab('checkout');
  }

  async function placeOrder(event) {
    event.preventDefault();
    if (!checkoutProduct) return;
    try {
      const order = await request('/orders', { token, method: 'POST', body: JSON.stringify({ items: [{ productId: checkoutProduct.id, quantity: Number(checkoutQuantity) }] }) });
      const mail = order.emailNotifications;
      setNotice(mail?.customer === 'sent' && mail?.admin === 'sent'
        ? `Pedido #${order.id} creado. Enviamos las instrucciones de pago a tu correo.`
        : mail?.mode === 'console'
          ? `Pedido #${order.id} pendiente de pago. Configura SMTP para enviar el correo; la vista previa quedó en la consola del backend.`
          : `Pedido #${order.id} registrado como pendiente de pago, pero no se pudo enviar el correo. Contacta a la tienda.`);
      setCheckoutProduct(null);
      setCheckoutQuantity(1);
      setTab('orders');
      await load();
    } catch (e) { setError(e.message); }
  }

  async function addProduct(event) {
    event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
    data.price = Number(data.price); data.stock = Number(data.stock);
    try { await request('/products', { token, method: 'POST', body: JSON.stringify(data) }); form.reset(); setNotice('Tenis agregados al catálogo.'); await load(); }
    catch (e) { setError(e.message); }
  }

  async function removeProduct(id) {
    try { await request(`/products/${id}`, { token, method: 'DELETE' }); setNotice('Producto eliminado.'); await load(); }
    catch (e) { setError(e.message); }
  }

  async function saveAccess(target, form) {
    const data = Object.fromEntries(new FormData(form));
    data.role = form.elements.role.value;
    data.can_access_products = form.elements.can_access_products.checked;
    data.can_access_orders = form.elements.can_access_orders.checked;
    try { await request(`/users/${target.id}`, { token, method: 'PUT', body: JSON.stringify(data) }); setNotice(`Permisos de ${target.name} actualizados.`); await load(); }
    catch (e) { setError(e.message); }
  }

  const navItems = [
    { id: 'catalog', label: 'TENIS', module: 'products' },
    { id: 'orders', label: 'PEDIDOS', module: 'orders' },
    ...(user?.role === 'admin' ? [{ id: 'manage', label: 'INVENTARIO' }, { id: 'users', label: 'USUARIOS' }] : [])
  ];

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#inicio" onClick={() => setTab('home')}><span className="brand-mark">11</span><span>ÁREA<span className="brand-accent">·</span>11<small>FOOTBALL CULTURE</small></span></a>
      <nav>{navItems.filter(item => !item.module || can(user, item.module)).map(item => <button className={tab === item.id ? 'selected' : ''} key={item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
      <div className="session">{user ? <><span>{user.name}<small>{user.role === 'admin' ? 'ADMINISTRADOR' : 'JUGADOR'}</small></span><button className="session-button" onClick={logout}>SALIR ↗</button></> : <button className="session-button" onClick={() => setTab('account')}>INICIAR SESIÓN ↗</button>}</div>
    </header>

    {error && <button className="toast error" onClick={() => setError('')}>{error}<b>×</b></button>}
    {notice && <button className="toast success" onClick={() => setNotice('')}>{notice}<b>×</b></button>}

    {tab === 'home' && <>
      <section className="hero" id="inicio"><div className="hero-grain"></div><div className="hero-copy"><span className="eyebrow"><i></i> EQUIPA TU JUEGO</span><h1>JUEGA<br/>A <em>OTRO</em><br/>NIVEL<span className="lime">.</span></h1><p>Encuentra los tenis que te llevan al siguiente nivel.<br/>Control, velocidad y precisión en cada jugada.</p>{can(user, 'products') ? <button className="cta" onClick={() => setTab('catalog')}>EXPLORAR TENIS <span>↗</span></button> : !user ? <button className="cta" onClick={() => setTab('account')}>ENTRAR A LA TIENDA <span>↗</span></button> : <div className="access-note">Tu cuenta está lista. Pide al administrador acceso a los módulos de tenis o pedidos.</div>}</div><div className="hero-visual"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="ball">⚽</div><div className="boot-graphic"><span>⚡</span><b>F</b></div><div className="vertical-copy">VELOCIDAD · CONTROL · PRECISIÓN</div><div className="hero-stamp">PITCH<br/>READY<br/><strong>2026</strong></div></div><div className="hero-bottom"><span>01 / COLECCIÓN DE JUEGO</span><span>DISEÑADO PARA LA CANCHA</span><span>↓ DESLIZA PARA DESCUBRIR</span></div></section>
      <section className="ticker"><div>DOMINA EL CAMPO <b>✳</b> VELOCIDAD QUE SE SIENTE <b>✳</b> TU PRÓXIMA JUGADA EMPIEZA AQUÍ <b>✳</b> DOMINA EL CAMPO <b>✳</b></div></section>
      <section className="home-feature"><div><span className="eyebrow dark">LA CANCHA TE LLAMA</span><h2>Tu juego merece<br/>el calzado <em>correcto.</em></h2></div><p>Encuentra el par ideal para tu posición, tu estilo y la superficie donde juegas. Cada detalle cuenta cuando el partido está en juego.</p>{can(user, 'products')&&<button className="text-link" onClick={()=>setTab('catalog')}>VER CATÁLOGO ↗</button>}</section>
    </>}

    {tab === 'account' && <main className="account-page"><div className="account-card"><span className="eyebrow dark">ÁREA·11 / ACCESO DE JUGADOR</span><h2>{authMode === 'login' ? 'Vuelve al juego.' : 'Únete al equipo.'}</h2><p>Inicia sesión para acceder a tu cuenta y módulos autorizados.</p><form onSubmit={authenticate}>{authMode === 'register' && <label>Nombre<input name="name" required placeholder="Nombre de jugador"/></label>}<label>Correo<input name="email" type="email" required placeholder="jugador@correo.com"/></label><label>Contraseña<input name="password" type="password" minLength="8" required placeholder="Mínimo 8 caracteres"/></label><button className="cta full">{authMode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'} <span>↗</span></button></form><button className="switch-auth" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? '¿Nuevo por aquí? Crea una cuenta' : '¿Ya tienes cuenta? Inicia sesión'}</button></div></main>}

    {tab === 'catalog' && can(user, 'products') && <main className="content-page"><div className="page-heading"><span className="eyebrow dark">ÁREA·11 / BOOT ROOM</span><h2>LISTOS PARA<br/><em>EL PARTIDO.</em></h2><p>Selección de tenis de fútbol. Encuentra tu siguiente ventaja.</p></div><div className="catalog-grid">{products.map((p, index) => <article className="boot-card" key={p.id}><div className={`boot-art boot-${index % 4}`}><span className="boot-number">{String(p.id).padStart(2,'0')}</span><span className="boot-icon">⚽</span><span className="boot-word">ÁREA·11</span></div><div className="boot-details"><div><span className="boot-type">FOOTBALL BOOT / FG</span><h3>{p.name}</h3><p>{p.description || 'Tracción y control para dominar cada jugada.'}</p><span className="stock">{p.stock > 0 ? `${p.stock} PARES DISPONIBLES` : 'AGOTADO'}</span></div><strong>${Number(p.price).toFixed(2)}</strong></div><button className="add-boot" disabled={!p.stock || !can(user, 'orders')} onClick={() => startCheckout(p)}>{can(user, 'orders') ? 'PEDIR ESTE PAR' : 'SOLICITA ACCESO A PEDIDOS'} <span>↗</span></button></article>)}</div>{!products.length&&<div className="empty-state">El administrador aún no ha agregado tenis al catálogo.</div>}</main>}

    {tab === 'checkout' && checkoutProduct && can(user, 'orders') && <main className="content-page"><div className="page-heading"><span className="eyebrow dark">ÁREA·11 / CHECKOUT</span><h2>CONFIRMA<br/><em>TU JUGADA.</em></h2><p>Revisa tu pedido antes de registrarlo. Recibirás por correo los detalles y las instrucciones de pago.</p></div><form className="checkout-card" onSubmit={placeOrder}><div className="checkout-product"><span className="boot-type">PRODUCTO</span><h3>{checkoutProduct.name}</h3><p>{checkoutProduct.description || 'Calzado de fútbol Área·11'}</p><strong>${Number(checkoutProduct.price).toFixed(2)} por par</strong></div><label>CANTIDAD<input type="number" min="1" max={checkoutProduct.stock} value={checkoutQuantity} onChange={(event) => setCheckoutQuantity(Math.min(checkoutProduct.stock, Math.max(1, Number(event.target.value))))} required /></label><div className="checkout-total"><span>Total del pedido</span><strong>${(Number(checkoutProduct.price) * Number(checkoutQuantity)).toFixed(2)}</strong></div><p className="checkout-note">El pedido quedará como <b>Pendiente de pago</b>. Se enviará un comprobante a tu correo y una notificación al administrador.</p><div className="checkout-actions"><button type="button" className="text-link" onClick={() => setTab('catalog')}>VOLVER AL CATÁLOGO</button><button className="cta">CONFIRMAR PEDIDO <span>↗</span></button></div></form></main>}

    {tab === 'orders' && can(user, 'orders') && <main className="content-page"><div className="page-heading"><span className="eyebrow dark">ÁREA·11 / TU TEMPORADA</span><h2>TUS <em>PEDIDOS.</em></h2><p>Consulta el estado y los detalles de tus pedidos.</p></div>{orders.length ? <div className="order-list">{orders.map(order => <article className="order-row" key={order.id}><div><span className="boot-type">PEDIDO #{order.id}</span><h3>{new Date(order.created_at).toLocaleDateString('es-MX')}</h3></div><div>{order.items?.map(item => <p key={item.id}>{item.quantity} × {item.product_name}</p>)}</div><span className="order-status">{order.status === 'pending' ? 'Pendiente de pago' : order.status}</span><strong>${Number(order.total).toFixed(2)}</strong></article>)}</div> : <div className="empty-state">Todavía no tienes pedidos. Explora los tenis para encontrar tu siguiente par.</div>}</main>}

    {tab === 'manage' && user?.role === 'admin' && <main className="content-page"><div className="page-heading"><span className="eyebrow dark">ÁREA·11 / ADMINISTRACIÓN</span><h2>BOOT <em>ROOM.</em></h2><p>Gestiona los tenis disponibles en la tienda.</p></div><form className="product-form" onSubmit={addProduct}><label>Modelo<input name="name" required placeholder="Ej. Phantom GX Elite"/></label><label>Descripción<input name="description" placeholder="Control, velocidad, superficie..."/></label><label>Precio<input name="price" type="number" min="0" step="0.01" required/></label><label>Pares<input name="stock" type="number" min="0" required/></label><button className="cta">AGREGAR TENIS ↗</button></form><div className="manage-list">{products.map(p=><div className="manage-row" key={p.id}><b>{p.name}</b><span>${Number(p.price).toFixed(2)} · {p.stock} pares</span><button onClick={()=>removeProduct(p.id)}>ELIMINAR ×</button></div>)}</div></main>}

    {tab === 'users' && user?.role === 'admin' && <main className="content-page"><div className="page-heading"><span className="eyebrow dark">ÁREA·11 / CONTROL DE ACCESO</span><h2>EL <em>EQUIPO.</em></h2><p>Asigna a cada usuario acceso a la tienda de tenis y a sus pedidos.</p></div><div className="users-list">{users.map(target=><form className="user-access" key={target.id} onSubmit={e=>{e.preventDefault();saveAccess(target,e.currentTarget);}}><div className="user-identity"><span className="user-avatar">{target.name.slice(0,1).toUpperCase()}</span><div><b>{target.name}</b><small>{target.email}</small></div></div><label className="role-field">ROL<select name="role" defaultValue={target.role}><option value="user">Usuario</option><option value="admin">Administrador</option></select></label><label className="permission"><input type="checkbox" name="can_access_products" defaultChecked={target.can_access_products}/> <span>Tenis / catálogo</span></label><label className="permission"><input type="checkbox" name="can_access_orders" defaultChecked={target.can_access_orders}/> <span>Pedidos</span></label><button className="save-access">GUARDAR CAMBIOS ↗</button></form>)}</div>{!users.length&&<div className="empty-state">No hay usuarios registrados todavía.</div>}</main>}

    {tab !== 'home' && tab !== 'account' && !can(user, tab === 'catalog' ? 'products' : 'orders') && user?.role !== 'admin' && <main className="empty-state denied">Este módulo no está habilitado en tu cuenta. Solicita acceso al administrador.</main>}
    <footer><a className="brand" href="#inicio" onClick={()=>setTab('home')}><span className="brand-mark">11</span><span>ÁREA<span className="brand-accent">·</span>11<small>FOOTBALL CULTURE</small></span></a><span>HECHO PARA EL JUEGO BONITO.</span><span>© 2026 ÁREA·11</span></footer>
  </div>;
}
