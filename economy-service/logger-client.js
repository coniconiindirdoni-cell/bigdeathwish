// modules/bank/service.js
const pool = require('../../db/pool');

async function getBalance(guildId, userId) {
  const { rows } = await pool.query('SELECT balance, bank FROM economy WHERE guild_id=$1 AND user_id=$2', [guildId, userId]);
  if (!rows.length) return { balance: 0, bank: 0 };
  return { balance: Number(rows[0].balance), bank: Number(rows[0].bank) };
}

/** Cüzdandan bankaya atomik transfer. */
async function deposit(guildId, userId, amount) {
  if (amount <= 0) return { ok: false, error: 'invalid_amount' };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO economy (guild_id, user_id, balance, bank) VALUES ($1,$2,0,0) ON CONFLICT (guild_id, user_id) DO NOTHING',
      [guildId, userId]
    );
    const { rows } = await client.query(
      'SELECT balance, bank FROM economy WHERE guild_id=$1 AND user_id=$2 FOR UPDATE', [guildId, userId]
    );
    if (Number(rows[0].balance) < amount) {
      await client.query('ROLLBACK');
      return { ok: false, error: 'insufficient_balance' };
    }
    const { rows: updated } = await client.query(
      'UPDATE economy SET balance = balance - $1, bank = bank + $1 WHERE guild_id=$2 AND user_id=$3 RETURNING balance, bank',
      [amount, guildId, userId]
    );
    await client.query('COMMIT');
    return { ok: true, balance: Number(updated[0].balance), bank: Number(updated[0].bank) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Bankadan cüzdana atomik transfer. */
async function withdraw(guildId, userId, amount) {
  if (amount <= 0) return { ok: false, error: 'invalid_amount' };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO economy (guild_id, user_id, balance, bank) VALUES ($1,$2,0,0) ON CONFLICT (guild_id, user_id) DO NOTHING',
      [guildId, userId]
    );
    const { rows } = await client.query(
      'SELECT balance, bank FROM economy WHERE guild_id=$1 AND user_id=$2 FOR UPDATE', [guildId, userId]
    );
    if (Number(rows[0].bank) < amount) {
      await client.query('ROLLBACK');
      return { ok: false, error: 'insufficient_bank_balance' };
    }
    const { rows: updated } = await client.query(
      'UPDATE economy SET balance = balance + $1, bank = bank - $1 WHERE guild_id=$2 AND user_id=$3 RETURNING balance, bank',
      [amount, guildId, userId]
    );
    await client.query('COMMIT');
    return { ok: true, balance: Number(updated[0].balance), bank: Number(updated[0].bank) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { getBalance, deposit, withdraw };
