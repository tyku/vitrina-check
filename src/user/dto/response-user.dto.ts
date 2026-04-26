import { SourceType } from '../schemas/user.schema';

export type TResponseUserDto = {
  id: string;
  sourceType: SourceType;
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  email: string;
  languageCode: string;
  createdAt: Date;
  updatedAt: Date;
};
