
import { GoogleGenAI } from "@google/genai";
import { headlessTools, headlessToolsDefinitions } from './headlessTools.js';

export class LifeLoop {
    constructor(apiKey, goalManager = null) {
        this.apiKey = apiKey;
        this.goalManager = goalManager;
        this.intervalId = null;
        this.isRunning = false;
        this.tickRate = 60000; // 60 seconds default
        this.currentGoalExecution = null; // Track if a goal is being executed
        this.eventHandler = null; // Callback for external events

        // Initialize AI (Headless Brain)
        if (this.apiKey) {
            this.ai = new GoogleGenAI({ apiKey: this.apiKey });
            console.log('[LIFE_LOOP] Headless Brain Initialized.');
            if (this.goalManager) {
                console.log('[LIFE_LOOP] GoalManager connected. Autonomous goal execution enabled.');
            }
        } else {
            console.warn('[LIFE_LOOP] No API Key provided. Brain is dormant.');
        }
    }

    setEventHandler(handler) {
        this.eventHandler = handler;
    }

    emit(type, payload) {
        if (this.eventHandler) {
            this.eventHandler({ type, payload, timestamp: Date.now() });
        }
    }

    start() {
        if (this.isRunning) return;

        console.log('[LIFE_LOOP] Starting Autonomy Loop...');
        this.isRunning = true;
        this.emit('status', { state: 'RUNNING', message: 'Autonomy Loop Started' });

        // Immediate first tick
        this.tick();

        this.intervalId = setInterval(() => {
            this.tick();
        }, this.tickRate);
    }

    stop() {
        if (!this.isRunning) return;

        console.log('[LIFE_LOOP] Stopping Autonomy Loop...');
        clearInterval(this.intervalId);
        this.isRunning = false;
        this.emit('status', { state: 'STOPPED', message: 'Autonomy Loop Stopped' });
    }

    async tick() {
        const now = new Date().toISOString();
        console.log(`[LIFE_LOOP] Heartbeat at ${now}`);
        this.emit('heartbeat', { time: now });

        // 1. Check if AI is ready
        if (!this.ai) return;

        // 2. Check for pending goals first (Priority 1)
        if (this.goalManager && !this.currentGoalExecution) {
            const processed = await this.processGoals();
            if (processed) {
                // Goal was processed, skip the default system check this tick
                return;
            }
        }

        // 3. Default system status check (Priority 2 - only if no goals)
        // This runs when there are no goals to process
        try {
            this.emit('thought', { message: 'Running routine system check...', source: 'System Routine' });

            // NEW SDK USAGE (v1.0.0+) - Stateless Generation
            const result = await this.ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: 'user', parts: [{ text: "Check system status (macOS). If everything is fine, just say 'System OK'. Do NOT use 'free' (use 'vm_stat')." }] }],
                config: {
                    tools: [{ functionDeclarations: headlessToolsDefinitions }]
                }
            });

            console.log('[LIFE_LOOP] Result Keys:', Object.keys(result));

            const candidate = result.candidates && result.candidates[0];
            if (!candidate) return;

            const parts = candidate.content && candidate.content.parts || [];
            const textPart = parts.find(p => p.text);
            const functionCallPart = parts.find(p => p.functionCall);

            if (functionCallPart) {
                const fc = functionCallPart.functionCall;
                console.log(`[LIFE_LOOP] Tool Call: ${fc.name}`);
                this.emit('tool_call', { tool: fc.name, args: fc.args });

                if (headlessTools[fc.name]) {
                    // NEW: Intercept Visual Commands
                    if (fc.name === 'presentVisualData') {
                        console.log(`[LIFE_LOOP] 📺 Triggering Smart Screen Update: ${fc.args.topic}`);
                        this.emit('visual_command', fc.args);
                    }

                    const toolResult = await headlessTools[fc.name](fc.args);
                    console.log(`[LIFE_LOOP] Tool Result:`, toolResult);
                    this.emit('tool_result', { tool: fc.name, result: toolResult });
                }
            } else if (textPart) {
                console.log(`[LIFE_LOOP] Thought: ${textPart.text}`);
                this.emit('thought', { message: textPart.text, source: 'LLM' });
            }

        } catch (e) {
            console.error('[LIFE_LOOP] Brain Freeze:', e.message);
            this.emit('error', { message: e.message });
        }
    }

    /**
     * Process pending goals from GoalManager
     * Returns true if a goal was processed, false otherwise
     */
    async processGoals() {
        if (!this.goalManager) return false;

        // Check for scheduled goals that are now due
        const now = Date.now();
        const allGoals = this.goalManager.list();
        
        // Update SCHEDULED goals to PENDING if they're due
        for (const goal of allGoals) {
            if (goal.status === 'SCHEDULED' && goal.scheduledAt && now >= goal.scheduledAt) {
                this.goalManager.updateStatus(goal.id, 'PENDING', 'Scheduled goal is now due');
            }
        }

        // Get all due goals (pending + scheduled goals that are due)
        const dueGoals = this.goalManager.getDueGoals();

        if (dueGoals.length === 0) {
            return false;
        }

        // Sort by priority: scheduled time (if set), then creation time
        dueGoals.sort((a, b) => {
            const aTime = a.scheduledAt || a.createdAt;
            const bTime = b.scheduledAt || b.createdAt;
            return aTime - bTime;
        });

        // Process the first due goal
        const goal = dueGoals[0];
        console.log(`[LIFE_LOOP] Processing goal: ${goal.description} (ID: ${goal.id})`);

        // Mark goal as in progress
        this.goalManager.updateStatus(goal.id, 'IN_PROGRESS', `Goal execution started at ${new Date().toISOString()}`);

        // Set execution flag to prevent concurrent goal execution
        this.currentGoalExecution = goal.id;

        try {
            // Execute the goal using AI
            const success = await this.executeGoal(goal);

            if (success) {
                this.goalManager.updateStatus(goal.id, 'COMPLETED', 'Goal completed successfully');
                console.log(`[LIFE_LOOP] ✅ Goal completed: ${goal.description}`);
                
                // Recurring goals are automatically rescheduled by updateStatus()
                if (goal.type === 'RECURRING' || goal.schedule) {
                    console.log(`[LIFE_LOOP] 🔄 Recurring goal will be rescheduled automatically`);
                }
            } else {
                this.goalManager.updateStatus(goal.id, 'FAILED', 'Goal execution did not complete successfully');
                console.log(`[LIFE_LOOP] ❌ Goal failed: ${goal.description}`);
            }
        } catch (error) {
            const errorMessage = `Goal execution error: ${error.message}`;
            this.goalManager.updateStatus(goal.id, 'FAILED', errorMessage);
            console.error(`[LIFE_LOOP] ❌ Goal execution error:`, error);
        } finally {
            // Clear execution flag
            this.currentGoalExecution = null;
        }

        return true;
    }

    /**
     * Execute a goal using AI planning and tool execution
     */
    async executeGoal(goal) {
        if (!this.ai) {
            throw new Error('AI not initialized');
        }

        // Create a detailed prompt for goal execution
        const executionPrompt = `You are an autonomous agent executing a goal. Your task is to accomplish the following goal:

Goal: ${goal.description}

Available tools:
- executeTerminalCommand: Execute shell commands
- readFile: Read file contents
- writeFile: Write content to files

Instructions:
1. Break down the goal into actionable steps
2. Use the available tools to execute the steps
3. If the goal requires multiple steps, execute them sequentially
4. After each tool execution, analyze the result and decide on the next step
4. After each tool execution, analyze the result and decide on the next step
5. When the goal is complete, summarize what was accomplished
6. **SMART SCREEN USAGE**:
   - You have access to a 'presentVisualData' tool. 
   - Use this to display rich content (news, grids, comparisons) on the user's Smart Screen.
   - If the goal implies showing information (e.g., "Show me news"), ALWAYS use this tool to display it.

Begin executing the goal now. Use tools as needed to accomplish it.`;

        try {
            let executionComplete = false;
            let iterations = 0;
            const maxIterations = 10; // Prevent infinite loops
            const conversationHistory = [];

            while (!executionComplete && iterations < maxIterations) {
                iterations++;

                // Build conversation history for context
                const contents = [
                    { role: 'user', parts: [{ text: executionPrompt }] },
                    ...conversationHistory
                ];

                // Get AI response with tool access
                const result = await this.ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: contents,
                    config: {
                        tools: [{ functionDeclarations: headlessToolsDefinitions }]
                    }
                });

                const candidate = result.candidates && result.candidates[0];
                if (!candidate) {
                    console.log('[LIFE_LOOP] No candidate in response');
                    break;
                }

                const parts = candidate.content && candidate.content.parts || [];
                const textPart = parts.find(p => p.text);
                const functionCallPart = parts.find(p => p.functionCall);

                // Add AI response to conversation history
                conversationHistory.push({
                    role: 'model',
                    parts: parts.map(p => {
                        if (p.text) return { text: p.text };
                        if (p.functionCall) return { functionCall: p.functionCall };
                        return p;
                    })
                });

                if (functionCallPart) {
                    // Execute tool
                    const fc = functionCallPart.functionCall;
                    console.log(`[LIFE_LOOP] 🔧 Executing tool: ${fc.name}(${JSON.stringify(fc.args)})`);

                    let toolResult;
                    if (headlessTools[fc.name]) {
                        try {
                            toolResult = await headlessTools[fc.name](fc.args);
                            console.log(`[LIFE_LOOP] ✅ Tool result: ${toolResult.substring(0, 200)}${toolResult.length > 200 ? '...' : ''}`);
                        } catch (toolError) {
                            toolResult = `Error executing tool: ${toolError.message}`;
                            console.error(`[LIFE_LOOP] ❌ Tool error:`, toolError);
                        }
                    } else {
                        toolResult = `Error: Unknown tool ${fc.name}`;
                        console.error(`[LIFE_LOOP] ❌ Unknown tool: ${fc.name}`);
                    }

                    // Add tool result to conversation history
                    conversationHistory.push({
                        role: 'user',
                        parts: [{
                            functionResponse: {
                                name: fc.name,
                                response: { result: toolResult }
                            }
                        }]
                    });

                } else if (textPart) {
                    // AI provided text response
                    const text = textPart.text;
                    console.log(`[LIFE_LOOP] 💭 AI Response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);

                    // Check if goal is complete (AI says it's done or goal keywords)
                    const completionKeywords = ['completed', 'done', 'finished', 'accomplished', 'success'];
                    const lowerText = text.toLowerCase();
                    if (completionKeywords.some(keyword => lowerText.includes(keyword))) {
                        executionComplete = true;
                        console.log(`[LIFE_LOOP] ✅ Goal execution marked complete by AI`);
                        return true;
                    }
                }

                // Small delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // If we hit max iterations, consider it a partial success if we got this far
            if (iterations >= maxIterations) {
                console.warn(`[LIFE_LOOP] ⚠️ Max iterations reached. Goal may not be fully complete.`);
                return false;
            }

            return executionComplete;

        } catch (error) {
            console.error(`[LIFE_LOOP] Error executing goal:`, error);
            throw error;
        }
    }
}
