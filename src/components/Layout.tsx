import { ReactNode, useState, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Wallet, TrendingUp, TrendingDown, FileText, Settings, Menu, X, LogOut, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import defaultLogoImg from '@/assets/logo-institucional.png';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
const navigation = [{
  name: 'Dashboard',
  href: '/dashboard',
  icon: LayoutDashboard
}, {
  name: 'Miembros',
  href: '/members',
  icon: Users
}, {
  name: 'Tesorería',
  href: '/treasury',
  icon: Wallet
}, {
  name: 'Cuotas Extra',
  href: '/extraordinary-fees',
  icon: TrendingUp
}, {
  name: 'Gastos',
  href: '/expenses',
  icon: TrendingDown
}, {
  name: 'Derechos de Grado',
  href: '/degree-fees',
  icon: GraduationCap
}, {
  name: 'Informes',
  href: '/reports',
  icon: FileText
}, {
  name: 'Configuración',
  href: '/settings',
  icon: Settings
}];
interface LayoutProps {
  children: ReactNode;
}

// Memoized navigation item for performance
const NavItem = memo(function NavItem({
  item,
  isActive,
  onClick
}: {
  item: typeof navigation[0];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return <button onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
      
      {item.name}
    </button>;
});

// Memoized sidebar content
const SidebarContent = memo(function SidebarContent({
  institutionName,
  logoUrl,
  currentPath,
  onNavigate,
  onLogout,
  showLogout = false
}: {
  institutionName: string;
  logoUrl?: string | null;
  currentPath: string;
  onNavigate: (href: string) => void;
  onLogout: () => void;
  showLogout?: boolean;
}) {
  return <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <img src={logoUrl || defaultLogoImg} alt="Logo institucional" className="h-10 w-auto object-contain" onError={e => {
          (e.target as HTMLImageElement).src = defaultLogoImg;
        }} />
          <h2 className="text-lg font-extrabold leading-tight">{institutionName}</h2>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map(item => <NavItem key={item.name} item={item} isActive={currentPath === item.href} onClick={() => onNavigate(item.href)} />)}
      </nav>

      {showLogout && <div className="border-t p-4">
          <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onLogout}>
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </Button>
        </div>}
    </div>;
});
export default function Layout({
  children
}: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    settings
  } = useSettings();
  const {
    signOut
  } = useAuth();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleNavigate = useCallback((href: string) => {
    navigate(href);
    setMobileMenuOpen(false);
  }, [navigate]);
  const handleLogout = useCallback(async () => {
    setMobileMenuOpen(false);
    await signOut();
  }, [signOut]);

  // Mobile layout with drawer
  if (isMobile) {
    return <div className="min-h-screen flex flex-col">
        {/* Fixed mobile header */}
        <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background px-4 py-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[60vw] max-w-[280px] p-0">
              <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar menú</span>
              </SheetClose>
              <SidebarContent institutionName={settings.institution_name} logoUrl={settings.logo_url} currentPath={location.pathname} onNavigate={handleNavigate} onLogout={handleLogout} showLogout={true} />
            </SheetContent>
          </Sheet>

          <h1 className="text-sm font-semibold truncate max-w-[50%]">
            {settings.institution_name}
          </h1>

          <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Cerrar sesión</span>
          </Button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4">
            {children}
          </div>
        </main>
      </div>;
  }

  // Desktop layout with fixed sidebar
  return <div className="flex min-h-screen">
      {/* Fixed header with logout */}
      <header className="fixed top-0 right-0 z-50 flex items-center gap-2 p-4">
        <Button variant="outline" size="sm" className="gap-2 text-primary bg-primary-foreground border-primary-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </header>

      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex-shrink-0">
        <SidebarContent institutionName={settings.institution_name} logoUrl={settings.logo_url} currentPath={location.pathname} onNavigate={handleNavigate} onLogout={handleLogout} />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-8 pt-16">
          {children}
        </div>
      </main>
    </div>;
}