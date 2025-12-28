import { Task, TaskStatus, TaskPriority, CalendarEvent } from "../types";

const TASK_STORAGE_KEY = "LUCA_TASK_DB_V1";
const CALENDAR_STORAGE_KEY = "LUCA_CALENDAR_DB_V1";

export const taskService = {
  // --- TASK MANAGEMENT ---

  getTasks(): Task[] {
    try {
      const stored = localStorage.getItem(TASK_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e: any) {
      console.error(
        "[TASK] Failed to parse stored tasks. Attempting recovery.",
        e.message
      );
      // ACTIONABLE FIX: If corrupted, back up the corrupted data and reset to prevent persistent failure
      const corrupted = localStorage.getItem(TASK_STORAGE_KEY);
      if (corrupted) {
        localStorage.setItem(
          `${TASK_STORAGE_KEY}_CORRUPTED_${Date.now()}`,
          corrupted
        );
        localStorage.removeItem(TASK_STORAGE_KEY);
      }
      return [];
    }
  },

  addTask(
    title: string,
    priority: TaskPriority,
    description?: string,
    deadline?: number
  ): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      description,
      priority,
      status: TaskStatus.PENDING,
      createdAt: Date.now(),
      deadline,
    };
    tasks.push(newTask);
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
    return newTask;
  },

  updateTaskStatus(taskId: string, status: TaskStatus): Task | null {
    const tasks = this.getTasks();
    const index = tasks.findIndex(
      (t) =>
        t.id === taskId || t.title.toLowerCase().includes(taskId.toLowerCase())
    );

    if (index !== -1) {
      tasks[index].status = status;
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
      return tasks[index];
    }
    return null;
  },

  updateTask(taskId: string, updates: Partial<Task>): Task | null {
    const tasks = this.getTasks();
    const index = tasks.findIndex(
      (t) =>
        t.id === taskId || t.title.toLowerCase().includes(taskId.toLowerCase())
    );

    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
      return tasks[index];
    }
    return null;
  },

  deleteTask(taskId: string): boolean {
    const tasks = this.getTasks();
    const initialLength = tasks.length;
    const filtered = tasks.filter(
      (t) =>
        t.id !== taskId && !t.title.toLowerCase().includes(taskId.toLowerCase())
    );

    if (filtered.length < initialLength) {
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(filtered));
      return true;
    }
    return false;
  },

  updateTaskPriority(taskId: string, priority: TaskPriority): Task | null {
    return this.updateTask(taskId, { priority });
  },

  updateTaskDeadline(taskId: string, deadline: number): Task | null {
    return this.updateTask(taskId, { deadline });
  },

  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getTasks().filter((t) => t.status === status);
  },

  getTasksByPriority(priority: TaskPriority): Task[] {
    return this.getTasks().filter((t) => t.priority === priority);
  },

  getTask(taskId: string): Task | null {
    const tasks = this.getTasks();
    return (
      tasks.find(
        (t) =>
          t.id === taskId ||
          t.title.toLowerCase().includes(taskId.toLowerCase())
      ) || null
    );
  },

  // --- CALENDAR MANAGEMENT ---

  getEvents(): CalendarEvent[] {
    try {
      const stored = localStorage.getItem(CALENDAR_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e: any) {
      console.error(
        "[CALENDAR] Failed to parse stored events. Attempting recovery.",
        e.message
      );
      // ACTIONABLE FIX: If corrupted, back up and reset
      const corrupted = localStorage.getItem(CALENDAR_STORAGE_KEY);
      if (corrupted) {
        localStorage.setItem(
          `${CALENDAR_STORAGE_KEY}_CORRUPTED_${Date.now()}`,
          corrupted
        );
        localStorage.removeItem(CALENDAR_STORAGE_KEY);
      }
      return [];
    }
  },

  addEvent(
    title: string,
    startTime: number,
    durationHours: number,
    type: CalendarEvent["type"]
  ): CalendarEvent {
    const events = this.getEvents();
    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title,
      startTime,
      endTime: startTime + durationHours * 3600000,
      type,
    };
    events.push(newEvent);
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events));
    return newEvent;
  },

  // --- CONTEXT FOR AI ---

  getManagementContext(): string {
    const tasks = this.getTasks().filter(
      (t) => t.status !== TaskStatus.COMPLETED
    );
    const events = this.getEvents().filter((e) => e.startTime > Date.now());

    let context = "CURRENT TASK QUEUE:\n";
    if (tasks.length === 0) context += "(Empty)\n";
    else
      context +=
        tasks
          .map((t) => `[${t.priority}] ${t.title} (${t.status})`)
          .join("\n") + "\n";

    context += "\nUPCOMING SCHEDULE:\n";
    if (events.length === 0) context += "(No events)\n";
    else
      context += events
        .map((e) => `${new Date(e.startTime).toLocaleString()}: ${e.title}`)
        .join("\n");

    return context;
  },
};
