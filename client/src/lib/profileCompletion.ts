export type ProfileCompletionInput = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  farmProfile?: {
    village?: string | null;
    district?: string | null;
    state?: string | null;
    cropPreferences?: string | string[] | null;
  } | null;
};

export type ProfileCompletionItem = {
  id: "name" | "email" | "avatar" | "farm" | "crops";
  complete: boolean;
};

export function getProfileCompletion(input: ProfileCompletionInput) {
  const cropPreferences = Array.isArray(input.farmProfile?.cropPreferences)
    ? input.farmProfile.cropPreferences
    : (() => {
        try {
          return JSON.parse(input.farmProfile?.cropPreferences ?? "[]") as unknown;
        } catch {
          return [];
        }
      })();
  const items: ProfileCompletionItem[] = [
    { id: "name", complete: Boolean(input.name?.trim()) },
    { id: "email", complete: Boolean(input.email?.trim()) },
    { id: "avatar", complete: Boolean(input.avatarUrl) },
    { id: "farm", complete: Boolean(input.farmProfile?.village?.trim() && input.farmProfile?.district?.trim() && input.farmProfile?.state?.trim()) },
    { id: "crops", complete: Array.isArray(cropPreferences) && cropPreferences.length > 0 },
  ];
  const completed = items.filter((item) => item.complete).length;
  return { items, completed, total: items.length, percent: Math.round((completed / items.length) * 100) };
}
