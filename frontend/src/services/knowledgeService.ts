import axiosInstance from '@/lib/axios';
import {
  KnowledgeArticle,
  KnowledgeCategory,
  ArticleRating,
  ArticleSearchParams,
  KnowledgeAnalytics,
  PaginatedResponse
} from '@/types';

export const knowledgeService = {
  // Categories
  getCategories: async (params?: { parent_id?: number; is_active?: boolean; is_public?: boolean }) => {
    const response = await axiosInstance.get('/knowledge/categories', { params });
    return response.data;
  },

  getCategory: async (id: number, includeArticles: boolean = false) => {
    const response = await axiosInstance.get(`/knowledge/categories/${id}`, {
      params: { include_articles: includeArticles }
    });
    return response.data;
  },

  createCategory: async (data: Partial<KnowledgeCategory>) => {
    const response = await axiosInstance.post('/knowledge/categories', data);
    return response.data;
  },

  updateCategory: async (id: number, data: Partial<KnowledgeCategory>) => {
    const response = await axiosInstance.put(`/knowledge/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: number) => {
    const response = await axiosInstance.delete(`/knowledge/categories/${id}`);
    return response.data;
  },

  // Articles
  getArticles: async (params: ArticleSearchParams): Promise<PaginatedResponse<KnowledgeArticle>> => {
    const response = await axiosInstance.get('/knowledge/articles', { params });
    return response.data;
  },

  getArticle: async (id: number): Promise<KnowledgeArticle> => {
    const response = await axiosInstance.get(`/knowledge/articles/${id}`);
    return response.data;
  },

  getArticleBySlug: async (slug: string): Promise<KnowledgeArticle> => {
    const response = await axiosInstance.get(`/knowledge/articles/slug/${slug}`);
    return response.data;
  },

  createArticle: async (data: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> => {
    const response = await axiosInstance.post('/knowledge/articles', data);
    return response.data;
  },

  updateArticle: async (id: number, data: Partial<KnowledgeArticle>): Promise<KnowledgeArticle> => {
    const response = await axiosInstance.put(`/knowledge/articles/${id}`, data);
    return response.data;
  },

  deleteArticle: async (id: number) => {
    const response = await axiosInstance.delete(`/knowledge/articles/${id}`);
    return response.data;
  },

  publishArticle: async (id: number) => {
    const response = await axiosInstance.post(`/knowledge/articles/${id}/publish`);
    return response.data;
  },

  unpublishArticle: async (id: number) => {
    const response = await axiosInstance.post(`/knowledge/articles/${id}/unpublish`);
    return response.data;
  },

  // Ratings
  rateArticle: async (articleId: number, isHelpful: boolean, feedback?: string): Promise<ArticleRating> => {
    const response = await axiosInstance.post(`/knowledge/articles/${articleId}/rate`, {
      is_helpful: isHelpful,
      feedback
    });
    return response.data;
  },

  // Analytics
  getAnalytics: async (): Promise<KnowledgeAnalytics> => {
    const response = await axiosInstance.get('/knowledge/analytics/overview');
    return response.data;
  },

  // Helper: Generate slug from title
  generateSlug: (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
};
