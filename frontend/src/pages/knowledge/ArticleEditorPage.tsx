import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '@/services/knowledgeService';
import { KnowledgeArticle, ArticleStatus } from '@/types';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader } from '@/components/common/Card';
import Button from '@/components/common/Button';
import SimpleRichTextEditor from '@/components/knowledge/SimpleRichTextEditor';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/utils/helpers';

export default function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = id && id !== 'new';

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    category_id: '',
    tags: '',
    status: 'DRAFT' as ArticleStatus,
    is_featured: false,
    is_faq: false,
    meta_title: '',
    meta_description: '',
  });

  const [autoSlug, setAutoSlug] = useState(true);

  // Fetch article if editing
  const { data: article, isLoading } = useQuery({
    queryKey: ['knowledge-article', id],
    queryFn: () => knowledgeService.getArticle(Number(id)),
    enabled: !!isEdit,
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['knowledge-categories'],
    queryFn: () => knowledgeService.getCategories({ is_active: true }),
  });

  // Load article data when editing
  useEffect(() => {
    if (article && isEdit) {
      setFormData({
        title: article.title,
        slug: article.slug,
        summary: article.summary || '',
        content: article.content,
        category_id: article.category_id?.toString() || '',
        tags: article.tags || '',
        status: article.status,
        is_featured: article.is_featured,
        is_faq: article.is_faq,
        meta_title: article.meta_title || '',
        meta_description: article.meta_description || '',
      });
      setAutoSlug(false);
    }
  }, [article, isEdit]);

  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<KnowledgeArticle>) => knowledgeService.createArticle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast.success('Article created successfully!');
      navigate('/knowledge/articles');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to create article'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<KnowledgeArticle>) =>
      knowledgeService.updateArticle(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-article', id] });
      toast.success('Article updated successfully!');
      navigate('/knowledge/articles');
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, 'Failed to update article'));
    },
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-generate slug from title
    if (field === 'title' && autoSlug) {
      const slug = knowledgeService.generateSlug(value);
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('Slug is required');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Content is required');
      return;
    }

    const payload = {
      ...formData,
      category_id: formData.category_id ? Number(formData.category_id) : undefined,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handlePublish = () => {
    const payload = {
      ...formData,
      status: 'PUBLISHED' as ArticleStatus,
      category_id: formData.category_id ? Number(formData.category_id) : undefined,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isEdit && isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/knowledge/articles')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Article' : 'Create New Article'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? 'Update your knowledge base article' : 'Create a new knowledge base article'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/knowledge/articles')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            Save as Draft
          </Button>
          <Button
            variant="primary"
            onClick={handlePublish}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Publish'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Basic Information</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="form-input"
                  placeholder="Enter article title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => {
                      handleChange('slug', e.target.value);
                      setAutoSlug(false);
                    }}
                    className="form-input flex-1"
                    placeholder="article-url-slug"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAutoSlug(true);
                      handleChange('slug', knowledgeService.generateSlug(formData.title));
                    }}
                  >
                    Auto-generate
                  </Button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  URL: /kb/{formData.slug || 'article-slug'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => handleChange('summary', e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="Brief summary of the article"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleChange('category_id', e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select a category</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    className="form-input"
                    placeholder="Comma-separated tags"
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => handleChange('is_featured', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Featured Article</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_faq}
                    onChange={(e) => handleChange('is_faq', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">FAQ</span>
                </label>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Content</h2>
          </CardHeader>
          <CardBody>
            <SimpleRichTextEditor
              value={formData.content}
              onChange={(value) => handleChange('content', value)}
              placeholder="Write your article content here..."
            />
          </CardBody>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">SEO Settings (Optional)</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => handleChange('meta_title', e.target.value)}
                  className="form-input"
                  placeholder="SEO title (defaults to article title)"
                  maxLength={60}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.meta_title.length}/60 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description
                </label>
                <textarea
                  value={formData.meta_description}
                  onChange={(e) => handleChange('meta_description', e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="SEO description (defaults to summary)"
                  maxLength={160}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.meta_description.length}/160 characters
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
