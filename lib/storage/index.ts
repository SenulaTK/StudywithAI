import Dexie, { type Table } from 'dexie';

export type StorageProviderType = 'local-dexie';

export const DESK_SCHEMA_VERSION = 'clean-v2';

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

export interface StoredNotebookSubject {
  id: string;
  name: string;
  syllabusBoard: string;
  createdAt: number;
}

export interface StoredDiagnosticQuestion {
  id: string;
  bloomsLevel:
    | 'Remember'
    | 'Understand'
    | 'Apply'
    | 'Analyze'
    | 'Evaluate'
    | 'Create';
  question: string;
  formulaLatex?: string;
  options: string[];
  correctIndex: number;
  socraticExplanation: string;
  xpReward: number;
}

export interface StoredRoadmapTopicNode {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  subject: string;
  status: 'LOCKED' | 'UNLOCKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  spacedDue?: boolean;
  weakPoint?: boolean;
  coreLatex: string;
  coreLatexCaption: string;
  initialBarnabyGreeting: string;
  initialSocraticQuestion: string;
  initialHints: string[];
  diagnosticQuestions: StoredDiagnosticQuestion[];
  labExpression?: string;
}

export interface StoredDialogueTurn {
  id: string;
  role: 'barnaby' | 'student';
  text: string;
  socraticFollowUp?: string;
  bloomsLevel?:
    | 'Remember'
    | 'Understand'
    | 'Apply'
    | 'Analyze'
    | 'Evaluate'
    | 'Create';
  latexFormula?: string;
  latexCaption?: string;
  hintSteps?: string[];
  keyUsed?: 'KEY_1' | 'KEY_2' | 'KEY_3' | 'LOCAL_WEBGPU';
  timestamp: string;
}

export interface StoredDeskMeta {
  schemaVersion?: string;
  userXP: number;
  streakCount: number;
  lastStudyDate?: string | null;
  currentSubject: string;
  syllabusBoard: string;
  activeTopicId?: string;
  subjects?: StoredNotebookSubject[];
  roadmapState?: StoredRoadmapTopicNode[];
  workbookDialogues?: Record<string, StoredDialogueTurn[]>;
  quizCompletedIds?: Record<string, boolean>;
  selectedAnswers?: Record<string, number>;
  topicBadges: Record<string, string>;
}

export interface DeskSnapshotArchive {
  formatVersion: '1.0.0-desk' | '2.0.0-desk';
  schemaVersion?: string;
  exportedAt: string;
  userXP: number;
  streakCount: number;
  lastStudyDate?: string | null;
  currentSubject: string;
  syllabusBoard: string;
  activeTopicId?: string;
  subjects?: StoredNotebookSubject[];
  roadmapState?: StoredRoadmapTopicNode[];
  workbookDialogues?: Record<string, StoredDialogueTurn[]>;
  quizCompletedIds?: Record<string, boolean>;
  selectedAnswers?: Record<string, number>;
  topicBadges: Record<string, string>;
  stickyNotes: StoredStickyNote[];
  backpackFiles: StoredBackpackFile[];
  cornellNotes: StoredCornellNote[];
}

export const CUSTOM_GEMINI_KEYS_STORAGE_KEY = 'barnaby_gemini_custom_keys';

class StudyDeskDatabase extends Dexie {
  stickyNotes!: Table<StoredStickyNote, string>;
  backpackFiles!: Table<StoredBackpackFile, string>;
  cornellNotes!: Table<StoredCornellNote, string>;
  kvMeta!: Table<{ key: string; value: string }, string>;

  constructor() {
    super('BarnabyStudyDeskCleanDB');
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

  public getProvider(): StorageProviderType {
    return this.activeProvider;
  }

  /**
   * Removes legacy pre-production IndexedDB data so previously-visited browsers
   * start cleanly without leftover demo subjects.
   */
  public async purgeLegacyDemoDb(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      await Dexie.delete('BarnabyStudyDeskDB');
    } catch {
      // Ignore deletion errors if browser restricts IndexedDB
    }
  }

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

  public async removeFromOPFS(filename: string): Promise<void> {
    if (typeof window === 'undefined' || !('storage' in navigator)) return;
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(filename);
    } catch {
      // Ignore if file does not exist or OPFS is unavailable
    }
  }

  public async saveStickyNotes(notes: StoredStickyNote[]): Promise<void> {
    if (!deskDb) return;
    await deskDb.stickyNotes.clear();
    if (notes.length > 0) {
      await deskDb.stickyNotes.bulkPut(notes);
    }
  }

  public async loadStickyNotes(): Promise<StoredStickyNote[]> {
    if (!deskDb) return [];
    return deskDb.stickyNotes.toArray();
  }

  public async saveBackpackFiles(files: StoredBackpackFile[]): Promise<void> {
    if (!deskDb) return;
    await deskDb.backpackFiles.clear();
    if (files.length > 0) {
      await deskDb.backpackFiles.bulkPut(files);
    }
  }

  public async loadBackpackFiles(): Promise<StoredBackpackFile[]> {
    if (!deskDb) return [];
    return deskDb.backpackFiles.toArray();
  }

  public async saveCornellNote(note: StoredCornellNote): Promise<void> {
    if (!deskDb) return;
    await deskDb.cornellNotes.put(note);
  }

  public async saveCornellNotes(notes: StoredCornellNote[]): Promise<void> {
    if (!deskDb) return;
    await deskDb.cornellNotes.clear();
    if (notes.length > 0) {
      await deskDb.cornellNotes.bulkPut(notes);
    }
  }

  public async loadCornellNotes(): Promise<StoredCornellNote[]> {
    if (!deskDb) return [];
    return deskDb.cornellNotes.toArray();
  }

  public async saveDeskMeta(meta: StoredDeskMeta): Promise<void> {
    if (!deskDb) return;
    await deskDb.kvMeta.put({
      key: 'desk-meta-clean-v2',
      value: JSON.stringify({
        ...meta,
        schemaVersion: DESK_SCHEMA_VERSION,
      }),
    });
  }

  public async loadDeskMeta(): Promise<StoredDeskMeta | null> {
    if (!deskDb) return null;
    const record = await deskDb.kvMeta.get('desk-meta-clean-v2');
    if (!record) return null;
    try {
      const parsed = JSON.parse(record.value) as StoredDeskMeta;
      if (parsed.schemaVersion !== DESK_SCHEMA_VERSION) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Wipes all local workspace notebooks, notes, flashcards, files, and metadata cleanly.
   */
  public async clearAllDeskData(): Promise<void> {
    await this.purgeLegacyDemoDb();
    if (deskDb) {
      await Promise.all([
        deskDb.stickyNotes.clear(),
        deskDb.backpackFiles.clear(),
        deskDb.cornellNotes.clear(),
        deskDb.kvMeta.clear(),
      ]);
    }
    await this.removeFromOPFS('latest-backup.desk');
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(CUSTOM_GEMINI_KEYS_STORAGE_KEY);
      } catch {
        // Ignore storage restrictions
      }
    }
  }

  /**
   * Exports a zero-cloud `.desk` archive file containing all user mastery state,
   * notebooks, topics, dialogues, sticky notes, backpack files, and Cornell notes.
   */
  public async exportDeskArchive(
    snapshot: DeskSnapshotArchive
  ): Promise<void> {
    const serialized = JSON.stringify(
      { ...snapshot, schemaVersion: DESK_SCHEMA_VERSION },
      null,
      2
    );
    await this.persistToOPFS('latest-backup.desk', serialized);

    if (typeof window === 'undefined') return;
    const blob = new Blob([serialized], {
      type: 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const slug = (snapshot.currentSubject || 'workspace')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    a.href = url;
    a.download = `barnaby-study-desk-${slug || 'workspace'}-${dateStamp}.desk`;
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
    if (
      !parsed ||
      (parsed.formatVersion !== '1.0.0-desk' &&
        parsed.formatVersion !== '2.0.0-desk')
    ) {
      throw new Error('Invalid .desk archive signature');
    }
    if (deskDb) {
      await deskDb.stickyNotes.clear();
      if (Array.isArray(parsed.stickyNotes) && parsed.stickyNotes.length > 0) {
        await this.saveStickyNotes(parsed.stickyNotes);
      }
      await deskDb.backpackFiles.clear();
      if (
        Array.isArray(parsed.backpackFiles) &&
        parsed.backpackFiles.length > 0
      ) {
        await this.saveBackpackFiles(parsed.backpackFiles);
      }
      await deskDb.cornellNotes.clear();
      if (Array.isArray(parsed.cornellNotes)) {
        for (const cn of parsed.cornellNotes) {
          await this.saveCornellNote(cn);
        }
      }
      await this.saveDeskMeta({
        schemaVersion: DESK_SCHEMA_VERSION,
        userXP: parsed.userXP || 0,
        streakCount: parsed.streakCount || 0,
        lastStudyDate: parsed.lastStudyDate ?? null,
        currentSubject: parsed.currentSubject || '',
        syllabusBoard: parsed.syllabusBoard || '',
        activeTopicId: parsed.activeTopicId || '',
        subjects: parsed.subjects || [],
        roadmapState: parsed.roadmapState || [],
        workbookDialogues: parsed.workbookDialogues || {},
        quizCompletedIds: parsed.quizCompletedIds || {},
        selectedAnswers: parsed.selectedAnswers || {},
        topicBadges: parsed.topicBadges || {},
      });
    }
    return parsed;
  }
}

export const storageAdapter = new BYOSStorageAdapter();
