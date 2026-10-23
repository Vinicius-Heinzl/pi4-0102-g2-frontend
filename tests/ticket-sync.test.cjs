const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function application() {
  let ticket = { id: 20, title: 'Emails excluídos', description: 'Recuperar emails', clientId: 1,
    supportId: 2, status: 'ASSIGNED', priority: 'MEDIUM', categoryId: 1 };
  const users = [{ id: 1, name: 'Adriana', department: 'Marketing' },
    { id: 2, name: 'Vinicius', department: 'TI' }, { id: 3, name: 'Ana', department: 'TI' }];
  const requests = [];
  const toasts = [];
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { innerHTML: '', value: '', listeners: {}, addEventListener(name, handler) { this.listeners[name] = handler; }, querySelector: () => null, querySelectorAll: () => [] });
    return nodes.get(id);
  };
  const routes = {};
  const events = {};
  const context = vm.createContext({
    console, URLSearchParams,
    localStorage: { getItem: () => 'test-token' },
    window: {},
    document: { visibilityState: 'visible', addEventListener: (name, callback) => { events[name] = callback; }, querySelectorAll: () => [], querySelector: () => null, getElementById: node },
    ThemeManager: { init() {}, isDark: () => false },
    Router: { register: (name, handler) => { routes[name] = handler; }, init() {}, resolve() {}, getCurrentRoute: () => 'chamados' },
    fetch: async (url, options) => {
      const body = options.body && JSON.parse(options.body);
      requests.push({ url, method: options.method, cache: options.cache, body });
      let data;
      if (options.method === 'PUT') { ticket = { ...ticket, ...body }; data = { success: true }; }
      else if (url.endsWith('/api/chamados/20')) data = { ticket: { ...ticket }, timeline: [] };
      else if (url.endsWith('/api/chamados')) data = [{ ...ticket }];
      else if (url.endsWith('/api/users')) data = users;
      else data = [];
      return { ok: true, status: 200, text: async () => JSON.stringify(data) };
    }
  });
  const run = code => vm.runInContext(code, context);
  for (const file of ['departments', 'i18n', 'data', 'api', 'components', 'app']) {
    run(fs.readFileSync(path.join(__dirname, '../frontend/js', `${file}.js`), 'utf8'));
  }
  context.showToast = (...args) => toasts.push(args);
  run(`CURRENT_USER = { id: 2, name: 'Vinicius', department: 'TI' };
    USERS = ${JSON.stringify(users)}; tickets = [${JSON.stringify(ticket)}];`);
  return { run, requests, routes, events, toasts, node, server: patch => { ticket = { ...ticket, ...patch }; } };
}

test('department column follows title in both tables and uses requester rather than assignee sector', () => {
  const { run } = application();
  for (const view of ['renderTicketsList()', 'renderDashboard()']) {
    const html = run(view);
    assert.match(html, /Título[\s\S]*?<\/th>\s*<th>Departamento<\/th>/);
    assert.match(html, /<td>Marketing<\/td>/);
  }
  assert.match(run(`renderTicketDetail(tickets[0])`), /Adriana<\/span>\s*<small[^>]*>Marketing<\/small>/);
});

test('creation department selector excludes legacy and test departments without editing users', () => {
  const { run } = application();
  run(`USERS.push(...['SI', 'Sistemas de Informação', 'teste', 'tst'].map((department, i) => ({id: 10 + i, name: 'Pessoa', department})))`);
  const html = run(`renderTicketModal()`);
  const select = html.match(/id="ticketDepartment">([\s\S]*?)<\/select>/)[1];
  assert.doesNotMatch(select, /value="(?:SI|Sistemas de Informação|teste|tst)"/);
  assert.match(select, /value="Marketing"/);
  assert.equal(run(`USERS.length`), 7);
});

test('fresh detail also updates list state and dashboard statistics; GET requests bypass cache', async () => {
  const { run, server, requests } = application();
  server({ status: 'CLOSED' });
  await run(`Api.fetchTicketById(20)`);
  assert.equal(run(`tickets[0].status`), 'CLOSED');
  assert.equal(run(`getDashboardStats().closed`), 1);
  assert.match(run(`renderTicketsList()`), /Resolvido/);
  assert.equal(requests[0].cache, 'no-store');
});

test('reassigning a resolved ticket preserves server status even when local list is stale', async () => {
  const { run, server, requests } = application();
  server({ status: 'CLOSED' });
  await run(`App.quickTechnicianChange(20, '3')`);
  const update = requests.find(request => request.method === 'PUT');
  assert.equal(update.body.status, 'CLOSED');
  assert.equal(update.body.supportId, 3);
  assert.equal(run(`tickets[0].status`), 'CLOSED');
  assert.equal(run(`getDashboardStats().closed`), 1);
});

test('resolution blocks a simultaneous reassignment and leaves both list and server resolved', async () => {
  const { run, requests } = application();
  await run(`Promise.all([App.quickStatusChange(20, 'CLOSED'), App.quickTechnicianChange(20, '3')])`);
  const updates = requests.filter(request => request.method === 'PUT');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].body.status, 'CLOSED');
  assert.equal(run(`tickets[0].status`), 'CLOSED');
});

test('entering tickets refreshes status changed from another page or browser tab', async () => {
  const { run, server, routes, node } = application();
  await run(`App.init()`);
  server({ status: 'CLOSED' });
  await routes.chamados();
  assert.match(node('pageContent').innerHTML, /Resolvido/);
  assert.equal(run(`tickets[0].status`), 'CLOSED');
});

test('returning to an already open tab refreshes the displayed status', async () => {
  const { run, server, events, node } = application();
  await run(`App.init()`);
  server({ status: 'CLOSED' });
  await events.visibilitychange();
  assert.match(node('pageContent').innerHTML, /Resolvido/);
  assert.equal(run(`getDashboardStats().closed`), 1);
});

async function resolvedApplication(department = 'TI') {
  const app = application();
  await app.run(`App.init()`);
  app.run(`CURRENT_USER = { id: 1, name: 'Adriana', department: '${department}', role: 'ADMIN' };
    USERS = [CURRENT_USER, {id: 2, name: 'Ana', department: 'Vendas'}];
    window.fixture = [
      {id: 20, title: 'Resolvido Marketing', description: '', clientId: 1, status: 'CLOSED', priority: 'MEDIUM'},
      {id: 21, title: 'Resolvido Vendas', description: '', clientId: 2, status: 'CLOSED', priority: 'HIGH'},
      {id: 22, title: 'Ainda em atendimento', description: '', clientId: 1, status: 'ASSIGNED', priority: 'HIGH'},
      {id: 23, title: 'Não solucionado', description: '', clientId: 1, status: 'UNRESOLVED', priority: 'HIGH'}
    ];
    Api.fetchTickets = async () => window.fixture;
    Router.getCurrentRoute = () => 'resolvidos';`);
  await app.routes.resolvidos();
  return app;
}

test('resolved menu and route show TI all resolved tickets and an accurate counter', async () => {
  const { run, node } = await resolvedApplication();
  const html = node('pageContent').innerHTML;
  assert.match(html, /<h1[^>]*>Resolvidos<\/h1>/);
  assert.match(html, /data-ticket-id="20"/);
  assert.match(html, /data-ticket-id="21"/);
  assert.doesNotMatch(html, /data-ticket-id="22"|data-ticket-id="23"/);
  assert.match(run(`renderSidebar()`), /data-route="resolvidos" href="#resolvidos"/);
  assert.equal(node('sidebarResolvedCount').textContent, 2);
  assert.equal(node('filterStatus').value, 'CLOSED');
});

test('non-TI ADMIN only sees department resolved tickets even when API fixture contains all sectors', async () => {
  const { run, node } = await resolvedApplication('Marketing');
  const html = node('pageContent').innerHTML;
  assert.match(html, /data-ticket-id="20"/);
  assert.doesNotMatch(html, /data-ticket-id="21"|data-ticket-id="22"|data-ticket-id="23"/);
  assert.equal(node('sidebarResolvedCount').textContent, 1);
  assert.match(run(`renderSidebar()`), /id="sidebarResolvedCount">1</);
});

test('resolved filters cannot expose open tickets and remain separate from the main list', async () => {
  const { run, node, routes } = await resolvedApplication();
  node('filterStatus').value = 'ASSIGNED';
  node('filterStatus').listeners.change();
  assert.doesNotMatch(node('pageContent').innerHTML, /data-ticket-id="22"/);
  node('filterPriority').value = 'HIGH';
  node('filterPriority').listeners.change();
  assert.match(node('pageContent').innerHTML, /data-ticket-id="21"/);
  assert.doesNotMatch(node('pageContent').innerHTML, /data-ticket-id="20"|data-ticket-id="22"/);
  run(`Router.getCurrentRoute = () => 'chamados'`);
  await routes.chamados();
  assert.match(node('pageContent').innerHTML, /data-ticket-id="20"/);
  assert.match(node('pageContent').innerHTML, /data-ticket-id="22"/);
});

test('resolved view removes reopened tickets and refreshes its counter when returning to the tab', async () => {
  const { run, events, node } = await resolvedApplication('Marketing');
  run(`window.fixture = window.fixture.map(ticket => ticket.id === 20 ? {...ticket, status: 'NEW'} : ticket)`);
  await events.visibilitychange();
  assert.match(node('pageContent').innerHTML, /Nenhum chamado resolvido encontrado/);
  assert.doesNotMatch(node('pageContent').innerHTML, /data-ticket-id="20"/);
  assert.equal(node('sidebarResolvedCount').textContent, 0);
});
