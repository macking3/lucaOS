import { useState } from "react";
import { MemoryNode, Task, CalendarEvent, Goal } from "../types";

export function useManagementState() {
  const [rightPanelMode, setRightPanelMode] = useState<
    "LOGS" | "MEMORY" | "MANAGE" | "CLOUD"
  >("MANAGE");
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [installedModules, setInstalledModules] = useState<string[]>([]);
  const [queuedTasks, setQueuedTasks] = useState<any[]>([]);

  return {
    rightPanelMode,
    setRightPanelMode,
    memories,
    setMemories,
    tasks,
    setTasks,
    events,
    setEvents,
    goals,
    setGoals,
    installedModules,
    setInstalledModules,
    queuedTasks,
    setQueuedTasks,
  };
}
