/** Algorithme marée / couloirs — transplanté depuis maquette M10. */

export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 23;
export const HOUR_HEIGHT_PX = 44;
export const DEFAULT_DURATION_MIN = 45;
export const DAY_TIMELINE_HOUR_COUNT = DAY_END_HOUR - DAY_START_HOUR + 1;

export function timeToMinutes(timeStr) {
  const [h, m] = String(timeStr || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
}

export function dateToMinutes(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function occurrenceStartMinutes(occurrence) {
  return dateToMinutes(occurrence.startDateTime);
}

export function occurrenceEndMinutes(occurrence) {
  const startMin = occurrenceStartMinutes(occurrence);
  if (occurrence.endDateTime > occurrence.startDateTime) {
    const endMin = dateToMinutes(occurrence.endDateTime);
    return Math.max(endMin, startMin + 15);
  }
  return startMin + DEFAULT_DURATION_MIN;
}

/**
 * @param {Array<{ id: string, startDateTime: Date, endDateTime: Date }>} occurrences
 * @returns {Map<string, { lane: number, lanes: number }>}
 */
export function assignLanes(occurrences) {
  const sorted = [...occurrences].sort(
    (a, b) => occurrenceStartMinutes(a) - occurrenceStartMinutes(b) || occurrenceEndMinutes(a) - occurrenceEndMinutes(b)
  );
  const laneEnds = [];
  let cluster = [];
  let clusterMaxLanes = 0;
  const results = new Map();

  const flush = () => {
    cluster.forEach((ev) => {
      const entry = results.get(ev.id);
      if (entry) entry.lanes = clusterMaxLanes;
    });
    cluster = [];
    clusterMaxLanes = 0;
    laneEnds.length = 0;
  };

  sorted.forEach((ev) => {
    const startMin = occurrenceStartMinutes(ev);
    if (cluster.length && laneEnds.every((end) => end <= startMin)) flush();

    let lane = laneEnds.findIndex((end) => end <= startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = occurrenceEndMinutes(ev);
    results.set(ev.id, { lane, lanes: 1 });
    cluster.push(ev);
    clusterMaxLanes = Math.max(clusterMaxLanes, laneEnds.length);
  });
  flush();
  return results;
}

export function computeTideNowY(nowMinutes) {
  const maxY = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT_PX;
  const y = ((nowMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT_PX;
  return Math.max(0, Math.min(maxY, y));
}

export function eventTopPx(startMinutes) {
  return ((startMinutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT_PX;
}

export function eventHeightPx(startMinutes, endMinutes) {
  return Math.max(30, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT_PX - 4);
}

export function isEventCompact(heightPx) {
  return heightPx < 46;
}
