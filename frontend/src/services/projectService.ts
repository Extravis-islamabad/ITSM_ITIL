import axiosInstance from '@/lib/axios';
import {
  ProjectCreate,
  ProjectUpdate,
  SprintCreate,
  SprintUpdate,
  TaskCreate,
  TaskUpdate,
  TaskMove,
  BoardColumnCreate,
  BoardColumnUpdate,
  ProjectMemberCreate,
  ProjectMemberRole,
} from '@/types/project';

export const projectService = {
  // ==================== PROJECTS ====================

  async getProjects(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    owner_id?: number;
  }) {
    const response = await axiosInstance.get('/projects', { params });
    return response.data;
  },

  async getProject(id: number) {
    const response = await axiosInstance.get(`/projects/${id}`);
    return response.data;
  },

  async createProject(data: ProjectCreate) {
    const response = await axiosInstance.post('/projects', data);
    return response.data;
  },

  async updateProject(id: number, data: ProjectUpdate) {
    const response = await axiosInstance.put(`/projects/${id}`, data);
    return response.data;
  },

  async deleteProject(id: number) {
    const response = await axiosInstance.delete(`/projects/${id}`);
    return response.data;
  },

  // ==================== BOARD COLUMNS ====================

  async getBoardColumns(projectId: number) {
    const response = await axiosInstance.get(`/projects/${projectId}/board/columns`);
    return response.data;
  },

  async createBoardColumn(projectId: number, data: BoardColumnCreate) {
    const response = await axiosInstance.post(`/projects/${projectId}/board/columns`, data);
    return response.data;
  },

  async updateBoardColumn(projectId: number, columnId: number, data: BoardColumnUpdate) {
    const response = await axiosInstance.put(`/projects/${projectId}/board/columns/${columnId}`, data);
    return response.data;
  },

  async deleteBoardColumn(projectId: number, columnId: number) {
    const response = await axiosInstance.delete(`/projects/${projectId}/board/columns/${columnId}`);
    return response.data;
  },

  async reorderColumns(projectId: number, columnIds: number[]) {
    const response = await axiosInstance.put(`/projects/${projectId}/board/columns/reorder`, {
      column_ids: columnIds
    });
    return response.data;
  },

  // ==================== PROJECT MEMBERS ====================

  async getProjectMembers(projectId: number) {
    const response = await axiosInstance.get(`/projects/${projectId}/members`);
    return response.data;
  },

  async addProjectMember(projectId: number, data: ProjectMemberCreate) {
    const response = await axiosInstance.post(`/projects/${projectId}/members`, data);
    return response.data;
  },

  async updateProjectMember(projectId: number, userId: number, role: ProjectMemberRole) {
    const response = await axiosInstance.put(`/projects/${projectId}/members/${userId}`, { role });
    return response.data;
  },

  async removeProjectMember(projectId: number, userId: number) {
    const response = await axiosInstance.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
  },

  // ==================== SPRINTS ====================

  async getSprints(projectId: number) {
    const response = await axiosInstance.get(`/projects/${projectId}/sprints`);
    return response.data;
  },

  async getSprint(projectId: number, sprintId: number) {
    const response = await axiosInstance.get(`/projects/${projectId}/sprints/${sprintId}`);
    return response.data;
  },

  async createSprint(projectId: number, data: SprintCreate) {
    const response = await axiosInstance.post(`/projects/${projectId}/sprints`, data);
    return response.data;
  },

  async updateSprint(projectId: number, sprintId: number, data: SprintUpdate) {
    const response = await axiosInstance.put(`/projects/${projectId}/sprints/${sprintId}`, data);
    return response.data;
  },

  async startSprint(projectId: number, sprintId: number) {
    const response = await axiosInstance.post(`/projects/${projectId}/sprints/${sprintId}/start`);
    return response.data;
  },

  async completeSprint(projectId: number, sprintId: number, moveIncompleteTo: string = 'backlog') {
    const response = await axiosInstance.post(`/projects/${projectId}/sprints/${sprintId}/complete`, {
      move_incomplete_to: moveIncompleteTo
    });
    return response.data;
  },

  async deleteSprint(projectId: number, sprintId: number) {
    const response = await axiosInstance.delete(`/projects/${projectId}/sprints/${sprintId}`);
    return response.data;
  },

  // ==================== TASKS ====================

  async getTasks(projectId: number, params?: {
    page?: number;
    page_size?: number;
    sprint_id?: number;
    status?: string;
    priority?: string;
    task_type?: string;
    assignee_id?: number;
    search?: string;
    in_backlog?: boolean;
  }) {
    const response = await axiosInstance.get(`/projects/${projectId}/tasks`, { params });
    return response.data;
  },

  async getTask(projectId: number, taskId: number) {
    const response = await axiosInstance.get(`/projects/${projectId}/tasks/${taskId}`);
    return response.data;
  },

  async createTask(projectId: number, data: TaskCreate) {
    const response = await axiosInstance.post(`/projects/${projectId}/tasks`, data);
    return response.data;
  },

  async updateTask(projectId: number, taskId: number, data: TaskUpdate) {
    const response = await axiosInstance.put(`/projects/${projectId}/tasks/${taskId}`, data);
    return response.data;
  },

  async moveTask(projectId: number, taskId: number, data: TaskMove) {
    const response = await axiosInstance.put(`/projects/${projectId}/tasks/${taskId}/move`, data);
    return response.data;
  },

  async bulkMoveTasks(projectId: number, taskIds: number[], sprintId: number | null) {
    const response = await axiosInstance.post(`/projects/${projectId}/tasks/bulk-move`, {
      task_ids: taskIds,
      sprint_id: sprintId
    });
    return response.data;
  },

  async deleteTask(projectId: number, taskId: number) {
    const response = await axiosInstance.delete(`/projects/${projectId}/tasks/${taskId}`);
    return response.data;
  },

  // ==================== TASK COMMENTS ====================

  async addTaskComment(projectId: number, taskId: number, content: string) {
    const response = await axiosInstance.post(`/projects/${projectId}/tasks/${taskId}/comments`, {
      content
    });
    return response.data;
  },

  async deleteTaskComment(projectId: number, taskId: number, commentId: number) {
    const response = await axiosInstance.delete(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`);
    return response.data;
  },

  // ==================== TASK ATTACHMENTS ====================

  async uploadTaskAttachment(projectId: number, taskId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(
      `/projects/${projectId}/tasks/${taskId}/attachments`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  },

  // ==================== REPORTS ====================

  async getBurndownReport(projectId: number, sprintId: number) {
    const response = await axiosInstance.get(`/projects/${projectId}/reports/burndown`, {
      params: { sprint_id: sprintId }
    });
    return response.data;
  },

  async getVelocityReport(projectId: number, numSprints: number = 5) {
    const response = await axiosInstance.get(`/projects/${projectId}/reports/velocity`, {
      params: { num_sprints: numSprints }
    });
    return response.data;
  },

  async getStatusReport(projectId: number) {
    const response = await axiosInstance.get(`/projects/${projectId}/reports/status`);
    return response.data;
  },
};

export default projectService;
