export function parseSseBody(body: string): {
  dataEvents: string[];
  doneEvent: string | null;
  errorEvent: string | null;
} {
  const dataEvents: string[] = [];
  let doneEvent: string | null = null;
  let errorEvent: string | null = null;
  let currentEvent = 'message';

  for (const line of body.split('\n')) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim();
      continue;
    }
    if (!line.startsWith('data: ')) {
      continue;
    }
    const payload = line.slice(6);
    if (currentEvent === 'done') {
      doneEvent = payload;
    } else if (currentEvent === 'error') {
      errorEvent = payload;
    } else {
      dataEvents.push(payload);
    }
    currentEvent = 'message';
  }

  return { dataEvents, doneEvent, errorEvent };
}
