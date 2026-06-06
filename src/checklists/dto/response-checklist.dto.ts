export type TResponseChecklistDto = {
  id: string;
  userId: string;
  href: string;
  name?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};
