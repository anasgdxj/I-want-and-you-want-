import Layout from './components/Layout';
import { AuthProvider } from './hooks/useAuth';
import { RouterProvider, useRouter } from './hooks/useRouter';
import { ThemeProvider } from './hooks/useTheme';
import AccountPage from './pages/AccountPage';
import AddListingPage from './pages/AddListingPage';
import AdminPage from './pages/AdminPage';
import ChatPage from './pages/ChatPage';
import FavoritesPage from './pages/FavoritesPage';
import HomePage from './pages/HomePage';
import ListingDetailsPage from './pages/ListingDetailsPage';
import LoginPage from './pages/LoginPage';
import MessagesPage from './pages/MessagesPage';
import NotFoundPage from './pages/NotFoundPage';
import SwapsPage from './pages/SwapsPage';
import UserProfilePage from './pages/UserProfilePage';

function AppRoutes() {
  const { path } = useRouter();
  const cleanPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

  const listingMatch = /^\/listing\/([^/]+)$/.exec(cleanPath);
  const chatMatch = /^\/messages\/([^/]+)$/.exec(cleanPath);
  const userMatch = /^\/user\/([^/]+)$/.exec(cleanPath);

  const isChatDetail = Boolean(chatMatch);

  let content = <NotFoundPage />;
  if (cleanPath === '/') content = <HomePage />;
  else if (listingMatch) content = <ListingDetailsPage listingId={decodeURIComponent(listingMatch[1])} />;
  else if (userMatch) content = <UserProfilePage userId={decodeURIComponent(userMatch[1])} />;
  else if (cleanPath === '/add') content = <AddListingPage />;
  else if (cleanPath === '/messages') content = <MessagesPage />;
  else if (chatMatch) content = <ChatPage conversationId={decodeURIComponent(chatMatch[1])} />;
  else if (cleanPath === '/swaps') content = <SwapsPage />;
  else if (cleanPath === '/favorites') content = <FavoritesPage />;
  else if (cleanPath === '/account') content = <AccountPage />;
  else if (cleanPath === '/login') content = <LoginPage />;
  else if (cleanPath === '/admin') content = <AdminPage />;

  return <Layout hideBottomNav={isChatDetail}>{content}</Layout>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider>
          <AppRoutes />
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
