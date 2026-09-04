import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

function rowToKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    machineId: row.machineId,
    isActive: row.isActive === 1 || row.isActive === true,
    config: parseJson(row.config, null) || {},
    createdAt: row.createdAt,
  };
}

export async function getApiKeys() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM apiKeys ORDER BY createdAt ASC`);
  return rows.map(rowToKey);
}

const KEY_CACHE_TTL_MS = 60_000;
const keyCacheById = new Map();
const keyCacheByKey = new Map();

function invalidateKeyCache(id = null, key = null) {
  if (id) keyCacheById.delete(id);
  if (key) keyCacheByKey.delete(key);
  if (!id && !key) {
    keyCacheById.clear();
    keyCacheByKey.clear();
  }
}

export async function getApiKeyById(id) {
  if (!id) return null;
  const cached = keyCacheById.get(id);
  if (cached && Date.now() - cached.ts < KEY_CACHE_TTL_MS) return cached.val;

  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
  const val = rowToKey(row);
  if (val) {
    keyCacheById.set(id, { val, ts: Date.now() });
    keyCacheByKey.set(val.key, { val, ts: Date.now() });
  }
  return val;
}

export async function getApiKeyByKey(key) {
  if (!key) return null;
  const cached = keyCacheByKey.get(key);
  if (cached && Date.now() - cached.ts < KEY_CACHE_TTL_MS) return cached.val;

  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE key = ?`, [key]);
  const val = rowToKey(row);
  if (val) {
    keyCacheByKey.set(key, { val, ts: Date.now() });
    keyCacheById.set(val.id, { val, ts: Date.now() });
  }
  return val;
}

export async function createApiKey(name, machineId, config = {}) {
  if (!machineId) throw new Error("machineId is required");
  const db = await getAdapter();
  const { generateApiKeyWithMachine } = await import("@/shared/utils/apiKey");
  const result = generateApiKeyWithMachine(machineId);
  const apiKey = {
    id: uuidv4(),
    name,
    key: result.key,
    machineId,
    isActive: true,
    config: config || {},
    createdAt: new Date().toISOString(),
  };
  db.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, config, createdAt) VALUES(?, ?, ?, ?, ?, ?, ?)`,
    [apiKey.id, apiKey.key, apiKey.name, apiKey.machineId, 1, stringifyJson(apiKey.config), apiKey.createdAt]
  );
  return apiKey;
}

export async function updateApiKey(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
    if (!row) return;
    const current = rowToKey(row);
    const merged = { ...current, ...data };
    if (data.config !== undefined) {
      merged.config = { ...(current.config || {}), ...(data.config || {}) };
    }
    db.run(
      `UPDATE apiKeys SET key = ?, name = ?, machineId = ?, isActive = ?, config = ? WHERE id = ?`,
      [merged.key, merged.name, merged.machineId, merged.isActive ? 1 : 0, stringifyJson(merged.config || {}), id]
    );
    result = merged;
  });
  invalidateKeyCache(id, result?.key);
  return result;
}

export async function deleteApiKey(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT key FROM apiKeys WHERE id = ?`, [id]);
  const key = row?.key;
  const res = db.run(`DELETE FROM apiKeys WHERE id = ?`, [id]);
  invalidateKeyCache(id, key);
  return (res?.changes ?? 0) > 0;
}

export async function validateApiKey(key) {
  const db = await getAdapter();
  const row = db.get(`SELECT isActive FROM apiKeys WHERE key = ?`, [key]);
  if (!row) return false;
  return row.isActive === 1 || row.isActive === true;
}
