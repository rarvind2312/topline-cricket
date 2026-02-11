import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

type AskAIResult = {
  answer: string;
  remaining?: number;
};

export async function askAI(
  question: string,
  opts?: { videoId?: string }
): Promise<AskAIResult> {
  const fn = httpsCallable(functions, 'askAiForPlayer');
  const payload: any = { question };
  if (opts?.videoId) payload.videoId = opts.videoId;
  const res = await fn(payload);
  return res.data as AskAIResult;
}
