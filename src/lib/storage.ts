export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // تجاهل أخطاء امتلاء الذاكرة أو تعطيل التخزين المحلي
    }
  },

  getString(key: string, fallback = ''): string {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },

  setString(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // تجاهل
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // تجاهل
    }
  },
};
