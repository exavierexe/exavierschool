'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, useUser, SignOutButton } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SavedBirthCharts } from '@/components/ui/birth-chart-calculator';
import { getBirthCharts, getBirthChartById, saveBirthChart, setDefaultChart, getDefaultChart, syncUser } from '@/actions';
import { BookOpen, Settings, User, LogOut, Calendar, Star } from 'lucide-react';
import { SavedTarotReadings } from '@/components/ui/saved-tarot-readings';

// Tabs for the user dashboard
const tabs = [
  { id: 'profile', label: 'Profile', icon: <User className="mr-2 h-4 w-4" /> },
  { id: 'birth-charts', label: 'Birth Charts', icon: <Calendar className="mr-2 h-4 w-4" /> },
  { id: 'tarot-readings', label: 'Tarot Readings', icon: <Star className="mr-2 h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="mr-2 h-4 w-4" /> },
];

export default function AccountPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('birth-charts');
  const [userInfo, setUserInfo] = useState({
    displayName: '',
    email: '',
    username: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [charts, setCharts] = useState<any[]>([]);
  const [defaultChartId, setDefaultChartId] = useState<number | null>(null);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if user is not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // Load user information when component mounts
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      setUserInfo({
        displayName: user.fullName || '',
        email: user.primaryEmailAddress?.emailAddress || '',
        username: user.username || '',
      });
    }
  }, [isLoaded, isSignedIn, user]);

  // Add user sync effect
  useEffect(() => {
    const syncUserData = async () => {
      if (!isLoaded || !user) return;

      try {
        setIsSyncing(true);
        setError(null);
        await syncUser(user.id);
        router.refresh(); // Refresh the page to show updated data
      } catch (err) {
        console.error('Error syncing user:', err);
        setError('Failed to sync user data. Please try again later.');
      } finally {
        setIsSyncing(false);
      }
    };

    syncUserData();
  }, [user, isLoaded, router]);

  // Load user's birth charts
  useEffect(() => {
    const loadCharts = async () => {
      try {
        if (isSignedIn && user) {
          setLoadingCharts(true);
          
          // Use the Clerk user ID directly
          const userId = user.id;
          
          // Load user's saved charts
          const savedCharts = await getBirthCharts(userId);
          setCharts(savedCharts);
          
          // Get user's default chart
          try {
            const defaultChart = await getDefaultChart(userId);
            if (defaultChart) {
              setDefaultChartId(defaultChart.id);
            } else if (savedCharts.length > 0) {
              // If no default chart is set but we have charts, use the first one
              setDefaultChartId(savedCharts[0].id);
            }
          } catch (err) {
            console.error('Error loading default chart:', err);
            // Fallback to first chart if default chart retrieval fails
            if (savedCharts.length > 0) {
              setDefaultChartId(savedCharts[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading charts:', error);
      } finally {
        setLoadingCharts(false);
      }
    };

    if (isLoaded && isSignedIn) {
      loadCharts();
    }
  }, [isLoaded, isSignedIn, user]);

  // Handle form submission to update user information
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSignedIn || !user) return;
    
    try {
      setIsUpdating(true);
      
      // Update user information using Clerk API
      await user.update({
        firstName: userInfo.displayName.split(' ')[0],
        lastName: userInfo.displayName.split(' ').slice(1).join(' '),
        username: userInfo.username,
      });
      
      // Optionally add server-side sync for your database
      
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle setting a chart as default
  const handleSetDefaultChart = async (chartId: number) => {
    try {
      // Update state optimistically
      setDefaultChartId(chartId);
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Call the server action to save the default chart preference
      const userId = user.id;
      
      const result = await setDefaultChart(userId, chartId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to set default chart');
      }
      
      // Show success message
      alert('Default chart updated successfully!');
    } catch (error) {
      console.error('Error setting default chart:', error);
      alert('Failed to set default chart. Please try again.');
      
      // Revert the default chart ID if there was an error
      if (charts.length > 0) {
        setDefaultChartId(charts[0].id);
      } else {
        setDefaultChartId(null);
      }
    }
  };

  // Loading state
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Loading your account...</h2>
            <div className="animate-pulse rounded-full h-12 w-12 bg-gray-600 mx-auto"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Account</h1>
      
      <div className="flex space-x-4 mb-8">
        <Button
          variant={activeTab === 'birth-charts' ? 'default' : 'outline'}
          onClick={() => setActiveTab('birth-charts')}
        >
          Birth Charts
        </Button>
        <Button
          variant={activeTab === 'tarot-readings' ? 'default' : 'outline'}
          onClick={() => setActiveTab('tarot-readings')}
        >
          Tarot Readings
        </Button>
      </div>

      {activeTab === 'birth-charts' && (
        <div className="space-y-8">
          <SavedBirthCharts userId={user?.id} />
        </div>
      )}

      {activeTab === 'tarot-readings' && (
        <div className="space-y-8">
          <SavedTarotReadings userId={user?.id} />
        </div>
      )}
    </div>
  );
}