/**
 * Goal Executor Service
 * Autonomous execution engine for goals using LLM-driven decision making
 */

import { goalStore } from './goalStore.js';

class GoalExecutor {
    constructor() {
        this.activeExecutions = new Map();
    }

    /**
     * Execute a goal autonomously
     */
    async executeGoal(goalId) {
        // Prevent concurrent executions of the same goal
        if (this.activeExecutions.has(goalId)) {
            console.log(`[GOAL_EXECUTOR] Goal ${goalId} is already executing`);
            return { success: false, error: 'Goal already executing' };
        }

        this.activeExecutions.set(goalId, true);

        try {
            const goal = goalStore.getGoal(goalId);
            if (!goal) {
                throw new Error(`Goal not found: ${goalId}`);
            }

            // Mark as in progress
            goalStore.updateStatus(goalId, 'IN_PROGRESS');
            goalStore.updateGoal(goalId, { lastRun: Date.now() });

            const execution = goalStore.logExecution(goalId, {
                status: 'IN_PROGRESS',
                startedAt: Date.now()
            });

            // Get current state
            const state = goalStore.getState(goalId);

            // Build execution context
            const context = this.buildContext(goal, state);

            // Use LLM to determine next action
            const action = await this.planNextAction(goal, state, context);

            if (!action) {
                // Goal is complete
                goalStore.updateStatus(goalId, 'COMPLETED');
                execution.status = 'COMPLETED';
                execution.completedAt = Date.now();
                execution.result = 'Goal completed successfully';
                return { success: true, isComplete: true };
            }

            // Execute the action
            const result = await this.executeAction(action, context);

            // Update state with result
            goalStore.addMemory(goalId, `Executed ${action.tool}: ${result.substring(0, 200)}`);
            goalStore.updateState(goalId, {
                lastAction: action.tool,
                lastResult: result,
                step: state.step + 1
            });

            // Check if goal is complete
            const isComplete = await this.checkCompletion(goal, state, result);

            if (isComplete) {
                goalStore.updateStatus(goalId, 'COMPLETED');
                execution.status = 'COMPLETED';
            }

            execution.completedAt = Date.now();
            execution.result = result;

            return { success: true, result, isComplete };

        } catch (error) {
            console.error(`[GOAL_EXECUTOR] Failed to execute goal ${goalId}:`, error);
            goalStore.updateStatus(goalId, 'FAILED');
            goalStore.logExecution(goalId, {
                status: 'FAILED',
                error: error.message,
                completedAt: Date.now()
            });
            return { success: false, error: error.message };
        } finally {
            this.activeExecutions.delete(goalId);
        }
    }

    /**
     * Build execution context
     */
    buildContext(goal, state) {
        return {
            goalId: goal.id,
            goalDescription: goal.description,
            currentStep: state.step,
            memory: state.memory,
            context: state.context
        };
    }

    /**
     * Use LLM to plan next action
     */
    async planNextAction(goal, state) {
        try {
            const prompt = `You are executing this goal: "${goal.description}"

Current progress:
- Step: ${state.step}
- Recent actions: ${state.memory.slice(-3).map(m => m.content).join(', ') || 'None yet'}

Available tools: searchWeb, readUrl, executeTerminalCommand, createTask, storeMemory, retrieveMemory

Determine the next action to take. If the goal is complete, respond with "COMPLETE".

Otherwise, respond with JSON:
{
  "tool": "tool_name",
  "args": {...},
  "reasoning": "why this action"
}`;

            const { default: fetch } = await import('node-fetch');
            const response = await fetch('http://localhost:3001/api/python/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are an autonomous goal executor. Be concise and actionable.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            const data = await response.json();
            const responseText = data.response || data.text || '';

            if (responseText.includes('COMPLETE')) {
                return null;
            }

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid LLM response');
            }

            return JSON.parse(jsonMatch[0]);

        } catch (error) {
            console.error('[GOAL_EXECUTOR] Failed to plan action:', error);
            throw error;
        }
    }

    /**
     * Execute a tool action via Cortex backend
     */
    async executeAction(action) {
        try {
            console.log(`[GOAL_EXECUTOR] Executing ${action.tool} with args:`, action.args);
            
            // Map tool names to Cortex API endpoints
            const toolRoutes = {
                // Web tools
                'searchWeb': { method: 'POST', path: '/api/web/search', body: action.args },
                'readUrl': { method: 'POST', path: '/api/web/read', body: action.args },
                
                // System tools
                'executeTerminalCommand': { method: 'POST', path: '/api/system/execute', body: action.args },
                'takeScreenshot': { method: 'GET', path: '/api/system/screenshot' },
                
                // Memory tools
                'storeMemory': { method: 'POST', path: '/api/memory/store', body: action.args },
                'retrieveMemory': { method: 'POST', path: '/api/memory/retrieve', body: action.args },
                
                // Task tools
                'createTask': { method: 'POST', path: '/api/tasks/create', body: action.args },
                'listTasks': { method: 'GET', path: '/api/tasks/list' },
                
                // Python tools
                'runPythonScript': { method: 'POST', path: '/api/python/execute', body: action.args },
                
                // Vision tools
                'analyzeImage': { method: 'POST', path: '/api/vision/analyze', body: action.args },
                
                // File tools
                'readFile': { method: 'POST', path: '/api/files/read', body: action.args },
                'writeFile': { method: 'POST', path: '/api/files/write', body: action.args }
            };

            const route = toolRoutes[action.tool];
            
            if (!route) {
                console.warn(`[GOAL_EXECUTOR] Unknown tool: ${action.tool}, simulating...`);
                return `Simulated execution of ${action.tool}: ${action.reasoning}`;
            }

            // Execute via Cortex API
            const { default: fetch } = await import('node-fetch');
            const url = `http://localhost:3001${route.path}`;
            
            const options = {
                method: route.method,
                headers: { 'Content-Type': 'application/json' }
            };

            if (route.body) {
                options.body = JSON.stringify(route.body);
            }

            const response = await fetch(url, options);
            const data = await response.json();

            // Format result
            if (data.error) {
                return `Error: ${data.error}`;
            }

            if (data.result) {
                return typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
            }

            return JSON.stringify(data);

        } catch (error) {
            console.error(`[GOAL_EXECUTOR] Tool execution failed:`, error);
            return `Error executing ${action.tool}: ${error.message}`;
        }
    }

    /**
     * Check if goal is complete using LLM
     */
    async checkCompletion(goal, state) {
        try {
            // Use LLM to evaluate if goal is complete
            const prompt = `Goal: "${goal.description}"

Steps taken: ${state.step}
Recent actions:
${state.memory.slice(-5).map(m => `- ${m.content}`).join('\n')}

Is this goal complete? Respond with only "YES" or "NO".`;

            const { default: fetch } = await import('node-fetch');
            const response = await fetch('http://localhost:3001/api/python/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are evaluating goal completion. Be strict - only say YES if truly complete.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            const data = await response.json();
            const responseText = (data.response || data.text || '').toUpperCase();

            return responseText.includes('YES');

        } catch (error) {
            console.error('[GOAL_EXECUTOR] Completion check failed:', error);
            // Fallback: complete after 10 steps
            return state.step >= 10;
        }
    }
}

export const goalExecutor = new GoalExecutor();
