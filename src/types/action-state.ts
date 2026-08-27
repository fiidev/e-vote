export type ActionState<T = unknown> = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
};
