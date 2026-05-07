import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.coerce.date(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark']).default('light'),
      newsletter: z.boolean().default(false),
    })
    .default({}),
});

type User = z.infer<typeof UserSchema>;

export const fetchUser = async (id: string): Promise<User> => {
  const res = await fetch(`/api/users/${id}`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to load user ${id}: ${res.status}`);
  }
  const json: unknown = await res.json();
  return UserSchema.parse(json);
};

export const updateUserPreferences = async (
  id: string,
  preferences: User['preferences'],
): Promise<User> => {
  const res = await fetch(`/api/users/${id}/preferences`, {
    body: JSON.stringify(preferences),
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    method: 'PATCH',
  });
  if (!res.ok) throw new Error(`Failed to update preferences for ${id}`);
  return UserSchema.parse(await res.json());
};
