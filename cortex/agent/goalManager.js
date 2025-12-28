
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const GOALS_FILE = 'goals.json';

export class GoalManager {
    constructor() {
        this.filePath = path.join(process.cwd(), GOALS_FILE);
        this.goals = this.loadGoals();
    }

    loadGoals() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('[GOAL_MANAGER] Failed to load goals:', e);
        }
        return [];
    }

    saveGoals() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.goals, null, 2));
        } catch (e) {
            console.error('[GOAL_MANAGER] Failed to save goals:', e);
        }
    }

    list() {
        return this.goals;
    }

    add(description, type = 'ONCE', schedule = null, scheduledAt = null) {
        // Parse schedule if provided
        let scheduleInfo = null;
        let nextExecution = null;

        if (schedule) {
            scheduleInfo = this.parseSchedule(schedule);
            if (scheduleInfo) {
                nextExecution = scheduleInfo.nextExecution;
            }
        }

        // Use scheduledAt if provided (absolute time), otherwise use parsed schedule
        const executionTime = scheduledAt || nextExecution;

        const goal = {
            id: randomUUID(),
            description,
            type, // 'ONCE', 'RECURRING'
            schedule, // e.g., '0 9 * * *' (Cron) or 'EVERY_HOUR'
            scheduledAt: executionTime, // Absolute execution time
            status: executionTime && executionTime > Date.now() ? 'SCHEDULED' : 'PENDING', // 'PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
            createdAt: Date.now(),
            lastRun: null,
            logs: []
        };
        this.goals.push(goal);
        this.saveGoals();
        
        if (executionTime && executionTime > Date.now()) {
            const executionDate = new Date(executionTime).toISOString();
            console.log(`[GOAL_MANAGER] Added scheduled goal: ${description} (scheduled for ${executionDate})`);
        } else {
        console.log(`[GOAL_MANAGER] Added goal: ${description}`);
        }
        return goal;
    }


    remove(id) {
        const initialLength = this.goals.length;
        this.goals = this.goals.filter(g => g.id !== id);
        if (this.goals.length !== initialLength) {
            this.saveGoals();
            console.log(`[GOAL_MANAGER] Removed goal: ${id}`);
            return true;
        }
        return false;
    }

    // --- GOAL SCHEDULING METHODS (Phase 1: Schedule Parsing) ---

    /**
     * Parse schedule string into execution time
     * Supports:
     * - Cron: "0 9 * * *" (9am daily)
     * - Interval: "EVERY_HOUR", "EVERY_DAY", "EVERY_WEEK"
     * - DateTime: "2024-12-03T15:00:00Z" (ISO format)
     * - Relative: "in 5 minutes", "tomorrow at 9am"
     * - Recurring: "every 30 minutes", "every day at 3pm"
     */
    parseSchedule(schedule) {
        if (!schedule) return null;

        const now = Date.now();

        // Interval shortcuts
        const intervals = {
            'EVERY_MINUTE': 60 * 1000,
            'EVERY_HOUR': 60 * 60 * 1000,
            'EVERY_DAY': 24 * 60 * 60 * 1000,
            'EVERY_WEEK': 7 * 24 * 60 * 60 * 1000
        };

        if (intervals[schedule]) {
            return {
                type: 'INTERVAL',
                interval: intervals[schedule],
                nextExecution: now + intervals[schedule]
            };
        }

        // ISO DateTime (absolute time)
        if (schedule.includes('T') || schedule.match(/^\d{4}-\d{2}-\d{2}/)) {
            try {
                const date = new Date(schedule);
                if (!isNaN(date.getTime())) {
                    return {
                        type: 'DATETIME',
                        scheduledAt: date.getTime(),
                        nextExecution: date.getTime()
                    };
                }
            } catch (e) {
                console.warn('[GOAL_MANAGER] Invalid datetime format:', schedule);
            }
        }

        // Simple cron-like patterns (minute hour day month weekday)
        // Format: "minute hour * * *" or "*/interval unit"
        if (schedule.match(/^[\d\*\/]+\s+[\d\*\/]+\s+[\d\*\/]+\s+[\d\*\/]+\s+[\d\*\/]+$/)) {
            return {
                type: 'CRON',
                cron: schedule,
                nextExecution: this.parseCronToNextExecution(schedule)
            };
        }

        // Relative time: "in X minutes/hours/days"
        const relativeMatch = schedule.match(/in\s+(\d+)\s+(minute|hour|day|week)s?/i);
        if (relativeMatch) {
            const amount = parseInt(relativeMatch[1]);
            const unit = relativeMatch[2].toLowerCase();
            const multipliers = {
                minute: 60 * 1000,
                hour: 60 * 60 * 1000,
                day: 24 * 60 * 60 * 1000,
                week: 7 * 24 * 60 * 60 * 1000
            };
            const interval = amount * (multipliers[unit] || 0);
            return {
                type: 'RELATIVE',
                interval: interval,
                nextExecution: now + interval
            };
        }

        // Recurring: "every X minutes/hours/days"
        const recurringMatch = schedule.match(/every\s+(\d+)\s+(minute|hour|day|week)s?/i);
        if (recurringMatch) {
            const amount = parseInt(recurringMatch[1]);
            const unit = recurringMatch[2].toLowerCase();
            const multipliers = {
                minute: 60 * 1000,
                hour: 60 * 60 * 1000,
                day: 24 * 60 * 60 * 1000,
                week: 7 * 24 * 60 * 60 * 1000
            };
            const interval = amount * (multipliers[unit] || 0);
            return {
                type: 'RECURRING',
                interval: interval,
                nextExecution: now + interval
            };
        }

        console.warn('[GOAL_MANAGER] Unrecognized schedule format:', schedule);
        return null;
    }

    /**
     * Parse simple cron pattern to next execution time
     * Supports basic patterns like "0 9 * * *" (9am daily)
     */
    parseCronToNextExecution(cronPattern) {
        const parts = cronPattern.trim().split(/\s+/);
        if (parts.length !== 5) return Date.now() + 60 * 60 * 1000; // Default: 1 hour

        const [minute, hour, day, month, weekday] = parts;
        const now = new Date();
        const next = new Date();

        // Simple implementation: If hour and minute are specified, use them
        if (hour !== '*' && minute !== '*') {
            const h = hour === '*' ? now.getHours() : parseInt(hour);
            const m = minute === '*' ? now.getMinutes() : parseInt(minute);
            
            next.setHours(h, m, 0, 0);
            
            // If time has passed today, schedule for tomorrow
            if (next.getTime() <= now.getTime()) {
                next.setDate(next.getDate() + 1);
            }
            
            return next.getTime();
        }

        // Default: 1 hour from now
        return now.getTime() + 60 * 60 * 1000;
    }

    /**
     * Check if a goal is due for execution
     */
    isGoalDue(goal) {
        // If no schedule, goal is due immediately (backward compatible)
        if (!goal.schedule && !goal.scheduledAt) {
            return goal.status === 'PENDING';
        }

        // If status is not PENDING, not due
        if (goal.status !== 'PENDING') {
            return false;
        }

        const now = Date.now();

        // Check scheduledAt (absolute time)
        if (goal.scheduledAt) {
            return now >= goal.scheduledAt;
        }

        // Check schedule (parsed)
        if (goal.schedule) {
            const scheduleInfo = this.parseSchedule(goal.schedule);
            if (!scheduleInfo) return false;

            // Check if nextExecution time has arrived
            if (scheduleInfo.nextExecution && now >= scheduleInfo.nextExecution) {
                return true;
            }

            // For interval/recurring, check if enough time has passed since lastRun
            if ((scheduleInfo.type === 'INTERVAL' || scheduleInfo.type === 'RECURRING') && goal.lastRun) {
                const timeSinceLastRun = now - goal.lastRun;
                return timeSinceLastRun >= scheduleInfo.interval;
            }

            // For new recurring goals without lastRun, use nextExecution
            if ((scheduleInfo.type === 'INTERVAL' || scheduleInfo.type === 'RECURRING') && !goal.lastRun) {
                return now >= scheduleInfo.nextExecution;
            }
        }

        return false;
    }

    /**
     * Calculate next execution time for a goal
     */
    getNextExecutionTime(goal) {
        if (!goal.schedule && !goal.scheduledAt) {
            return Date.now(); // Immediate
        }

        if (goal.scheduledAt) {
            return goal.scheduledAt;
        }

        const scheduleInfo = this.parseSchedule(goal.schedule);
        if (!scheduleInfo) return Date.now();

        return scheduleInfo.nextExecution || Date.now();
    }

    // --- GOAL SCHEDULING METHODS (Phase 2: Schedule Support) ---

    /**
     * Get all goals that are due for execution
     */
    getDueGoals() {
        return this.goals.filter(goal => this.isGoalDue(goal));
    }

    /**
     * Get all scheduled goals (future executions)
     */
    getScheduledGoals() {
        return this.goals.filter(goal => 
            goal.status === 'SCHEDULED' || 
            (goal.scheduledAt && goal.scheduledAt > Date.now() && goal.status === 'PENDING')
        );
    }

    /**
     * Reschedule a recurring goal after completion
     */
    rescheduleRecurring(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return false;

        // Only reschedule if it's a recurring goal
        if (goal.type !== 'RECURRING' && !goal.schedule) {
            return false;
        }

        if (!goal.schedule) return false;

        const scheduleInfo = this.parseSchedule(goal.schedule);
        if (!scheduleInfo) return false;

        // Calculate next execution based on schedule type
        let nextExecution = Date.now();

        if (scheduleInfo.type === 'INTERVAL' || scheduleInfo.type === 'RECURRING') {
            // For intervals, add the interval to now
            nextExecution = Date.now() + scheduleInfo.interval;
        } else if (scheduleInfo.type === 'CRON') {
            // For cron, parse to next execution
            nextExecution = this.parseCronToNextExecution(goal.schedule);
            // If cron execution is in the past, add a day
            if (nextExecution <= Date.now()) {
                const next = new Date(nextExecution);
                next.setDate(next.getDate() + 1);
                nextExecution = next.getTime();
            }
        } else if (scheduleInfo.type === 'DATETIME') {
            // Absolute datetime goals don't recur
            return false;
        } else if (scheduleInfo.type === 'RELATIVE') {
            // Relative goals don't recur
            return false;
        }

        // Update goal for next execution
        goal.scheduledAt = nextExecution;
        goal.status = nextExecution > Date.now() ? 'SCHEDULED' : 'PENDING';
        goal.lastRun = Date.now();

        this.saveGoals();
        console.log(`[GOAL_MANAGER] Rescheduled recurring goal: ${goal.description} (next: ${new Date(nextExecution).toISOString()})`);
        return true;
    }

    /**
     * Update goal status, handling scheduled goals
     */
    updateStatus(id, status, log = null) {
        const goal = this.goals.find(g => g.id === id);
        if (goal) {
            const oldStatus = goal.status;
            goal.status = status;
            if (log) {
                goal.logs.push({ timestamp: Date.now(), message: log });
                // Keep logs trim
                if (goal.logs.length > 20) goal.logs.shift();
            }
            if (status === 'COMPLETED' || status === 'FAILED') {
                goal.lastRun = Date.now();

                // If it's a recurring goal, reschedule it
                if (status === 'COMPLETED' && (goal.type === 'RECURRING' || goal.schedule)) {
                    this.rescheduleRecurring(id);
                }
            }
            this.saveGoals();
            
            if (oldStatus === 'SCHEDULED' && status === 'PENDING') {
                console.log(`[GOAL_MANAGER] Goal ${id} is now due for execution`);
            }
            return true;
        }
        return false;
    }
}
