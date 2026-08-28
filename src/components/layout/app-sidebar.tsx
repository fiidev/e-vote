"use client";

import {
  Building2,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  Radio,
  Users,
  Vote,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { AuthUser } from "@/lib/auth";
import { signOut } from "@/lib/auth-client";

interface AppSidebarProps {
  user: AuthUser;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(isSuperAdmin
      ? [
          {
            href: "/admin/organizations",
            label: "Organisasi",
            icon: Building2,
          },
        ]
      : []),
    { href: "/admin/elections", label: "Pemilihan", icon: Vote },
    { href: "/admin/candidates", label: "Kandidat", icon: ListChecks },
    { href: "/admin/voters", label: "Pemilih", icon: Users },
    { href: "/admin/live-count", label: "Live Count", icon: Radio },
  ];

  async function handleSignOut() {
    setIsLoggingOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            router.replace("/login");
            router.refresh();
          },
        },
      });
      router.replace("/login");
      router.refresh();
    } catch {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-bold text-ink block">
              E-Vote
            </span>
            <span className="truncate text-[11px] font-medium text-ink-muted block font-mono">
              {user.organizationName ? user.organizationName : "Super Admin"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    href={item.href}
                    isActive={active}
                    tooltip={item.label}
                  >
                    <item.icon aria-hidden />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 px-2 py-1.5 overflow-hidden group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-ink">
                {(user.name ?? user.email ?? "A")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-semibold text-ink">
                    {user.name ?? "Admin"}
                  </p>
                  <Badge
                    variant={isSuperAdmin ? "default" : "secondary"}
                    className="text-[9px] px-1 py-0"
                  >
                    {isSuperAdmin ? "SUPER" : "ORG"}
                  </Badge>
                </div>
                <p className="truncate text-[11px] text-ink-muted">
                  {user.email}
                </p>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="default"
              tooltip="Keluar"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full cursor-pointer"
              onPress={handleSignOut}
              isDisabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
              ) : (
                <LogOut className="size-4 shrink-0" aria-hidden />
              )}
              <span className="group-data-[collapsible=icon]:hidden truncate">
                {isLoggingOut ? "Keluar…" : "Keluar"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
