const oracledb = require("oracledb");
require("dotenv").config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false;

const poolOptions = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTION_STRING,
  poolAlias: process.env.ORACLE_POOL_ALIAS || "campus_connect_pool",
  poolMin: Number(process.env.ORACLE_POOL_MIN || 1),
  poolMax: Number(process.env.ORACLE_POOL_MAX || 10),
  poolIncrement: Number(process.env.ORACLE_POOL_INCREMENT || 1),
  stmtCacheSize: Number(process.env.ORACLE_STMT_CACHE_SIZE || 40)
};

let poolPromise = null;

function ensureOracleEnv() {
  if (!poolOptions.user || !poolOptions.password || !poolOptions.connectString) {
    throw new Error(
      "Missing Oracle environment variables. Set ORACLE_USER, ORACLE_PASSWORD, and ORACLE_CONNECTION_STRING."
    );
  }
}

async function initializeOraclePool() {
  ensureOracleEnv();

  if (!poolPromise) {
    poolPromise = oracledb
      .createPool(poolOptions)
      .catch((error) => {
        poolPromise = null;
        throw error;
      });
  }

  return poolPromise;
}

async function getConnection() {
  const pool = await initializeOraclePool();
  return pool.getConnection();
}

async function executeQuery(sql, binds = {}, options = {}) {
  const connection = await getConnection();
  try {
    return await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: false,
      ...options
    });
  } finally {
    await connection.close().catch(() => {});
  }
}

async function callProcedure(plsqlBlock, binds = {}, options = {}) {
  return executeQuery(plsqlBlock, binds, {
    autoCommit: options.autoCommit ?? false,
    ...options
  });
}

async function withTransaction(work) {
  const connection = await getConnection();
  try {
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    await connection.close().catch(() => {});
  }
}

async function closeOraclePool() {
  if (!poolPromise) {
    return;
  }

  const pool = await poolPromise;
  await pool.close(10);
  poolPromise = null;
}

function formatOracleError(error) {
  return {
    message: error.message,
    errorNum: error.errorNum,
    code: error.errorNum ? `ORA-${String(error.errorNum).padStart(5, "0")}` : undefined,
    offset: error.offset
  };
}

module.exports = {
  oracledb,
  initializeOraclePool,
  closeOraclePool,
  executeQuery,
  callProcedure,
  withTransaction,
  formatOracleError
};