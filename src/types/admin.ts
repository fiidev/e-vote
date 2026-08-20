export interface ActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
}
