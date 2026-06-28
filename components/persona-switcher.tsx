"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { setActiveUserAction } from "@/app/actions";

type UserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: {
    name: string;
  } | null;
};

export function PersonaSwitcher({
  users,
  activeUserId
}: {
  users: UserOption[];
  activeUserId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = query ? `${pathname}?${query}` : pathname;

  return (
    <form action={setActiveUserAction} className="persona-switcher">
      <input type="hidden" name="returnTo" value={returnTo} />
      <label htmlFor="active-user">Persona</label>
      <select
        id="active-user"
        name="userId"
        defaultValue={activeUserId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} - {user.role.toLowerCase()}
          </option>
        ))}
      </select>
    </form>
  );
}
