'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, useUser, SignOutButton } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SavedBirthCharts } from '@/components/ui/birth-chart-calculator';
import { getBirthCharts, getBirthChartById, saveBirthChart, setDefaultChart, getDefaultChart } from '@/actions';
import { BookOpen, Settings, User, LogOut, Calendar, Star } from 'lucide-react';

// Tabs for the user dashboard
const tabs = [
  { id: 'profile', label: 'Profile', icon: <User className="mr-2 h-4 w-4" /> },
  { id: 'charts', label: 'Birth Charts', icon: <Calendar className="mr-2 h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="mr-2 h-4 w-4" /> },
];

export default function AccountPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [userInfo, setUserInfo] = useState({
    displayName: '',
    email: '',
    username: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [charts, setCharts] = useState<any[]>([]);
  const [defaultChartId, setDefaultChartId] = useState<number | null>(null);
  const [loadingCharts, setLoadingCharts] = useState(true);

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

  // Load user's birth charts
  useEffect(() => {
    const loadCharts = async () => {
      try {
        if (isSignedIn && user) {
          setLoadingCharts(true);
          
          // Parse user ID from Clerk user object
          const userId = parseInt(user.id);
          if (isNaN(userId)) {
            throw new Error('Invalid user ID');
          }
          
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
      const userId = parseInt(user.id);
      if (isNaN(userId)) {
        throw new Error('Invalid user ID');
      }
      
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
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-64">
          <Card className="p-4">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold mb-2">
                {userInfo.displayName ? userInfo.displayName[0].toUpperCase() : '?'}
              </div>
              <h2 className="text-lg font-semibold">{userInfo.displayName || 'User'}</h2>
              <p className="text-sm text-gray-500">{userInfo.email}</p>
            </div>
            
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
              
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <SignOutButton>
                  <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 rounded-md dark:text-red-400 dark:hover:bg-red-900/20">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </button>
                </SignOutButton>
              </div>
            </nav>
          </Card>
        </aside>
        
        {/* Main content */}
        <main className="flex-1">
          <Card className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">My Profile</h2>
                
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={userInfo.displayName}
                      onChange={(e) => setUserInfo({ ...userInfo, displayName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={userInfo.username}
                      onChange={(e) => setUserInfo({ ...userInfo, username: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userInfo.email}
                      disabled
                      className="mt-1 bg-gray-100 dark:bg-gray-800"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      To change your email, please go to account settings
                    </p>
                  </div>
                  
                  <div className="pt-4">
                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </div>
                </form>
                
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Account Management</h3>
                  <UserProfile
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "rounded-lg shadow-none p-0",
                        navbar: "hidden",
                        pageScrollBox: "p-0"
                      }
                    }}
                    path="/account"
                    routing="path"
                  />
                </div>
              </div>
            )}
            
            {/* Charts Tab */}
            {activeTab === 'charts' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">My Birth Charts</h2>
                
                {loadingCharts ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading your charts...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <SavedBirthCharts 
                      userId={user?.id ? parseInt(user.id) : undefined} 
                      onSelectChart={(chartId) => {
                        router.push(`/swisseph?chart=${chartId}`);
                      }}
                    />
                    
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold mb-4">Default Chart</h3>
                      
                      {charts.length > 0 ? (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-500">
                            Select your default chart. This chart will be used throughout the application when interacting with other features.
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {charts.map(chart => (
                              <Card 
                                key={chart.id} 
                                className={`p-4 cursor-pointer transition-all ${
                                  defaultChartId === chart.id 
                                    ? 'ring-2 ring-purple-500 dark:ring-purple-400' 
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                                onClick={() => handleSetDefaultChart(chart.id)}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold">{chart.name}</h4>
                                    <p className="text-xs text-gray-500">
                                      {new Date(chart.birthDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                  
                                  {defaultChartId === chart.id && (
                                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <p className="text-gray-500">No saved charts found. Create a birth chart first.</p>
                          <Button 
                            onClick={() => router.push('/swisseph')}
                            className="mt-4"
                          >
                            Create Birth Chart
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
                
                <div className="space-y-6">
                  <Card className="p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-2">Theme Preferences</h3>
                    <p className="text-sm text-gray-500 mb-4">Choose your preferred application theme</p>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" className="flex-1">Light</Button>
                      <Button variant="outline" className="flex-1">Dark</Button>
                      <Button className="flex-1">System</Button>
                    </div>
                  </Card>
                  
                  <Card className="p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-2">Notifications</h3>
                    <p className="text-sm text-gray-500 mb-4">Manage your notification preferences</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Email notifications</span>
                        <input type="checkbox" className="toggle" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>New feature announcements</span>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
                    <p className="text-sm text-gray-500 mb-4">Irreversible account actions</p>
                    
                    <Button variant="destructive">Delete Account</Button>
                  </Card>
                </div>
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}