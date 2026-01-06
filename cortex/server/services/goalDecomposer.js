/**
 * Goal Decomposer Service
 * Uses LLM to break down complex goals into actionable sub-tasks
 */


class GoalDecomposer {
    /**
     * Decompose a high-level goal into sub-goals using LLM
     */
    async decomposeGoal(goalDescription, parentGoalId = null) {
        try {
            const prompt = `You are a goal decomposition expert. Break down this high-level goal into specific, actionable sub-tasks.

Goal: "${goalDescription}"

Requirements:
1. Each sub-task should be clear and actionable
2. Sub-tasks should be ordered logically
3. Include dependencies (which tasks must complete first)
4. Estimate duration for each task
5. Assign priority (1-10, higher = more important)

Return ONLY a JSON array in this exact format:
[
  {
    "description": "Clear, actionable task description",
    "priority": 8,
    "dependencies": [0],
    "estimatedDuration": "10 minutes"
  }
]

If the goal is already simple and actionable, return an empty array [].`;

            // Import lucaService dynamically to avoid circular dependencies
            const { default: fetch } = await import('node-fetch');
            const response = await fetch('http://localhost:3001/api/python/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a goal decomposition expert. Always return valid JSON.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            const data = await response.json();
            const responseText = data.response || data.text || '';

            // Extract JSON from response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.log('[GOAL_DECOMPOSER] No decomposition needed for simple goal');
                return [];
            }

            const subGoals = JSON.parse(jsonMatch[0]);

            // Validate and format sub-goals
            return subGoals.map((sg, index) => ({
                description: sg.description,
                type: 'ONCE',
                priority: sg.priority || 5,
                parentGoalId: parentGoalId,
                metadata: {
                    dependencies: sg.dependencies || [],
                    estimatedDuration: sg.estimatedDuration || 'unknown',
                    order: index
                }
            }));

        } catch (error) {
            console.error('[GOAL_DECOMPOSER] Failed to decompose goal:', error);
            return [];
        }
    }

    /**
     * Check if a goal's dependencies are satisfied
     */
    areDependenciesSatisfied(goal, allGoals) {
        if (!goal.metadata?.dependencies || goal.metadata.dependencies.length === 0) {
            return true;
        }

        const siblings = allGoals.filter(g => g.parentGoalId === goal.parentGoalId);
        
        for (const depIndex of goal.metadata.dependencies) {
            const dependency = siblings[depIndex];
            if (!dependency || dependency.status !== 'COMPLETED') {
                return false;
            }
        }

        return true;
    }

    /**
     * Get next executable sub-goal
     */
    getNextExecutableSubGoal(parentGoalId, allGoals) {
        const subGoals = allGoals
            .filter(g => g.parentGoalId === parentGoalId)
            .sort((a, b) => (a.metadata?.order || 0) - (b.metadata?.order || 0));

        for (const subGoal of subGoals) {
            if (subGoal.status === 'PENDING' && this.areDependenciesSatisfied(subGoal, allGoals)) {
                return subGoal;
            }
        }

        return null;
    }
}

export const goalDecomposer = new GoalDecomposer();
