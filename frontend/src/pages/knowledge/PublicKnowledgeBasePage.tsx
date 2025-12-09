import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { knowledgeService } from '@/services/knowledgeService';
import { KnowledgeArticle, KnowledgeCategory } from '@/types';
import { MagnifyingGlassIcon, EyeIcon, ClockIcon, StarIcon } from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';
import { formatDate } from '@/utils/helpers';

export default function PublicKnowledgeBasePage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const navigate = useNavigate();

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['knowledge-categories-public'],
    queryFn: () => knowledgeService.getCategories({ is_active: true, is_public: true }),
  });

  // Fetch articles
  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['knowledge-articles-public', { search, category: selectedCategory }],
    queryFn: () => knowledgeService.getArticles({
      search,
      category_id: selectedCategory || undefined,
      status: 'PUBLISHED',
      page: 1,
      page_size: 20,
    }),
  });

  // Fetch popular articles
  const { data: analytics } = useQuery({
    queryKey: ['knowledge-analytics'],
    queryFn: () => knowledgeService.getAnalytics(),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 to-accent-700 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Knowledge Base</h1>
            <p className="text-xl text-primary-100 mb-8">
              Find answers to common questions and learn how to use our platform
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg rounded-xl text-gray-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <Card>
              <CardBody>
                <h2 className="text-lg font-semibold mb-4">Categories</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition ${
                      selectedCategory === null
                        ? 'bg-primary-100 text-primary-700 font-medium'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    All Articles
                  </button>
                  {categories?.map((cat: KnowledgeCategory) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                        selectedCategory === cat.id
                          ? 'bg-primary-100 text-primary-700 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl">{cat.icon || '📁'}</span>
                      <span className="flex-1">{cat.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {cat.article_count || 0}
                      </Badge>
                    </button>
                  ))}
                </div>

                {/* Popular Articles */}
                {analytics?.popular_articles && analytics.popular_articles.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <StarIcon className="h-5 w-5 text-yellow-500" />
                      Popular Articles
                    </h2>
                    <div className="space-y-2">
                      {analytics.popular_articles.slice(0, 5).map((article: KnowledgeArticle) => (
                        <button
                          key={article.id}
                          onClick={() => navigate(`/kb/${article.slug}`)}
                          className="w-full text-left p-2 rounded hover:bg-gray-100 transition text-sm"
                        >
                          <div className="font-medium text-gray-900 line-clamp-2">
                            {article.title}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <EyeIcon className="h-3 w-3" />
                            {article.view_count} views
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Main Content - Articles */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <LoadingSpinner />
            ) : !articlesData?.items || articlesData.items.length === 0 ? (
              <Card>
                <CardBody>
                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium text-gray-900">No articles found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search ? 'Try searching with different keywords' : 'No articles available yet'}
                    </p>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-4">
                {articlesData.items.map((article: KnowledgeArticle) => {
                  const totalRatings = article.helpful_count + article.not_helpful_count;
                  const helpfulPercentage = totalRatings > 0
                    ? Math.round((article.helpful_count / totalRatings) * 100)
                    : 0;

                  return (
                    <Card key={article.id} className="hover:shadow-lg transition cursor-pointer">
                      <CardBody onClick={() => navigate(`/kb/${article.slug}`)}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {article.is_featured && (
                                <Badge variant="warning" className="text-xs">
                                  ⭐ Featured
                                </Badge>
                              )}
                              {article.is_faq && (
                                <Badge variant="primary" className="text-xs">
                                  FAQ
                                </Badge>
                              )}
                              {article.category_name && (
                                <Badge variant="secondary" className="text-xs">
                                  {article.category_name}
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              {article.title}
                            </h3>

                            {article.summary && (
                              <p className="text-gray-600 mb-3 line-clamp-2">
                                {article.summary}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <EyeIcon className="h-4 w-4" />
                                {article.view_count} views
                              </div>
                              <div className="flex items-center gap-1">
                                <ClockIcon className="h-4 w-4" />
                                {formatDate(article.created_at, 'PP')}
                              </div>
                              {totalRatings > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className={helpfulPercentage >= 70 ? 'text-green-600' : 'text-gray-500'}>
                                    👍 {helpfulPercentage}% helpful ({totalRatings})
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
