/** 本地日历日是否同一天 */
export function isSameLocalDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function isTimestampToday(ts: number): boolean {
  return isSameLocalDay(ts, Date.now());
}
