import { v4 as uuid } from 'uuid';
import { doc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  BoardState, Card, Column, Swimlane, Label, TeamMember,
  Notification, FilterState, Priority, Comment, ChecklistItem, TrashItem, ArchiveItem
} from '../types';

const STORAGE_KEY = 'kanban-board-state';

function createDefaultState(): BoardState {
  const columns: Column[] = [
    { id: 'col-backlog', title: 'Backlog', wipLimit: 0, order: 0, color: '#94a3b8' },
    { id: 'col-todo', title: 'To Do', wipLimit: 5, order: 1, color: '#6366f1' },
    { id: 'col-progress', title: 'In Progress', wipLimit: 3, order: 2, color: '#f59e0b' },
    { id: 'col-review', title: 'Review', wipLimit: 2, order: 3, color: '#8b5cf6' },
    { id: 'col-done', title: 'Done', wipLimit: 0, order: 4, color: '#10b981' },
  ];
  const swimlanes: Swimlane[] = [
    { id: 'swim-default', title: 'Default', order: 0, collapsed: false },
  ];
  const labels: Label[] = [
    { id: 'lbl-bug', name: 'Bug', color: '#ef4444' },
    { id: 'lbl-feature', name: 'Feature', color: '#3b82f6' },
    { id: 'lbl-improvement', name: 'Improvement', color: '#10b981' },
    { id: 'lbl-urgent', name: 'Urgent', color: '#f97316' },
    { id: 'lbl-design', name: 'Design', color: '#ec4899' },
    { id: 'lbl-research', name: 'Research', color: '#8b5cf6' },
  ];
  const members: TeamMember[] = [
    { id: 'user-1', name: 'You', email: 'you@team.com', avatar: '', role: 'admin' },
  ];
  return {
    columns, swimlanes, cards: [], labels, members,
    notifications: [], activityLog: [],
    filters: { search: '', assigneeIds: [], labelIds: [], priorities: [], dueDateRange: { from: null, to: null } },
    savedColors: ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'],
    theme: 'light',
    trash: [],
    archive: [],
  };
}

function loadState(): BoardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.savedColors) {
        parsed.savedColors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
      }
      if (!parsed.theme) {
        parsed.theme = 'light';
      }
      if (!parsed.trash) parsed.trash = [];
      if (!parsed.archive) parsed.archive = [];
      if (parsed.cards) {
        parsed.cards.forEach((c: Card) => {
          if (!c.checklist) c.checklist = [];
          c.checklist.forEach((item: any) => {
            if (item.assigneeId === undefined) item.assigneeId = null;
          });
          if (c.startDate === undefined) c.startDate = null;
        });
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return createDefaultState();
}

function migrateState(parsed: any): BoardState {
  if (!parsed.savedColors) {
    parsed.savedColors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];
  }
  if (!parsed.theme) parsed.theme = 'light';
  if (!parsed.columns) parsed.columns = [];
  if (!parsed.swimlanes) parsed.swimlanes = [];
  if (!parsed.cards) parsed.cards = [];
  if (!parsed.labels) parsed.labels = [];
  if (!parsed.members) parsed.members = [];
  if (!parsed.notifications) parsed.notifications = [];
  if (!parsed.activityLog) parsed.activityLog = [];
  if (!parsed.trash) parsed.trash = [];
  if (!parsed.archive) parsed.archive = [];
  if (!parsed.filters) parsed.filters = { search: '', assigneeIds: [], labelIds: [], priorities: [], dueDateRange: { from: null, to: null } };

  parsed.cards.forEach((c: Card) => {
    if (!c.checklist) c.checklist = [];
    c.checklist.forEach((item: any) => {
      if (item.assigneeId === undefined) item.assigneeId = null;
    });
    if (c.startDate === undefined) c.startDate = null;
  });
  return parsed as BoardState;
}

type Listener = () => void;

class BoardStore {
  private state: BoardState;
  private listeners: Set<Listener> = new Set();
  private userId: string | null = null;
  private firestoreUnsub: Unsubscribe | null = null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private ignoreNextSnapshot = false;
  selectedCardId: string | null = null;

  constructor() {
    this.state = loadState();
  }

  openCard(cardId: string) {
    this.selectedCardId = cardId;
    this.listeners.forEach(l => l());
  }

  closeCard() {
    this.selectedCardId = null;
    this.listeners.forEach(l => l());
  }

  // --- Firebase sync ---
  setUser(userId: string | null, displayName?: string, email?: string, photoURL?: string) {
    // Unsubscribe from previous user's data
    if (this.firestoreUnsub) {
      this.firestoreUnsub();
      this.firestoreUnsub = null;
    }

    // If a different user is signing in on this browser, reset local state so the
    // previous user's board doesn't flash or leak into the new user's session.
    if (this.userId && userId && this.userId !== userId) {
      localStorage.removeItem(STORAGE_KEY);
      this.state = createDefaultState();
    }

    this.userId = userId;

    if (!userId) {
      this.listeners.forEach(l => l());
      return;
    }

    // One-time, idempotent migration: rewrite lingering 'user-1' references to
    // the signed-in user's Firebase UID across members, cards, checklists,
    // comments (recursive), reactions, activity log, trash, archive, filters.
    this.migrateUser1ToUid(userId);
    this.updateOwnProfile(userId, displayName, email, photoURL);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.listeners.forEach(l => l());

    // Listen for realtime updates from Firestore
    const docRef = doc(db, 'boards', userId);
    this.firestoreUnsub = onSnapshot(docRef, (snapshot) => {
      if (this.ignoreNextSnapshot) {
        this.ignoreNextSnapshot = false;
        return;
      }
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.boardState) {
          const cloudState = migrateState(JSON.parse(data.boardState));
          // Preserve local-only state (filters, theme)
          cloudState.filters = this.state.filters;
          cloudState.theme = this.state.theme;
          this.state = cloudState;
          // Cloud doc may still reference 'user-1' if it was saved by an older build.
          this.migrateUser1ToUid(userId);
          this.updateOwnProfile(userId, displayName, email, photoURL);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
          this.listeners.forEach(l => l());
        }
      } else {
        // No cloud data yet — push local data up
        this.saveToFirestore();
      }
    });
  }

  private updateOwnProfile(uid: string, displayName?: string, email?: string, photoURL?: string) {
    const me = this.state.members.find(m => m.id === uid);
    if (me) {
      if (displayName) me.name = displayName;
      if (email) me.email = email;
      if (photoURL !== undefined) me.avatar = photoURL || '';
    } else {
      // No member record for this UID yet — add one so assignee/author lookups resolve.
      this.state.members.push({
        id: uid,
        name: displayName || 'You',
        email: email || '',
        avatar: photoURL || '',
        role: 'admin',
      });
    }
  }

  private migrateUser1ToUid(newUid: string): boolean {
    if (newUid === 'user-1') return false;
    let mutated = false;
    const rewriteId = (id: string | null | undefined) => {
      if (id === 'user-1') { mutated = true; return newUid; }
      return id;
    };

    // Members: promote user-1's record to the new UID (or drop it if a record for
    // newUid already exists on this board).
    const meIdx = this.state.members.findIndex(m => m.id === 'user-1');
    if (meIdx !== -1) {
      const existing = this.state.members.find(m => m.id === newUid);
      if (existing) {
        this.state.members.splice(meIdx, 1);
      } else {
        this.state.members[meIdx].id = newUid;
      }
      mutated = true;
    }

    // Cards: assignee, checklist assignees, comments (recursive), reactions
    const rewriteCommentTree = (arr: Comment[]) => {
      arr.forEach(cm => {
        cm.authorId = rewriteId(cm.authorId) as string;
        if (cm.reactions) {
          Object.keys(cm.reactions).forEach(emoji => {
            cm.reactions![emoji] = cm.reactions![emoji].map(uid => {
              if (uid === 'user-1') { mutated = true; return newUid; }
              return uid;
            });
          });
        }
        if (cm.replies) rewriteCommentTree(cm.replies);
      });
    };
    this.state.cards.forEach(c => {
      c.assigneeId = rewriteId(c.assigneeId) ?? null;
      if (c.checklist) c.checklist.forEach(i => { i.assigneeId = rewriteId(i.assigneeId) ?? null; });
      if (c.comments) rewriteCommentTree(c.comments);
    });

    // Activity log
    this.state.activityLog.forEach(a => { a.userId = rewriteId(a.userId) as string; });

    // Trash
    this.state.trash.forEach(t => {
      if (t.type === 'card') {
        const card = t.data as Card;
        card.assigneeId = rewriteId(card.assigneeId) ?? null;
        if (card.checklist) card.checklist.forEach(i => { i.assigneeId = rewriteId(i.assigneeId) ?? null; });
        if (card.comments) rewriteCommentTree(card.comments);
      }
      if (t.associatedCards) {
        t.associatedCards.forEach(card => {
          card.assigneeId = rewriteId(card.assigneeId) ?? null;
          if (card.checklist) card.checklist.forEach(i => { i.assigneeId = rewriteId(i.assigneeId) ?? null; });
          if (card.comments) rewriteCommentTree(card.comments);
        });
      }
    });

    // Archive
    this.state.archive.forEach(a => {
      if (a.type === 'card') {
        const card = a.data as Card;
        card.assigneeId = rewriteId(card.assigneeId) ?? null;
        if (card.checklist) card.checklist.forEach(i => { i.assigneeId = rewriteId(i.assigneeId) ?? null; });
        if (card.comments) rewriteCommentTree(card.comments);
      }
      if (a.associatedCards) {
        a.associatedCards.forEach(card => {
          card.assigneeId = rewriteId(card.assigneeId) ?? null;
          if (card.checklist) card.checklist.forEach(i => { i.assigneeId = rewriteId(i.assigneeId) ?? null; });
          if (card.comments) rewriteCommentTree(card.comments);
        });
      }
    });

    // Filter state (assignee filter chips)
    if (this.state.filters.assigneeIds.includes('user-1')) {
      this.state.filters.assigneeIds = this.state.filters.assigneeIds.map(id => id === 'user-1' ? newUid : id);
      mutated = true;
    }

    return mutated;
  }

  getCurrentMemberId(): string {
    return this.userId || 'user-1';
  }

  private saveToFirestore() {
    if (!this.userId) return;

    // Debounce Firestore writes to avoid excessive API calls
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(async () => {
      try {
        this.ignoreNextSnapshot = true;
        const docRef = doc(db, 'boards', this.userId!);
        // Save state without filters (they're local-only)
        const stateToSave = { ...this.state };
        stateToSave.filters = { search: '', assigneeIds: [], labelIds: [], priorities: [], dueDateRange: { from: null, to: null } };
        await setDoc(docRef, {
          boardState: JSON.stringify(stateToSave),
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to save to Firestore:', err);
        this.ignoreNextSnapshot = false;
      }
    }, 1000);
  }

  private save() {
    this.state = { ...this.state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.listeners.forEach(l => l());
    // Also push to Firestore if user is logged in
    this.saveToFirestore();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getState(): BoardState { return this.state; }

  private logActivity(cardId: string, userId: string, action: string, detail: string) {
    this.state.activityLog.unshift({
      id: uuid(), cardId, userId, action, detail, timestamp: new Date().toISOString(),
    });
    if (this.state.activityLog.length > 500) this.state.activityLog.length = 500;
  }

  private addNotification(message: string, type: Notification['type'] = 'info', cardId?: string) {
    this.state.notifications.unshift({
      id: uuid(), message, type, read: false, timestamp: new Date().toISOString(), cardId,
    });
    if (this.state.notifications.length > 100) this.state.notifications.length = 100;
  }

  // --- Cards ---
  addCard(partial: Partial<Card> & { title: string; columnId: string }) {
    const card: Card = {
      id: uuid(),
      title: partial.title,
      description: partial.description || '',
      assigneeId: partial.assigneeId || null,
      startDate: partial.startDate || null,
      dueDate: partial.dueDate || null,
      priority: partial.priority || 'medium',
      labels: partial.labels || [],
      comments: [],
      attachments: [],
      checklist: [],
      columnId: partial.columnId,
      swimlaneId: partial.swimlaneId || this.state.swimlanes[0]?.id || 'swim-default',
      order: this.state.cards.filter(c => c.columnId === partial.columnId).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const col = this.state.columns.find(c => c.id === card.columnId);
    if (col && col.wipLimit > 0) {
      const count = this.state.cards.filter(c => c.columnId === col.id).length;
      if (count >= col.wipLimit) {
        this.addNotification(`WIP limit reached for "${col.title}" (${col.wipLimit})`, 'warning', card.id);
      }
    }

    this.state.cards.push(card);
    this.logActivity(card.id, this.getCurrentMemberId(), 'created', `Created card "${card.title}"`);
    this.addNotification(`Card "${card.title}" created`, 'success', card.id);
    this.save();
    return card;
  }

  updateCard(cardId: string, updates: Partial<Card>) {
    const idx = this.state.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return;
    const card = this.state.cards[idx];
    const oldColumnId = card.columnId;
    Object.assign(card, updates, { updatedAt: new Date().toISOString() });

    if (updates.columnId && updates.columnId !== oldColumnId) {
      const newCol = this.state.columns.find(c => c.id === updates.columnId);
      const oldCol = this.state.columns.find(c => c.id === oldColumnId);
      if (newCol && newCol.wipLimit > 0) {
        const count = this.state.cards.filter(c => c.columnId === newCol.id).length;
        if (count > newCol.wipLimit) {
          this.addNotification(`WIP limit exceeded for "${newCol.title}" (${count}/${newCol.wipLimit})`, 'warning', cardId);
        }
      }
      this.logActivity(cardId, this.getCurrentMemberId(), 'moved', `Moved "${card.title}" from ${oldCol?.title} to ${newCol?.title}`);
    } else {
      this.logActivity(cardId, this.getCurrentMemberId(), 'updated', `Updated "${card.title}"`);
    }
    this.save();
  }

  deleteCard(cardId: string) {
    const card = this.state.cards.find(c => c.id === cardId);
    if (card) {
      // Move to trash instead of permanent delete
      const trashItem: TrashItem = {
        id: uuid(),
        type: 'card',
        data: { ...card },
        deletedAt: new Date().toISOString(),
      };
      this.state.trash.push(trashItem);
      this.state.cards = this.state.cards.filter(c => c.id !== cardId);
      this.logActivity(cardId, this.getCurrentMemberId(), 'deleted', `Moved card "${card.title}" to trash`);
      this.addNotification(`Card "${card.title}" moved to trash`, 'info', cardId);
    }
    this.cleanupTrash();
    this.save();
  }

  moveCard(cardId: string, toColumnId: string, toSwimlaneId: string, newOrder: number) {
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card) return;
    const oldColumnId = card.columnId;
    card.columnId = toColumnId;
    card.swimlaneId = toSwimlaneId;
    card.order = newOrder;
    card.updatedAt = new Date().toISOString();

    const siblings = this.state.cards
      .filter(c => c.columnId === toColumnId && c.swimlaneId === toSwimlaneId && c.id !== cardId)
      .sort((a, b) => a.order - b.order);
    siblings.splice(newOrder, 0, card);
    siblings.forEach((c, i) => { c.order = i; });

    if (oldColumnId !== toColumnId) {
      const newCol = this.state.columns.find(c => c.id === toColumnId);
      const oldCol = this.state.columns.find(c => c.id === oldColumnId);
      if (newCol && newCol.wipLimit > 0) {
        const count = this.state.cards.filter(c => c.columnId === newCol.id).length;
        if (count > newCol.wipLimit) {
          this.addNotification(`WIP limit exceeded for "${newCol.title}" (${count}/${newCol.wipLimit})`, 'warning', cardId);
        }
      }
      this.logActivity(cardId, this.getCurrentMemberId(), 'moved', `Moved "${card.title}" from ${oldCol?.title} to ${newCol?.title}`);
    }
    this.save();
  }

  private getCard(cardId: string) {
    return this.state.cards.find(c => c.id === cardId);
  }

  private findCommentInTree(comments: Comment[], commentId: string): Comment | undefined {
    for (const node of comments) {
      if (node.id === commentId) return node;
      if (node.replies) {
        const found = this.findCommentInTree(node.replies, commentId);
        if (found) return found;
      }
    }
    return undefined;
  }

  addComment(cardId: string, text: string, scheduledAt?: string) {
    const card = this.getCard(cardId);
    if (!card) return;
    const me = this.getCurrentMemberId();
    const comment: Comment = { id: uuid(), authorId: me, text, createdAt: new Date().toISOString(), scheduledAt };
    card.comments.push(comment);
    if (scheduledAt) {
      this.logActivity(cardId, me, 'scheduled', `Scheduled a comment on "${card.title}"`);
    } else {
      this.logActivity(cardId, me, 'commented', `Commented on "${card.title}"`);
    }
    this.save();
  }

  addReply(cardId: string, commentId: string, text: string) {
    const card = this.getCard(cardId);
    if (!card) return;
    const comment = this.findCommentInTree(card.comments, commentId);
    if (!comment) return;
    if (!comment.replies) comment.replies = [];
    const reply: Comment = { id: uuid(), authorId: this.getCurrentMemberId(), text, createdAt: new Date().toISOString() };
    comment.replies.push(reply);
    this.save();
  }

  editComment(cardId: string, commentId: string, newText: string) {
    const card = this.getCard(cardId);
    if (!card) return;
    const comment = this.findCommentInTree(card.comments, commentId);
    if (!comment) return;
    comment.text = newText;
    this.save();
  }

  toggleReaction(cardId: string, commentId: string, emoji: string) {
    const card = this.getCard(cardId);
    if (!card) return;
    const comment = this.findCommentInTree(card.comments, commentId);
    if (!comment) return;
    if (!comment.reactions) comment.reactions = {};
    const userId = this.getCurrentMemberId();
    if (!comment.reactions[emoji]) {
      comment.reactions[emoji] = [userId];
    } else if (comment.reactions[emoji].includes(userId)) {
      comment.reactions[emoji] = comment.reactions[emoji].filter(id => id !== userId);
      if (comment.reactions[emoji].length === 0) delete comment.reactions[emoji];
    } else {
      comment.reactions[emoji].push(userId);
    }
    this.save();
  }

  deleteComment(cardId: string, commentId: string) {
    const card = this.getCard(cardId);
    if (!card) return;
    const comment = this.findCommentInTree(card.comments, commentId);
    if (!comment) return;
    comment.deleted = true;
    comment.deletedAt = new Date().toISOString();
    comment.text = '';
    comment.reactions = {};
    this.logActivity(cardId, this.getCurrentMemberId(), 'updated', `Deleted a comment on "${card.title}"`);
    this.save();
  }

  // --- Checklist ---
  addChecklistItem(cardId: string, text: string, assigneeId: string | null = null) {
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card) return;
    if (!card.checklist) card.checklist = [];
    const item: ChecklistItem = { id: uuid(), text, checked: false, assigneeId };
    card.checklist.push(item);
    this.logActivity(cardId, this.getCurrentMemberId(), 'updated', `Added checklist item "${text}" to "${card.title}"`);
    this.save();
    return item;
  }

  updateChecklistItemAssignee(cardId: string, itemId: string, assigneeId: string | null) {
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card) return;
    const item = card.checklist?.find(i => i.id === itemId);
    if (item) {
      item.assigneeId = assigneeId;
      this.save();
    }
  }

  toggleChecklistItem(cardId: string, itemId: string) {
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card) return;
    const item = card.checklist?.find(i => i.id === itemId);
    if (item) {
      item.checked = !item.checked;
      this.save();
    }
  }

  deleteChecklistItem(cardId: string, itemId: string) {
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card) return;
    card.checklist = card.checklist.filter(i => i.id !== itemId);
    this.save();
  }

  // --- Attachments ---
  addAttachment(cardId: string, url: string) {
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card) return;
    card.attachments.push(url);
    this.logActivity(cardId, this.getCurrentMemberId(), 'updated', `Added attachment to "${card.title}"`);
    this.save();
  }

  removeAttachment(cardId: string, index: number) {
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card) return;
    card.attachments.splice(index, 1);
    this.save();
  }

  // --- Columns ---
  addColumn(title: string) {
    this.state.columns.push({
      id: uuid(), title, wipLimit: 0,
      order: this.state.columns.length,
      color: '#6366f1',
    });
    this.save();
  }

  updateColumn(colId: string, updates: Partial<Column>) {
    const col = this.state.columns.find(c => c.id === colId);
    if (col) { Object.assign(col, updates); this.save(); }
  }

  reorderColumns(fromIndex: number, toIndex: number) {
    const sorted = [...this.state.columns].sort((a, b) => a.order - b.order);
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, moved);
    sorted.forEach((col, i) => { col.order = i; });
    this.save();
  }

  deleteColumn(colId: string) {
    const col = this.state.columns.find(c => c.id === colId);
    if (col) {
      const associatedCards = this.state.cards.filter(c => c.columnId === colId).map(c => ({ ...c }));
      const trashItem: TrashItem = {
        id: uuid(),
        type: 'column',
        data: { ...col },
        deletedAt: new Date().toISOString(),
        associatedCards,
      };
      this.state.trash.push(trashItem);
      this.state.cards = this.state.cards.filter(c => c.columnId !== colId);
      this.state.columns = this.state.columns.filter(c => c.id !== colId);
      this.logActivity(colId, this.getCurrentMemberId(), 'deleted', `Moved list "${col.title}" to trash`);
    }
    this.cleanupTrash();
    this.save();
  }

  // --- Swimlanes ---
  addSwimlane(title: string) {
    this.state.swimlanes.push({ id: uuid(), title, order: this.state.swimlanes.length, collapsed: false });
    this.save();
  }

  updateSwimlane(id: string, updates: Partial<Swimlane>) {
    const s = this.state.swimlanes.find(sl => sl.id === id);
    if (s) { Object.assign(s, updates); this.save(); }
  }

  deleteSwimlane(id: string) {
    if (this.state.swimlanes.length <= 1) return;
    const fallback = this.state.swimlanes.find(s => s.id !== id);
    if (fallback) {
      this.state.cards.forEach(c => { if (c.swimlaneId === id) c.swimlaneId = fallback.id; });
    }
    this.state.swimlanes = this.state.swimlanes.filter(s => s.id !== id);
    this.save();
  }

  // --- Labels ---
  addLabel(name: string, color: string) {
    const label: Label = { id: uuid(), name, color };
    this.state.labels.push(label);
    this.save();
    return label;
  }

  deleteLabel(id: string) {
    this.state.labels = this.state.labels.filter(l => l.id !== id);
    this.state.cards.forEach(c => { c.labels = c.labels.filter(l => l !== id); });
    this.save();
  }

  // --- Members ---
  addMember(name: string, email: string, role: TeamMember['role'] = 'member') {
    const member: TeamMember = { id: uuid(), name, email, avatar: '', role };
    this.state.members.push(member);
    this.save();
    return member;
  }

  updateMember(id: string, updates: Partial<TeamMember>) {
    const m = this.state.members.find(mem => mem.id === id);
    if (m) { Object.assign(m, updates); this.save(); }
  }

  deleteMember(id: string) {
    this.state.members = this.state.members.filter(m => m.id !== id);
    this.state.cards.forEach(c => { if (c.assigneeId === id) c.assigneeId = null; });
    this.save();
  }

  // --- Notifications ---
  markNotificationRead(id: string) {
    const n = this.state.notifications.find(notif => notif.id === id);
    if (n) { n.read = true; this.save(); }
  }

  markAllNotificationsRead() {
    this.state.notifications.forEach(n => { n.read = true; });
    this.save();
  }

  clearNotifications() {
    this.state.notifications = [];
    this.save();
  }

  // --- Filters ---
  setFilters(filters: Partial<FilterState>) {
    Object.assign(this.state.filters, filters);
    this.save();
  }

  clearFilters() {
    this.state.filters = { search: '', assigneeIds: [], labelIds: [], priorities: [], dueDateRange: { from: null, to: null } };
    this.save();
  }

  getFilteredCards(): Card[] {
    const f = this.state.filters;
    return this.state.cards.filter(card => {
      if (f.search && !card.title.toLowerCase().includes(f.search.toLowerCase()) &&
        !card.description.toLowerCase().includes(f.search.toLowerCase())) return false;
      if (f.assigneeIds.length && (!card.assigneeId || !f.assigneeIds.includes(card.assigneeId))) return false;
      if (f.labelIds.length && !card.labels.some(l => f.labelIds.includes(l))) return false;
      if (f.priorities.length && !f.priorities.includes(card.priority)) return false;
      return true;
    });
  }

  // --- Analytics helpers ---
  getCardsPerColumn() {
    return this.state.columns.map(col => ({
      name: col.title,
      count: this.state.cards.filter(c => c.columnId === col.id).length,
      color: col.color,
    }));
  }

  getCardsByPriority() {
    const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
    return priorities.map(p => ({
      name: p,
      count: this.state.cards.filter(c => c.priority === p).length,
    }));
  }

  getThroughput(days: number = 30) {
    const now = new Date();
    const entries = this.state.activityLog.filter(e => {
      if (e.action !== 'moved') return false;
      const doneCol = this.state.columns.find(c => c.title === 'Done');
      if (!doneCol || !e.detail.includes(doneCol.title)) return false;
      const diff = (now.getTime() - new Date(e.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= days;
    });
    return entries.length;
  }

  // --- Theme ---
  setTheme(theme: 'light' | 'dark') {
    this.state.theme = theme;
    this.save();
  }

  // --- Saved Colors ---
  addSavedColor(color: string) {
    if (!this.state.savedColors.includes(color)) {
      this.state.savedColors.push(color);
      this.save();
    }
  }

  removeSavedColor(color: string) {
    this.state.savedColors = this.state.savedColors.filter(c => c !== color);
    this.save();
  }

  resetBoard() {
    // Preserve the signed-in user's profile across the reset so they don't
    // lose their name/email/avatar when wiping the board.
    const currentMe = this.userId
      ? this.state.members.find(m => m.id === this.userId)
      : null;
    const profileSnapshot = currentMe
      ? { name: currentMe.name, email: currentMe.email, avatar: currentMe.avatar, role: currentMe.role }
      : null;

    this.state = createDefaultState();

    if (this.userId) {
      this.migrateUser1ToUid(this.userId);
      if (profileSnapshot) {
        const me = this.state.members.find(m => m.id === this.userId);
        if (me) {
          me.name = profileSnapshot.name;
          me.email = profileSnapshot.email;
          me.avatar = profileSnapshot.avatar;
          me.role = profileSnapshot.role;
        }
      }
    }
    this.save();
  }

  // --- Trash ---
  private cleanupTrash() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    this.state.trash = this.state.trash.filter(item => new Date(item.deletedAt) > thirtyDaysAgo);
  }

  restoreFromTrash(trashId: string) {
    const trashItem = this.state.trash.find(t => t.id === trashId);
    if (!trashItem) return;

    if (trashItem.type === 'card') {
      const card = trashItem.data as Card;
      // Check if column still exists, otherwise put in first column
      const colExists = this.state.columns.some(c => c.id === card.columnId);
      if (!colExists && this.state.columns.length > 0) {
        card.columnId = this.state.columns[0].id;
      }
      card.order = this.state.cards.filter(c => c.columnId === card.columnId).length;
      this.state.cards.push(card);
      this.logActivity(card.id, this.getCurrentMemberId(), 'restored', `Restored card "${card.title}" from trash`);
      this.addNotification(`Card "${card.title}" restored`, 'success', card.id);
    } else if (trashItem.type === 'column') {
      const col = trashItem.data as Column;
      col.order = this.state.columns.length;
      this.state.columns.push(col);
      // Restore associated cards
      if (trashItem.associatedCards) {
        trashItem.associatedCards.forEach(card => {
          card.columnId = col.id;
          this.state.cards.push(card);
        });
      }
      this.logActivity(col.id, this.getCurrentMemberId(), 'restored', `Restored list "${col.title}" from trash`);
      this.addNotification(`List "${col.title}" restored with its cards`, 'success');
    }

    this.state.trash = this.state.trash.filter(t => t.id !== trashId);
    this.save();
  }

  permanentDeleteFromTrash(trashId: string) {
    this.state.trash = this.state.trash.filter(t => t.id !== trashId);
    this.save();
  }

  emptyTrash() {
    this.state.trash = [];
    this.save();
  }

  getTrash(): TrashItem[] {
    this.cleanupTrash();
    return this.state.trash.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }

  // --- Archive ---
  archiveCard(cardId: string) {
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card) return;
    const archiveItem: ArchiveItem = {
      id: uuid(),
      type: 'card',
      data: { ...card },
      archivedAt: new Date().toISOString(),
    };
    this.state.archive.push(archiveItem);
    this.state.cards = this.state.cards.filter(c => c.id !== cardId);
    this.logActivity(cardId, this.getCurrentMemberId(), 'archived', `Archived card "${card.title}"`);
    this.addNotification(`Card "${card.title}" archived`, 'info', cardId);
    this.save();
  }

  archiveColumn(colId: string) {
    const col = this.state.columns.find(c => c.id === colId);
    if (!col) return;
    const associatedCards = this.state.cards.filter(c => c.columnId === colId).map(c => ({ ...c }));
    const archiveItem: ArchiveItem = {
      id: uuid(),
      type: 'column',
      data: { ...col },
      archivedAt: new Date().toISOString(),
      associatedCards,
    };
    this.state.archive.push(archiveItem);
    this.state.cards = this.state.cards.filter(c => c.columnId !== colId);
    this.state.columns = this.state.columns.filter(c => c.id !== colId);
    this.logActivity(colId, this.getCurrentMemberId(), 'archived', `Archived list "${col.title}"`);
    this.addNotification(`List "${col.title}" archived`, 'info');
    this.save();
  }

  restoreFromArchive(archiveId: string) {
    const item = this.state.archive.find(a => a.id === archiveId);
    if (!item) return;

    if (item.type === 'card') {
      const card = item.data as Card;
      const colExists = this.state.columns.some(c => c.id === card.columnId);
      if (!colExists && this.state.columns.length > 0) {
        card.columnId = this.state.columns[0].id;
      }
      card.order = this.state.cards.filter(c => c.columnId === card.columnId).length;
      this.state.cards.push(card);
      this.logActivity(card.id, this.getCurrentMemberId(), 'restored', `Restored card "${card.title}" from archive`);
      this.addNotification(`Card "${card.title}" restored from archive`, 'success', card.id);
    } else if (item.type === 'column') {
      const col = item.data as Column;
      col.order = this.state.columns.length;
      this.state.columns.push(col);
      if (item.associatedCards) {
        item.associatedCards.forEach(card => {
          card.columnId = col.id;
          this.state.cards.push(card);
        });
      }
      this.logActivity(col.id, this.getCurrentMemberId(), 'restored', `Restored list "${col.title}" from archive`);
      this.addNotification(`List "${col.title}" restored from archive`, 'success');
    }

    this.state.archive = this.state.archive.filter(a => a.id !== archiveId);
    this.save();
  }

  deleteFromArchive(archiveId: string) {
    this.state.archive = this.state.archive.filter(a => a.id !== archiveId);
    this.save();
  }

  getArchive(): ArchiveItem[] {
    return this.state.archive.sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());
  }
}

export const store = new BoardStore();
