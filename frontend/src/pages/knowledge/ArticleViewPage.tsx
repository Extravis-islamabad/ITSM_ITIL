import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '@/services/knowledgeService';
import { KnowledgeArticle } from '@/types';
import { ArrowLeftIcon, EyeIcon, ClockIcon, UserIcon, HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { Card, CardBody } from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/helpers';

export default function ArticleViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [hasRated, setHasRated] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  // Fetch article by slug
  const { data: article, isLoading } = useQuery({
    queryKey: ['knowledge-article-slug', slug],
    queryFn: () => knowledgeService.getArticleBySlug(slug!),
    enabled: !!slug,
  });

  // Rate mutation
  const rateMutation = useMutation({
    mutationFn: ({ isHelpful, feedback }: { isHelpful: boolean; feedback?: string }) =>
      knowledgeService.rateArticle(article!.id, isHelpful, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-article-slug', slug] });
      toast.success('Thank you for your feedback!');
      setHasRated(true);
      setShowFeedback(false);
      setFeedback('');
    },
  });

  const handleRate = (isHelpful: boolean) => {
    if (hasRated) {
      toast.error('You have already rated this article');
      return;
    }

    if (!isHelpful && !showFeedback) {
      setShowFeedback(true);
      return;
    }

    rateMutation.mutate({ isHelpful, feedback: isHelpful ? undefined : feedback });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Article not found</h2>
          <p className="mt-2 text-gray-600">The article you're looking for doesn't exist.</p>
          <Button
            variant="primary"
            onClick={() => navigate('/kb')}
            className="mt-4"
          >
            Back to Knowledge Base
          </Button>
        </div>
      </div>
    );
  }

  const totalRatings = article.helpful_count + article.not_helpful_count;
  const helpfulPercentage = totalRatings > 0
    ? Math.round((article.helpful_count / totalRatings) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/kb')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Knowledge Base
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                {article.is_featured && (
                  <Badge variant="warning">⭐ Featured</Badge>
                )}
                {article.is_faq && (
                  <Badge variant="primary">FAQ</Badge>
                )}
                {article.category_name && (
                  <Badge variant="secondary">{article.category_name}</Badge>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {article.title}
              </h1>

              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <UserIcon className="h-4 w-4" />
                  {article.author_name}
                </div>
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" />
                  {formatDate(article.published_at || article.created_at, 'PPP')}
                </div>
                <div className="flex items-center gap-1">
                  <EyeIcon className="h-4 w-4" />
                  {article.view_count} views
                </div>
                {totalRatings > 0 && (
                  <div className="flex items-center gap-1">
                    <span className={helpfulPercentage >= 70 ? 'text-green-600' : ''}>
                      👍 {helpfulPercentage}% helpful ({totalRatings})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardBody>
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              </CardBody>
            </Card>

            {/* Rating Section */}
            <Card className="mt-6">
              <CardBody>
                <h3 className="text-lg font-semibold mb-4">Was this article helpful?</h3>

                {!hasRated && !showFeedback ? (
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => handleRate(true)}
                      className="flex-1"
                    >
                      <HandThumbUpIcon className="h-5 w-5 mr-2" />
                      Yes, it was helpful
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRate(false)}
                      className="flex-1"
                    >
                      <HandThumbDownIcon className="h-5 w-5 mr-2" />
                      No, needs improvement
                    </Button>
                  </div>
                ) : showFeedback && !hasRated ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      We're sorry this article wasn't helpful. Please tell us how we can improve it:
                    </p>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="form-input"
                      rows={4}
                      placeholder="Your feedback (optional)..."
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="primary"
                        onClick={() => handleRate(false)}
                      >
                        Submit Feedback
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowFeedback(false);
                          setFeedback('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-green-600">
                    ✓ Thank you for your feedback!
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Article Info */}
            <Card className="mb-6">
              <CardBody>
                <h3 className="font-semibold mb-4">Article Information</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Last Updated</dt>
                    <dd className="font-medium">
                      {formatDate(article.updated_at || article.created_at, 'PPP')}
                    </dd>
                  </div>
                  {article.last_reviewed_at && (
                    <div>
                      <dt className="text-gray-500">Last Reviewed</dt>
                      <dd className="font-medium">
                        {formatDate(article.last_reviewed_at, 'PPP')}
                      </dd>
                    </div>
                  )}
                  {article.tags && (
                    <div>
                      <dt className="text-gray-500">Tags</dt>
                      <dd className="flex flex-wrap gap-2 mt-1">
                        {article.tags.split(',').map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardBody>
            </Card>

            {/* Related Articles */}
            {article.related_articles && article.related_articles.length > 0 && (
              <Card>
                <CardBody>
                  <h3 className="font-semibold mb-4">Related Articles</h3>
                  <div className="space-y-3">
                    {article.related_articles.map((related: KnowledgeArticle) => (
                      <button
                        key={related.id}
                        onClick={() => navigate(`/kb/${related.slug}`)}
                        className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition"
                      >
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                          {related.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <EyeIcon className="h-3 w-3" />
                          {related.view_count} views
                        </div>
                      </button>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
