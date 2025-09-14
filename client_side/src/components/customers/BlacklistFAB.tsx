// components/customers/BlacklistFAB.tsx
import React from 'react';
import BlacklistModal from './modals/BlacklistModal';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert } from 'lucide-react';

const BlacklistFAB: React.FC = () => {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
      <BlacklistModal
        type="organization"
        trigger={
          <Button
            size="lg"
            variant="outline"
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-white border-orange-200 hover:border-orange-300"
          >
            <Shield className="w-5 h-5 text-orange-600 mr-2" />
            My Blacklist
          </Button>
        }
      />
      <BlacklistModal
        type="global"
        trigger={
          <Button
            size="lg"
            variant="outline"
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <ShieldAlert className="w-5 h-5 mr-2" />
            Global Blacklist
          </Button>
        }
      />
    </div>
  );
};

export default BlacklistFAB;
