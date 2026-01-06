/**
 * Goal Store Service
 * Persistent storage for autonomous goals with hierarchical support
 * Currently in-memory, designed for easy migration to PostgreSQL
 */

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';

const STORAGE_PATH = path.join(os.homedir(), 'Documents', 'Luca', 'goals.json');

class GoalStore {
    constructor() {
        this.goals = new Map();
        this.executions = new Map();
        this.state = new Map();
        this.load();
    }

    // --- PERSISTENCE ---
    load() {
        try {
            if (fs.existsSync(STORAGE_PATH)) {
                const data = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf8'));
                this.goals = new Map(data.goals || []);
                this.executions = new Map(data.executions || []);
                this.state = new Map(data.state || []);
                console.log(`[GOAL_STORE] Loaded ${this.goals.size} goals from disk`);
            }
        } catch (error) {
            console.error('[GOAL_STORE] Failed to load goals:', error);
        }
    }

    save() {
        try {
            const dir = path.dirname(STORAGE_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const data = {
                goals: Array.from(this.goals.entries()),
                executions: Array.from(this.executions.entries()),
                state: Array.from(this.state.entries())
            };
            
            fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[GOAL_STORE] Failed to save goals:', error);
        }
    }

    // --- GOAL CRUD ---
    createGoal(goalData) {
        const goal = {
            id: uuidv4(),
            description: goalData.description,
            type: goalData.type || 'ONCE', // ONCE | RECURRING
            schedule: goalData.schedule || null,
            status: 'PENDING', // PENDING | IN_PROGRESS | COMPLETED | FAILED | PAUSED
            parentGoalId: goalData.parentGoalId || null,
            priority: goalData.priority || 5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastRun: null,
            nextRun: goalData.nextRun || null,
            metadata: goalData.metadata || {}
        };

        this.goals.set(goal.id, goal);
        this.save();
        
        console.log(`[GOAL_STORE] Created goal: ${goal.id} - ${goal.description}`);
        return goal;
    }

    getGoal(goalId) {
        return this.goals.get(goalId);
    }

    getAllGoals() {
        return Array.from(this.goals.values());
    }

    getGoalsByType(type) {
        return Array.from(this.goals.values()).filter(g => g.type === type);
    }

    getGoalsByStatus(status) {
        return Array.from(this.goals.values()).filter(g => g.status === status);
    }

    getSubGoals(parentGoalId) {
        return Array.from(this.goals.values()).filter(g => g.parentGoalId === parentGoalId);
    }

    updateGoal(goalId, updates) {
        const goal = this.goals.get(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }

        Object.assign(goal, updates, { updatedAt: Date.now() });
        this.goals.set(goalId, goal);
        this.save();
        
        return goal;
    }

    updateStatus(goalId, status) {
        return this.updateGoal(goalId, { status });
    }

    deleteGoal(goalId) {
        // Also delete sub-goals
        const subGoals = this.getSubGoals(goalId);
        for (const subGoal of subGoals) {
            this.deleteGoal(subGoal.id);
        }

        this.goals.delete(goalId);
        this.executions.delete(goalId);
        this.state.delete(goalId);
        this.save();
    }

    // --- EXECUTION TRACKING ---
    logExecution(goalId, executionData) {
        const execution = {
            id: uuidv4(),
            goalId,
            startedAt: executionData.startedAt || Date.now(),
            completedAt: executionData.completedAt || null,
            status: executionData.status || 'IN_PROGRESS',
            result: executionData.result || null,
            error: executionData.error || null,
            toolCalls: executionData.toolCalls || []
        };

        if (!this.executions.has(goalId)) {
            this.executions.set(goalId, []);
        }

        this.executions.get(goalId).push(execution);
        this.save();

        return execution;
    }

    getExecutions(goalId) {
        return this.executions.get(goalId) || [];
    }

    getLatestExecution(goalId) {
        const executions = this.getExecutions(goalId);
        return executions[executions.length - 1] || null;
    }

    // --- STATE MANAGEMENT ---
    getState(goalId) {
        return this.state.get(goalId) || {
            step: 0,
            context: {},
            memory: [],
            updatedAt: Date.now()
        };
    }

    updateState(goalId, newState) {
        const currentState = this.getState(goalId);
        const mergedState = {
            ...currentState,
            ...newState,
            updatedAt: Date.now()
        };

        this.state.set(goalId, mergedState);
        this.save();

        return mergedState;
    }

    addMemory(goalId, memory) {
        const state = this.getState(goalId);
        state.memory.push({
            timestamp: Date.now(),
            content: memory
        });
        this.updateState(goalId, state);
    }

    clearState(goalId) {
        this.state.delete(goalId);
        this.save();
    }

    // --- STATISTICS ---
    getStats() {
        const goals = this.getAllGoals();
        return {
            total: goals.length,
            pending: goals.filter(g => g.status === 'PENDING').length,
            inProgress: goals.filter(g => g.status === 'IN_PROGRESS').length,
            completed: goals.filter(g => g.status === 'COMPLETED').length,
            failed: goals.filter(g => g.status === 'FAILED').length,
            recurring: goals.filter(g => g.type === 'RECURRING').length
        };
    }
}

// Singleton instance
export const goalStore = new GoalStore();
