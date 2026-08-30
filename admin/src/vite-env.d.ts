/// <reference types="vite/client" />

interface SnapBatonData {
  apiBase: string;
  nonce: string;
  page: string;
  groupId: number;
  userId: number;
  canEdit: boolean;
  canDelete: boolean;
  canManage: boolean;
  uploadUrl: string;
  uploadPass: string;
  feedbackToken: string;
}

declare const snapbatonData: SnapBatonData;
