import "./globals.css";

import type { Metadata } from "next";
import Link from "next/link";
import {
  Bot,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  PackageCheck,
  Upload
} from "lucide-react";

import { PersonaSwitcher } from "@/components/persona-switcher";
import { getActiveUser, getUsers } from "@/lib/data";

export const metadata: Metadata = {
  title: "APFlow",
  description: "Invoice intake, review, approval, and export automation MVP"
};

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/exports", label: "Exports", icon: PackageCheck }
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [users, activeUser] = await Promise.all([getUsers(), getActiveUser()]);

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link className="brand" href="/">
              <strong>APFlow</strong>
              <span>Invoice operations</span>
            </Link>

            <nav className="nav" aria-label="Primary navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="sidebar-footer">
              <div className="active-user">
                <Bot size={18} />
                <strong>{activeUser?.name ?? "No user"}</strong>
                <span>
                  {activeUser?.role.toLowerCase() ?? "no role"}
                  {activeUser?.department ? ` - ${activeUser.department.name}` : ""}
                </span>
              </div>
              {activeUser ? (
                <PersonaSwitcher users={users} activeUserId={activeUser.id} />
              ) : null}
            </div>
          </aside>

          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
