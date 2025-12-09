import axiosInstance from '@/lib/axios';
import { Category } from '@/types';

export const categoryService = {
  getCategories: async (isActive?: boolean): Promise<Category[]> => {
    const response = await axiosInstance.get<Category[]>('/categories', {
      params: { is_active: isActive },
    });
    return response.data;
  },

  getCategory: async (id: number): Promise<Category> => {
    const response = await axiosInstance.get<Category>(`/categories/${id}`);
    return response.data;
  },

  createCategory: async (data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    category_type: string;
    is_active?: boolean;
  }): Promise<Category> => {
    const response = await axiosInstance.post<Category>('/categories', data);
    return response.data;
  },

  updateCategory: async (id: number, data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    category_type?: string;
    is_active?: boolean;
  }): Promise<Category> => {
    const response = await axiosInstance.put<Category>(`/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/categories/${id}`);
  },

  createSubcategory: async (categoryId: number, data: { name: string; description?: string }): Promise<any> => {
    const response = await axiosInstance.post(`/categories/${categoryId}/subcategories`, data);
    return response.data;
  },

  updateSubcategory: async (id: number, data: { name?: string; description?: string; is_active?: boolean }): Promise<any> => {
    const response = await axiosInstance.put(`/categories/subcategories/${id}`, data);
    return response.data;
  },

  deleteSubcategory: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/categories/subcategories/${id}`);
  },
};