import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionStatus {
  subscribed: boolean;
  free_quota_remaining: number;
  subscription_status: string;
  subscription_end?: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    free_quota_remaining: 1,
    subscription_status: 'inactive'
  });
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setSubscriptionStatus(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
    
    // Refresh subscription status every minute
    const interval = setInterval(checkSubscription, 60000);
    
    return () => clearInterval(interval);
  }, [user]);

  const createCheckout = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      throw error;
    }
  };

  const manageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      throw error;
    }
  };

  const decrementQuota = async () => {
    if (!user) return false;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('free_quota_remaining, subscription_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // If subscribed, allow unlimited access
      if (profile.subscription_status === 'active') {
        return true;
      }

      // If no quota remaining, deny access
      if (profile.free_quota_remaining <= 0) {
        return false;
      }

      // Decrement quota
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ free_quota_remaining: profile.free_quota_remaining - 1 })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh subscription status
      await checkSubscription();
      
      return true;
    } catch (error) {
      console.error('Error decrementing quota:', error);
      return false;
    }
  };

  return {
    ...subscriptionStatus,
    loading,
    checkSubscription,
    createCheckout,
    decrementQuota,
    manageSubscription,
  };
};
