import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useColorScheme } from '@/components/useColorScheme';
import { colors } from '@/constants/Theme';
import { BearLogo } from '@/components/BearLogo';
import { SummaryPillBar } from '@/components/SummaryPillBar';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

function TabBarIcon(props: { name: IconName; color: string }) {
  return <FontAwesome size={20} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme ?? 'light'];

  return (
    <Tabs
      initialRouteName="today"
      tabBar={(props: BottomTabBarProps) => <SummaryPillBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerRight: () => (
          <View style={{ minHeight: 44, justifyContent: 'center', paddingRight: 8 }}>
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={{ padding: 12 }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <FontAwesome name="cog" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
        ),
        headerRightContainerStyle: { paddingRight: 12 },
        headerLeft: () => (
          <View style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 8 }}>
            <BearLogo width={44} height={44} />
          </View>
        ),
        headerLeftContainerStyle: { paddingLeft: 12 },
        headerStyle: {
          backgroundColor: theme.background,
          borderBottomWidth: 0,
          shadowOpacity: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: 'Items',
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          title: 'Money',
          tabBarIcon: ({ color }) => <TabBarIcon name="dollar" color={color} />,
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
