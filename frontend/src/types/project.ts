/**
 * Project Management Types
 */

// ==================== ENUMS ====================

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum SprintStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  QA = 'QA',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TaskType {
  TASK = 'TASK',
  BUG = 'BUG',
  FEATURE = 'FEATURE',
  IMPROVEMENT = 'IMPROVEMENT',
  STORY = 'STORY',
}

export enum ProjectMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

// ==================== INTERFACES ====================

export interface UserBrief {
  id: number;
  full_name: string;
  email: string;
  avatar_url?: string;
}

export interface BoardColumn {
  id: number;
  project_id: number;
  name: string;
  status_key: string;
  position: number;
  color: string;
  is_default: boolean;
  is_done_column: boolean;
  created_at: string;
}

export interface BoardColumnCreate {
  name: string;
  status_key: string;
  position?: number;
  color?: string;
  is_done_column?: boolean;
}

export interface BoardColumnUpdate {
  name?: string;
  position?: number;
  color?: string;
  is_done_column?: boolean;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: ProjectMemberRole;
  joined_at: string;
  user?: UserBrief;
}

export interface ProjectMemberCreate {
  user_id: number;
  role: ProjectMemberRole;
}

export interface Sprint {
  id: number;
  project_id: number;
  name: string;
  goal?: string;
  status: SprintStatus;
  start_date?: string;
  end_date?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
  task_count: number;
  completed_task_count: number;
  total_story_points: number;
  completed_story_points: number;
}

export interface SprintCreate {
  name: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
}

export interface SprintUpdate {
  name?: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  user?: UserBrief;
}

export interface TaskActivity {
  id: number;
  task_id: number;
  user_id: number;
  activity_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  created_at: string;
  user?: UserBrief;
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  user_id: number;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
  user?: UserBrief;
}

export interface Task {
  id: number;
  project_id: number;
  sprint_id?: number;
  task_number: string;
  title: string;
  description?: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: number;
  reporter_id: number;
  story_points?: number;
  time_estimate?: number;
  time_spent: number;
  parent_task_id?: number;
  due_date?: string;
  completed_at?: string;
  position: number;
  created_at: string;
  updated_at?: string;
  assignee?: UserBrief;
  reporter?: UserBrief;
  subtask_count: number;
  comment_count: number;
}

export interface TaskDetail extends Task {
  comments: TaskComment[];
  activities: TaskActivity[];
  attachments: TaskAttachment[];
  subtasks: Task[];
}

export interface TaskCreate {
  title: string;
  description?: string;
  task_type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: number;
  sprint_id?: number;
  story_points?: number;
  time_estimate?: number;
  due_date?: string;
  parent_task_id?: number;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  task_type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: number;
  sprint_id?: number;
  story_points?: number;
  time_estimate?: number;
  time_spent?: number;
  due_date?: string;
  position?: number;
}

export interface TaskMove {
  status: TaskStatus;
  position?: number;
}

export interface Project {
  id: number;
  project_key: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  owner_id: number;
  lead_id?: number;
  start_date?: string;
  end_date?: string;
  task_sequence: number;
  created_at: string;
  updated_at?: string;
  owner?: UserBrief;
  lead?: UserBrief;
  member_count: number;
  task_count: number;
  open_task_count: number;
}

export interface ProjectDetail extends Project {
  columns: BoardColumn[];
  members: ProjectMember[];
  active_sprint?: Sprint;
}

export interface ProjectCreate {
  name: string;
  project_key: string;
  description?: string;
  lead_id?: number;
  start_date?: string;
  end_date?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  lead_id?: number;
  start_date?: string;
  end_date?: string;
}

// ==================== RESPONSE TYPES ====================

export interface PaginatedProjects {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedTasks {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ==================== REPORT TYPES ====================

export interface BurndownDataPoint {
  date: string;
  remaining_points: number;
  ideal_points: number;
}

export interface BurndownReport {
  sprint_id: number;
  sprint_name: string;
  total_points: number;
  completed_points: number;
  data_points: BurndownDataPoint[];
}

export interface VelocityDataPoint {
  sprint_name: string;
  committed_points: number;
  completed_points: number;
}

export interface VelocityReport {
  project_id: number;
  average_velocity: number;
  data_points: VelocityDataPoint[];
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface ProjectStatusReport {
  project_id: number;
  total_tasks: number;
  distribution: StatusDistribution[];
}

// ==================== HELPER FUNCTIONS ====================

export const getProjectStatusColor = (status: ProjectStatus): string => {
  const colors: Record<ProjectStatus, string> = {
    [ProjectStatus.PLANNING]: 'bg-blue-100 text-blue-800',
    [ProjectStatus.ACTIVE]: 'bg-green-100 text-green-800',
    [ProjectStatus.ON_HOLD]: 'bg-yellow-100 text-yellow-800',
    [ProjectStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
    [ProjectStatus.CANCELLED]: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getTaskStatusColor = (status: TaskStatus): string => {
  const colors: Record<TaskStatus, string> = {
    [TaskStatus.BACKLOG]: 'bg-gray-100 text-gray-800',
    [TaskStatus.TODO]: 'bg-blue-100 text-blue-800',
    [TaskStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
    [TaskStatus.QA]: 'bg-purple-100 text-purple-800',
    [TaskStatus.DONE]: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getTaskPriorityColor = (priority: TaskPriority): string => {
  const colors: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: 'bg-gray-100 text-gray-800',
    [TaskPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
    [TaskPriority.HIGH]: 'bg-orange-100 text-orange-800',
    [TaskPriority.CRITICAL]: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

export const getTaskTypeColor = (type: TaskType): string => {
  const colors: Record<TaskType, string> = {
    [TaskType.TASK]: 'bg-blue-100 text-blue-800',
    [TaskType.BUG]: 'bg-red-100 text-red-800',
    [TaskType.FEATURE]: 'bg-green-100 text-green-800',
    [TaskType.IMPROVEMENT]: 'bg-purple-100 text-purple-800',
    [TaskType.STORY]: 'bg-indigo-100 text-indigo-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

export const getTaskTypeIcon = (type: TaskType): string => {
  const icons: Record<TaskType, string> = {
    [TaskType.TASK]: 'CheckSquare',
    [TaskType.BUG]: 'Bug',
    [TaskType.FEATURE]: 'Star',
    [TaskType.IMPROVEMENT]: 'TrendingUp',
    [TaskType.STORY]: 'BookOpen',
  };
  return icons[type] || 'CheckSquare';
};

export const getSprintStatusColor = (status: SprintStatus): string => {
  const colors: Record<SprintStatus, string> = {
    [SprintStatus.PLANNING]: 'bg-blue-100 text-blue-800',
    [SprintStatus.ACTIVE]: 'bg-green-100 text-green-800',
    [SprintStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getMemberRoleColor = (role: ProjectMemberRole): string => {
  const colors: Record<ProjectMemberRole, string> = {
    [ProjectMemberRole.OWNER]: 'bg-purple-100 text-purple-800',
    [ProjectMemberRole.ADMIN]: 'bg-blue-100 text-blue-800',
    [ProjectMemberRole.MEMBER]: 'bg-green-100 text-green-800',
    [ProjectMemberRole.VIEWER]: 'bg-gray-100 text-gray-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
};

export const getColumnColor = (color: string): string => {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-200',
    blue: 'bg-blue-200',
    yellow: 'bg-yellow-200',
    purple: 'bg-purple-200',
    green: 'bg-green-200',
    red: 'bg-red-200',
    orange: 'bg-orange-200',
    indigo: 'bg-indigo-200',
    pink: 'bg-pink-200',
    cyan: 'bg-cyan-200',
  };
  return colorMap[color] || 'bg-gray-200';
};

export const formatTaskStatus = (status: TaskStatus): string => {
  return status.split('_').map(word =>
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
};

export const formatTaskType = (type: TaskType): string => {
  return type.charAt(0) + type.slice(1).toLowerCase();
};
