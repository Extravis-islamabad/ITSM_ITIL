import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '@/services/knowledgeService';
import { KnowledgeArticle, ArticleStatus } from '@/types';
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import toast from 'react-hot-toast';

export default function ArticlesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch articles
  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-articles', { search, page, status: statusFilter, category_id: categoryFilter }],
    queryFn: () => knowledgeService.getArticles({
      search,
      page,
      page_size: 20,
      status: statusFilter || undefined,
      category_id: categoryFilter || undefined
    }),
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ['knowledge-categories'],
    queryFn: () => knowledgeService.getCategories({ is_active: true }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => knowledgeService.deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast.success('Article deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete article');
    },
  });

  // Publish/Unpublish mutation
  const togglePublishMutation = useMutation({
    mutationFn: ({ id, publish }: { id: number; publish: boolean }) =>
      publish ? knowledgeService.publishArticle(id) : knowledgeService.unpublishArticle(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-articles'] });
      toast.success(variables.publish ? 'Article published' : 'Article unpublished');
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this article?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: ArticleStatus) => {
    const variants: Record<ArticleStatus, 'success' | 'warning' | 'secondary' | 'primary'> = {
      PUBLISHED: 'success',
      DRAFT: 'secondary',
      REVIEW: 'warning',
      ARCHIVED: 'secondary',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base Articles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage knowledge base articles
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/knowledge/articles/new')}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Article
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
            <select
              className="form-input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All Categories</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ArticleStatus | '')}
            >
              <option value="">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="REVIEW">Review</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Articles List */}
      <Card>
        <CardBody>
          {isLoading ? (
            <LoadingSpinner />
          ) : !data?.items || data.items.length === 0 ? (
            <EmptyState
              title="No articles found"
              description="Get started by creating your first knowledge base article"
              action={
                <Button variant="primary" onClick={() => navigate('/knowledge/articles/new')}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Article
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Article
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Views
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.items.map((article: KnowledgeArticle) => {
                      const totalRatings = article.helpful_count + article.not_helpful_count;
                      const helpfulPercentage = totalRatings > 0
                        ? Math.round((article.helpful_count / totalRatings) * 100)
                        : 0;

                      return (
                        <tr key={article.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {article.title}
                                  {article.is_featured && (
                                    <span className="ml-2 text-xs text-yellow-600">★ Featured</span>
                                  )}
                                  {article.is_faq && (
                                    <span className="ml-2 text-xs text-blue-600">FAQ</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {article.summary?.substring(0, 100)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {article.category_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(article.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-500">
                              <EyeIcon className="h-4 w-4 mr-1" />
                              {article.view_count}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {totalRatings > 0 ? (
                              <span className={helpfulPercentage >= 70 ? 'text-green-600' : 'text-gray-500'}>
                                {helpfulPercentage}% ({totalRatings})
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {article.author_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => navigate(`/knowledge/articles/${article.id}`)}
                                className="text-accent-600 hover:text-accent-900"
                                title="Edit"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              {article.status === 'DRAFT' ? (
                                <button
                                  onClick={() => togglePublishMutation.mutate({ id: article.id, publish: true })}
                                  className="text-green-600 hover:text-green-900"
                                  title="Publish"
                                >
                                  Publish
                                </button>
                              ) : article.status === 'PUBLISHED' ? (
                                <button
                                  onClick={() => togglePublishMutation.mutate({ id: article.id, publish: false })}
                                  className="text-yellow-600 hover:text-yellow-900"
                                  title="Unpublish"
                                >
                                  Unpublish
                                </button>
                              ) : null}
                              <button
                                onClick={() => handleDelete(article.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.total_pages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      disabled={page === data.total_pages}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(page * 20, data.total)}
                        </span>{' '}
                        of <span className="font-medium">{data.total}</span> results
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page === data.total_pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
