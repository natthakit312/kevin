export interface MissionFilter {
  name?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export type MissionStatus =
  | 'Open'
  | 'InProgress'
  | 'Completed'
  | 'Failed';
