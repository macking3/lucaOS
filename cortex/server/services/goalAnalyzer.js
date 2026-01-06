/**
 * Goal Analyzer Service
 * Analyzes conversations and system state to autonomously create goals
 */

import { goalStore } from './goalStore.js';

class GoalAnalyzer {
    constructor() {
        this.settings = {
            mode: 'confirm', // manual | confirm | autonomous
            enabled: true,
            minPriority: 7,
            autoApproveAfter: 60000, // 60 seconds
            categories: {
                reminders: true,
                research: true,
                automation: false,
                optimization: false
            }
        };
        this.pendingApprovals = new Map();
    }

    /**
     * Analyze a message for actionable goals
     */
    async analyzeMessage(message, conversationHistory = []) {
        if (!this.settings.enabled) {
            return [];
        }

        try {
            console.log('[GOAL_ANALYZER] Analyzing message for autonomous goals...');
            
            const intents = await this.extractIntents(message, conversationHistory);
            const createdGoals = [];

            for (const intent of intents) {
                if (this.shouldCreateGoal(intent)) {
                    const goal = await this.createGoalFromIntent(intent);
                    if (goal) {
                        createdGoals.push(goal);
                    }
                }
            }

            return createdGoals;

        } catch (error) {
            console.error('[GOAL_ANALYZER] Analysis failed:', error);
            return [];
        }
    }

    /**
     * Extract actionable intents from conversation using LLM
     */
    async extractIntents(message, history) {
        try {
            const recentHistory = history.slice(-5).map(m => 
                `${m.sender === 'user' ? 'User' : 'Luca'}: ${m.text}`
            ).join('\n');

            const prompt = `You are Luca's autonomous goal analyzer. Analyze this conversation and identify actionable goals.

Recent conversation:
${recentHistory}

Latest message: "${message}"

Identify goals that Luca should create. Consider:
- Reminders (meetings, deadlines, tasks)
- Research requests (learning, information gathering)
- Automation opportunities (recurring tasks)
- System optimizations (performance, cleanup)

Return goals in this JSON format:
[
  {
    "type": "reminder|research|automation|optimization",
    "description": "Clear, actionable goal description",
    "trigger": "when to execute (e.g., 'tomorrow at 2pm', 'every day at 9am', 'immediately')",
    "priority": 1-10,
    "reasoning": "why this goal is needed",
    "category": "reminders|research|automation|optimization"
  }
]

Rules:
- Only suggest goals with priority >= 7
- Be specific with triggers (include dates/times if mentioned)
- Don't create goals for casual conversation
- Return empty array [] if no actionable goals found

Examples:
User: "I have a meeting tomorrow at 2pm" 
→ [{"type":"reminder","description":"Remind about meeting 15 minutes before","trigger":"tomorrow at 1:45pm","priority":9,"reasoning":"Time-sensitive event mentioned","category":"reminders"}]

User: "I need to learn about quantum computing"
→ [{"type":"research","description":"Research quantum computing and compile summary","trigger":"immediately","priority":7,"reasoning":"User expressed learning intent","category":"research"}]

User: "How's the weather?"
→ []`;

            const { default: fetch } = await import('node-fetch');
            const response = await fetch('http://localhost:3001/api/python/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are an autonomous goal analyzer. Always return valid JSON.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            const data = await response.json();
            const responseText = data.response || data.text || '';

            // Extract JSON from response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return [];
            }

            const intents = JSON.parse(jsonMatch[0]);
            console.log(`[GOAL_ANALYZER] Extracted ${intents.length} intents`);
            return intents;

        } catch (error) {
            console.error('[GOAL_ANALYZER] Intent extraction failed:', error);
            return [];
        }
    }

    /**
     * Determine if a goal should be created
     */
    shouldCreateGoal(intent) {
        // Check priority threshold
        if (intent.priority < this.settings.minPriority) {
            console.log(`[GOAL_ANALYZER] Skipping low priority goal: ${intent.description}`);
            return false;
        }

        // Check if category is enabled
        if (!this.settings.categories[intent.category]) {
            console.log(`[GOAL_ANALYZER] Category disabled: ${intent.category}`);
            return false;
        }

        // Check for duplicates
        if (this.isDuplicate(intent)) {
            console.log(`[GOAL_ANALYZER] Duplicate goal detected: ${intent.description}`);
            return false;
        }

        return true;
    }

    /**
     * Check if similar goal already exists
     */
    isDuplicate(intent) {
        const existingGoals = goalStore.getAllGoals();
        
        // Simple duplicate check - can be enhanced with fuzzy matching
        return existingGoals.some(goal => 
            goal.description.toLowerCase().includes(intent.description.toLowerCase().slice(0, 20)) &&
            goal.status !== 'COMPLETED'
        );
    }

    /**
     * Create a goal from an intent
     */
    async createGoalFromIntent(intent) {
        try {
            const schedule = this.parseSchedule(intent.trigger);
            
            const goalData = {
                description: intent.description,
                type: schedule.recurring ? 'RECURRING' : 'ONCE',
                schedule: schedule.cron,
                priority: intent.priority,
                metadata: {
                    source: 'autonomous',
                    reasoning: intent.reasoning,
                    createdBy: 'luca',
                    category: intent.category,
                    originalIntent: intent
                }
            };

            // Create goal based on mode
            if (this.settings.mode === 'autonomous') {
                // Create and approve immediately
                const goal = goalStore.createGoal(goalData);
                console.log(`[AUTONOMOUS] Created goal: ${goal.description}`);
                return goal;
            } else {
                // Create with pending approval
                const goal = goalStore.createGoal({
                    ...goalData,
                    status: 'PAUSED' // Paused until approved
                });

                // Set up auto-approval timer
                this.setupApprovalTimer(goal);
                
                // Emit event for frontend notification
                this.emitGoalCreated(goal);
                
                console.log(`[CONFIRM] Created goal pending approval: ${goal.description}`);
                return goal;
            }

        } catch (error) {
            console.error('[GOAL_ANALYZER] Goal creation failed:', error);
            return null;
        }
    }

    /**
     * Parse natural language trigger to cron schedule
     */
    parseSchedule(trigger) {
        const lower = trigger.toLowerCase();

        // Recurring patterns
        if (lower.includes('every day')) {
            return { recurring: true, cron: '0 9 * * *' }; // 9am daily
        }
        if (lower.includes('every week')) {
            return { recurring: true, cron: '0 9 * * 1' }; // 9am Monday
        }
        if (lower.includes('every hour')) {
            return { recurring: true, cron: '0 * * * *' };
        }

        // One-time patterns
        if (lower.includes('tomorrow')) {
            const timeMatch = lower.match(/(\d+):?(\d+)?\s*(am|pm)?/);
            if (timeMatch) {
                // Will be handled by goal executor to calculate exact time
                return { recurring: false, cron: null };
            }
        }

        if (lower.includes('immediately') || lower.includes('now')) {
            return { recurring: false, cron: null };
        }

        return { recurring: false, cron: null };
    }

    /**
     * Set up auto-approval timer
     */
    setupApprovalTimer(goal) {
        const timerId = setTimeout(() => {
            this.approveGoal(goal.id, true); // true = auto-approved
        }, this.settings.autoApproveAfter);

        this.pendingApprovals.set(goal.id, timerId);
    }

    /**
     * Approve a pending goal
     */
    approveGoal(goalId, autoApproved = false) {
        try {
            const goal = goalStore.getGoal(goalId);
            if (!goal) return;

            // Clear timer
            const timerId = this.pendingApprovals.get(goalId);
            if (timerId) {
                clearTimeout(timerId);
                this.pendingApprovals.delete(goalId);
            }

            // Activate goal
            goalStore.updateStatus(goalId, 'PENDING');
            
            console.log(`[GOAL_ANALYZER] Goal ${autoApproved ? 'auto-' : ''}approved: ${goal.description}`);
            
            // Emit event
            this.emitGoalApproved(goal, autoApproved);

        } catch (error) {
            console.error('[GOAL_ANALYZER] Approval failed:', error);
        }
    }

    /**
     * Reject a pending goal
     */
    rejectGoal(goalId) {
        try {
            const goal = goalStore.getGoal(goalId);
            if (!goal) return;

            // Clear timer
            const timerId = this.pendingApprovals.get(goalId);
            if (timerId) {
                clearTimeout(timerId);
                this.pendingApprovals.delete(goalId);
            }

            // Delete goal
            goalStore.deleteGoal(goalId);
            
            console.log(`[GOAL_ANALYZER] Goal rejected: ${goal.description}`);
            
            // Emit event
            this.emitGoalRejected(goal);

        } catch (error) {
            console.error('[GOAL_ANALYZER] Rejection failed:', error);
        }
    }

    /**
     * Emit events for frontend notifications
     */
    emitGoalCreated(goal) {
        // Will be wired to WebSocket/EventEmitter for real-time notifications
        console.log(`[EVENT] goal_created:`, goal.id);
    }

    emitGoalApproved(goal, autoApproved) {
        console.log(`[EVENT] goal_approved:`, goal.id, { autoApproved });
    }

    emitGoalRejected(goal) {
        console.log(`[EVENT] goal_rejected:`, goal.id);
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('[GOAL_ANALYZER] Settings updated:', this.settings);
    }

    /**
     * Get current settings
     */
    getSettings() {
        return this.settings;
    }
}

// Singleton instance
export const goalAnalyzer = new GoalAnalyzer();
