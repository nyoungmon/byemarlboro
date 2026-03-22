import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getKSTDate = (date: Date | number = new Date()) => {
  const d = new Date(date);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 9));
};

export const getKSTDateString = () => {
  const kst = getKSTDate();
  const y = kst.getFullYear().toString().slice(2);
  const m = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const w = days[kst.getDay()];
  
  return `${y}.${m}.${d}(${w})`;
};

export const isTodayKST = (timestamp: number) => {
  const nowKST = getKSTDate();
  const logKST = getKSTDate(timestamp);
  return nowKST.getFullYear() === logKST.getFullYear() &&
         nowKST.getMonth() === logKST.getMonth() &&
         nowKST.getDate() === logKST.getDate();
};
