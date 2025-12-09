import { useNavigate } from 'react-router-dom';
import Button from '@/components/common/Button';
import { HomeIcon } from '@heroicons/react/24/outline';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-50 via-secondary-50 to-primary-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-extrabold text-accent-600">404</h1>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-gray-900">Page not found</h2>
            <p className="mt-2 text-gray-600">
              Sorry, we couldn't find the page you're looking for.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={() => navigate('/')}
            className="inline-flex items-center"
          >
            <HomeIcon className="h-5 w-5 mr-2" />
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          If you believe this is an error, please contact support.
        </div>
      </div>
    </div>
  );
}