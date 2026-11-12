export type RiderTaskNotification = {
  taskId: string;
  taskType: string;
  taskDate: string;
  boxId: string;
  area: string | null;
  read: boolean;
};
export type RiderTaskNotificationFeed = {
  notifications: RiderTaskNotification[];
  unreadCount: number;
};
