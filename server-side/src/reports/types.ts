export type Preset =
  | 'today'
  | 'yesterday'
  | 'last24h'
  | 'last7d'
  | 'last30d'
  | 'last90d'
  | 'thisYear'
  | 'prevMonth'
  | 'prevTrimester'
  | 'prevSemester'
  | 'prevYear';

export type Interval = 'day' | 'week' | 'month';
