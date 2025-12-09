import { useNavigate } from 'react-router-dom';
import { ShieldExclamationIcon, HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Button from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { getUserRole, getRoleDisplayName } from '@/utils/roleHelpers';

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = getUserRole(user);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldExclamationIcon className="h-10 w-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>

          {userRole && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500">Your current role:</p>
              <p className="font-semibold text-gray-900">
                {getRoleDisplayName(userRole)}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate('/')}
            >
              <HomeIcon className="h-5 w-5 mr-2" />
              Go to Dashboard
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Go Back
            </Button>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            If you believe this is an error, please contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
