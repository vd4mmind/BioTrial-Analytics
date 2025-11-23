
export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  type: 'APP_OPEN' | 'SIMULATION_RUN' | 'DATA_UPLOAD' | 'DATA_EXPORT' | 'TAB_SWITCH' | 'FEEDBACK_SUBMIT' | 'PAGE_VIEW';
  metadata?: any;
}

export interface UserFeedback {
  id: string;
  timestamp: number;
  rating: number;
  comment: string;
  userId: string;
}

export interface UsageStats {
  totalSessions: number;
  totalTimeSpentSec: number;
  eventCounts: Record<string, number>;
  lastActive: number;
}

class AnalyticsAgent {
  private userId: string;
  private sessionId: string;
  private sessionStartTime: number;
  private STORAGE_KEY_EVENTS = 'biotrial_analytics_events';
  private STORAGE_KEY_FEEDBACK = 'biotrial_analytics_feedback';
  private STORAGE_KEY_USER = 'biotrial_analytics_user_id';
  private STORAGE_KEY_STATS = 'biotrial_analytics_stats';

  constructor() {
    this.userId = this.getOrCreateUserId();
    this.sessionId = crypto.randomUUID();
    this.sessionStartTime = Date.now();
    this.initSession();
  }

  private getOrCreateUserId(): string {
    let uid = localStorage.getItem(this.STORAGE_KEY_USER);
    if (!uid) {
      uid = crypto.randomUUID();
      localStorage.setItem(this.STORAGE_KEY_USER, uid);
    }
    return uid;
  }

  private initSession() {
    this.logEvent('APP_OPEN', { userAgent: navigator.userAgent });
    this.updateStats(0); // Init stats if empty
    
    // Set up periodic time tracking (every 1 minute update total time)
    setInterval(() => {
      this.updateStats(60);
    }, 60000);
  }

  private updateStats(timeDeltaSec: number) {
    const statsStr = localStorage.getItem(this.STORAGE_KEY_STATS);
    let stats: UsageStats = statsStr ? JSON.parse(statsStr) : {
      totalSessions: 0,
      totalTimeSpentSec: 0,
      eventCounts: {},
      lastActive: Date.now()
    };

    if (timeDeltaSec === 0) {
      // New session start
      stats.totalSessions += 1;
    }

    stats.totalTimeSpentSec += timeDeltaSec;
    stats.lastActive = Date.now();
    
    localStorage.setItem(this.STORAGE_KEY_STATS, JSON.stringify(stats));
  }

  public logEvent(type: AnalyticsEvent['type'], metadata?: any) {
    const event: AnalyticsEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      metadata
    };

    const existinglogs = this.getEvents();
    // Keep last 1000 events to prevent storage overflow
    const newLogs = [event, ...existinglogs].slice(0, 1000);
    
    localStorage.setItem(this.STORAGE_KEY_EVENTS, JSON.stringify(newLogs));

    // Update aggregated counts
    const statsStr = localStorage.getItem(this.STORAGE_KEY_STATS);
    if (statsStr) {
      const stats = JSON.parse(statsStr);
      stats.eventCounts[type] = (stats.eventCounts[type] || 0) + 1;
      localStorage.setItem(this.STORAGE_KEY_STATS, JSON.stringify(stats));
    }

    console.debug(`[Analytics] Logged: ${type}`, metadata);
  }

  public submitFeedback(rating: number, comment: string) {
    const feedback: UserFeedback = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      rating,
      comment,
      userId: this.userId
    };

    const existing = this.getFeedbacks();
    localStorage.setItem(this.STORAGE_KEY_FEEDBACK, JSON.stringify([feedback, ...existing]));
    this.logEvent('FEEDBACK_SUBMIT', { rating });
  }

  // --- Getters for Admin Dashboard ---

  public getEvents(): AnalyticsEvent[] {
    const str = localStorage.getItem(this.STORAGE_KEY_EVENTS);
    return str ? JSON.parse(str) : [];
  }

  public getFeedbacks(): UserFeedback[] {
    const str = localStorage.getItem(this.STORAGE_KEY_FEEDBACK);
    return str ? JSON.parse(str) : [];
  }

  public getStats(): UsageStats {
    const str = localStorage.getItem(this.STORAGE_KEY_STATS);
    return str ? JSON.parse(str) : { totalSessions: 0, totalTimeSpentSec: 0, eventCounts: {}, lastActive: 0 };
  }

  public getUserId(): string {
    return this.userId;
  }

  public clearData() {
    localStorage.removeItem(this.STORAGE_KEY_EVENTS);
    localStorage.removeItem(this.STORAGE_KEY_FEEDBACK);
    localStorage.removeItem(this.STORAGE_KEY_STATS);
    // We keep UserID to persist identity
    window.location.reload();
  }
}

// Singleton instance
export const analytics = new AnalyticsAgent();
