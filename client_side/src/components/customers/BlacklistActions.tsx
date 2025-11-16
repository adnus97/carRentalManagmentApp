'use client';

import React from 'react';
import BlacklistModal from './modals/BlacklistModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BlacklistActions: React.FC = () => {
  const { t } = useTranslation('client');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-500" />
          {t('blacklist.actions.title', 'Blacklist Management')}
        </CardTitle>
        <p className="text-sm text-gray-600">
          {t(
            'blacklist.actions.subtitle',
            'View and manage customer blacklists for security and compliance.',
          )}
        </p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Organization Blacklist */}
          <div className="flex flex-col items-center p-6 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">
              {t('blacklist.actions.org_title', 'My Organization Blacklist')}
            </h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              {t(
                'blacklist.actions.org_sub',
                'View customers blacklisted by your organization',
              )}
            </p>
            <BlacklistModal type="organization" />
          </div>

          {/* Global Blacklist */}
          <div className="flex flex-col items-center p-6 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">
              {t('blacklist.actions.global_title', 'Global Blacklist')}
            </h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              {t(
                'blacklist.actions.global_sub',
                'View all blacklisted customers across all organizations',
              )}
            </p>
            <BlacklistModal type="global" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlacklistActions;
