/// <reference types="vite/client" />

interface SnapBatonData {
  apiBase: string;
  nonce: string;
  page: string;
  userId: number;
  canEdit: boolean;
  canDelete: boolean;
  canManage: boolean;
  uploadUrl: string;
  uploadPass: string;
}

declare const snapbatonData: SnapBatonData;
