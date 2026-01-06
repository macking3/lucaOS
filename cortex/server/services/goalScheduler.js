/**
 * Goal Scheduler Service
 * Cron-based scheduler for recurring goals
 */

import cron from 'node-cron';
import { goalStore } from './goalStore.js';
import { goalExecutor } from './goalExecutor.js';

class GoalScheduler {
    constructor() {
        this.jobs = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize scheduler and load recurring goals
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('[GOAL_SCHEDULER] Already initialized');
            return;
        }

        console.log('[GOAL_SCHEDULER] Initializing...');
        
        const recurringGoals = goalStore.getGoalsByType('RECURRING');
        console.log(`[GOAL_SCHEDULER] Found ${recurringGoals.length} recurring goals`);

        for (const goal of recurringGoals) {
            if (goal.status !== 'PAUSED') {
                this.scheduleGoal(goal);
            }
        }

        this.isInitialized = true;
        console.log('[GOAL_SCHEDULER] Initialization complete');
    }

    /**
     * Schedule a recurring goal
     */
    scheduleGoal(goal) {
        // Stop existing job if any
        if (this.jobs.has(goal.id)) {
            this.jobs.get(goal.id).stop();
        }

        if (!goal.schedule) {
            console.warn(`[GOAL_SCHEDULER] Goal ${goal.id} has no schedule`);
            return;
        }

        try {
            const cronExpression = this.parseToCron(goal.schedule);
            
            const job = cron.schedule(cronExpression, async () => {
                console.log(`[GOAL_SCHEDULER] Executing recurring goal: ${goal.description}`);
                
                try {
                    await goalExecutor.executeGoal(goal.id);
                } catch (error) {
                    console.error(`[GOAL_SCHEDULER] Failed to execute goal ${goal.id}:`, error);
                }
            });

            this.jobs.set(goal.id, job);
            console.log(`[GOAL_SCHEDULER] Scheduled goal ${goal.id}: ${goal.schedule} (${cronExpression})`);

        } catch (error) {
            console.error(`[GOAL_SCHEDULER] Failed to schedule goal ${goal.id}:`, error);
        }
    }

    /**
     * Unschedule a goal
     */
    unscheduleGoal(goalId) {
        const job = this.jobs.get(goalId);
        if (job) {
            job.stop();
            this.jobs.delete(goalId);
            console.log(`[GOAL_SCHEDULER] Unscheduled goal ${goalId}`);
        }
    }

    /**
     * Pause a goal's schedule
     */
    pauseGoal(goalId) {
        this.unscheduleGoal(goalId);
        goalStore.updateStatus(goalId, 'PAUSED');
    }

    /**
     * Resume a paused goal
     */
    resumeGoal(goalId) {
        const goal = goalStore.getGoal(goalId);
        if (goal && goal.type === 'RECURRING') {
            goalStore.updateStatus(goalId, 'PENDING');
            this.scheduleGoal(goal);
        }
    }

    /**
     * Convert natural language schedule to cron expression
     */
    parseToCron(schedule) {
        const normalized = schedule.toLowerCase().trim();

        const patterns = {
            'every minute': '* * * * *',
            'every 5 minutes': '*/5 * * * *',
            'every 10 minutes': '*/10 * * * *',
            'every 15 minutes': '*/15 * * * *',
            'every 30 minutes': '*/30 * * * *',
            'every hour': '0 * * * *',
            'every 2 hours': '0 */2 * * *',
            'every 6 hours': '0 */6 * * *',
            'every day': '0 0 * * *',
            'every week': '0 0 * * 0',
            'every month': '0 0 1 * *'
        };

        // Check if it's already a cron expression (5 parts separated by spaces)
        if (/^[\d*/,-]+ [\d*/,-]+ [\d*/,-]+ [\d*/,-]+ [\d*/,-]+$/.test(normalized)) {
            return normalized;
        }

        return patterns[normalized] || '0 * * * *'; // Default to hourly
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            activeJobs: this.jobs.size,
            jobs: Array.from(this.jobs.keys())
        };
    }
}

// Singleton instance
export const goalScheduler = new GoalScheduler();
