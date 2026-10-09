/**
 * Two-pane messaging.
 *
 * Conversations are always tied to a service request — there is no open
 * public chat. This module renders the conversation list, the message thread
 * and a composer with basic client-side rate limiting.
 */

import { el, $, $$, mount, formatRelative, formatTime } from './lib/dom.js';
import { icon } from './lib/icons.js';
import { call } from './lib/api.js';
import * as store from './lib/store.js';
import { ROLES } from '../../shared/constants.js';
import { spinner, errorState, emptyState, avatar, toastError } from './components/ui.js';
import { relativeHref } from './components/navbar.js';

const POLL_INTERVAL_MS = 15_000;
const MIN_SEND_GAP_MS = 400;

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

/**
 * Renders the messaging page.
 *
 * @param {HTMLElement} root - wrapper for the two-pane layout
 * @param {object} options
 * @param {string} [options.requestId] - open the conversation for this request
 * @param {string} [options.conversationId]
 * @param {string} [options.role] - which side the viewer is on
 */
export function initMessaging(root, { requestId = null, conversationId = null, role = null } = {}) {
  if (!root) return null;

  const params = new URLSearchParams(window.location.search);
  const viewerRole = role ?? (store.getRole() ?? ROLES.CUSTOMER);

  const state = {
    conversations: [],
    activeId: conversationId ?? params.get('conversation') ?? null,
    messages: [],
    pollTimer: null,
    lastSentAt: 0,
  };

  mount(root, spinner({ label: 'Loading conversations' }));

  async function load() {
    try {
      const { conversations } = await call('GET', '/conversations');
      state.conversations = conversations ?? [];
    } catch (error) {
      mount(root, errorState({ message: error.userMessage, onRetry: load }));
      return;
    }

    // Pick the requested conversation, else the most recent.
    if (!state.activeId && requestId) {
      state.activeId = state.conversations.find((item) => item.requestId === requestId)?.id ?? null;
    }
    if (!state.activeId && state.conversations.length) {
      state.activeId = [...state.conversations].sort(byRecent)[0].id;
    }

    const layout = el(
      'div',
      { class: 'chat' },
      el('div', { class: 'chat__list', 'data-conversation-list': '', role: 'list', 'aria-label': 'Conversations' }),
      el(
        'div',
        { class: 'chat__panel', 'data-thread': '' },
        el(
          'header',
          { class: 'chat__header' },
          el('a', { class: 'icon-btn', href: relativeHref('dashboard.html'), 'aria-label': 'Back to dashboard' }, icon('arrowLeft')),
          el('div', { 'data-thread-header': '' }),
          el(
            'a',
            { class: 'btn btn--sm btn--secondary', href: relativeHref('request-details.html'), 'data-request-link': '' },
            'View request'
          )
        ),
        el('div', { class: 'chat__messages', 'data-messages': '', role: 'log', 'aria-live': 'polite', 'aria-label': 'Messages' }),
        el(
          'form',
          { class: 'chat__composer', 'data-composer': '' },
          el('label', { class: 'sr-only', for: 'message-input' }, 'Message'),
          el('input', {
            class: 'control',
            id: 'message-input',
            name: 'body',
            placeholder: 'Type a message…',
            autocomplete: 'off',
            maxlength: 2000,
            required: true,
          }),
          el('button', { class: 'btn btn--primary', type: 'submit' }, icon('send'), el('span', { class: 'sr-only' }, 'Send message'))
        )
      )
    );

    mount(root, layout);
    renderList();
    await renderThread();

    // Poll for new messages so both sides stay roughly in sync.
    state.pollTimer && clearInterval(state.pollTimer);
    state.pollTimer = setInterval(pollThread, POLL_INTERVAL_MS);

    // Stop polling when the tab is hidden.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearInterval(state.pollTimer);
      else {
        pollThread();
        state.pollTimer = setInterval(pollThread, POLL_INTERVAL_MS);
      }
    });
  }

  function byRecent(a, b) {
    return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
  }

  /* ---------------------------------------------------------------- */
  /* conversation list                                                */
  /* ---------------------------------------------------------------- */

  function renderList() {
    const list = $('[data-conversation-list]', root);
    if (!list) return;

    if (!state.conversations.length) {
      mount(
        list,
        emptyState({
          iconName: 'message',
          title: 'No conversations yet',
          text: 'Messages open once you have a service request with a provider.',
          action: el('a', { class: 'btn btn--primary', href: relativeHref('services.html') }, 'Find a service'),
        })
      );
      return;
    }

    mount(
      list,
      ...[...state.conversations].sort(byRecent).map((conversation) => {
        const otherName = viewerRole === ROLES.PROVIDER ? conversation.customerName : conversation.providerName;
        const lastMessage = conversation.messages?.at(-1);

        return el(
          'button',
          {
            class: 'conversation-item',
            type: 'button',
            role: 'listitem',
            'aria-current': String(conversation.id === state.activeId),
            dataset: { conversation: conversation.id },
          },
          avatar(otherName, { size: 'sm' }),
          el(
            'div',
            { class: 'conversation-item__body' },
            el(
              'div',
              { class: 'conversation-item__top' },
              el('span', { class: 'conversation-item__name', text: otherName }),
              el('span', { class: 'conversation-item__time', text: formatRelative(conversation.lastMessageAt) })
            ),
            el('span', { class: 'conversation-item__preview clamp-2', text: lastMessage?.body ?? 'No messages yet' }),
            conversation.unreadCount
              ? el('span', { class: 'badge badge--accent', text: `${conversation.unreadCount} new` })
              : null
          )
        );
      })
    );
  }

  /* ---------------------------------------------------------------- */
  /* message thread                                                  */
  /* ---------------------------------------------------------------- */

  async function renderThread() {
    const panel = $('[data-thread]', root);
    const thread = $('[data-messages]', root);
    if (!panel || !thread) return;

    const conversation = state.conversations.find((item) => item.id === state.activeId);

    if (!conversation) {
      mount(panel, emptyState({ iconName: 'message', title: 'Select a conversation', text: 'Choose a conversation to read your messages.' }));
      return;
    }

    const otherName = viewerRole === ROLES.PROVIDER ? conversation.customerName : conversation.providerName;

    mount(
      $('[data-thread-header]', root),
      el(
        'div',
        { class: 'stack', style: { '--flow': '0px' } },
        el('strong', { text: otherName }),
        el('span', { class: 'text-xs text-muted', text: `Request ${conversation.requestId}` })
      )
    );

    const requestLink = $('[data-request-link]', root);
    if (requestLink) requestLink.href = relativeHref(`request-details.html?id=${conversation.requestId}`);

    state.messages = conversation.messages ?? [];
    drawMessages();

    // Clear the unread badge locally so the list is accurate.
    conversation.unreadCount = 0;
    renderList();

    const input = $('#message-input', root);
    input?.focus();
  }

  function drawMessages() {
    const thread = $('[data-messages]', root);
    if (!thread) return;

    const viewerId = store.getUser()?.id;
    const viewerRoleNow = store.getRole();

    if (!state.messages.length) {
      mount(thread, el('p', { class: 'text-small text-muted', text: 'No messages yet. Say hello.' }));
      return;
    }

    mount(
      thread,
      ...state.messages.map((message) => {
        const outgoing = message.senderId === viewerId || message.senderRole === viewerRoleNow;
        return el(
          'div',
          { class: `bubble ${outgoing ? 'bubble--outgoing' : ''}` },
          el('span', { class: 'bubble__sender', text: message.senderName }),
          el('p', { class: 'bubble__text', text: message.body }),
          el('time', { class: 'bubble__time', datetime: message.createdAt, text: formatTime(message.createdAt) })
        );
      })
    );

    thread.scrollTop = thread.scrollHeight;
  }

  async function pollThread() {
    const conversation = state.conversations.find((item) => item.id === state.activeId);
    if (!conversation || document.hidden) return;

    try {
      const result = await call('GET', `/requests/${encodeURIComponent(conversation.requestId)}/messages`);
      const incoming = result.messages ?? [];

      if (incoming.length === state.messages.length) return;

      conversation.messages = incoming;
      conversation.lastMessageAt = incoming.at(-1)?.createdAt ?? conversation.lastMessageAt;
      state.messages = incoming;
      drawMessages();
    } catch {
      // Polling failures are non-fatal — the next tick will retry.
    }
  }

  /* ---------------------------------------------------------------- */
  /* composer                                                        */
  /* ---------------------------------------------------------------- */

  function bindComposer() {
    root.addEventListener('submit', async (event) => {
      const form = event.target.closest('[data-composer]');
      if (!form) return;
      event.preventDefault();

      const input = $('#message-input', root);
      const body = input.value.trim();
      if (!body) return;

      // Basic throttle — the server enforces the real rate limit.
      const now = Date.now();
      if (now - state.lastSentAt < MIN_SEND_GAP_MS) return;
      state.lastSentAt = now;

      const conversation = state.conversations.find((item) => item.id === state.activeId);
      if (!conversation) return;

      const submit = form.querySelector('[type="submit"]');
      submit.classList.add('is-loading');
      submit.disabled = true;

      try {
        const result = await call('POST', `/requests/${encodeURIComponent(conversation.requestId)}/messages`, { body: { body } });
        const message = result.message ?? {
          id: `MSG-${now}`,
          senderId: store.getUser()?.id,
          senderName: store.getUser()?.fullName,
          senderRole: store.getRole(),
          body,
          createdAt: new Date().toISOString(),
        };

        conversation.messages = [...(conversation.messages ?? []), message];
        conversation.lastMessageAt = message.createdAt;
        state.messages = conversation.messages;

        input.value = '';
        drawMessages();
        renderList();
      } catch (error) {
        toastError(error.userMessage, { title: 'Message not sent' });
        input.focus();
      } finally {
        submit.classList.remove('is-loading');
        submit.disabled = false;
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* events                                                          */
  /* ---------------------------------------------------------------- */

  root.addEventListener('click', (event) => {
    const item = event.target.closest('[data-conversation]');
    if (!item) return;
    state.activeId = item.dataset.conversation;
    renderList();
    renderThread();
  });

  bindComposer();
  load();

  return {
    destroy() {
      clearInterval(state.pollTimer);
    },
    getState: () => state,
  };
}

export { $$ };