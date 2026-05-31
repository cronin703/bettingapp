'use server';
import { runMorning, runPregame, runSettle, runForDate } from '@/lib/model/runner';

export async function triggerMorning() {
  return runMorning();
}

export async function triggerPregame() {
  return runPregame();
}

export async function triggerSettle() {
  return runSettle();
}

export async function triggerBackfill(date: string) {
  return runForDate(date, true);
}
