import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
import { Upload, BarChart3, GitCompare, MessageCircle, Zap } from "lucide-react";

const navItems = [
  { title: "Upload Logs", url: "/", icon: Upload },
  { title: "Normalization", url: "/normalization", icon: GitCompare },
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Ask ChargeSense", url: "/chat", icon: MessageCircle },
];

export function AppSidebar() {
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

      <div className="mt-auto p-4 mx-3 mb-3 rounded-lg energy-gradient border border-border/50">
        <p className="text-[11px] text-sidebar-foreground/60">Hackathon Project</p>
        <p className="text-xs text-sidebar-foreground/80 font-medium">Smart EV Insights</p>
      </div>
    </Sidebar>
  );
}
