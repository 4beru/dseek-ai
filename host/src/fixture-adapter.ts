import { HostError } from './errors.ts';
import type { HostAdapter, HostSession, HostSnapshot, Preset } from './types.ts';

/** All content is synthetic. This adapter has no DSH, model or network dependency. */
export const FIXTURE = Object.freeze({
  hostName: 'Development workstation', workspaceId: 'demo', workspaceName: 'Workspace',
  existingSessionId: 'demo-session', existingSessionTitle: 'Project planning',
  existingMessage: 'Help me organize the next steps for this project.',
  createdSessionTitle: 'New conversation', expectedAssistantText: 'Start by outlining the goal, listing the next steps, and noting any open decisions. Keep each step small enough to review independently.',
});
export const MULTI_PROJECT_FIXTURE = Object.freeze({
  markdownSessionId: 'demo-fund-plan', markdownAnchor: 'Foundation portal plan', filterWorkspaceId: 'demo-fund',
  workspaces: Object.freeze([
    { id: 'demo-fund', name: 'Foundation portal' },
    { id: 'demo-tenders', name: 'Tender radar' },
    { id: 'demo-site', name: 'Website' },
    { id: 'demo-mobile', name: 'Mobile app' },
    { id: 'demo-pc', name: 'PC administration' },
  ]),
});
const FUND_MARKDOWN = '# Foundation portal plan\n\nThe portal should make it easy to **explore programs**, understand each initiative and get in touch with the team.\n\n## Page structure\n\n- A home page with clear program descriptions.\n- An initiative catalog and an individual project card.\n- A contact form with an `email` field.\n\nKeep navigation straightforward on a small screen. Important actions should be accessible without horizontal scrolling.\n\n## Review steps\n\n1. Open the home page.\n2. Select a project from the catalog.\n3. Check labels and the loading state.\n\nAndroid state model:\n\n```kotlin\ndata class Project(\n    val title: String,\n    val isLoading: Boolean = false,\n)\n\nval project = Project("Foundation portal")\n```\n\n**Next decision:** agree on the navigation labels before refining the page layouts.';
const TENDER_MARKDOWN = '## Tender radar overview\n\nOrganize procurement opportunities by **deadline and relevance** so the team can review the most useful results first.\n\n- Show new entries in a separate section.\n- Include a deadline and a short description for each result.\n- Let users reset the `region` filter in one action.\n\n### Review checklist\n\n1. Compare the empty state with the results list.\n2. Increase the system font size.\n3. Make sure long headings wrap correctly.\n\n**Next step:** agree on the digest layout and notification preferences before connecting external sources.';
const MULTI_SESSIONS = [
  ['demo-fund-plan', 'demo-fund', 'Portal plan and section structure', true, FUND_MARKDOWN],
  ['demo-tenders-review', 'demo-tenders', 'Checking tender radar filters', true, TENDER_MARKDOWN],
  ['demo-mobile-chat', 'demo-mobile', 'Chat: spacing and long replies', false, 'Use consistent spacing between messages, let long replies wrap naturally, and keep the send button visible above the keyboard.'],
  ['demo-site-navigation', 'demo-site', 'Navigation and mobile menu', false, 'Keep the main navigation concise: Home, Programs, About and Contact. On smaller screens, group these links in a menu with a clear close action.'],
  ['demo-fund-form', 'demo-fund', 'Application form: field validation', false, 'Validate required fields when the user leaves them, show errors beside each field, and preserve the entered values when returning to the form.'],
  ['demo-pc-backup', 'demo-pc', 'Backup plan', false, 'Choose the folders to include, check available storage, and agree on a backup schedule. Confirm the destination before running any commands.'],
  ['demo-tenders-digest', 'demo-tenders', 'Weekly digest: layout', false, TENDER_MARKDOWN],
  ['demo-mobile-offline', 'demo-mobile', 'Offline states and reconnection', false, 'Show the connection status, preserve the current draft, and provide a reconnect action. Keep cached messages available while the connection recovers.'],
  ['demo-site-a11y', 'demo-site', 'Card accessibility and contrast', false, 'Give each card a descriptive heading and a clear focus indicator. Check contrast in both themes and keep touch targets comfortable at larger font sizes.'],
  ['demo-pc-storage', 'demo-pc', 'Free space and cleanup: draft', false, 'Review storage usage by category, identify large files, and confirm what can be archived. Ask for confirmation before deleting anything.'],
  ['demo-fund-content', 'demo-fund', 'Home page copy', false, FUND_MARKDOWN],
  ['demo-mobile-settings', 'demo-mobile', 'Connection settings screen', false, 'Keep the computer identity and connection status together. Place reconnect, appearance and language controls in clearly separated sections.'],
] as const;
const EPOCH = 1700000000000;
const MULTI_DAYS_AGO = [0, 0, 0, 0, 1, 1, 2, 3, 5, 8, 12, 20] as const;
function multiProjectDate(startedAt: number, index: number): number {
  const date = new Date(startedAt), daysAgo = MULTI_DAYS_AGO[index]!;
  if (daysAgo === 0) {
    date.setHours(0, 0, 0, 0);
    // The two running rows are updated today even when the demo starts just
    // after midnight; their last user messages still show realistic elapsed time.
    return startedAt - Math.min(Math.max(0, index - 1) * 45 * 60_000, startedAt - date.getTime());
  }
  date.setDate(date.getDate() - daysAgo);
  date.setHours(index % 2 ? 10 : 12, 0, 0, 0);
  return date.getTime();
}
export interface FixtureOptions { answerDelayMs?: number; multiProject?: boolean }

export class FixtureAdapter implements HostAdapter {
  readonly upstreamVersion = 'fixture';
  private readonly sessions = new Map<string, HostSnapshot>();
  private readonly listeners = new Map<string, Set<() => void>>();
  private readonly tasks = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly requests = new Map<string, string>();
  private readonly delay: number;
  private readonly epoch: number;
  private readonly workspaceIds: ReadonlySet<string>;
  private tick = 0;
  private disposed = false;
  constructor(options: FixtureOptions = {}) {
    this.delay = options.answerDelayMs ?? 2000;
    if (!Number.isSafeInteger(this.delay) || this.delay < 0 || this.delay > 60000 || (options.multiProject !== undefined && typeof options.multiProject !== 'boolean')) throw new HostError('invalid_config');
    this.epoch = options.multiProject ? Date.now() : EPOCH;
    this.workspaceIds = new Set(options.multiProject ? MULTI_PROJECT_FIXTURE.workspaces.map(item => item.id) : [FIXTURE.workspaceId]);
    if (options.multiProject) {
      for (const [index, [id, workspaceId, title, running, answer]] of MULTI_SESSIONS.entries()) {
        const updatedAt = multiProjectDate(this.epoch, index);
        const userAt = running ? this.epoch - (index === 0 ? 3 : 5) * 60_000 : updatedAt - 1000;
        this.sessions.set(id, { session: { id, workspaceId, title, running, updatedAt }, cursor: 1, hasMore: false, activity: running ? 'running' : 'idle', messages: [
          { id: `${id}-user`, role: 'user', text: `Help me work through ${title.toLowerCase()}. Suggest a clear plan and highlight any open decisions.`, createdAt: userAt },
          { id: `${id}-assistant`, role: 'assistant', text: answer, createdAt: updatedAt },
        ] });
      }
      return;
    }
    this.sessions.set(FIXTURE.existingSessionId, {
      session: { id: FIXTURE.existingSessionId, title: FIXTURE.existingSessionTitle, workspaceId: FIXTURE.workspaceId, updatedAt: EPOCH, running: false },
      cursor: 1, hasMore: false, activity: 'idle', messages: [
        { id: 'demo-user', role: 'user', text: FIXTURE.existingMessage, createdAt: EPOCH },
        { id: 'demo-assistant', role: 'assistant', text: FIXTURE.expectedAssistantText, createdAt: EPOCH + 1 },
      ],
    });
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const timer of this.tasks.values()) clearTimeout(timer);
    this.tasks.clear();
    for (const set of this.listeners.values()) for (const wake of set) wake();
    this.listeners.clear();
  }
  private check(signal: AbortSignal): void { signal.throwIfAborted(); if (this.disposed) throw new HostError('unavailable'); }
  private current(id: string): HostSnapshot { const value = this.sessions.get(id); if (!value) throw new HostError('not_found'); return value; }
  private publish(id: string): void { for (const wake of this.listeners.get(id) ?? []) wake(); }
  async listPresets(signal: AbortSignal): Promise<Preset[]> { this.check(signal); return [{ id: 'fixture', name: 'General assistant' }]; }
  async listSessions(signal: AbortSignal): Promise<HostSession[]> {
    this.check(signal);
    return [...this.sessions.values()].map((item) => ({ ...item.session })).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async snapshot(sessionId: string, signal: AbortSignal): Promise<HostSnapshot> { this.check(signal); return structuredClone(this.current(sessionId)); }
  async *watch(sessionId: string, signal: AbortSignal): AsyncIterable<HostSnapshot> {
    this.check(signal); this.current(sessionId);
    let wake: () => void = () => {};
    let changed = true;
    const notify = () => { changed = true; wake(); };
    const set = this.listeners.get(sessionId) ?? new Set<() => void>();
    this.listeners.set(sessionId, set); set.add(notify);
    signal.addEventListener('abort', notify, { once: true });
    try {
      while (!signal.aborted && !this.disposed) {
        if (changed) { changed = false; yield await this.snapshot(sessionId, signal); continue; }
        await new Promise<void>((resolve) => { wake = resolve; if (changed || signal.aborted || this.disposed) resolve(); });
      }
    } finally {
      set.delete(notify);
      if (!set.size) this.listeners.delete(sessionId);
      signal.removeEventListener('abort', notify); wake = () => {};
    }
  }
  async createSession(input: { workspaceId: string; presetId?: string; requestId: string }, signal: AbortSignal, expectedWorkspaceId: string): Promise<{ sessionId: string }> {
    this.check(signal);
    if (!this.workspaceIds.has(input.workspaceId) || input.workspaceId !== expectedWorkspaceId) throw new HostError('not_found');
    if (input.presetId !== undefined && input.presetId !== 'fixture') throw new HostError('invalid_request');
    if (!/^[0-9a-f-]{36}$/i.test(input.requestId)) throw new HostError('invalid_request');
    const sessionId = `demo-${input.requestId.toLowerCase()}`;
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { session: { id: sessionId, title: FIXTURE.createdSessionTitle, workspaceId: input.workspaceId, updatedAt: this.epoch + ++this.tick, running: false }, messages: [], cursor: -1, hasMore: false, activity: 'idle' });
    }
    return { sessionId };
  }
  async prompt(sessionId: string, text: string, requestId: string, signal: AbortSignal, expectedWorkspaceId: string): Promise<void> {
    this.check(signal);
    const current = this.current(sessionId);
    if (current.session.workspaceId !== expectedWorkspaceId) throw new HostError('not_found');
    if (!text.trim()) throw new HostError('invalid_request');
    const key = `${sessionId}:${requestId}`;
    const previous = this.requests.get(key);
    if (previous !== undefined) { if (previous !== text) throw new HostError('conflict'); return; }
    if (this.tasks.has(sessionId)) throw new HostError('conflict');
    this.requests.set(key, text);
    current.messages.push({ id: `demo-user-${requestId}`, role: 'user', text, createdAt: this.epoch + ++this.tick, requestId });
    current.session.updatedAt = this.epoch + this.tick;
    current.session.running = true; current.activity = 'running'; current.cursor++;
    const timer = setTimeout(() => {
      this.tasks.delete(sessionId);
      if (this.disposed) return;
      current.messages.push({ id: `demo-assistant-${requestId}`, role: 'assistant', text: FIXTURE.expectedAssistantText, createdAt: this.epoch + ++this.tick });
      if (current.messages.length > 100) { current.messages = current.messages.slice(-100); current.hasMore = true; }
      current.session.running = false; current.activity = 'idle'; current.cursor++;
      this.publish(sessionId);
    }, this.delay);
    this.tasks.set(sessionId, timer);
    this.publish(sessionId);
  }
  async cancel(sessionId: string, signal: AbortSignal, expectedCursor: number, expectedWorkspaceId: string): Promise<void> {
    this.check(signal);
    const current = this.current(sessionId);
    if (current.session.workspaceId !== expectedWorkspaceId) throw new HostError('not_found');
    if (!Number.isSafeInteger(expectedCursor) || expectedCursor < -1) throw new HostError('invalid_request');
    if (!current.session.running || current.cursor !== expectedCursor) throw new HostError('conflict');
    const timer = this.tasks.get(sessionId); if (timer) clearTimeout(timer);
    this.tasks.delete(sessionId);
    current.session.running = false; current.activity = 'idle'; current.cursor++;
    this.publish(sessionId);
  }
}
