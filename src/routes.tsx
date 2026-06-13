import MainChatPage from './pages/MainChatPage';
import SettingsPage from './pages/SettingsPage';
import NewGroupCreationPage from './pages/NewGroupCreationPage';
import NewGroupChatPage from './pages/NewGroupChatPage';
import RoomsListPage from './pages/RoomsListPage';
import SharePage from './pages/SharePage';
import PersonaListPage from './pages/PersonaListPage';
import PersonaFormPage from './pages/PersonaFormPage';
import PersonaGalleryPage from './pages/PersonaGalleryPage';
import CreatorDashboardPage from './pages/CreatorDashboardPage';
import PublicPersonaPage from './pages/PublicPersonaPage';
import CreditsPage from './pages/CreditsPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import AgentStudioPage from './pages/AgentStudioPage';
import TemplateLibraryPage from './pages/TemplateLibraryPage';
import TemplateSharePage from './pages/TemplateSharePage';
import ContactsPage from './pages/ContactsPage';
import GroupChatPage from './pages/GroupChatPage';
import DashboardPage from './pages/DashboardPage';
import PipelineSharePage from './pages/PipelineSharePage';
import PublicToolPage from './pages/PublicToolPage';
import AuthPage from './pages/AuthPage';
import B2BTaskPage from './pages/B2BTaskPage';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  { name: 'Login',            path: '/login',                   element: <AuthPage />,               public: true, visible: false },
  { name: 'Dashboard',        path: '/',                        element: <DashboardPage />,          public: true },
  { name: 'AI Chat',          path: '/chat',                    element: <MainChatPage />,           public: true, visible: false },
  { name: 'Chat',             path: '/chat/:conversationId',    element: <MainChatPage />,           public: true, visible: false },
  { name: 'Group Chat',       path: '/group-chat',              element: <GroupChatPage />,          public: true, visible: false },
  { name: 'Group Chat Room',  path: '/group-chat/:sessionId',   element: <GroupChatPage />,          public: true, visible: false },
  { name: 'Personas',         path: '/personas',                element: <PersonaListPage />,        public: true, visible: false },
  { name: 'Create Persona',   path: '/personas/create',         element: <PersonaFormPage />,        public: true, visible: false },
  { name: 'Edit Persona',     path: '/personas/edit/:personaId',element: <PersonaFormPage />,        public: true, visible: false },
  { name: 'Persona Gallery',  path: '/personas/gallery',        element: <PersonaGalleryPage />,     public: true, visible: false },
  { name: 'Creator Dashboard',path: '/personas/dashboard',      element: <CreatorDashboardPage />,   public: true, visible: false },
  { name: 'Public Persona',   path: '/p/:personaId',            element: <PublicPersonaPage />,      public: true, visible: false },
  { name: 'Rooms',            path: '/rooms',                   element: <RoomsListPage />,          public: true, visible: false },
  { name: 'Create Room',      path: '/rooms/create',            element: <NewGroupCreationPage />,   public: true, visible: false },
  { name: 'Room Chat',        path: '/room/:groupId',           element: <NewGroupChatPage />,       public: true, visible: false },
  { name: 'Agent Studio',       path: '/studio',                              element: <AgentStudioPage />,        public: true, visible: false },
  { name: 'Pipeline Share',     path: '/studio/share/:shareId',               element: <PipelineSharePage />,      public: true, visible: false },
  { name: 'Template Library',   path: '/studio/templates',                    element: <TemplateLibraryPage />,    public: true, visible: false },
  { name: 'Template Share',     path: '/studio/template-share/:shareToken',   element: <TemplateSharePage />,      public: true, visible: false },
  { name: 'Settings',         path: '/settings',                element: <SettingsPage />,           public: true, visible: false },
  { name: 'Credits',          path: '/credits',                 element: <CreditsPage />,            public: true, visible: false },
  { name: 'Payment Success',  path: '/payment-success',         element: <PaymentSuccessPage />,     public: true, visible: false },
  { name: 'Share',            path: '/share/:slug',             element: <SharePage />,              public: true, visible: false },
  { name: 'Contacts', path: '/contacts', element: <ContactsPage />, public: true, visible: false },
  { name: 'Public Tool', path: '/tool/:shareToken', element: <PublicToolPage />, public: true, visible: false },
  { name: 'B2B Execution', path: '/b2b', element: <B2BTaskPage />, public: true, visible: false },
];
