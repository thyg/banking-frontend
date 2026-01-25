"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarLink } from "@/config/navigation";

interface MainNavProps {
  links: SidebarLink[];
}

export function MainNav({ links }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1 p-2">
      {links.map((link, index) => {
        const isActive = pathname === link.href;
        const isDisabled = link.disabled;

        return (
          <div key={index}>
            {/* Separator with optional section label */}
            {link.separatorBefore && (
              <div className="my-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-300" />
                  {link.sectionLabel && (
                    <>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {link.sectionLabel}
                      </span>
                      <div className="h-px flex-1 bg-gray-300" />
                    </>
                  )}
                </div>
              </div>
            )}

            {isDisabled ? (
              <div
                className="flex items-center gap-3 rounded-r-full rounded-l-none px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed opacity-60"
              >
                <link.icon className="h-5 w-5 text-gray-400" />
                {link.title}
              </div>
            ) : (
              <Link
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-r-full rounded-l-none px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200/50",
                  isActive ? "bg-blue-100 text-blue-800 font-semibold hover:bg-blue-100" : "hover:bg-gray-200"
                )}
              >
                <link.icon className={cn("h-5 w-5", isActive ? "text-blue-700" : "text-gray-600")} />
                {link.title}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}