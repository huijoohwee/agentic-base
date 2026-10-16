import { MemoryAdapter } from '../src/adapters/memory.mjs';
import { createBaseEngine } from '../src/engine.mjs';

export const taskFields = [
  { id: 'title', name: 'Title', type: 'text', required: true },
  { id: 'status', name: 'Status', type: 'select', required: true, options: ['Todo', 'Doing', 'Done'] },
  { id: 'due', name: 'Due', type: 'date' },
  { id: 'points', name: 'Points', type: 'number' },
  { id: 'region', name: 'Region', type: 'text' },
];

export function harness({ authorize = ({ actorId }) => actorId === 'alice', limits = {} } = {}) {
  const adapter = new MemoryAdapter();
  let id = 0;
  let tick = 0;
  const engine = createBaseEngine({ adapter, authorize, limits,
    idFactory: kind => `${kind}_${++id}`,
    now: () => `2026-10-16T00:00:${String(tick++).padStart(2, '0')}.000Z`,
  });
  const run = (operation, payload = {}, actorId = 'alice') => engine.execute({
    contractVersion: 1, actorId, operation, payload,
  });
  return { adapter, engine, run };
}

export async function seedTable(run, fields = taskFields) {
  const base = await run('base.create', { id: 'base_local', name: 'Local Tasks' });
  const table = await run('table.create', { baseId: 'base_local', expectedRevision: 1, id: 'table_tasks', name: 'Tasks', fields });
  return { base, table, revision: table.data.revision };
}

export async function addRecord(run, { revision, id, values, tableId = 'table_tasks', baseId = 'base_local' }) {
  const result = await run('record.create', { baseId, tableId, expectedRevision: revision, id, values });
  return { result, revision: result.data?.revision ?? revision };
}
