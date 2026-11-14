import Dexie, { type Table } from 'dexie';

export type StorageProviderType =
  | 'local-dexie'
  | 'google-drive'
  | 'onedrive'
  | 'dropbox';

export interface StoredStickyNote {
  id: string;
  subject: string;
  topicId: string;
  frontPrompt: string;
  backAnswer: string;
  color: 'yellow' | 'mint' | 'amber' | 'coral';
  rotationClass: string;
  masteryStatus: 'MASTERED' | 'SPACED_DUE' | 'WEAK_POINT' | 'NEW';
  intervalDays?: number;
  easeFactor?: number;
  nextReviewAt?: number;
  updatedAt: number;
}

export interface StoredBackpackFile {
  id: string;
  name: string;
  sizeBytes: number;
  type: 'pdf' | 'notes' | 'video-transcript';
  subject: string;
  chunks: string[];
  uploadedAt: number;
}

export interface StoredCornellNote {
  id: string;
  subject: string;
  topicId: string;
  cues: string;
  notes: string;
  summary: string;
  updatedAt: number;
}

export interface StoredDeskMeta {
  userXP: number;
  streakCount: number;
  currentSubject: string;
  syllabusBoard: string;
  topicBadges: Record<string, string>;
}

export interface DeskSnapshotArchive {
  formatVersion: '1.0.0-desk';
  exportedAt: string;
  studentCallsign: string;
  userXP: number;
  streakCount: number;
  currentSubject: string;
  syllabusBoard: string;
  topicBadges: Record<string, string>;
  stickyNotes: StoredStickyNote[];
  backpackFiles: StoredBackpackFile[];
  cornellNotes: StoredCornellNote[];
}

class StudyDeskDatabase extends Dexie {
  stickyNotes!: Table<StoredStickyNote, string>;
  backpackFiles!: Table<StoredBackpackFile, string>;
  cornellNotes!: Table<StoredCornellNote, string>;
  kvMeta!: Table<{ key: string; value: string }, string>;

  constructor() {
    super('BarnabyStudyDeskDB');
    this.version(1).stores({
      stickyNotes: 'id, subject, topicId, masteryStatus, updatedAt',
      backpackFiles: 'id, subject, type, uploadedAt',
      cornellNotes: 'id, subject, topicId, updatedAt',
      kvMeta: 'key',
    });
  }
}

export const deskDb =
  typeof window !== 'undefined' ? new StudyDeskDatabase() : null;

export class BYOSStorageAdapter {
  private activeProvider: StorageProviderType = 'local-dexie';
  private cloudConnected: Record<StorageProviderType, boolean> = {
    'local-dexie': true,
    'google-drive': false,
    onedrive: false,
    dropbox: false,
  };

  public getProvider(): StorageProviderType {
    return this.activeProvider;
  }

  public setProvider(provider: StorageProviderType) {
    this.activeProvider = provider;
  }

  public isProviderConnected(provider: StorageProviderType): boolean {
    return this.cloudConnected[provider];
  }

  public toggleCloudConnection(provider: StorageProviderType): boolean {
    if (provider === 'local-dexie') return true;
    this.cloudConnected[provider] = !this.cloudConnected[provider];
    if (this.cloudConnected[provider]) {
      this.activeProvider = provider;
    } else if (this.activeProvider === provider) {
      this.activeProvider = 'local-dexie';
    }
    return this.cloudConnected[provider];
  }

  /**
   * Saves a binary/JSON snapshot to Origin Private File System (WebOPFS) if supported,
   * in addition to Dexie IndexedDB.
   */
  public async persistToOPFS(
    filename: string,
    content: string
  ): Promise<boolean> {
    if (typeof window === 'undefined' || !('storage' in navigator)) {
      return false;
    }
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch {
      return false;
    }
  }

  public async saveStickyNotes(notes: StoredStickyNote[]): Promise<void> {
    if (!deskDb) return;
    await deskDb.stickyNotes.clear();
    await deskDb.stickyNotes.bulkPut(notes);
  }

  public async loadStickyNotes(): Promise<StoredStickyNote[]> {
    if (!deskDb) return [];
    return deskDb.stickyNotes.toArray();
  }

  public async saveBackpackFiles(files: StoredBackpackFile[]): Promise<void> {
    if (!deskDb) return;
    await deskDb.backpackFiles.clear();
    await deskDb.backpackFiles.bulkPut(files);
  }

  public async loadBackpackFiles(): Promise<StoredBackpackFile[]> {
    if (!deskDb) return [];
    return deskDb.backpackFiles.toArray();
  }

  public async saveCornellNote(note: StoredCornellNote): Promise<void> {
    if (!deskDb) return;
    await deskDb.cornellNotes.put(note);
  }

  public async loadCornellNotes(): Promise<StoredCornellNote[]> {
    if (!deskDb) return [];
    return deskDb.cornellNotes.toArray();
  }

  public async saveDeskMeta(meta: StoredDeskMeta): Promise<void> {
    if (!deskDb) return;
    await deskDb.kvMeta.put({
      key: 'desk-meta-v1',
      value: JSON.stringify(meta),
    });
  }

  public async loadDeskMeta(): Promise<StoredDeskMeta | null> {
    if (!deskDb) return null;
    const record = await deskDb.kvMeta.get('desk-meta-v1');
    if (!record) return null;
    try {
      return JSON.parse(record.value) as StoredDeskMeta;
    } catch {
      return null;
    }
  }

  /**
   * Exports a zero-cloud `.desk` archive file containing all student mastery state,
   * sticky notes, RAG backpack chunks, and Cornell notes.
   */
  public async exportDeskArchive(
    snapshot: DeskSnapshotArchive
  ): Promise<void> {
    const serialized = JSON.stringify(snapshot, null, 2);
    await this.persistToOPFS('latest-backup.desk', serialized);

    if (typeof window === 'undefined') return;
    const blob = new Blob([serialized], {
      type: 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `barnaby-study-desk-${snapshot.currentSubject.toLowerCase()}-${dateStamp}.desk`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Imports and validates a `.desk` archive file.
   */
  public async parseDeskArchive(file: File): Promise<DeskSnapshotArchive> {
    const text = await file.text();
    const parsed = JSON.parse(text) as DeskSnapshotArchive;
    if (!parsed || parsed.formatVersion !== '1.0.0-desk') {
      throw new Error('Invalid .desk archive signature');
    }
    if (deskDb) {
      if (Array.isArray(parsed.stickyNotes)) {
        await this.saveStickyNotes(parsed.stickyNotes);
      }
      if (Array.isArray(parsed.backpackFiles)) {
        await this.saveBackpackFiles(parsed.backpackFiles);
      }
      if (Array.isArray(parsed.cornellNotes)) {
        for (const cn of parsed.cornellNotes) {
          await this.saveCornellNote(cn);
        }
      }
      await this.saveDeskMeta({
        userXP: parsed.userXP,
        streakCount: parsed.streakCount,
        currentSubject: parsed.currentSubject,
        syllabusBoard: parsed.syllabusBoard,
        topicBadges: parsed.topicBadges || {},
      });
    }
    return parsed;
  }
}

export const storageAdapter = new BYOSStorageAdapter();
