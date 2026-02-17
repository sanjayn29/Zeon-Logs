import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, BarChart3, GitCompare, MessageCircle, Zap, Home, LogOut } from "lucide-react";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Upload Logs", url: "/upload", icon: Upload },
  { title: "Normalization", url: "/normalization", icon: GitCompare },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Ask ChargeSense", url: "/chat", icon: MessageCircle },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();

  const getUserInitials = () => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  return (
    <Sidebar className="w-60 border-r border-sidebar-border">
      <div className="p-5 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-sidebar-primary">ChargeSense</h1>
          <p className="text-[10px] text-sidebar-foreground/60 tracking-wider uppercase">EV Log Analysis</p>
        </div>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest px-5">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-5 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent rounded-lg mx-2 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Profile Section */}
      <div className="mt-auto border-t border-sidebar-border">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || user?.email || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            onClick={signOut}
            variant="destructive"
            size="sm"
            className="w-full text-xs bg-destructive/90 hover:bg-destructive text-destructive-foreground"
          >
            <LogOut className="w-3 h-3 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </Sidebar>
  );
}