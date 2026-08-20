"use client";

import {
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Users,
  Vote,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { signOut } from "@/lib/auth-client";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/elections", label: "Pemilihan", icon: Vote },
  { href: "/admin/candidates", label: "Kandidat", icon: ListChecks },
  { href: "/admin/voters", label: "Pemilih", icon: Users },
] as const;

interface AppSidebarProps {
  user: { name?: string | null; email?: string | null };
}

/** Sidebar admin — nav aktif mengikuti pathname, footer berisi user + logout. */
export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-4" aria-hidden />
          </div>
          <span className="truncate text-sm font-semibold text-ink">
            E-Pilketos
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
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
        <div className="flex flex-col gap-2 px-2 py-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-ink">
              {(user.name ?? user.email ?? "A")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink">
                {user.name ?? "Admin"}
              </p>
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => signOut({ callbackURL: "/login" })}
          >
            <LogOut className="size-4" aria-hidden />
            Keluar
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
