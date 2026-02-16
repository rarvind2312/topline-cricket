import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

type AdminActionResult = {
  ok: boolean;
  uid?: string;
};

type EmergencyNoticeResult = {
  ok: boolean;
  sent?: number;
};

export async function grantAdminByEmail(email: string): Promise<AdminActionResult> {
  const fn = httpsCallable(functions, 'grantAdminByEmail');
  const res = await fn({ email });
  return res.data as AdminActionResult;
}

export async function revokeAdminByEmail(email: string): Promise<AdminActionResult> {
  const fn = httpsCallable(functions, 'revokeAdminByEmail');
  const res = await fn({ email });
  return res.data as AdminActionResult;
}

export async function sendEmergencyClosureNotification(
  message: string
): Promise<EmergencyNoticeResult> {
  const fn = httpsCallable(functions, 'sendEmergencyClosureNotification');
  const res = await fn({ message });
  return res.data as EmergencyNoticeResult;
}
