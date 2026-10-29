export type SupervisorState =
  | "stopped"
  | "starting-serving"
  | "serving"
  | "stopping-serving"
  | "exporting"
  | "recovery-required"
  | "recovery-failed"
  | "shutting-down"
  | "terminated";

export type LifecycleEvent =
  | "start-serving"
  | "serving-health-confirmed"
  | "serving-start-failed"
  | "stop-serving"
  | "serving-stopped"
  | "serving-lost"
  | "start-export"
  | "export-finished"
  | "ownership-unconfirmed"
  | "owned-exit-reconfirmed"
  | "shutdown-requested"
  | "shutdown-complete";

export class LifecycleConflictError extends Error {
  readonly state: SupervisorState;
  readonly event: LifecycleEvent;

  constructor(state: SupervisorState, event: LifecycleEvent) {
    super(`Lifecycle event ${event} is invalid in state ${state}`);
    this.name = "LifecycleConflictError";
    this.state = state;
    this.event = event;
  }
}

const TRANSITIONS: Partial<
  Record<SupervisorState, Partial<Record<LifecycleEvent, SupervisorState>>>
> = {
  stopped: {
    "start-serving": "starting-serving",
    "start-export": "exporting",
    "shutdown-requested": "shutting-down",
  },
  "starting-serving": {
    "serving-health-confirmed": "serving",
    "serving-start-failed": "recovery-required",
    "ownership-unconfirmed": "recovery-failed",
    "shutdown-requested": "shutting-down",
  },
  serving: {
    "stop-serving": "stopping-serving",
    "serving-lost": "recovery-required",
    "ownership-unconfirmed": "recovery-failed",
    "shutdown-requested": "shutting-down",
  },
  "stopping-serving": {
    "serving-stopped": "stopped",
    "ownership-unconfirmed": "recovery-failed",
    "shutdown-requested": "shutting-down",
  },
  exporting: {
    "export-finished": "stopped",
    "ownership-unconfirmed": "recovery-failed",
    "shutdown-requested": "shutting-down",
  },
  "recovery-required": {
    "start-serving": "starting-serving",
    "shutdown-requested": "shutting-down",
  },
  "recovery-failed": {
    "owned-exit-reconfirmed": "recovery-required",
    "shutdown-requested": "shutting-down",
  },
  "shutting-down": {
    "shutdown-complete": "terminated",
  },
};

export function transitionLifecycle(
  current: SupervisorState,
  event: LifecycleEvent,
): SupervisorState {
  const next = TRANSITIONS[current]?.[event];
  if (next === undefined) {
    throw new LifecycleConflictError(current, event);
  }
  return next;
}
