const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function application(department = 'Vendas', hash = '') {
  const requests = [];
  const window = { location: { hash }, history: { replaceState: (_, __, hash) => { window.location.hash = hash; } } };
  const context = vm.createContext({
    window, URLSearchParams,
    localStorage: { getItem: () => 'token' },
    document: { querySelectorAll: () => [] },
    fetch: async (url) => {
      requests.push(url);
      return { ok: true, status: 200, text: async () => JSON.stringify({ ticket: { id: 99, clientId: 3 }, timeline: [] }) };
    }
  });
  for (const file of ['departments', 'i18n', 'data', 'api', 'components', 'router']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../frontend/js', `${file}.js`), 'utf8'), context);
  }
  const run = code => vm.runInContext(code, context);
  run(`CURRENT_USER = { id: 1, department: ${JSON.stringify(department)}, role: 'ADMIN' };
    USERS = [CURRENT_USER, {id: 2, name: 'Ana', department: 'Vendas'}, {id: 3, name: 'Bruno', department: 'Compras'}, {id: 4, name: 'Carla', department: 'TI'}];
    tickets = [
      {id: 10, title: 'Solicitação de vendas', clientId: 2, supportId: 4, status: 'NEW', priority: 'HIGH', categoryId: 1},
      {id: 11, title: 'Atribuído a vendas', clientId: 3, supportId: 2, status: 'ASSIGNED', priority: 'MEDIUM', categoryId: 1},
      {id: 12, title: 'Exclusivo de compras', clientId: 3, status: 'CLOSED', priority: 'LOW', categoryId: 1},
      {id: 13, title: 'Sem vínculo conhecido', clientId: 999, status: 'NEW'}
    ]; CATEGORIES = [{id: 1, name: 'Sistemas'}];`);
  return { run, requests, window };
}

test('department scope includes coworkers and assignments, excludes unrelated and unknown tickets', () => {
  const { run } = application();
  assert.equal(run(`getVisibleTickets().map(t => t.id).join(',')`), '10,11');
  run(`CURRENT_USER = USERS[2]`);
  assert.equal(run(`getVisibleTickets().map(t => t.id).join(',')`), '11,12');
  run(`CURRENT_USER = USERS[3]`);
  assert.equal(run(`getVisibleTickets().length`), 4);
});

test('every registered department has a scoped home and unknown departments fail closed', () => {
  const { run } = application();
  assert.equal(run(`DEPARTMENTS.every(department => {
    CURRENT_USER = {id: 1, department};
    if (department === 'TI') return getHomeRoute() === 'dashboard';
    const own = {clientId: 1};
    const unrelated = {clientId: 999};
    return getHomeRoute() === 'meu-departamento' && canViewTicket(own) && !canViewTicket(unrelated);
  })`), true);
  for (const department of ['', 'Geral', 'Unknown']) {
    run(`CURRENT_USER = { id: 1, department: ${JSON.stringify(department)} }`);
    assert.equal(run(`getVisibleTickets().length`), 0);
  }
  run(`CURRENT_USER = null`);
  assert.equal(run(`getVisibleTickets().length`), 0);
});

test('all statistics, recent tickets, lists and sidebar counts use department scope', () => {
  const { run } = application();
  assert.equal(run(`getDashboardStats().total`), 2);
  assert.equal(run(`getDashboardStats().closed`), 0);
  assert.equal(run(`getDashboardStats().categories[0].count`), 2);
  for (const render of ['renderDashboard()', 'renderTicketsList()', 'renderTicketsList(tickets)']) {
    const html = run(render);
    assert.match(html, /Solicitação de vendas/);
    assert.doesNotMatch(html, /Exclusivo de compras|Sem vínculo conhecido/);
  }
  assert.match(run(`renderDashboard()`), /Painel do setor — Vendas/);
  const sidebar = run(`renderSidebar()`);
  assert.match(sidebar, /href="#meu-departamento"/);
  assert.doesNotMatch(sidebar, /Visão geral|href="#dashboard"/);
  assert.match(sidebar, /id="sidebarTicketCount">2</);
});

test('direct and unknown detail URLs never display a ticket from another sector', async () => {
  const { run, requests } = application();
  assert.doesNotMatch(run(`renderTicketDetail(tickets[2])`), /Exclusivo de compras/);
  await assert.rejects(run(`Api.fetchTicketById(12)`), /outro departamento/);
  assert.equal(requests.length, 0);
  await assert.rejects(run(`Api.fetchTicketById(99)`), /outro departamento/);
});

test('notifications and unread counts exclude other sectors and stale references', () => {
  const { run } = application();
  run(`notifications = [
    {id: 1, ticketId: 10, title: 'Venda recebida', isRead: false},
    {id: 2, ticketId: 12, title: 'Compra privada', isRead: false},
    {id: 3, ticketId: 999, title: 'Referência antiga', isRead: false}
  ]`);
  assert.equal(run(`getUnreadNotificationsCount()`), 1);
  assert.doesNotMatch(run(`renderNotificationsList()`), /Compra privada|Referência antiga/);
  run(`CURRENT_USER.department = 'TI'`);
  assert.equal(run(`getUnreadNotificationsCount()`), 3);
});

test('non-TI direct overview URL resolves to department home before rendering', () => {
  for (const hash of ['', '#dashboard', '#meu-departamento']) {
    const { run, window } = application('Vendas', hash);
    run(`window.rendered = ''; Router.register('dashboard', () => window.rendered = 'global');
      Router.register('meu-departamento', () => window.rendered = 'sector'); Router.resolve()`);
    assert.equal(window.rendered, 'sector');
    assert.equal(window.location.hash, '#meu-departamento');
  }
  const { run, window } = application('TI', '#meu-departamento');
  run(`Router.register('dashboard', () => window.rendered = 'global'); Router.resolve()`);
  assert.equal(window.rendered, 'global');
});
