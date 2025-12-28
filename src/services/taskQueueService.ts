/**
 * Task Queue Service
 * Manages queuing and execution of voice commands to prevent blocking
 */

import { taskProgressService } from './taskProgressService';

export interface QueuedTask {
    id: string;
    command: string;
    timestamp: number;
    status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
    priority: number;
    result?: string;
    error?: string;
    progress?: number;
    progressMessage?: string;
}

type TaskExecutor = (command: string, onProgress?: (message: string, progress?: number) => void) => Promise<string>;

class TaskQueue {
    private queue: QueuedTask[] = [];
    private running: QueuedTask | null = null;
    private maxConcurrent = 1; // Can be increased for parallel execution
    private executor: TaskExecutor | null = null;
    private onStatusChange?: (tasks: QueuedTask[]) => void;

    /**
     * Set the executor function that will run tasks
     */
    setExecutor(executor: TaskExecutor) {
        this.executor = executor;
    }

    /**
     * Set callback for status changes
     */
    onStatusUpdate(callback: (tasks: QueuedTask[]) => void) {
        this.onStatusChange = callback;
    }

    /**
     * Add a task to the queue
     */
    async add(command: string, priority = 0): Promise<string> {
        const task: QueuedTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            command,
            timestamp: Date.now(),
            status: 'pending',
            priority
        };

        this.queue.push(task);
        // Sort by priority (higher priority first)
        this.queue.sort((a, b) => b.priority - a.priority);
        
        this.notifyStatusChange();
        this.process();
        
        return task.id;
    }

    /**
     * Process the next task in queue
     */
    private async process() {
        if (this.running || this.queue.length === 0 || !this.executor) {
            return;
        }

        const task = this.queue.shift()!;
        this.running = task;
        task.status = 'running';
        this.notifyStatusChange();

        // Report task start
        taskProgressService.reportStart(task.id, 'Command', task.command);

        try {
            // Progress callback for real-time updates
            const onProgress = (message: string, progress?: number) => {
                task.progress = progress;
                task.progressMessage = message;
                taskProgressService.reportProgress(task.id, message, progress);
                this.notifyStatusChange();
            };

            const result = await this.executor(task.command, onProgress);
            task.result = result;
            task.status = 'completed';
            taskProgressService.reportCompleted(task.id, 'Task completed successfully');
        } catch (error: any) {
            task.error = error.message || 'Unknown error';
            task.status = 'failed';
            taskProgressService.reportError(task.id, error.message || 'Unknown error');
            console.error(`[TASK QUEUE] Task failed: ${task.command}`, error);
        } finally {
            this.running = null;
            this.notifyStatusChange();
            // Process next task
            this.process();
        }
    }

    /**
     * Cancel a pending task
     */
    cancel(taskId: string): boolean {
        const task = this.queue.find(t => t.id === taskId);
        if (task && task.status === 'pending') {
            task.status = 'cancelled';
            this.queue = this.queue.filter(t => t.id !== taskId);
            this.notifyStatusChange();
            return true;
        }
        
        // Can't cancel running task directly, but can mark for cancellation
        if (task && task.status === 'running') {
            console.log(`[TASK QUEUE] Cannot cancel running task ${taskId}, but it will complete soon`);
            return false;
        }
        
        return false;
    }

    /**
     * Get currently running task
     */
    getRunningTask(): QueuedTask | null {
        return this.running;
    }

    /**
     * Get all tasks
     */
    getTasks(): QueuedTask[] {
        const allTasks = this.running ? [this.running, ...this.queue] : [...this.queue];
        return allTasks;
    }

    /**
     * Get active (pending or running) tasks
     */
    getActiveTasks(): QueuedTask[] {
        return this.getTasks().filter(t => 
            t.status === 'pending' || t.status === 'running'
        );
    }

    /**
     * Clear completed tasks
     */
    clearCompleted() {
        this.queue = this.queue.filter(t => t.status !== 'completed');
        this.notifyStatusChange();
    }

    /**
     * Clear all tasks
     */
    clear() {
        // Cancel pending tasks
        this.queue.forEach(t => {
            if (t.status === 'pending') {
                t.status = 'cancelled';
            }
        });
        this.queue = [];
        // Note: Can't cancel running task, but it will complete
        this.notifyStatusChange();
    }

    /**
     * Check if queue is processing
     */
    isProcessing(): boolean {
        return this.running !== null;
    }

    /**
     * Get queue length
     */
    getLength(): number {
        return this.queue.length + (this.running ? 1 : 0);
    }

    /**
     * Notify status change
     */
    private notifyStatusChange() {
        if (this.onStatusChange) {
            this.onStatusChange(this.getTasks());
        }
    }
}

// Singleton instance
export const taskQueue = new TaskQueue();

