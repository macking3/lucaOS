/**
 * Task Progress Service
 * Manages real-time progress updates and status communication for voice interactions
 */

export interface TaskProgress {
    taskId: string;
    toolName: string;
    status: 'starting' | 'progress' | 'completing' | 'completed' | 'error';
    message: string;
    progress?: number; // 0-100
    timestamp: number;
}

type ProgressCallback = (progress: TaskProgress) => void;
type StatusCallback = (status: string) => void;

class TaskProgressService {
    private progressCallbacks = new Map<string, ProgressCallback>();
    private statusCallbacks: StatusCallback[] = [];
    private activeTasks = new Map<string, {
        toolName: string;
        startTime: number;
        progress: number;
    }>();

    /**
     * Register a callback for task progress updates
     */
    onProgress(taskId: string, callback: ProgressCallback) {
        this.progressCallbacks.set(taskId, callback);
    }

    /**
     * Unregister progress callback
     */
    offProgress(taskId: string) {
        this.progressCallbacks.delete(taskId);
    }

    /**
     * Register a callback for general status updates (for voice)
     */
    onStatusUpdate(callback: StatusCallback) {
        this.statusCallbacks.push(callback);
    }

    /**
     * Unregister status callback
     */
    offStatusUpdate(callback: StatusCallback) {
        this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    }

    /**
     * Report task starting
     */
    reportStart(taskId: string, toolName: string, message: string) {
        this.activeTasks.set(taskId, {
            toolName,
            startTime: Date.now(),
            progress: 0
        });

        const progress: TaskProgress = {
            taskId,
            toolName,
            status: 'starting',
            message,
            progress: 0,
            timestamp: Date.now()
        };

        this.notifyProgress(taskId, progress);
        this.notifyStatus(`Starting ${toolName}...`);
    }

    /**
     * Report task progress
     */
    reportProgress(taskId: string, message: string, progressPercent?: number) {
        const task = this.activeTasks.get(taskId);
        if (!task) return;

        const progress = progressPercent !== undefined 
            ? progressPercent 
            : Math.min(task.progress + 10, 90); // Auto-increment if not specified

        task.progress = progress;

        const progressUpdate: TaskProgress = {
            taskId,
            toolName: task.toolName,
            status: 'progress',
            message,
            progress,
            timestamp: Date.now()
        };

        this.notifyProgress(taskId, progressUpdate);
        this.notifyStatus(message);
    }

    /**
     * Report task completing
     */
    reportCompleting(taskId: string, message: string) {
        const task = this.activeTasks.get(taskId);
        if (!task) return;

        const progressUpdate: TaskProgress = {
            taskId,
            toolName: task.toolName,
            status: 'completing',
            message,
            progress: 95,
            timestamp: Date.now()
        };

        this.notifyProgress(taskId, progressUpdate);
        this.notifyStatus(message);
    }

    /**
     * Report task completed
     */
    reportCompleted(taskId: string, message: string) {
        const task = this.activeTasks.get(taskId);
        if (!task) return;

        const progressUpdate: TaskProgress = {
            taskId,
            toolName: task.toolName,
            status: 'completed',
            message,
            progress: 100,
            timestamp: Date.now()
        };

        this.notifyProgress(taskId, progressUpdate);
        this.notifyStatus(message);
        this.activeTasks.delete(taskId);
    }

    /**
     * Report task error
     */
    reportError(taskId: string, error: string) {
        const task = this.activeTasks.get(taskId);
        if (!task) return;

        const progressUpdate: TaskProgress = {
            taskId,
            toolName: task.toolName,
            status: 'error',
            message: `Error: ${error}`,
            timestamp: Date.now()
        };

        this.notifyProgress(taskId, progressUpdate);
        this.notifyStatus(`Task failed: ${error}`);
        this.activeTasks.delete(taskId);
    }

    /**
     * Get active tasks
     */
    getActiveTasks(): string[] {
        return Array.from(this.activeTasks.keys());
    }

    /**
     * Check if task is active
     */
    isTaskActive(taskId: string): boolean {
        return this.activeTasks.has(taskId);
    }

    /**
     * Notify progress callback
     */
    private notifyProgress(taskId: string, progress: TaskProgress) {
        const callback = this.progressCallbacks.get(taskId);
        if (callback) {
            callback(progress);
        }
    }

    /**
     * Notify status callbacks (for voice)
     */
    private notifyStatus(message: string) {
        this.statusCallbacks.forEach(callback => {
            try {
                callback(message);
            } catch (e) {
                console.error('[TASK PROGRESS] Status callback error:', e);
            }
        });
    }
}

// Singleton instance
export const taskProgressService = new TaskProgressService();

