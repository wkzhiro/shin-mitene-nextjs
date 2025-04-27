// types/admin.types.ts

export type User = {
  id: string;
  username: string;
  email: string | null;
  role: boolean | null;
};

export type Category = {
  id: number;
  name: string;
};
